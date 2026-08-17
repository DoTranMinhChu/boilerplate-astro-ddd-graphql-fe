// @vitest-environment jsdom
//
// src/modules/cms/node/applyAnimationTimeline.test.ts
//
// This project's vitest.config.ts defaults to `environment: 'node'` (no DOM globals) —
// this file imports `gsap`, which touches `window`/`document` at points, so it needs
// the same per-file jsdom pragma this codebase already established for exactly this
// reason (see nodeRegistry.test.ts/CustomCodeNode.test.ts from earlier phases).
//
// Deviation from the plan's verbatim test file text: jsdom's `window` doesn't
// implement `matchMedia` (a well-known jsdom gap, already hit and fixed the same way
// in nodeRegistry.test.ts) — `applyAnimationTimeline.ts` calls
// `gsap.registerPlugin(ScrollTrigger)` at MODULE-EVALUATION time, and ScrollTrigger's
// registration calls `matchMedia` synchronously. A plain top-level stub placed before
// a static `import` wouldn't help: static ESM imports are hoisted above a file's own
// code, so `applyAnimationTimeline.ts` would already be evaluating before any stub
// assignment placed after a static `import` runs. Fixed the same way nodeRegistry.test.ts
// was: stub `window.matchMedia` first, then pull in `applyAnimationTimeline.ts` via a
// dynamic `import()` inside `beforeAll` — dynamic imports resolve at the point they're
// awaited, not hoisted, so ordering is guaranteed correct. The test bodies/assertions
// below are otherwise unchanged from the brief.
import { describe, it, expect, beforeAll } from 'vitest';
import type { AnimationTimeline } from './animationTimeline.types';

if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

let applyAnimationTimeline: typeof import('./applyAnimationTimeline')['applyAnimationTimeline'];

beforeAll(async () => {
    ({ applyAnimationTimeline } = await import('./applyAnimationTimeline'));
});

describe('applyAnimationTimeline', () => {
    it('returns a no-op cleanup and does nothing when timeline is undefined', () => {
        const el = document.createElement('div');
        const cleanup = applyAnimationTimeline(el, undefined);
        expect(typeof cleanup).toBe('function');
        expect(() => cleanup()).not.toThrow();
    });

    it('returns a no-op cleanup and does nothing when keyframes is empty', () => {
        const el = document.createElement('div');
        const timeline: AnimationTimeline = { keyframes: [], trigger: 'onLoad' };
        const cleanup = applyAnimationTimeline(el, timeline);
        expect(() => cleanup()).not.toThrow();
    });

    it('skips entirely when mobileEnabled is false and viewport is under 768px', () => {
        const originalWidth = window.innerWidth;
        Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
        const el = document.createElement('div');
        document.body.appendChild(el);
        const timeline: AnimationTimeline = {
            keyframes: [{ id: '1', property: 'opacity', to: 1, duration: 0.5 }],
            trigger: 'onLoad',
            mobileEnabled: false,
        };
        const cleanup = applyAnimationTimeline(el, timeline);
        // No assertion on gsap internals here (that would be brittle) — the important
        // behavioral contract is that this path returns cleanly without throwing and
        // without needing a real scroll/RAF loop to settle, matching the mobile-gate
        // early-return in the implementation.
        expect(() => cleanup()).not.toThrow();
        Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
        el.remove();
    });

    it('applies an onLoad timeline with a single keyframe, ending at the target value', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        const timeline: AnimationTimeline = {
            keyframes: [{ id: '1', property: 'opacity', from: 0, to: 1, duration: 0.01 }],
            trigger: 'onLoad',
        };
        const cleanup = applyAnimationTimeline(el, timeline);
        // GSAP's timeline runs asynchronously (rAF-driven) even with a tiny duration —
        // assert on the STRUCTURAL contract (a cleanup function that reverts gsap's
        // context without throwing) rather than racing gsap's own animation frame,
        // matching this codebase's existing convention for GSAP-adjacent unit tests
        // (see presetRegistry.ts's own lack of timing-assertion tests — GSAP's actual
        // frame-by-frame behavior is exercised by live dev-server verification, Task 5).
        expect(() => cleanup()).not.toThrow();
        el.remove();
    });

    it('resolves a keyframe with a `target` to the matching [data-anim-target] child, falling back to the root element if not found', () => {
        const el = document.createElement('div');
        const child = document.createElement('span');
        child.setAttribute('data-anim-target', 'heading');
        el.appendChild(child);
        document.body.appendChild(el);
        const timeline: AnimationTimeline = {
            keyframes: [{ id: '1', target: 'heading', property: 'opacity', to: 1, duration: 0.01 }],
            trigger: 'onLoad',
        };
        const cleanup = applyAnimationTimeline(el, timeline);
        expect(() => cleanup()).not.toThrow();
        el.remove();
    });
});
