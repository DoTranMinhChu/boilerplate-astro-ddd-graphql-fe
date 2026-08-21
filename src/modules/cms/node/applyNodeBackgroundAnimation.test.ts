import { describe, it, expect } from 'vitest';
import { buildBackgroundAnimationCss } from './applyNodeBackgroundAnimation';

describe('buildBackgroundAnimationCss', () => {
    it('returns null when style.background.animate is unset', () => {
        expect(buildBackgroundAnimationCss({ id: 'n1', style: {} })).toBeNull();
        expect(buildBackgroundAnimationCss({ id: 'n1', style: { background: { type: 'image', value: 'a.jpg' } } })).toBeNull();
    });

    it('returns null when animate is "none"', () => {
        expect(buildBackgroundAnimationCss({ id: 'n1', style: { background: { type: 'image', animate: 'none', value: 'a.jpg' } } })).toBeNull();
    });

    it('returns null when there is no node id', () => {
        expect(buildBackgroundAnimationCss({ style: { background: { type: 'image', animate: 'breathe', value: 'a.jpg' } } })).toBeNull();
    });

    it('returns null when background.type is not "image" (e.g. "color"), even if animate is still set to "breathe"', () => {
        expect(buildBackgroundAnimationCss({ id: 'n1', style: { background: { type: 'color', animate: 'breathe', value: 'a.jpg' } } })).toBeNull();
    });

    // final-review fix round 2: previously `value` wasn't checked at all, so this produced a dead
    // <style> tag (no data-breathe-id element exists to target when there's no image URL yet).
    it('returns null when there is no background value, even if type is "image" and animate is "breathe"', () => {
        expect(buildBackgroundAnimationCss({ id: 'n1', style: { background: { type: 'image', animate: 'breathe' } } })).toBeNull();
    });

    it('builds a keyframes rule + animation declaration scoped to the node\'s own data-breathe-id, for "breathe"', () => {
        const css = buildBackgroundAnimationCss({ id: 'hero-1', style: { background: { type: 'image', animate: 'breathe', value: 'a.jpg' } } });
        expect(css).toBe(
            '@keyframes breathe-hero-1 { 0%, 100% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.08) translate(-1%, -1%); } } ' +
            '[data-breathe-id="hero-1"] { animation: breathe-hero-1 11s ease-in-out infinite; }',
        );
    });

    it('a different node id produces a differently-scoped keyframes name (no collision between two breathing heroes on the same page)', () => {
        const css = buildBackgroundAnimationCss({ id: 'hero-2', style: { background: { type: 'image', animate: 'breathe', value: 'a.jpg' } } });
        expect(css).toContain('@keyframes breathe-hero-2');
        expect(css).toContain('[data-breathe-id="hero-2"]');
    });
});
