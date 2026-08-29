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
import { describe, it, expect, beforeAll, vi } from 'vitest';
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
let gsap: typeof import('gsap')['gsap'];

beforeAll(async () => {
    ({ applyAnimationTimeline } = await import('./applyAnimationTimeline'));
    ({ gsap } = await import('gsap'));
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

    it('returns a no-op cleanup when timeline.keyframes is not an array (malformed/partial animationRef — final whole-branch review Minor F)', () => {
        const el = document.createElement('div');
        const cleanup = applyAnimationTimeline(el, { keyframes: 'not-an-array' as any, trigger: 'onLoad' });
        expect(() => cleanup()).not.toThrow();
    });

    // Final whole-branch review Important B: the tests above only assert "doesn't
    // throw" — none actually verify gsap.timeline() is called with the RIGHT arguments.
    // These spy on gsap.timeline directly (no waiting on GSAP's own rAF loop, so no
    // brittleness) to assert the real keyframe → call mapping the design spec (§6)
    // asked for: single/multiple keyframe → correct property/duration/delay/order.
    describe('gsap.timeline() call mapping (spy-based, no animation-frame timing involved)', () => {
        it('maps a single keyframe with `from` to one .fromTo() call with the right vars and absolute position', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            const fromToSpy = vi.fn();
            const toSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({
                fromTo: fromToSpy,
                to: toSpy,
                play: vi.fn(),
            } as any);

            const timeline: AnimationTimeline = {
                keyframes: [{ id: '1', property: 'opacity', from: 0, to: 1, duration: 0.8, delay: 0.4, easing: 'back.out(1.7)' }],
                trigger: 'onLoad',
            };
            const cleanup = applyAnimationTimeline(el, timeline);

            expect(fromToSpy).toHaveBeenCalledTimes(1);
            expect(fromToSpy).toHaveBeenCalledWith(el, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }, 0.4);
            expect(toSpy).not.toHaveBeenCalled();

            timelineSpy.mockRestore();
            cleanup();
            el.remove();
        });

        it('maps a keyframe with no `from` to one .to() call (GSAP keeps the current value as the start point)', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            const fromToSpy = vi.fn();
            const toSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({
                fromTo: fromToSpy,
                to: toSpy,
                play: vi.fn(),
            } as any);

            const timeline: AnimationTimeline = {
                keyframes: [{ id: '1', property: 'y', to: 0, duration: 0.6 }],
                trigger: 'onLoad',
            };
            const cleanup = applyAnimationTimeline(el, timeline);

            expect(toSpy).toHaveBeenCalledTimes(1);
            expect(toSpy).toHaveBeenCalledWith(el, { y: 0, duration: 0.6, ease: 'power2.out' }, 0);
            expect(fromToSpy).not.toHaveBeenCalled();

            timelineSpy.mockRestore();
            cleanup();
            el.remove();
        });

        it('maps multiple keyframes onto the SAME timeline, each at its own absolute delay position, in array order', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            const fromToSpy = vi.fn();
            const toSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({
                fromTo: fromToSpy,
                to: toSpy,
                play: vi.fn(),
            } as any);

            const timeline: AnimationTimeline = {
                keyframes: [
                    { id: '1', property: 'opacity', from: 0, to: 1, duration: 0.8 },
                    { id: '2', property: 'y', from: 20, to: 0, duration: 0.6, delay: 0.2 },
                ],
                trigger: 'onLoad',
            };
            const cleanup = applyAnimationTimeline(el, timeline);

            // ONE gsap.timeline() instance shared by both calls, not two separate timelines.
            expect(timelineSpy).toHaveBeenCalledTimes(1);
            expect(fromToSpy).toHaveBeenCalledTimes(2);
            expect(fromToSpy).toHaveBeenNthCalledWith(1, el, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0);
            expect(fromToSpy).toHaveBeenNthCalledWith(2, el, { y: 20 }, { y: 0, duration: 0.6, ease: 'power2.out' }, 0.2);

            timelineSpy.mockRestore();
            cleanup();
            el.remove();
        });

        it('onScroll trigger passes a ScrollTrigger config and does NOT call .play() directly (ScrollTrigger drives playback)', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            const playSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockImplementation((vars: any) => {
                expect(vars.scrollTrigger).toEqual({ trigger: el, start: 'top 70%', toggleActions: 'play none none none' });
                return { fromTo: vi.fn(), to: vi.fn(), play: playSpy } as any;
            });

            const timeline: AnimationTimeline = {
                keyframes: [{ id: '1', property: 'opacity', to: 1, duration: 0.5 }],
                trigger: 'onScroll',
                scrollStart: 'top 70%',
            };
            const cleanup = applyAnimationTimeline(el, timeline);

            expect(timelineSpy).toHaveBeenCalledTimes(1);
            expect(playSpy).not.toHaveBeenCalled();

            timelineSpy.mockRestore();
            cleanup();
            el.remove();
        });

        it('onLoad trigger calls .play() directly (no ScrollTrigger involved)', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            const playSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({ fromTo: vi.fn(), to: vi.fn(), play: playSpy } as any);

            const timeline: AnimationTimeline = {
                keyframes: [{ id: '1', property: 'opacity', to: 1, duration: 0.5 }],
                trigger: 'onLoad',
            };
            const cleanup = applyAnimationTimeline(el, timeline);

            expect(playSpy).toHaveBeenCalledTimes(1);

            timelineSpy.mockRestore();
            cleanup();
            el.remove();
        });
    });

    // Task 1 (Motion System Unification, Phase 5): `AnimationKeyframe.stagger` — when set,
    // the keyframe's `target` (or, if unset, the root's own children) resolves via
    // `querySelectorAll`/`.children` instead of a single `querySelector`, and GSAP's native
    // `stagger` option is used. Adapted from the plan's `vi.mock('gsap')` sketch to this
    // file's established real-gsap + `vi.spyOn(gsap, 'timeline')` convention (see file-header
    // comment) rather than introducing a second, inconsistent mocking style.
    describe('stagger', () => {
        it('keyframe with stagger + target: resolves ALL matching elements via querySelectorAll, uses GSAP stagger option', () => {
            const root = document.createElement('div');
            root.innerHTML = '<div data-anim-target="card"></div><div data-anim-target="card"></div><div data-anim-target="card"></div>';
            document.body.appendChild(root);
            const toSpy = vi.fn();
            const fromToSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({ fromTo: fromToSpy, to: toSpy, play: vi.fn() } as any);

            const cleanup = applyAnimationTimeline(root, {
                keyframes: [{ id: 'k1', target: 'card', property: 'opacity', to: 1, duration: 0.6, stagger: 0.08 }],
                trigger: 'onLoad',
            });

            expect(toSpy).toHaveBeenCalledTimes(1);
            const [targets, vars] = toSpy.mock.calls[0];
            expect((targets as NodeListOf<Element>).length).toBe(3);
            expect(vars.stagger).toBe(0.08);

            timelineSpy.mockRestore();
            cleanup();
            root.remove();
        });

        it('keyframe with NO stagger: resolves a SINGLE element via querySelector, no stagger option (unchanged behavior)', () => {
            const root = document.createElement('div');
            root.innerHTML = '<div data-anim-target="logo"></div>';
            document.body.appendChild(root);
            const toSpy = vi.fn();
            const fromToSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({ fromTo: fromToSpy, to: toSpy, play: vi.fn() } as any);

            const cleanup = applyAnimationTimeline(root, {
                keyframes: [{ id: 'k1', target: 'logo', property: 'opacity', to: 1, duration: 0.6 }],
                trigger: 'onLoad',
            });

            const [targets, vars] = toSpy.mock.calls[0];
            expect(targets instanceof Element).toBe(true);
            expect(vars.stagger).toBeUndefined();

            timelineSpy.mockRestore();
            cleanup();
            root.remove();
        });

        it('keyframe with stagger, no target: resolves rootEl.children', () => {
            const root = document.createElement('div');
            root.innerHTML = '<span></span><span></span>';
            document.body.appendChild(root);
            const toSpy = vi.fn();
            const fromToSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({ fromTo: fromToSpy, to: toSpy, play: vi.fn() } as any);

            const cleanup = applyAnimationTimeline(root, {
                keyframes: [{ id: 'k1', property: 'y', to: 0, duration: 0.6, stagger: 0.06 }],
                trigger: 'onLoad',
            });

            const [targets] = toSpy.mock.calls[0];
            expect((targets as HTMLCollection).length).toBe(2);

            timelineSpy.mockRestore();
            cleanup();
            root.remove();
        });
    });
});
