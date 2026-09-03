// src/modules/cms/node/animationTimeline.types.ts
//
// Phase 4 (Animation Timeline) — the real keyframe model the roadmap's charter asked
// for, originally introduced alongside the older single-preset `AnimationLayer`
// (cms.types.ts) for the 8 hand-authorable node primitives ONLY, while the 14
// migration-only widgets kept using `AnimationLayer`/`legacyAnimation`/
// `presetRegistry.ts` unchanged — two independent, parallel animation systems by
// design at the time.
//
// As of Motion System Unification (Phase 5), that old system is GONE — deleted in
// full, along with every widget that used to depend on it. `AnimationTimeline` (this
// file) is now the SOLE animation model in this codebase; there is no second, parallel
// system left to keep separate from. The rest of this file's field-level docs below
// are still accurate and describe the current, only animation model.
export const EAnimationTrigger = { ON_LOAD: 'onLoad', ON_SCROLL: 'onScroll' } as const;
export type EAnimationTrigger = (typeof EAnimationTrigger)[keyof typeof EAnimationTrigger];

export const EAnimationProperty = { OPACITY: 'opacity', X: 'x', Y: 'y', SCALE: 'scale', ROTATION: 'rotation' } as const;
export type EAnimationProperty = (typeof EAnimationProperty)[keyof typeof EAnimationProperty];

export interface AnimationKeyframe {
    /** Stable key for the Inspector's add/remove/reorder list UI — NOT a separate
     * server-side id, purely a client-side React/Solid <For> key so removing/adding a
     * step elsewhere in the list doesn't cause other steps to remount and lose focus. */
    id: string;
    /** Optional sub-element inside a composite node (same convention as the old
     * `AnimationLayer.target` — e.g. 'image'/'heading'/'body'). Resolved at render time
     * via `el.querySelector('[data-anim-target="<target>"]')`. Omit to animate the
     * node's own root element. */
    target?: string;
    property: EAnimationProperty;
    /** Optional — GSAP's `.to()` keeps the CURRENT value as the start point when `from`
     * is omitted, so this is only needed when the admin wants an explicit starting value
     * different from whatever the element currently has. */
    from?: number;
    to: number;
    /** Seconds. */
    duration: number;
    /** Seconds — an ABSOLUTE offset from the start of the whole timeline (not relative
     * to the previous step), so the Inspector can show "this step starts at 0.4s"
     * without the admin needing to understand GSAP's relative position-parameter
     * strings (`+=0.2`, `<`, labels, etc.). */
    delay?: number;
    /** Raw GSAP ease string (e.g. 'power2.out', 'back.out(1.7)') — free text, not
     * validated: GSAP itself silently falls back to a default ease on an invalid
     * string rather than throwing, so there's nothing unsafe about accepting anything
     * here. */
    easing?: string;
    /** Seconds between each matched element's start time, when `target` (or, if unset, the
     * root's own children) resolves to MULTIPLE elements — GSAP's native stagger option.
     * Omit for the existing single-element behavior (querySelector, not querySelectorAll). */
    stagger?: number;
}

export interface AnimationTimeline {
    keyframes: AnimationKeyframe[];
    trigger: EAnimationTrigger;
    /** GSAP ScrollTrigger `start` value (e.g. 'top 85%') — only meaningful when
     * `trigger === 'onScroll'`. */
    scrollStart?: string;
    /** true = replay every time the trigger condition is met again (matches the old
     * `AnimationLayer.trigger === 'repeat'` semantics); false/undefined = play once. */
    repeat?: boolean;
    /** false = fully skip this animation under the same 768px mobile breakpoint this
     * codebase has used since Phase 1 (kept as a literal here rather than importing it
     * from elsewhere — the now-deleted `useAnimate.ts` used the same threshold
     * historically, back when that was a second, separate animation system; see Task 2). */
    mobileEnabled?: boolean;
}
