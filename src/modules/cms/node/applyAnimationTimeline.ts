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
                const targets = kf.target ? rootEl.querySelectorAll(`[data-anim-target="${kf.target}"]`) : rootEl.children;
                if (kf.from !== undefined) {
                    tl.fromTo(targets, { [kf.property]: kf.from }, vars, kf.delay ?? 0);
                } else {
                    tl.to(targets, vars, kf.delay ?? 0);
                }
                continue;
            }
            const targetEl = kf.target ? rootEl.querySelector(`[data-anim-target="${kf.target}"]`) ?? rootEl : rootEl;
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
