// src/modules/cms/node/applySpotlightRevealStyle.test.ts
import { describe, it, expect } from 'vitest';
import { buildSpotlightRevealCss } from '@modules/cms/node/applySpotlightRevealStyle';

describe('buildSpotlightRevealCss', () => {
    it('returns null when spotlightReveal is unset', () => {
        expect(buildSpotlightRevealCss({ id: 'n1', props: {} })).toBeNull();
    });

    it('returns null when there is no node id', () => {
        expect(buildSpotlightRevealCss({ props: { spotlightReveal: true } })).toBeNull();
    });

    it('builds a ::after mask-reveal rule scoped to the node\'s own data-node-id, reading the ancestor Frame\'s --spot-x/--spot-opacity custom properties', () => {
        const css = buildSpotlightRevealCss({ id: 'n1', props: { spotlightReveal: true } });
        expect(css).toContain('[data-node-id="n1"] > *::after');
        expect(css).toContain('content: attr(data-label)');
        expect(css).toContain('var(--spot-x)');
        expect(css).toContain('opacity: var(--spot-opacity, 0)');
        expect(css).toContain('#dc619c');
    });

    it('also sets position: relative, white-space: nowrap, and overflow: hidden on the Text node\'s own rendered element, so the ::after overlay is scoped to its own box (not the ancestor Frame) and a long unwrapped label cannot bleed outside it (re-opening the documented /trang-chu live page-width bug)', () => {
        const css = buildSpotlightRevealCss({ id: 'n1', props: { spotlightReveal: true } });
        expect(css).toContain('[data-node-id="n1"] > * { position: relative; white-space: nowrap; overflow: hidden; }');
    });

    it('returns null when richText is also true — the plain-text data-label branch is unreachable, so the ::after rule would be a silent dead no-op', () => {
        const css = buildSpotlightRevealCss({ id: 'n1', props: { spotlightReveal: true, richText: true } });
        expect(css).toBeNull();
    });

    it('returns null when countUp is also true — same dead-data-label reasoning as richText', () => {
        const css = buildSpotlightRevealCss({ id: 'n1', props: { spotlightReveal: true, countUp: true } });
        expect(css).toBeNull();
    });
});
