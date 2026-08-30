// src/modules/cms/node/applyAnimationTimeline.ts
//
// Phase 4 (Animation Timeline) — builds ONE real gsap.timeline() from a node's
// AnimationTimeline: every keyframe becomes a `.to()` call chained onto the SAME
// timeline, positioned by its own absolute `delay` (in seconds) rather than a
// relative GSAP position string — this is a deliberate simplification so the
// Inspector can show "this step starts at 0.4s" without requiring the admin to
// understand GSAP's position-parameter syntax (`+=0.2`, `<`, labels, ...).
//
// Parallel, independent system from `presetRegistry.ts`/`useAnimate.ts` — those keep
// serving the 14 migration-only widgets via `AnimationLayer`/`legacyAnimation`
// unchanged. This file/its directive (useNodeAnimation.ts) is new, additive, and
// never imported by anything in that older pipeline.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { AnimationTimeline } from './animationTimeline.types';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

const MOBILE_BREAKPOINT = 768;

/** Builds and starts a gsap.timeline() for `timeline` against `rootEl`, returning a
 * cleanup function (call on unmount). Returns a no-op cleanup if `timeline` is
 * undefined/has no keyframes, if `timeline.keyframes` isn't an array (final whole-branch
 * review: the BE's `animationRef` column is a loosely-typed `jsonb`/`Record<string, any>`
 * with no shape validation — a malformed or partial value, however unlikely given no
 * current writer produces one, shouldn't throw here; matches `nodeDataBinding.ts`'s own
 * precedent of gracefully ignoring an unexpected legacy shape rather than crashing the
 * node's render), or if `mobileEnabled === false` and the viewport is currently under
 * 768px (same threshold/convention useAnimate.ts already uses). */
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
    // resolved target element first and applied as one combined `transform` per element,
    // mirroring `applyNodeStyle.ts`'s own transform-composition convention (`effective.transform`
    // block: build up parts from each field's own value, default the ones not present). Any
    // property with no keyframe for a given element defaults to its CSS-neutral value (`0` for
    // x/y/rotation, `1` for scale) rather than being omitted, since — unlike `applyNodeStyle.ts`'s
    // conditional parts — this always writes a fully-resolved final state.
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        type TransformState = { x: number; y: number; scale: number; rotation: number };
        const transformStates = new Map<Element, TransformState>();

        for (const kf of timeline.keyframes) {
            // Task 11b convention: a dynamic `kf.target` (admin-controlled free text) must be
            // escaped via `CSS.escape()` before building a `[data-anim-target="..."]` selector —
            // an unescaped `"` in the target would otherwise produce an invalid/throwing selector.
            const targets: Element[] = kf.target ? Array.from(rootEl.querySelectorAll(`[data-anim-target="${CSS.escape(kf.target)}"]`)) : [rootEl];
            targets.forEach((el) => {
                if (kf.property === 'opacity') {
                    (el as HTMLElement).style.opacity = String(kf.to);
                    return;
                }
                let state = transformStates.get(el);
                if (!state) {
                    state = { x: 0, y: 0, scale: 1, rotation: 0 };
                    transformStates.set(el, state);
                }
                if (kf.property === 'x') state.x = kf.to;
                else if (kf.property === 'y') state.y = kf.to;
                else if (kf.property === 'scale') state.scale = kf.to;
                else if (kf.property === 'rotation') state.rotation = kf.to;
            });
        }

        transformStates.forEach((state, el) => {
            (el as HTMLElement).style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale}) rotate(${state.rotation}deg)`;
        });

        return () => {};
    }

    const ctx = gsap.context(() => {
        const tl = gsap.timeline({
            scrollTrigger:
                timeline.trigger === 'onScroll'
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
            if (kf.stagger !== undefined) {
                vars.stagger = kf.stagger;
                const targets = kf.target ? rootEl.querySelectorAll(`[data-anim-target="${CSS.escape(kf.target)}"]`) : rootEl.children;
                if (kf.from !== undefined) {
                    tl.fromTo(targets, { [kf.property]: kf.from }, vars, kf.delay ?? 0);
                } else {
                    tl.to(targets, vars, kf.delay ?? 0);
                }
                continue;
            }
            const targetEl = kf.target ? rootEl.querySelector(`[data-anim-target="${CSS.escape(kf.target)}"]`) ?? rootEl : rootEl;
            if (kf.from !== undefined) {
                tl.fromTo(targetEl, { [kf.property]: kf.from }, vars, kf.delay ?? 0);
            } else {
                tl.to(targetEl, vars, kf.delay ?? 0);
            }
        }

        if (timeline.trigger === 'onLoad') tl.play();
    });

    return () => ctx.revert();
}
