// src/modules/cms/node/animationTimeline.types.ts
//
// Phase 4 (Animation Timeline) — the real keyframe model the roadmap's charter asks
// for, replacing the single-preset `AnimationLayer` (cms.types.ts) for the 8
// hand-authorable node primitives ONLY. The 14 migration-only widgets keep using
// `AnimationLayer`/`legacyAnimation`/`presetRegistry.ts` unchanged forever — these are
// two independent, parallel animation systems by design (see this plan's Global
// Constraints), not a replacement of the old one.
export type AnimationProperty = 'opacity' | 'x' | 'y' | 'scale' | 'rotation';

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
    property: AnimationProperty;
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
    trigger: 'onLoad' | 'onScroll';
    /** GSAP ScrollTrigger `start` value (e.g. 'top 85%') — only meaningful when
     * `trigger === 'onScroll'`. */
    scrollStart?: string;
    /** true = replay every time the trigger condition is met again (matches the old
     * `AnimationLayer.trigger === 'repeat'` semantics); false/undefined = play once. */
    repeat?: boolean;
    /** false = fully skip this animation under the same 768px mobile breakpoint
     * `useAnimate.ts` already uses (kept as a literal here rather than importing that
     * module, since this is a deliberately separate system — see Task 2). */
    mobileEnabled?: boolean;
}
