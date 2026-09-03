import { describe, it, expect } from 'vitest';
import { buildBackgroundAnimationCss } from '@modules/cms/node/applyNodeBackgroundAnimation';
import { ENodeType } from '@modules/cms/node/node.constants';

describe('buildBackgroundAnimationCss', () => {
    it('returns null when style.background.animate is unset', () => {
        expect(buildBackgroundAnimationCss({ id: 'n1', type: ENodeType.FRAME, style: {} })).toBeNull();
        expect(buildBackgroundAnimationCss({ id: 'n1', type: ENodeType.FRAME, style: { background: { type: 'image', value: 'a.jpg' } } })).toBeNull();
    });

    it('returns null when animate is "none"', () => {
        expect(buildBackgroundAnimationCss({ id: 'n1', type: ENodeType.FRAME, style: { background: { type: 'image', animate: 'none', value: 'a.jpg' } } })).toBeNull();
    });

    it('returns null when there is no node id', () => {
        expect(buildBackgroundAnimationCss({ type: ENodeType.FRAME, style: { background: { type: 'image', animate: 'breathe', value: 'a.jpg' } } })).toBeNull();
    });

    it('returns null when background.type is not "image" (e.g. "color"), even if animate is still set to "breathe"', () => {
        expect(buildBackgroundAnimationCss({ id: 'n1', type: ENodeType.FRAME, style: { background: { type: 'color', animate: 'breathe', value: 'a.jpg' } } })).toBeNull();
    });

    // final-review fix round 2: previously `value` wasn't checked at all, so this produced a dead
    // <style> tag (no data-breathe-id element exists to target when there's no image URL yet).
    it('returns null when there is no background value, even if type is "image" and animate is "breathe"', () => {
        expect(buildBackgroundAnimationCss({ id: 'n1', type: ENodeType.FRAME, style: { background: { type: 'image', animate: 'breathe' } } })).toBeNull();
    });

    it('builds a keyframes rule + animation declaration scoped to the node\'s own data-breathe-id, for "breathe"', () => {
        const css = buildBackgroundAnimationCss({ id: 'hero-1', type: ENodeType.FRAME, style: { background: { type: 'image', animate: 'breathe', value: 'a.jpg' } } });
        expect(css).toBe(
            '@keyframes breathe-hero-1 { 0%, 100% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.08) translate(-1%, -1%); } } ' +
            '[data-breathe-id="hero-1"] { animation: breathe-hero-1 11s ease-in-out infinite; }',
        );
    });

    it('a different node id produces a differently-scoped keyframes name (no collision between two breathing heroes on the same page)', () => {
        const css = buildBackgroundAnimationCss({ id: 'hero-2', type: ENodeType.FRAME, style: { background: { type: 'image', animate: 'breathe', value: 'a.jpg' } } });
        expect(css).toContain('@keyframes breathe-hero-2');
        expect(css).toContain('[data-breathe-id="hero-2"]');
    });

    // final-review fix round 4: a non-Frame node with `animate:'breathe'` in its data is only
    // reachable via direct GraphQL/DB writes (the Inspector's `animate` control is already
    // gated to Frame nodes only, per round 3) — but without this guard it still emitted a dead
    // <style> tag targeting a `data-breathe-id` layer no non-Frame primitive ever renders.
    describe('type guard (round 4 Minor finding)', () => {
        it('returns null for a non-"frame"-typed node even with a fully-valid breathe config', () => {
            expect(buildBackgroundAnimationCss({ id: 'n1', type: ENodeType.TEXT, style: { background: { type: 'image', animate: 'breathe', value: 'a.jpg' } } })).toBeNull();
        });

        it('returns null when node.type is unset entirely', () => {
            expect(buildBackgroundAnimationCss({ id: 'n1', style: { background: { type: 'image', animate: 'breathe', value: 'a.jpg' } } })).toBeNull();
        });

        it('still builds CSS for a "frame"-typed node (regression guard — the guard must not be overly broad)', () => {
            expect(buildBackgroundAnimationCss({ id: 'n1', type: ENodeType.FRAME, style: { background: { type: 'image', animate: 'breathe', value: 'a.jpg' } } })).not.toBeNull();
        });
    });

    // final-review fix round 4: the actual bug this whole round fixes — an admin configuring
    // `background.animate:'breathe'` entirely inside `responsiveOverrides.mobile.style` (the
    // Inspector allows this whenever the preview breakpoint is Mobile). FrameNode.tsx's
    // `effectiveStyle()` already merged this correctly and rendered the `data-breathe-id` DOM
    // layer, but this function previously only ever saw the desktop base style and returned
    // `null` — a frozen, non-animating background layer on mobile.
    describe('responsiveOverrides + breakpoint (round 4 fix)', () => {
        it('a mobile-only animate:"breathe" override produces CSS when breakpoint is "mobile"', () => {
            const node = { id: 'n1', type: ENodeType.FRAME, style: { background: { type: 'image' as const, value: 'desktop.jpg' } } };
            const responsiveOverrides = { mobile: { style: { background: { type: 'image' as const, animate: 'breathe' as const, value: 'mobile.jpg' } } } };
            const css = buildBackgroundAnimationCss(node, responsiveOverrides, 'mobile');
            expect(css).not.toBeNull();
            expect(css).toContain('@keyframes breathe-n1');
            expect(css).toContain('[data-breathe-id="n1"]');
        });

        it('the same mobile-only override produces null when breakpoint is "desktop" (desktop base has no animate set)', () => {
            const node = { id: 'n1', type: ENodeType.FRAME, style: { background: { type: 'image' as const, value: 'desktop.jpg' } } };
            const responsiveOverrides = { mobile: { style: { background: { type: 'image' as const, animate: 'breathe' as const, value: 'mobile.jpg' } } } };
            expect(buildBackgroundAnimationCss(node, responsiveOverrides, 'desktop')).toBeNull();
        });

        it('omitting responsiveOverrides/breakpoint entirely (1-arg call) defaults to desktop — unchanged behavior for existing callers', () => {
            const node = { id: 'n1', type: ENodeType.FRAME, style: { background: { type: 'image' as const, animate: 'breathe' as const, value: 'desktop.jpg' } } };
            expect(buildBackgroundAnimationCss(node)).not.toBeNull();
        });

        it('a responsiveOverrides.mobile.style.background.animate:"none" override suppresses CSS on mobile even though the desktop base has animate:"breathe"', () => {
            const node = { id: 'n1', type: ENodeType.FRAME, style: { background: { type: 'image' as const, animate: 'breathe' as const, value: 'desktop.jpg' } } };
            const responsiveOverrides = { mobile: { style: { background: { type: 'image' as const, animate: 'none' as const, value: 'desktop.jpg' } } } };
            expect(buildBackgroundAnimationCss(node, responsiveOverrides, 'mobile')).toBeNull();
            // ...but desktop (unaffected by the mobile-only override) still animates.
            expect(buildBackgroundAnimationCss(node, responsiveOverrides, 'desktop')).not.toBeNull();
        });

        it('a tablet-only override also cascades correctly (tablet then mobile, matching resolveEffectiveStyle/applyNodeStyle)', () => {
            const node = { id: 'n1', type: ENodeType.FRAME, style: { background: { type: 'image' as const, value: 'desktop.jpg' } } };
            const responsiveOverrides = { tablet: { style: { background: { type: 'image' as const, animate: 'breathe' as const, value: 'tablet.jpg' } } } };
            expect(buildBackgroundAnimationCss(node, responsiveOverrides, 'tablet')).not.toBeNull();
            expect(buildBackgroundAnimationCss(node, responsiveOverrides, 'desktop')).toBeNull();
        });
    });
});
