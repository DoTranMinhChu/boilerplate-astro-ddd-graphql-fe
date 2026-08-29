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
import { describe, it, expect, beforeAll, vi } from 'vitest';
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

    it('no overlay by default', () => {
        const { container } = render(() => <ImageNode node={node()} context={context()} />);
        expect(container.querySelectorAll('div').length).toBe(1); // just the wrapper
    });

    it('overlayGradient set: renders an absolutely-positioned overlay div with the gradient', () => {
        const { container } = render(() => (
            <ImageNode node={node({ style: { image: { overlayGradient: 'linear-gradient(180deg, transparent, black)' } } })} context={context()} />
        ));
        const wrapper = container.firstElementChild as HTMLElement;
        expect(wrapper.style.position).toBe('relative');
        const overlay = wrapper.children[1] as HTMLElement; // [0]=img, [1]=overlay
        expect(overlay.style.position).toBe('absolute');
        expect(overlay.style.inset).toBe('0px');
        expect(overlay.style.background).toContain('linear-gradient(180deg, transparent, black)');
    });

    it('treatment "duotone": renders a color-mix-blend overlay from the resolved from/to colors', () => {
        const { container } = render(() => (
            <ImageNode node={node({ style: { image: { treatment: 'duotone', duotone: { from: '#1a1a2e', to: '#e94560' } } } })} context={context()} />
        ));
        const wrapper = container.firstElementChild as HTMLElement;
        const overlay = wrapper.children[1] as HTMLElement;
        // jsdom's CSSStyleDeclaration (matching real-browser CSSOM color serialization) normalizes
        // hex colors to rgb() form when read back through `.style.background`, while CSS color
        // keywords (see the overlayGradient test above, 'black'/'transparent') stay literal. Verified
        // directly against jsdom: #1a1a2e -> rgb(26, 26, 46), #e94560 -> rgb(233, 69, 96). The
        // brief's literal-hex assertion doesn't survive a real DOM round-trip; this checks the same
        // intent (linear-gradient(135deg, <from>, <to>)) against the value jsdom actually returns.
        expect(overlay.style.background).toContain('linear-gradient(135deg, rgb(26, 26, 46), rgb(233, 69, 96))');
        expect(overlay.style.mixBlendMode).toBe('color');
    });

    it('treatment "duotone" with a theme color token: resolves via resolveColorValue (var(--color-x))', () => {
        const { container } = render(() => (
            <ImageNode node={node({ style: { image: { treatment: 'duotone', duotone: { from: { tokenRef: 'primary' }, to: { tokenRef: 'accent' } } } } })} context={context()} />
        ));
        const overlay = (container.firstElementChild as HTMLElement).children[1] as HTMLElement;
        expect(overlay.style.background).toContain('var(--color-primary)');
        expect(overlay.style.background).toContain('var(--color-accent)');
    });

    it('treatment "duotone" wins over overlayGradient if somehow both are set (documented precedence)', () => {
        const { container } = render(() => (
            <ImageNode node={node({ style: { image: { treatment: 'duotone', duotone: { from: '#000', to: '#fff' }, overlayGradient: 'linear-gradient(red, blue)' } } })} context={context()} />
        ));
        const overlay = (container.firstElementChild as HTMLElement).children[1] as HTMLElement;
        // See the CSSOM-normalization note above: #000 -> rgb(0, 0, 0), #fff -> rgb(255, 255, 255).
        expect(overlay.style.background).toContain('linear-gradient(135deg, rgb(0, 0, 0), rgb(255, 255, 255))');
        expect(overlay.style.background).not.toContain('red');
    });

    describe('revealOnScroll', () => {
        it('revealOnScroll unset: no IntersectionObserver created, image renders normally', () => {
            const observeSpy = vi.fn();
            const IOStub = vi.fn().mockImplementation(() => ({ observe: observeSpy, disconnect: vi.fn() }));
            vi.stubGlobal('IntersectionObserver', IOStub);
            render(() => <ImageNode node={node()} context={context()} />);
            expect(IOStub).not.toHaveBeenCalled();
            vi.unstubAllGlobals();
        });

        it('revealOnScroll true: creates an IntersectionObserver watching the wrapper, starts pre-reveal', () => {
            const observeSpy = vi.fn();
            const IOStub = vi.fn().mockImplementation((cb) => ({ observe: observeSpy, disconnect: vi.fn(), _cb: cb }));
            vi.stubGlobal('IntersectionObserver', IOStub);
            const { container } = render(() => (
                <ImageNode node={node({ style: { image: { revealOnScroll: true } } })} context={context()} />
            ));
            expect(IOStub).toHaveBeenCalled();
            expect(observeSpy).toHaveBeenCalledWith(container.firstElementChild);
            const wrapper = container.firstElementChild as HTMLElement;
            expect(wrapper.style.opacity).toBe('0');
            expect(wrapper.style.transform).toBe('scale(1.05)');
            vi.unstubAllGlobals();
        });

        it('revealOnScroll true, intersection fires: transitions to revealed state and disconnects', () => {
            let capturedCallback: IntersectionObserverCallback | undefined;
            const disconnectSpy = vi.fn();
            const IOStub = vi.fn().mockImplementation((cb: IntersectionObserverCallback) => {
                capturedCallback = cb;
                return { observe: vi.fn(), disconnect: disconnectSpy };
            });
            vi.stubGlobal('IntersectionObserver', IOStub);
            const { container } = render(() => (
                <ImageNode node={node({ style: { image: { revealOnScroll: true } } })} context={context()} />
            ));
            capturedCallback!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
            const wrapper = container.firstElementChild as HTMLElement;
            expect(wrapper.style.opacity).toBe('1');
            expect(wrapper.style.transform).toBe('scale(1)');
            expect(disconnectSpy).toHaveBeenCalled();
            vi.unstubAllGlobals();
        });

        it('revealOnScroll true with prefers-reduced-motion: renders already-revealed, no observer created', () => {
            // This file's top-level `if (!window.matchMedia)` guard (above) only fills the jsdom gap
            // so module-eval-time gsap/ScrollTrigger registration doesn't throw — it always reports
            // `matches: false`. To exercise the reduced-motion branch, save that stub, override it
            // locally for just this test, then restore it afterward so no other test in this file
            // (or run after it) sees a matchMedia that unconditionally reports reduced-motion.
            const originalMatchMedia = window.matchMedia;
            window.matchMedia = ((query: string) => ({
                matches: query === '(prefers-reduced-motion: reduce)',
                media: query,
                onchange: null,
                addListener: () => {},
                removeListener: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false,
            })) as unknown as typeof window.matchMedia;
            const IOStub = vi.fn();
            vi.stubGlobal('IntersectionObserver', IOStub);
            const { container } = render(() => (
                <ImageNode node={node({ style: { image: { revealOnScroll: true } } })} context={context()} />
            ));
            expect(IOStub).not.toHaveBeenCalled();
            const wrapper = container.firstElementChild as HTMLElement;
            expect(wrapper.style.opacity).toBe('1');
            vi.unstubAllGlobals();
            window.matchMedia = originalMatchMedia;
        });
    });
});
