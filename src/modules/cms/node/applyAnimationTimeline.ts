// src/modules/cms/node/applyAnimationTimeline.ts
//
// Phase 4 (Animation Timeline) — builds ONE real gsap.timeline() from a node's
// AnimationTimeline: every keyframe becomes a `.to()` call chained onto the SAME
// timeline, positioned by its own absolute `delay` (in seconds) rather than a
// relative GSAP position string — this is a deliberate simplification so the
// Inspector can show "this step starts at 0.4s" without requiring the admin to
// understand GSAP's position-parameter syntax (`+=0.2`, `<`, labels, ...).
//
// As of Motion System Unification (Phase 5), this file — together with
// `animationTimeline.types.ts` and its directive `useNodeAnimation.ts` — is the SOLE
// animation system in this codebase. Historically (Phase 4 and earlier) there was a
// second, older system (`presetRegistry.ts`/`useAnimate.ts`/`AnimationLayer`,
// `use:animate={layer}`) that served a fixed set of migration-only widgets in
// parallel by design. That system, and every widget still wired to it, was fully
// deleted as part of this plan — there is no second animation pipeline anywhere in
// this codebase anymore. If you're reading old comments/docs elsewhere that still
// mention `AnimationLayer`/`legacyAnimation`/`useAnimate`, they're describing history,
// not current architecture.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { AnimationTimeline } from './animationTimeline.types';
import { EAnimationTrigger, EAnimationProperty } from './animationTimeline.types';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

const MOBILE_BREAKPOINT = 768;

/** Resolves which element(s) a keyframe applies to — shared by BOTH the reduced-motion
 * (synchronous final-state) path and the GSAP-animated path below, so the two can never
 * silently diverge again (final whole-branch review Important I2: they used to each hand-roll
 * their own resolution rule and had quietly drifted apart — a `stagger` keyframe with no
 * `target` resolved to ALL of `rootEl.children` on the animated path but only `[rootEl]` on
 * the reduced-motion path, and a `target` matching nothing fell back to `rootEl` on the
 * animated (non-stagger) path but resolved to nothing at all on the reduced-motion path).
 *
 * Mirrors the GSAP path's two pre-existing rules exactly:
 *  - `kf.stagger` set: a `kf.target` resolves via `querySelectorAll` (empty array if nothing
 *    matches — GSAP itself has no fallback here, so neither does this); no `kf.target`
 *    resolves to ALL of `rootEl.children`.
 *  - `kf.stagger` unset: a `kf.target` resolves via a single `querySelector`, falling back to
 *    `rootEl` itself if nothing matches; no `kf.target` resolves to `rootEl`.
 * The non-stagger case always returns a single-element array — callers that need the bare
 * `Element` (to keep passing a single target to GSAP, not a 1-item array/NodeList, which is
 * what this file's existing tests pin down) read `[0]` off the result themselves. */
function resolveKeyframeTargets(rootEl: Element, kf: AnimationTimeline['keyframes'][number]): Element[] {
    if (kf.stagger !== undefined) {
        if (kf.target) return Array.from(rootEl.querySelectorAll(`[data-anim-target="${CSS.escape(kf.target)}"]`));
        return Array.from(rootEl.children);
    }
    if (kf.target) {
        const found = rootEl.querySelector(`[data-anim-target="${CSS.escape(kf.target)}"]`);
        return [found ?? rootEl];
    }
    return [rootEl];
}

/** Final whole-branch review Important I1: the reduced-motion final-state write used to
 * ALWAYS compose a full 4-part `translate(...) scale(...) rotate(...)` string, defaulting any
 * of x/y/scale/rotation this element's OWN keyframes didn't mention to a CSS-neutral value (0
 * for x/y/rotation, 1 for scale) rather than leaving it alone. That SILENTLY ERASED a
 * `transform` this element already had from an independent writer — confirmed live on
 * ShapeNode.tsx/TextNode.tsx/ImageNode.tsx (an admin-configured rotation from
 * applyNodeStyle.ts's Transform panel) and SiteHeader.tsx's scroll-hide translate — since only
 * reduced-motion users hit this path at all (the normal GSAP path already composes with/
 * preserves whatever transform is already there, rather than clobbering it).
 *
 * Fix: only ever touch the specific translateX/translateY/scale/rotate token this element's
 * OWN keyframes actually set, by regex-replacing that ONE named function inside whatever
 * `transform` string is already on the element (or appending it, if not present yet) — every
 * other token already in the string is left byte-for-byte untouched, never defaulted.
 *
 * Known, disclosed limitation: this uses translateX/translateY/scale as this path's own token
 * vocabulary, which does not lexically match applyNodeStyle.ts's own combined `translate(x,y)`
 * / separate `scaleX`/`scaleY` tokens. `rotate(...)` DOES match (both systems use the same
 * single-argument `rotate(<deg>deg)` form), so a pre-existing rotation is correctly preserved/
 * overridden. A pre-existing `translate(x,y)` or `scaleX`/`scaleY` from applyNodeStyle.ts, if a
 * keyframe ALSO targets x/y/scale, is not structurally merged — both end up present in the
 * string and compose/compound rather than the new value cleanly replacing the old. That's a
 * real residual gap, but strictly better than the previous behavior (silent, total erasure):
 * nothing this function didn't itself write is ever lost. A full matrix-aware merge across
 * both systems' token vocabularies was judged out of scope for this fix round. */
function mergeTransformParts(existing: string, state: { x?: number; y?: number; scale?: number; rotation?: number }): string {
    let result = existing || '';
    const setToken = (fnName: string, value: string) => {
        const tokenRegex = new RegExp(`${fnName}\\([^)]*\\)`);
        result = tokenRegex.test(result) ? result.replace(tokenRegex, `${fnName}(${value})`) : result ? `${result} ${fnName}(${value})` : `${fnName}(${value})`;
    };
    if (state.x !== undefined) setToken('translateX', `${state.x}px`);
    if (state.y !== undefined) setToken('translateY', `${state.y}px`);
    if (state.scale !== undefined) setToken('scale', `${state.scale}`);
    if (state.rotation !== undefined) setToken('rotate', `${state.rotation}deg`);
    return result;
}

/** Builds and starts a gsap.timeline() for `timeline` against `rootEl`, returning a
 * cleanup function (call on unmount). Returns a no-op cleanup if `timeline` is
 * undefined/has no keyframes, if `timeline.keyframes` isn't an array (final whole-branch
 * review: the BE's `animationRef` column is a loosely-typed `jsonb`/`Record<string, any>`
 * with no shape validation — a malformed or partial value, however unlikely given no
 * current writer produces one, shouldn't throw here; matches `nodeDataBinding.ts`'s own
 * precedent of gracefully ignoring an unexpected legacy shape rather than crashing the
 * node's render), or if `mobileEnabled === false` and the viewport is currently under
 * 768px (same threshold/convention the now-deleted `useAnimate.ts` used historically). */
export function applyAnimationTimeline(rootEl: Element, timeline: AnimationTimeline | undefined): () => void {
    if (!timeline || !Array.isArray(timeline.keyframes) || !timeline.keyframes.length) return () => {};
    if (timeline.mobileEnabled === false && typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT) return () => {};

    // `prefers-reduced-motion` — neither the old `AnimationLayer`/`useAnimate` system nor this
    // one ever checked this before now (a real, confirmed accessibility gap; see Task 12). When
    // active, skip GSAP entirely and apply every keyframe's final `to` state synchronously
    // instead — no tween, no timeline, no ScrollTrigger. `opacity` maps straight onto
    // `el.style.opacity`. `x`/`y`/`scale`/`rotation` are NOT independent CSS properties (setting
    // `el.style.x` etc. would silently do nothing), so per the `AnimationProperty` union they
    // must compose into a single `transform` declaration — and since several keyframes in the
    // same timeline can target the SAME element on DIFFERENT properties, they're grouped by
    // resolved target element first. Target resolution uses the SAME `resolveKeyframeTargets`
    // helper the GSAP path below uses (final whole-branch review Important I2 — the two used to
    // have quietly-drifted-apart resolution rules). Only the x/y/scale/rotation properties a
    // given element's OWN keyframes actually set are written into that element's `transform` —
    // anything else already on the element (from `applyNodeStyle.ts`'s Transform panel, or any
    // other independent writer) is preserved rather than defaulted to a CSS-neutral value and
    // clobbered (final whole-branch review Important I1 — see `mergeTransformParts` above).
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        type TransformState = Partial<{ x: number; y: number; scale: number; rotation: number }>;
        const transformStates = new Map<Element, TransformState>();

        for (const kf of timeline.keyframes) {
            const targets = resolveKeyframeTargets(rootEl, kf);
            targets.forEach((el) => {
                if (kf.property === EAnimationProperty.OPACITY) {
                    (el as HTMLElement).style.opacity = String(kf.to);
                    return;
                }
                const state = transformStates.get(el) ?? {};
                if (kf.property === EAnimationProperty.X) state.x = kf.to;
                else if (kf.property === EAnimationProperty.Y) state.y = kf.to;
                else if (kf.property === EAnimationProperty.SCALE) state.scale = kf.to;
                else if (kf.property === EAnimationProperty.ROTATION) state.rotation = kf.to;
                transformStates.set(el, state);
            });
        }

        transformStates.forEach((state, el) => {
            (el as HTMLElement).style.transform = mergeTransformParts((el as HTMLElement).style.transform, state);
        });

        return () => {};
    }

    const ctx = gsap.context(() => {
        const tl = gsap.timeline({
            scrollTrigger:
                timeline.trigger === EAnimationTrigger.ON_SCROLL
                    ? {
                          trigger: rootEl,
                          start: timeline.scrollStart ?? 'top 85%',
                          toggleActions: timeline.repeat ? 'play reverse play reverse' : 'play none none none',
                      }
                    : undefined,
        });

        for (const kf of timeline.keyframes) {
            const vars: Record<string, any> = { duration: kf.duration, ease: kf.easing || 'power2.out' };
            vars[kf.property] = kf.to;
            const resolved = resolveKeyframeTargets(rootEl, kf);
            if (kf.stagger !== undefined) {
                vars.stagger = kf.stagger;
                if (kf.from !== undefined) {
                    tl.fromTo(resolved, { [kf.property]: kf.from }, vars, kf.delay ?? 0);
                } else {
                    tl.to(resolved, vars, kf.delay ?? 0);
                }
                continue;
            }
            const targetEl = resolved[0];
            if (kf.from !== undefined) {
                tl.fromTo(targetEl, { [kf.property]: kf.from }, vars, kf.delay ?? 0);
            } else {
                tl.to(targetEl, vars, kf.delay ?? 0);
            }
        }

        if (timeline.trigger === EAnimationTrigger.ON_LOAD) tl.play();
    });

    return () => ctx.revert();
}
