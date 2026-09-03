// src/modules/cms/node/primitives/ImageNode.ssr.test.tsx
// Runs under vitest.ssr.config.ts (`npm run test:ssr`), NOT the default vitest.config.ts — see
// that file's header for why the two toolchains must stay separate: this is the ONLY environment
// that actually exercises Solid's real server render path (`onMount` never runs at all on the
// server — the client jsdom project can't prove that; @solidjs/testing-library's `render()`
// flushes `onMount` synchronously, so a client-only test can't distinguish "starts revealed, then
// onMount hides it" from "starts hidden").
//
// Regression test for final-review fix (Important #4, "I-4"): the design spec's own SSR-safe
// guarantee is "the initial (pre-JS) render is the FINAL revealed state (opacity:1, scale:1, no
// inline transform), and the reveal-out effect only applies once client JS mounts" — so a no-JS/
// slow-JS visitor never sees a permanently-invisible image. The previous implementation
// initialized the `revealed` signal to `false` whenever `shouldReveal()` was true (unless
// reduced-motion), so the SERVER-rendered HTML itself shipped `opacity:0` — genuinely invisible
// without JS, contradicting the spec. Fixed by always starting `revealed` at `true` and only
// flipping it to `false` inside `onMount` (client-only, never runs during SSR).
import { describe, it, expect } from 'vitest';
import { renderToStringAsync } from 'solid-js/web';
import { createComponent } from 'solid-js';
import { ImageNode } from '@modules/cms/node/primitives/ImageNode';
import type { NodeTree, NodeRenderContext } from '@modules/cms/node/node.types';

function node(overrides: Partial<NodeTree> = {}): NodeTree {
    return {
        id: 'img1', pageId: 'p1', parentId: undefined, order: 0, type: 'image',
        layoutMode: 'flow', style: {}, layout: {}, props: { src: '/test.jpg', alt: 'Test' },
        dataBinding: { mode: 'static' }, responsiveOverrides: {},
        createdAt: '', updatedAt: '', deletedAt: undefined, animationRef: undefined,
        componentDefinitionId: undefined, componentSourceNodeId: undefined, children: [],
        ...overrides,
    } as any;
}
function context(): NodeRenderContext {
    return {
        isCustomerLoggedIn: false, device: () => 'desktop', queryParams: {}, pathParams: {}, now: new Date(),
    } as any;
}

describe('ImageNode SSR — revealOnScroll (I-4 final-review fix)', () => {
    it('server-rendered HTML for a revealOnScroll node ships the FINAL revealed state: opacity:1, no pre-reveal scale transform', async () => {
        const n = node({ style: { image: { revealOnScroll: true } } });
        const html = await renderToStringAsync(() => createComponent(ImageNode, { node: n, context: context() }));
        expect(html).toContain('<img');
        // Must NOT ship the pre-reveal hidden state (opacity:0 / scale(1.05)) — a no-JS visitor
        // would otherwise see this image as permanently invisible.
        expect(html).not.toContain('opacity:0');
        expect(html).not.toContain('scale(1.05)');
        // Must ship the fully-revealed state instead.
        expect(html).toMatch(/opacity:\s*1/);
        expect(html).toContain('scale(1)');
    });

    it('a revealOnScroll node with NO other opacity/transform field: SSR opacity is exactly 1 (base 1 × reveal-factor 1, not left at the pre-reveal 0 default)', async () => {
        const n = node({ style: { image: { revealOnScroll: true } } });
        const html = await renderToStringAsync(() => createComponent(ImageNode, { node: n, context: context() }));
        expect(html).toContain('opacity:1;');
    });

    it('a plain node with revealOnScroll unset renders normally over SSR (no opacity/transform forced at all)', async () => {
        const n = node();
        const html = await renderToStringAsync(() => createComponent(ImageNode, { node: n, context: context() }));
        expect(html).toContain('<img');
        expect(html).not.toContain('opacity');
    });
});
