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

    // final-review fix (Important #1, "I-1"): renamed from "img always fills its wrapper" — that
    // was never actually true once you consider a node with NO explicit size/aspectRatio (the
    // DEFAULT `node()` fixture used throughout this file): forcing `width/height:100%` on the img
    // in that case stretches it to match the wrapper's block-level 100%-container-width box,
    // instead of rendering at its natural intrinsic size (the browser preflight's
    // `max-width:100%; height:auto` behavior it rendered at before this whole plan). `display:
    // block` alone is unconditional (harmless, doesn't affect natural sizing).
    it('display:block is always set, but width/height are NOT forced when neither aspectRatio nor an explicit size is set', () => {
        const { container } = render(() => <ImageNode node={node()} context={context()} />);
        const img = container.querySelector('img')!;
        expect((img as HTMLElement).style.display).toBe('block');
        expect((img as HTMLElement).style.width).toBe('');
        expect((img as HTMLElement).style.height).toBe('');
    });

    it('image.aspectRatio set: img gets width/height 100% to fill the now-defined wrapper box', () => {
        const { container } = render(() => (
            <ImageNode node={node({ style: { image: { aspectRatio: '16:9' } } })} context={context()} />
        ));
        const img = container.querySelector('img')!;
        expect((img as HTMLElement).style.width).toBe('100%');
        expect((img as HTMLElement).style.height).toBe('100%');
    });

    it('style.size.width set (no aspectRatio): img gets width/height 100%', () => {
        const { container } = render(() => (
            <ImageNode node={node({ style: { size: { width: '320px' } } })} context={context()} />
        ));
        const img = container.querySelector('img')!;
        expect((img as HTMLElement).style.width).toBe('100%');
        expect((img as HTMLElement).style.height).toBe('100%');
    });

    it('style.size.height set (no aspectRatio, no width): img gets width/height 100%', () => {
        const { container } = render(() => (
            <ImageNode node={node({ style: { size: { height: '240px' } } })} context={context()} />
        ));
        const img = container.querySelector('img')!;
        expect((img as HTMLElement).style.width).toBe('100%');
        expect((img as HTMLElement).style.height).toBe('100%');
    });

    // Re-review fix (NEW-2, regression): `hasDefinedSize()` used to check only
    // `image.aspectRatio`/`style.size.width`/`.height` — completely blind to `layout.width`/
    // `.height`, the DIFFERENT field the Node Builder canvas's drag-RESIZE gesture writes
    // (`FreeLayoutProps`, node.types.ts). Resizing an Image node LARGER than its own source
    // image's natural size left the <img> at its tiny unscaled natural size inside the now-big
    // resized wrapper box, instead of filling it.
    it('(NEW-2 fix) layout.width/height set (canvas resize gesture, no style.size/aspectRatio): img gets width/height 100% to fill the resized wrapper box', () => {
        const { container } = render(() => (
            <ImageNode node={node({ layout: { width: 400, height: 250 } })} context={context()} />
        ));
        const img = container.querySelector('img')!;
        expect((img as HTMLElement).style.width).toBe('100%');
        expect((img as HTMLElement).style.height).toBe('100%');
    });

    it('(NEW-2 fix) layout.width alone (no height, no style.size/aspectRatio) still counts as a defined size', () => {
        const { container } = render(() => (
            <ImageNode node={node({ layout: { width: 400 } })} context={context()} />
        ));
        const img = container.querySelector('img')!;
        expect((img as HTMLElement).style.width).toBe('100%');
        expect((img as HTMLElement).style.height).toBe('100%');
    });

    // Post-round-3 fix (Issue #1, breakpoint-blind regression): the NEW-2 fix above read
    // `props.node.layout?.width`/`.height` RAW, which is only ever the DESKTOP layout value. The
    // canvas resize gesture, while previewing Tablet/Mobile, writes into
    // `responsiveOverrides.<bp>.layout` instead (via `buildLayoutPatch.ts`) — never into
    // `node.layout` directly — so resizing while previewing Tablet/Mobile left `hasDefinedSize()`
    // false again, the exact bug NEW-2 was meant to fix, just breakpoint-blind. Now routed through
    // `resolveEffectiveLayout(node, device())`, the same breakpoint-merge helper `applyChildLayout`
    // already uses.
    it('(Issue #1 fix) responsiveOverrides.tablet.layout width/height set (no desktop-level layout.width/height): img gets width/height 100% when device()==="tablet"', () => {
        const tabletContext = { isCustomerLoggedIn: false, device: () => 'tablet', queryParams: {}, pathParams: {}, now: new Date() } as any;
        const n = node({
            layout: {}, // NO width/height at the desktop level
            responsiveOverrides: { tablet: { layout: { width: 400, height: 250 } } },
        });
        const { container } = render(() => <ImageNode node={n} context={tabletContext} />);
        const img = container.querySelector('img')!;
        expect((img as HTMLElement).style.width).toBe('100%');
        expect((img as HTMLElement).style.height).toBe('100%');
    });

    it('(Issue #1 fix) the SAME node (tablet-only override, no desktop-level layout.width/height) gets NO forced width/height when device()==="desktop" (no regression)', () => {
        const n = node({
            layout: {},
            responsiveOverrides: { tablet: { layout: { width: 400, height: 250 } } },
        });
        const { container } = render(() => <ImageNode node={n} context={context()} />);
        const img = container.querySelector('img') as HTMLElement;
        expect(img.style.width).toBe('');
        expect(img.style.height).toBe('');
    });

    it('neither aspectRatio nor size set: img gets NO explicit width/height (verified via the raw style object, not just visually)', () => {
        const { container } = render(() => <ImageNode node={node()} context={context()} />);
        const img = container.querySelector('img') as HTMLElement;
        expect(img.style.getPropertyValue('width')).toBe('');
        expect(img.style.getPropertyValue('height')).toBe('');
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

    it('non-img properties (e.g. border-radius from style.border) land on the wrapper, not the img — and (I-2 final-review fix) the wrapper also gets overflow:hidden so the img is actually clipped to the rounded shape', () => {
        const { container } = render(() => (
            <ImageNode node={node({ style: { border: { width: 2, style: 'solid', color: '#000', radius: { tl: 8, tr: 8, br: 8, bl: 8 } } } })} context={context()} />
        ));
        const wrapper = container.firstElementChild as HTMLElement;
        const img = container.querySelector('img') as HTMLElement;
        expect(wrapper.style.borderRadius).toBe('8px 8px 8px 8px');
        expect(img.style.borderRadius).toBe('');
        // final-review fix (Important #2, "I-2"): `border-radius` only clips an element's OWN
        // background/border painting, not descendant content, unless `overflow` isn't `visible` —
        // so a radius on the wrapper alone left the (square) <img> rendering right over the
        // rounded corners, hiding them. Wrapper now defaults to `overflow:hidden` whenever a
        // radius is present and the admin hasn't explicitly chosen their own `overflow`.
        expect(wrapper.style.overflow).toBe('hidden');
    });

    it('(I-2) an explicit style.overflow is respected, not overridden, even when border-radius is also set', () => {
        const { container } = render(() => (
            <ImageNode node={node({ style: { border: { radius: { tl: 8, tr: 8, br: 8, bl: 8 } }, overflow: 'visible' } })} context={context()} />
        ));
        const wrapper = container.firstElementChild as HTMLElement;
        expect(wrapper.style.overflow).toBe('visible');
    });

    it('(I-2) no border-radius set: wrapper gets no overflow at all (unchanged default)', () => {
        const { container } = render(() => <ImageNode node={node()} context={context()} />);
        const wrapper = container.firstElementChild as HTMLElement;
        expect(wrapper.style.overflow).toBe('');
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

    // final-review fix (Critical #2, "C-2"): `overlayBackground()`/`hasOverlay()`/
    // `overlayMixBlend()`/`shouldReveal()` used to read `props.node.style?.image` directly,
    // bypassing `responsiveOverrides` entirely — while `fullStyle()` (and so the `filter`
    // CSS) DID correctly merge them via `applyNodeStyle`'s 3-arg overload. So a
    // `treatment:'duotone'` set ONLY inside `responsiveOverrides.mobile.style.image` got its
    // `filter:grayscale(1)` applied (via the merged flat CSS) but no overlay div at all when
    // previewing/rendering at the 'mobile' breakpoint — a flat grayscale image with zero color
    // tint on real phones. Now both derive from one `resolveEffectiveStyle()` call.
    it('(C-2) treatment:duotone set only in responsiveOverrides.mobile.style.image renders the overlay div when device()==="mobile"', () => {
        const mobileContext = { isCustomerLoggedIn: false, device: () => 'mobile', queryParams: {}, pathParams: {}, now: new Date() } as any;
        const n = node({
            style: {}, // no image.treatment at the base/desktop level at all
            responsiveOverrides: { mobile: { style: { image: { treatment: 'duotone', duotone: { from: '#000', to: '#fff' } } } } },
        });
        const { container } = render(() => <ImageNode node={n} context={mobileContext} />);
        const wrapper = container.firstElementChild as HTMLElement;
        // The overlay div renders (children.length === 2: img + overlay), proving hasOverlay()/
        // overlayBackground() saw the mobile-only override, not just the (image-less) base style.
        expect(wrapper.children.length).toBe(2);
        const overlay = wrapper.children[1] as HTMLElement;
        expect(overlay.style.mixBlendMode).toBe('color');
        expect(overlay.style.background).toContain('linear-gradient(135deg, rgb(0, 0, 0), rgb(255, 255, 255))');
    });

    it('(C-2) the SAME node renders NO overlay when device()==="desktop" (the override only applies at mobile)', () => {
        const desktopContext = context();
        const n = node({
            style: {},
            responsiveOverrides: { mobile: { style: { image: { treatment: 'duotone', duotone: { from: '#000', to: '#fff' } } } } },
        });
        const { container } = render(() => <ImageNode node={n} context={desktopContext} />);
        const wrapper = container.firstElementChild as HTMLElement;
        expect(wrapper.children.length).toBe(1); // just the img, no overlay
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

        // final-review fix (Important #3, "I-3"): `wrapperStyle()` used to unconditionally
        // OVERWRITE `opacity`/`transform`/`transition` whenever `shouldReveal()` was true — but a
        // node can ALSO independently set `transform.rotate`/`.scaleX`/etc and `effects.opacity`,
        // both real, independently-authorable style fields. This silently destroyed both. Fixed
        // to COMPOSE: append the reveal's own `scale(...)` to the end of any existing `transform`
        // string, and MULTIPLY the reveal's 0/1 factor into any existing `opacity`.
        it('(I-3) transform.rotate + revealOnScroll: rotation is retained (composed with the reveal scale), both pre- and post-reveal', () => {
            let capturedCallback: IntersectionObserverCallback | undefined;
            const IOStub = vi.fn().mockImplementation((cb: IntersectionObserverCallback) => {
                capturedCallback = cb;
                return { observe: vi.fn(), disconnect: vi.fn() };
            });
            vi.stubGlobal('IntersectionObserver', IOStub);
            const { container } = render(() => (
                <ImageNode node={node({ style: { transform: { rotate: 5 }, image: { revealOnScroll: true } } })} context={context()} />
            ));
            const wrapper = container.firstElementChild as HTMLElement;
            // Pre-reveal: base rotation still present, reveal's own scale(1.05) appended after it.
            expect(wrapper.style.transform).toBe('rotate(5deg) scale(1.05)');
            capturedCallback!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
            // Post-reveal: rotation STILL retained (not clobbered), reveal's scale now scale(1).
            expect(wrapper.style.transform).toBe('rotate(5deg) scale(1)');
            vi.unstubAllGlobals();
        });

        it('(I-3) effects.opacity:0.5 + revealOnScroll: ends up at opacity 0.5 once revealed (not clobbered to a flat 1), and 0 pre-reveal (0.5 × 0)', () => {
            let capturedCallback: IntersectionObserverCallback | undefined;
            const IOStub = vi.fn().mockImplementation((cb: IntersectionObserverCallback) => {
                capturedCallback = cb;
                return { observe: vi.fn(), disconnect: vi.fn() };
            });
            vi.stubGlobal('IntersectionObserver', IOStub);
            const { container } = render(() => (
                <ImageNode node={node({ style: { effects: { opacity: 0.5 }, image: { revealOnScroll: true } } })} context={context()} />
            ));
            const wrapper = container.firstElementChild as HTMLElement;
            expect(wrapper.style.opacity).toBe('0'); // 0.5 base * 0 pre-reveal factor
            capturedCallback!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
            expect(wrapper.style.opacity).toBe('0.5'); // 0.5 base * 1 post-reveal factor — NOT flat 1
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
