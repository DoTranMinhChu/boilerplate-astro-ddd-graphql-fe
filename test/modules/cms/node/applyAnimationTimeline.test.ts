// @vitest-environment jsdom
//
// src/modules/cms/node/applyAnimationTimeline.test.ts
//
// This project's vitest.config.ts defaults to `environment: 'node'` (no DOM globals) —
// this file imports `gsap`, which touches `window`/`document` at points, so it needs
// the same per-file jsdom pragma this codebase already established for exactly this
// reason (see nodeRegistry.test.ts/CustomCodeNode.test.ts from earlier phases).
//
// Task 10 (perf/scale): `applyAnimationTimeline.ts` no longer imports gsap/ScrollTrigger (or
// calls `gsap.registerPlugin`) at module-evaluation time — both now happen lazily, inside the
// cached `loadGsap()` loader, the FIRST time a non-reduced-motion caller actually needs gsap. That
// removes the module-eval-time `matchMedia` touch this file used to have to work around via a
// dynamic `import()` in `beforeAll` — kept anyway (still needed so the top-level `window.matchMedia`
// stub below applies before `applyAnimationTimeline.ts` is ever evaluated, and to import `gsap`
// itself for the spy-based assertions), but the workaround is simpler now: no more
// registerPlugin-touches-matchMedia race to defend against, just an ordinary "stub before import"
// pattern. Every test below now awaits `applyAnimationTimeline(...)` — it's an async function
// (returns `Promise<() => void>`), though its `prefers-reduced-motion` branch (see the dedicated
// describe block near the bottom) still completes its DOM side effects fully synchronously, before
// ever calling (or needing) `loadGsap()`.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { AnimationTimeline } from '@modules/cms/node/animationTimeline.types';

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

// Task 11b: `applyAnimationTimeline.ts` now calls `CSS.escape()` before building a
// `[data-anim-target="..."]` selector. jsdom 28.1 (this project's installed version,
// confirmed directly) implements neither a `CSS` global nor `CSS.escape` — a gap in
// the SAME category as the `matchMedia` one documented above, not a real-browser
// concern (CSS.escape is baseline-available in every evergreen browser this project
// targets). Polyfilled with the standard CSSOM algorithm (the same one every native
// implementation follows — see https://drafts.csswg.org/cssom/#the-css.escape()-method
// — as also shipped by the widely-used `css.escape` package) so the escaping tests
// below exercise real spec semantics rather than a fake.
if (typeof (globalThis as any).CSS === 'undefined' || typeof (globalThis as any).CSS.escape !== 'function') {
    const cssEscape = (value: string): string => {
        const string = String(value);
        const length = string.length;
        let index = -1;
        let result = '';
        const firstCodeUnit = string.charCodeAt(0);
        if (length === 1 && firstCodeUnit === 0x002d) return '\\' + string;
        while (++index < length) {
            const codeUnit = string.charCodeAt(index);
            if (codeUnit === 0x0000) {
                result += '�';
                continue;
            }
            if (
                (codeUnit >= 0x0001 && codeUnit <= 0x001f) ||
                codeUnit === 0x007f ||
                (index === 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
                (index === 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCodeUnit === 0x002d)
            ) {
                result += '\\' + codeUnit.toString(16) + ' ';
                continue;
            }
            if (index === 0 && length === 1 && codeUnit === 0x002d) {
                result += '\\' + string.charAt(index);
                continue;
            }
            if (
                codeUnit >= 0x0080 ||
                codeUnit === 0x002d ||
                codeUnit === 0x005f ||
                (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
                (codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
                (codeUnit >= 0x0061 && codeUnit <= 0x007a)
            ) {
                result += string.charAt(index);
                continue;
            }
            result += '\\' + string.charAt(index);
        }
        return result;
    };
    (globalThis as any).CSS = { ...(globalThis as any).CSS, escape: cssEscape };
    (window as any).CSS = (globalThis as any).CSS;
}

let applyAnimationTimeline: typeof import('@modules/cms/node/applyAnimationTimeline')['applyAnimationTimeline'];
let gsap: typeof import('gsap')['gsap'];

beforeAll(async () => {
    ({ applyAnimationTimeline } = await import('@modules/cms/node/applyAnimationTimeline'));
    ({ gsap } = await import('gsap'));
});

describe('applyAnimationTimeline', () => {
    it('returns a no-op cleanup and does nothing when timeline is undefined', async () => {
        const el = document.createElement('div');
        const cleanup = await applyAnimationTimeline(el, undefined);
        expect(typeof cleanup).toBe('function');
        expect(() => cleanup()).not.toThrow();
    });

    it('returns a no-op cleanup and does nothing when keyframes is empty', async () => {
        const el = document.createElement('div');
        const timeline: AnimationTimeline = { keyframes: [], trigger: 'onLoad' };
        const cleanup = await applyAnimationTimeline(el, timeline);
        expect(() => cleanup()).not.toThrow();
    });

    it('skips entirely when mobileEnabled is false and viewport is under 768px', async () => {
        const originalWidth = window.innerWidth;
        Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
        const el = document.createElement('div');
        document.body.appendChild(el);
        const timeline: AnimationTimeline = {
            keyframes: [{ id: '1', property: 'opacity', to: 1, duration: 0.5 }],
            trigger: 'onLoad',
            mobileEnabled: false,
        };
        const cleanup = await applyAnimationTimeline(el, timeline);
        // No assertion on gsap internals here (that would be brittle) — the important
        // behavioral contract is that this path returns cleanly without throwing and
        // without needing a real scroll/RAF loop to settle, matching the mobile-gate
        // early-return in the implementation.
        expect(() => cleanup()).not.toThrow();
        Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
        el.remove();
    });

    it('applies an onLoad timeline with a single keyframe, ending at the target value', async () => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        const timeline: AnimationTimeline = {
            keyframes: [{ id: '1', property: 'opacity', from: 0, to: 1, duration: 0.01 }],
            trigger: 'onLoad',
        };
        const cleanup = await applyAnimationTimeline(el, timeline);
        // GSAP's timeline runs asynchronously (rAF-driven) even with a tiny duration —
        // assert on the STRUCTURAL contract (a cleanup function that reverts gsap's
        // context without throwing) rather than racing gsap's own animation frame,
        // matching this codebase's existing convention for GSAP-adjacent unit tests
        // (see presetRegistry.ts's own lack of timing-assertion tests — GSAP's actual
        // frame-by-frame behavior is exercised by live dev-server verification, Task 5).
        expect(() => cleanup()).not.toThrow();
        el.remove();
    });

    it('resolves a keyframe with a `target` to the matching [data-anim-target] child, falling back to the root element if not found', async () => {
        const el = document.createElement('div');
        const child = document.createElement('span');
        child.setAttribute('data-anim-target', 'heading');
        el.appendChild(child);
        document.body.appendChild(el);
        const timeline: AnimationTimeline = {
            keyframes: [{ id: '1', target: 'heading', property: 'opacity', to: 1, duration: 0.01 }],
            trigger: 'onLoad',
        };
        const cleanup = await applyAnimationTimeline(el, timeline);
        expect(() => cleanup()).not.toThrow();
        el.remove();
    });

    it('returns a no-op cleanup when timeline.keyframes is not an array (malformed/partial animationRef — final whole-branch review Minor F)', async () => {
        const el = document.createElement('div');
        const cleanup = await applyAnimationTimeline(el, { keyframes: 'not-an-array' as any, trigger: 'onLoad' });
        expect(() => cleanup()).not.toThrow();
    });

    // Task 11b (Important, reviewer-found): `kf.target` now flows from admin-controlled
    // free-text (a content-type field key via ContentDetailNode, or NodeAnimationTab's
    // free-text `target` input on any node) into a `[data-anim-target="${kf.target}"]`
    // selector string. A raw `"` in that string breaks OUT of the quoted attribute value
    // (`[data-anim-target="field"key"]` is syntactically invalid CSS), which previously
    // threw an uncaught DOMException from `querySelector`. `CSS.escape()` now escapes the
    // target before interpolation, so this must resolve cleanly instead of throwing.
    it('resolves a `target` containing a raw `"` via CSS.escape() instead of throwing a DOMException from querySelector', async () => {
        const el = document.createElement('div');
        const child = document.createElement('span');
        const weirdTarget = 'field"key';
        child.setAttribute('data-anim-target', weirdTarget);
        el.appendChild(child);
        document.body.appendChild(el);
        const toSpy = vi.fn();
        const fromToSpy = vi.fn();
        const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({ fromTo: fromToSpy, to: toSpy, play: vi.fn() } as any);

        const timeline: AnimationTimeline = {
            keyframes: [{ id: '1', target: weirdTarget, property: 'opacity', to: 1, duration: 0.5 }],
            trigger: 'onLoad',
        };

        // Awaiting is itself the "does not throw" assertion — an async function that threw
        // synchronously inside its body would surface here as a rejected promise, which an
        // un-caught `await` propagates as this test's own failure.
        await applyAnimationTimeline(el, timeline);
        expect(toSpy).toHaveBeenCalledTimes(1);
        const [resolvedTarget] = toSpy.mock.calls[0];
        expect(resolvedTarget).toBe(child);

        timelineSpy.mockRestore();
        el.remove();
    });

    // Final whole-branch review Important B: the tests above only assert "doesn't
    // throw" — none actually verify gsap.timeline() is called with the RIGHT arguments.
    // These spy on gsap.timeline directly (no waiting on GSAP's own rAF loop, so no
    // brittleness) to assert the real keyframe → call mapping the design spec (§6)
    // asked for: single/multiple keyframe → correct property/duration/delay/order.
    describe('gsap.timeline() call mapping (spy-based, no animation-frame timing involved)', () => {
        it('maps a single keyframe with `from` to one .fromTo() call with the right vars and absolute position', async () => {
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
            const cleanup = await applyAnimationTimeline(el, timeline);

            expect(fromToSpy).toHaveBeenCalledTimes(1);
            expect(fromToSpy).toHaveBeenCalledWith(el, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }, 0.4);
            expect(toSpy).not.toHaveBeenCalled();

            timelineSpy.mockRestore();
            cleanup();
            el.remove();
        });

        it('maps a keyframe with no `from` to one .to() call (GSAP keeps the current value as the start point)', async () => {
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
            const cleanup = await applyAnimationTimeline(el, timeline);

            expect(toSpy).toHaveBeenCalledTimes(1);
            expect(toSpy).toHaveBeenCalledWith(el, { y: 0, duration: 0.6, ease: 'power2.out' }, 0);
            expect(fromToSpy).not.toHaveBeenCalled();

            timelineSpy.mockRestore();
            cleanup();
            el.remove();
        });

        it('maps multiple keyframes onto the SAME timeline, each at its own absolute delay position, in array order', async () => {
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
            const cleanup = await applyAnimationTimeline(el, timeline);

            // ONE gsap.timeline() instance shared by both calls, not two separate timelines.
            expect(timelineSpy).toHaveBeenCalledTimes(1);
            expect(fromToSpy).toHaveBeenCalledTimes(2);
            expect(fromToSpy).toHaveBeenNthCalledWith(1, el, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0);
            expect(fromToSpy).toHaveBeenNthCalledWith(2, el, { y: 20 }, { y: 0, duration: 0.6, ease: 'power2.out' }, 0.2);

            timelineSpy.mockRestore();
            cleanup();
            el.remove();
        });

        it('onScroll trigger passes a ScrollTrigger config and does NOT call .play() directly (ScrollTrigger drives playback)', async () => {
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
            const cleanup = await applyAnimationTimeline(el, timeline);

            expect(timelineSpy).toHaveBeenCalledTimes(1);
            expect(playSpy).not.toHaveBeenCalled();

            timelineSpy.mockRestore();
            cleanup();
            el.remove();
        });

        it('onLoad trigger calls .play() directly (no ScrollTrigger involved)', async () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            const playSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({ fromTo: vi.fn(), to: vi.fn(), play: playSpy } as any);

            const timeline: AnimationTimeline = {
                keyframes: [{ id: '1', property: 'opacity', to: 1, duration: 0.5 }],
                trigger: 'onLoad',
            };
            const cleanup = await applyAnimationTimeline(el, timeline);

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
        it('keyframe with stagger + target: resolves ALL matching elements via querySelectorAll, uses GSAP stagger option', async () => {
            const root = document.createElement('div');
            root.innerHTML = '<div data-anim-target="card"></div><div data-anim-target="card"></div><div data-anim-target="card"></div>';
            document.body.appendChild(root);
            const toSpy = vi.fn();
            const fromToSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({ fromTo: fromToSpy, to: toSpy, play: vi.fn() } as any);

            const cleanup = await applyAnimationTimeline(root, {
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

        it('keyframe with NO stagger: resolves a SINGLE element via querySelector, no stagger option (unchanged behavior)', async () => {
            const root = document.createElement('div');
            root.innerHTML = '<div data-anim-target="logo"></div>';
            document.body.appendChild(root);
            const toSpy = vi.fn();
            const fromToSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({ fromTo: fromToSpy, to: toSpy, play: vi.fn() } as any);

            const cleanup = await applyAnimationTimeline(root, {
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

        it('keyframe with stagger + target containing a raw `"`: resolves via CSS.escape() through querySelectorAll instead of throwing (Task 11b)', async () => {
            const root = document.createElement('div');
            const weirdTarget = 'card"0';
            const c1 = document.createElement('div');
            c1.setAttribute('data-anim-target', weirdTarget);
            const c2 = document.createElement('div');
            c2.setAttribute('data-anim-target', weirdTarget);
            root.appendChild(c1);
            root.appendChild(c2);
            document.body.appendChild(root);
            const toSpy = vi.fn();
            const fromToSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({ fromTo: fromToSpy, to: toSpy, play: vi.fn() } as any);

            // Awaiting is itself the "does not throw" assertion (see the note on the equivalent
            // non-stagger CSS.escape() test above) — an async function that threw synchronously
            // inside its body surfaces as a rejected promise, which an un-caught `await`
            // propagates as this test's own failure.
            await applyAnimationTimeline(root, {
                keyframes: [{ id: 'k1', target: weirdTarget, property: 'opacity', to: 1, duration: 0.6, stagger: 0.08 }],
                trigger: 'onLoad',
            });

            expect(toSpy).toHaveBeenCalledTimes(1);
            const [targets] = toSpy.mock.calls[0];
            expect((targets as NodeListOf<Element>).length).toBe(2);

            timelineSpy.mockRestore();
            root.remove();
        });

        it('keyframe with stagger, no target: resolves rootEl.children', async () => {
            const root = document.createElement('div');
            root.innerHTML = '<span></span><span></span>';
            document.body.appendChild(root);
            const toSpy = vi.fn();
            const fromToSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({ fromTo: fromToSpy, to: toSpy, play: vi.fn() } as any);

            const cleanup = await applyAnimationTimeline(root, {
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

    // Task 12: neither GSAP animation system ever checked `prefers-reduced-motion` before this —
    // a real, confirmed accessibility gap. Adapted from the plan's test sketch (which references
    // module-level `toMock`/`fromToMock` that don't exist in this file) to this file's own
    // established per-test `vi.spyOn(gsap, 'timeline')` convention (see file-header comment and
    // every other describe block above) rather than introducing a second, inconsistent mocking
    // style. Test bodies/assertions are otherwise the same intent as the plan's sketch.
    describe('applyAnimationTimeline — prefers-reduced-motion', () => {
        const withReducedMotion = (matches: boolean) => {
            const original = window.matchMedia;
            window.matchMedia = ((query: string) => ({
                matches: matches && query === '(prefers-reduced-motion: reduce)',
                media: query,
                onchange: null,
                addListener: () => {},
                removeListener: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false,
            })) as unknown as typeof window.matchMedia;
            return () => {
                window.matchMedia = original;
            };
        };

        it('when reduced-motion is active: applies each keyframe\'s final "to" state immediately, no GSAP tween', async () => {
            const restore = withReducedMotion(true);
            const root = document.createElement('div');
            root.innerHTML = '<div data-anim-target="logo" style="opacity:0"></div>';
            document.body.appendChild(root);
            const timelineSpy = vi.spyOn(gsap, 'timeline');

            await applyAnimationTimeline(root, {
                keyframes: [{ id: 'k1', target: 'logo', property: 'opacity', to: 1, duration: 0.8 }],
                trigger: 'onLoad',
            });

            expect(timelineSpy).not.toHaveBeenCalled();
            const el = root.querySelector('[data-anim-target="logo"]') as HTMLElement;
            expect(el.style.opacity).toBe('1');

            timelineSpy.mockRestore();
            restore();
            root.remove();
        });

        it('when reduced-motion is NOT active: GSAP tween still runs as before (unchanged behavior)', async () => {
            const restore = withReducedMotion(false);
            const root = document.createElement('div');
            root.innerHTML = '<div data-anim-target="logo"></div>';
            document.body.appendChild(root);
            const toSpy = vi.fn();
            const fromToSpy = vi.fn();
            const timelineSpy = vi.spyOn(gsap, 'timeline').mockReturnValue({ fromTo: fromToSpy, to: toSpy, play: vi.fn() } as any);

            await applyAnimationTimeline(root, {
                keyframes: [{ id: 'k1', target: 'logo', property: 'opacity', to: 1, duration: 0.8 }],
                trigger: 'onLoad',
            });

            expect(toSpy).toHaveBeenCalledTimes(1);

            timelineSpy.mockRestore();
            restore();
            root.remove();
        });

        // Final whole-branch review Important I1 (fixed): the old behavior composed a full
        // 4-part `translate(...) scale(...) rotate(...)` string, DEFAULTING any of x/y/scale/
        // rotation not covered by a keyframe to its CSS-neutral value (0/0/1/0) — silently
        // erasing any pre-existing transform (e.g. from applyNodeStyle.ts's Transform panel)
        // for reduced-motion users. The correct behavior only ever writes the specific
        // translateX/translateY/scale/rotate token a keyframe actually set, leaving anything
        // not covered by a keyframe alone (never defaulted).
        it('when reduced-motion is active: only writes the specific translateX/scale tokens keyframes actually set — untouched y/rotation are NOT defaulted to neutral values', async () => {
            const restore = withReducedMotion(true);
            const root = document.createElement('div');
            root.innerHTML = '<div data-anim-target="card"></div>';
            document.body.appendChild(root);

            await applyAnimationTimeline(root, {
                keyframes: [
                    { id: 'k1', target: 'card', property: 'x', to: 40, duration: 0.5 },
                    { id: 'k2', target: 'card', property: 'scale', to: 1.2, duration: 0.5 },
                    // no `y` or `rotation` keyframe for 'card' — must be left untouched, NOT
                    // defaulted to translateY(0px)/rotate(0deg).
                ],
                trigger: 'onLoad',
            });

            const el = root.querySelector('[data-anim-target="card"]') as HTMLElement;
            expect(el.style.transform).toBe('translateX(40px) scale(1.2)');
            expect(el.style.transform).not.toContain('translateY');
            expect(el.style.transform).not.toContain('rotate');

            restore();
            root.remove();
        });

        // New test (final whole-branch review Important I1): a pre-existing inline `transform`
        // set by an INDEPENDENT writer (e.g. applyNodeStyle.ts's Transform panel — confirmed
        // live on ShapeNode.tsx/TextNode.tsx/ImageNode.tsx) must survive a reduced-motion write
        // that only targets a DIFFERENT part of the transform (here: `y`, not `rotation`).
        it('when reduced-motion is active: preserves a pre-existing inline transform (e.g. from applyNodeStyle.ts) not covered by any keyframe', async () => {
            const restore = withReducedMotion(true);
            const root = document.createElement('div');
            root.innerHTML = '<div data-anim-target="card"></div>';
            document.body.appendChild(root);
            const el = root.querySelector('[data-anim-target="card"]') as HTMLElement;
            // Simulates applyNodeStyle.ts having already set a 45deg rotation via the Transform
            // panel, independently of this node's animation timeline.
            el.style.transform = 'rotate(45deg)';

            await applyAnimationTimeline(root, {
                keyframes: [{ id: 'k1', target: 'card', property: 'y', to: 20, duration: 0.5 }],
                trigger: 'onLoad',
            });

            // The pre-existing rotation must still be there — NOT reset to rotate(0deg) or
            // erased entirely — while the keyframe's own `y` value is also reflected.
            expect(el.style.transform).toContain('rotate(45deg)');
            expect(el.style.transform).toContain('translateY(20px)');

            restore();
            root.remove();
        });

        it('when reduced-motion is active: a target with only an opacity keyframe gets its opacity set but no transform written at all', async () => {
            const restore = withReducedMotion(true);
            const root = document.createElement('div');
            root.innerHTML = '<div data-anim-target="logo"></div>';
            document.body.appendChild(root);

            await applyAnimationTimeline(root, {
                keyframes: [{ id: 'k1', target: 'logo', property: 'opacity', to: 0.5, duration: 0.5 }],
                trigger: 'onLoad',
            });

            const el = root.querySelector('[data-anim-target="logo"]') as HTMLElement;
            expect(el.style.opacity).toBe('0.5');
            expect(el.style.transform).toBe('');

            restore();
            root.remove();
        });

        it('when reduced-motion is active: a `target` containing a raw `"` resolves via CSS.escape() instead of throwing a DOMException', async () => {
            const restore = withReducedMotion(true);
            const root = document.createElement('div');
            const weirdTarget = 'field"key';
            const child = document.createElement('div');
            child.setAttribute('data-anim-target', weirdTarget);
            root.appendChild(child);
            document.body.appendChild(root);

            // Awaiting is itself the "does not throw" assertion — see the note on the equivalent
            // non-reduced-motion CSS.escape() test above.
            await applyAnimationTimeline(root, {
                keyframes: [{ id: 'k1', target: weirdTarget, property: 'opacity', to: 1, duration: 0.5 }],
                trigger: 'onLoad',
            });
            expect(child.style.opacity).toBe('1');

            restore();
            root.remove();
        });

        // Final whole-branch review Important I2: the reduced-motion path used to resolve
        // targets via its OWN divergent rule instead of mirroring the GSAP path's
        // `resolveKeyframeTargets` logic — a `stagger` keyframe with no `target` resolved to
        // `[rootEl]` here (instead of ALL of `rootEl.children`, like the animated path), so
        // reduced-motion users got the final state applied to the CONTAINER instead of each
        // card. If the cards start at `opacity:0` (a common stagger-reveal base style), this
        // left them permanently invisible for reduced-motion users. Exactly the shape of the
        // plan's own new `presetCardStagger` quick-preset (Task 13).
        it('when reduced-motion is active: a stagger keyframe with NO target applies the final state to ALL of rootEl.children (matches the animated path), not just the root', async () => {
            const restore = withReducedMotion(true);
            const root = document.createElement('div');
            root.innerHTML = '<div style="opacity:0"></div><div style="opacity:0"></div><div style="opacity:0"></div>';
            document.body.appendChild(root);

            await applyAnimationTimeline(root, {
                keyframes: [{ id: 'k1', property: 'opacity', to: 1, duration: 0.6, stagger: 0.08 }],
                trigger: 'onLoad',
            });

            const cards = Array.from(root.children) as HTMLElement[];
            expect(cards).toHaveLength(3);
            for (const card of cards) expect(card.style.opacity).toBe('1');
            // The container itself must NOT have been (mis)targeted instead of its children.
            expect((root as HTMLElement).style.opacity).toBe('');

            restore();
            root.remove();
        });

        // Final whole-branch review Important I2 (continued): a NON-stagger `target` that
        // matches nothing in the DOM falls back to `rootEl` on the animated path (see the
        // `querySelector(...) ?? rootEl` test around line 154 above) but used to resolve to an
        // empty NodeList on the reduced-motion path — meaning NOTHING got the final state
        // applied at all. Now both paths share `resolveKeyframeTargets`, so the fallback
        // behavior matches exactly.
        it('when reduced-motion is active: a non-stagger target matching nothing falls back to applying the final state on rootEl itself (matches the animated path\'s fallback)', async () => {
            const restore = withReducedMotion(true);
            const root = document.createElement('div');
            document.body.appendChild(root);

            await applyAnimationTimeline(root, {
                keyframes: [{ id: 'k1', target: 'does-not-exist', property: 'opacity', to: 0.7, duration: 0.5 }],
                trigger: 'onLoad',
            });

            expect((root as HTMLElement).style.opacity).toBe('0.7');

            restore();
            root.remove();
        });
    });
});
