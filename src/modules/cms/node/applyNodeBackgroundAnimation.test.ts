import { describe, it, expect } from 'vitest';
import { buildBackgroundAnimationCss } from './applyNodeBackgroundAnimation';

describe('buildBackgroundAnimationCss', () => {
    it('returns null when style.background.animate is unset', () => {
        expect(buildBackgroundAnimationCss({ id: 'n1', style: {} })).toBeNull();
        expect(buildBackgroundAnimationCss({ id: 'n1', style: { background: { type: 'image', value: 'a.jpg' } } })).toBeNull();
    });

    it('returns null when animate is "none"', () => {
        expect(buildBackgroundAnimationCss({ id: 'n1', style: { background: { type: 'image', animate: 'none' } } })).toBeNull();
    });

    it('returns null when there is no node id', () => {
        expect(buildBackgroundAnimationCss({ style: { background: { type: 'image', animate: 'breathe' } } })).toBeNull();
    });

    it('builds a keyframes rule + animation declaration scoped to the node\'s own data-node-id, for "breathe"', () => {
        const css = buildBackgroundAnimationCss({ id: 'hero-1', style: { background: { type: 'image', animate: 'breathe' } } });
        expect(css).toBe(
            '@keyframes breathe-hero-1 { 0%, 100% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.08) translate(-1%, -1%); } } ' +
            '[data-node-id="hero-1"] > * { animation: breathe-hero-1 11s ease-in-out infinite; }',
        );
    });

    it('a different node id produces a differently-scoped keyframes name (no collision between two breathing heroes on the same page)', () => {
        const css = buildBackgroundAnimationCss({ id: 'hero-2', style: { background: { type: 'image', animate: 'breathe' } } });
        expect(css).toContain('@keyframes breathe-hero-2');
        expect(css).toContain('[data-node-id="hero-2"] > *');
    });
});
