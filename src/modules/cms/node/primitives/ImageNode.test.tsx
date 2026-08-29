// src/modules/cms/node/primitives/ImageNode.test.tsx
// @vitest-environment jsdom
//
// Same jsdom `matchMedia` gap already hit + fixed by nodeRegistry.test.ts/CustomCodeNode.test.ts/
// ContentDetailNode.test.tsx/FeaturedEntryNode.test.tsx/ProjectShowcaseNode.test.tsx/
// LogoGridNode.test.tsx/MixedFeedNode.test.tsx/TextNode.test.tsx/FrameNode.test.tsx:
// ImageNode.tsx statically imports `../useNodeAnimation`, which statically imports
// `./applyAnimationTimeline`, which calls `gsap.registerPlugin(ScrollTrigger)` at
// MODULE-EVALUATION time — that registration reads `matchMedia`, which jsdom's `window` doesn't
// implement. Fixed the same way: stub `window.matchMedia` first, then reach `./ImageNode` via a
// dynamic `import()` inside `beforeAll` — static imports are hoisted above any top-level stub
// placed after them, so a plain top-level assignment wouldn't run early enough.
import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@solidjs/testing-library';
import type { NodeTree, NodeRenderContext } from '../node.types';

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

let ImageNode: typeof import('./ImageNode')['ImageNode'];

beforeAll(async () => {
    ({ ImageNode } = await import('./ImageNode'));
}, 30000);

// Matches the established primitive-test convention in this directory (see LogoGridNode.test.tsx/
// FrameNode.test.tsx) — a plain `as any` context/node rather than a full typed fixture, kept
// typed as NodeTree/NodeRenderContext via the `as any` cast at the construction site so the test
// still documents the intended real shape.
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

describe('ImageNode', () => {
    it('renders a wrapper div containing the img (structural change)', () => {
        const { container } = render(() => <ImageNode node={node()} context={context()} />);
        const wrapper = container.firstElementChild!;
        expect(wrapper.tagName).toBe('DIV');
        const img = wrapper.querySelector('img')!;
        expect(img).not.toBeNull();
        expect(img.getAttribute('src')).toBe('/test.jpg');
        expect(img.getAttribute('alt')).toBe('Test');
    });

    it('img always fills its wrapper (width/height 100%, display block)', () => {
        const { container } = render(() => <ImageNode node={node()} context={context()} />);
        const img = container.querySelector('img')!;
        expect((img as HTMLElement).style.width).toBe('100%');
        expect((img as HTMLElement).style.height).toBe('100%');
        expect((img as HTMLElement).style.display).toBe('block');
    });

    it('defaults object-fit to cover when style.size.objectFit is unset', () => {
        const { container } = render(() => <ImageNode node={node()} context={context()} />);
        const img = container.querySelector('img')!;
        expect((img as HTMLElement).style.objectFit).toBe('cover');
    });

    it('explicit style.size.objectFit still wins over the cover default', () => {
        const { container } = render(() => (
            <ImageNode node={node({ style: { size: { objectFit: 'contain' } } })} context={context()} />
        ));
        const img = container.querySelector('img')!;
        expect((img as HTMLElement).style.objectFit).toBe('contain');
    });

    it('has loading="lazy"', () => {
        const { container } = render(() => <ImageNode node={node()} context={context()} />);
        expect(container.querySelector('img')!.getAttribute('loading')).toBe('lazy');
    });

    it('non-img properties (e.g. border-radius from style.border) land on the wrapper, not the img', () => {
        const { container } = render(() => (
            <ImageNode node={node({ style: { border: { width: 2, style: 'solid', color: '#000', radius: { tl: 8, tr: 8, br: 8, bl: 8 } } } })} context={context()} />
        ));
        const wrapper = container.firstElementChild as HTMLElement;
        const img = container.querySelector('img') as HTMLElement;
        expect(wrapper.style.borderRadius).toBe('8px 8px 8px 8px');
        expect(img.style.borderRadius).toBe('');
    });
});
