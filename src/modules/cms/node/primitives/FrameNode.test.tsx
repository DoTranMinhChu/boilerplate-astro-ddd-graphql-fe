// src/modules/cms/node/primitives/FrameNode.test.tsx
// @vitest-environment jsdom
//
// Same jsdom `matchMedia` gap already hit + fixed by nodeRegistry.test.ts/CustomCodeNode.test.ts/
// ContentDetailNode.test.tsx/FeaturedEntryNode.test.tsx/ProjectShowcaseNode.test.tsx/
// LogoGridNode.test.tsx/MixedFeedNode.test.tsx/TextNode.test.tsx: FrameNode.tsx statically imports
// `../useNodeAnimation`, which statically imports `./applyAnimationTimeline`, which calls
// `gsap.registerPlugin(ScrollTrigger)` at MODULE-EVALUATION time — that registration reads
// `matchMedia`, which jsdom's `window` doesn't implement. Fixed the same way: stub
// `window.matchMedia` first, then reach `./FrameNode` via a dynamic `import()` inside `beforeAll`
// — static imports are hoisted above any top-level stub placed after them, so a plain top-level
// assignment wouldn't run early enough.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { gsap } from 'gsap';

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

let FrameNode: typeof import('./FrameNode')['FrameNode'];

beforeAll(async () => {
    ({ FrameNode } = await import('./FrameNode'));
}, 30000);

// Matches the established primitive-test convention in this directory (see LogoGridNode.test.tsx
// and Task 5's TextNode.test.tsx) — a plain `as any` context/node rather than a full typed fixture.
const baseContext = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;

describe('FrameNode — background video (closes the pre-existing "handled at component level" gap)', () => {
    it('renders a real <video> background layer when style.background.type is "video"', () => {
        const node = {
            id: 'frame-1',
            type: 'FRAME',
            style: { background: { type: 'video', value: 'https://example.com/bg.mp4' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const video = container.querySelector('video');
        expect(video).toBeTruthy();
        expect(video!.getAttribute('src')).toBe('https://example.com/bg.mp4');
        expect(video!.hasAttribute('autoplay')).toBe(true);
        expect(video!.hasAttribute('muted')).toBe(true);
        expect(video!.hasAttribute('loop')).toBe(true);
    });

    it('renders no <video> element for any other background type', () => {
        const node = {
            id: 'frame-2',
            type: 'FRAME',
            style: { background: { type: 'color', value: '#000000ff' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        expect(container.querySelector('video')).toBeNull();
    });

    // final-review fix (Important #3): `position: relative` alone does NOT create a new CSS
    // stacking context (z-index stays `auto`), so the video layer's `-z-10` could hoist past this
    // Frame's own box and paint behind whatever the nearest actual stacking-context ancestor is
    // (e.g. an outer Frame's own background color). `isolation: isolate` forces a real stacking
    // context so the negative z-index stays contained. jsdom has no real layout engine so this
    // can't assert the visual outcome — it only pins the intended mechanism.
    it('sets isolation:isolate on the Frame root when it has a video background', () => {
        const node = {
            id: 'frame-3',
            type: 'FRAME',
            style: { background: { type: 'video', value: 'https://example.com/bg.mp4' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const root = container.firstElementChild as HTMLElement;
        expect(root.style.isolation).toBe('isolate');
    });

    it('does NOT set isolation on the Frame root for a non-video background', () => {
        const node = {
            id: 'frame-4',
            type: 'FRAME',
            style: { background: { type: 'color', value: '#000000ff' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const root = container.firstElementChild as HTMLElement;
        expect(root.style.isolation).toBe('');
    });
});

// final-review fix round 2: the "breathe" pan/zoom animation moved from animating
// background-size/background-position on the Frame's own root element (which silently
// overrode the `cover` default applyNodeStyle.ts sets, causing stretch distortion) to a
// SEPARATE, EMPTY, child-free background layer — mirroring MediaHeroNode.tsx's original
// bespoke architecture and this same file's pre-existing video-background layer pattern above.
describe('FrameNode — background breathe animation layer (final-review fix round 2: dedicated child-free layer, not background-size/position on the root)', () => {
    it('renders a breathe layer (data-breathe-id matching the node id) when background.type is "image", animate is "breathe", and value is set', () => {
        const node = {
            id: 'frame-breathe-1',
            type: 'FRAME',
            style: { background: { type: 'image', animate: 'breathe', value: 'https://example.com/bg.jpg' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const layer = container.querySelector('[data-breathe-id]');
        expect(layer).toBeTruthy();
        expect(layer!.getAttribute('data-breathe-id')).toBe('frame-breathe-1');
        expect((layer as HTMLElement).style.backgroundImage).toContain('https://example.com/bg.jpg');
    });

    it('does NOT render a breathe layer when background.value is missing', () => {
        const node = {
            id: 'frame-breathe-2',
            type: 'FRAME',
            style: { background: { type: 'image', animate: 'breathe' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        expect(container.querySelector('[data-breathe-id]')).toBeNull();
    });

    it('does NOT render a breathe layer when background.type is not "image" (e.g. "color")', () => {
        const node = {
            id: 'frame-breathe-3',
            type: 'FRAME',
            style: { background: { type: 'color', animate: 'breathe', value: '#fff' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        expect(container.querySelector('[data-breathe-id]')).toBeNull();
    });

    it('does NOT render a breathe layer when animate is unset', () => {
        const node = {
            id: 'frame-breathe-4',
            type: 'FRAME',
            style: { background: { type: 'image', value: 'https://example.com/bg.jpg' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        expect(container.querySelector('[data-breathe-id]')).toBeNull();
    });

    it('does NOT render a breathe layer when a video background is active (mutually exclusive by construction)', () => {
        const node = {
            id: 'frame-breathe-5',
            type: 'FRAME',
            style: { background: { type: 'video', value: 'https://example.com/bg.mp4' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        expect(container.querySelector('[data-breathe-id]')).toBeNull();
        expect(container.querySelector('video')).toBeTruthy();
    });

    it('sets isolation:isolate and overflow:hidden on the Frame root when the breathe layer is active', () => {
        const node = {
            id: 'frame-breathe-6',
            type: 'FRAME',
            style: { background: { type: 'image', animate: 'breathe', value: 'https://example.com/bg.jpg' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const root = container.firstElementChild as HTMLElement;
        expect(root.style.isolation).toBe('isolate');
        expect(root.style.overflow).toBe('hidden');
    });

    it('does NOT set isolation or overflow:hidden on the Frame root for a non-breathe background (regression guard for the pre-existing video-only isolation logic)', () => {
        const node = {
            id: 'frame-breathe-7',
            type: 'FRAME',
            style: { background: { type: 'image', value: 'https://example.com/bg.jpg' } },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const root = container.firstElementChild as HTMLElement;
        expect(root.style.isolation).toBe('');
        expect(root.style.overflow).toBe('');
    });
});

// final-review fix round 3 (#1): the video/breathe layers previously read raw
// `props.node.style?.background`, ignoring `responsiveOverrides` entirely — while the Frame's
// own root element (via `applyNodeStyle`) DOES cascade tablet/mobile overrides before computing
// CSS. A node with a desktop image + a DIFFERENT mobile-override image showed the mobile image
// on the root but the (stale) desktop image on the opaque covering layer on top of it.
describe('FrameNode — video/breathe layers respect responsiveOverrides (final-review fix round 3, #1)', () => {
    it('breathe layer uses the MOBILE override image, not the desktop base image, when device is "mobile"', () => {
        const node = {
            id: 'frame-resp-1',
            type: 'FRAME',
            style: { background: { type: 'image', animate: 'breathe', value: 'https://example.com/desktop.jpg' } },
            responsiveOverrides: {
                mobile: { style: { background: { type: 'image', animate: 'breathe', value: 'https://example.com/mobile.jpg' } } },
            },
            children: [],
        } as any;
        const mobileContext = { ...baseContext, device: () => 'mobile' as const };
        const { container } = render(() => <FrameNode node={node} context={mobileContext} />);
        const layer = container.querySelector('[data-breathe-id]') as HTMLElement;
        expect(layer).toBeTruthy();
        expect(layer.style.backgroundImage).toContain('https://example.com/mobile.jpg');
        expect(layer.style.backgroundImage).not.toContain('desktop.jpg');
    });

    it('breathe layer keeps the desktop base image when device is "desktop", even with a mobile override present', () => {
        const node = {
            id: 'frame-resp-2',
            type: 'FRAME',
            style: { background: { type: 'image', animate: 'breathe', value: 'https://example.com/desktop.jpg' } },
            responsiveOverrides: {
                mobile: { style: { background: { type: 'image', animate: 'breathe', value: 'https://example.com/mobile.jpg' } } },
            },
            children: [],
        } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const layer = container.querySelector('[data-breathe-id]') as HTMLElement;
        expect(layer).toBeTruthy();
        expect(layer.style.backgroundImage).toContain('https://example.com/desktop.jpg');
    });

    it('a per-breakpoint animate:\'none\' override disables the mobile breathe layer even though the desktop base has animate:\'breathe\'', () => {
        const node = {
            id: 'frame-resp-3',
            type: 'FRAME',
            style: { background: { type: 'image', animate: 'breathe', value: 'https://example.com/desktop.jpg' } },
            responsiveOverrides: {
                mobile: { style: { background: { type: 'image', animate: 'none', value: 'https://example.com/desktop.jpg' } } },
            },
            children: [],
        } as any;
        const mobileContext = { ...baseContext, device: () => 'mobile' as const };
        const { container } = render(() => <FrameNode node={node} context={mobileContext} />);
        expect(container.querySelector('[data-breathe-id]')).toBeNull();
    });

    it('breathe layer uses the TABLET override image when device is "tablet"', () => {
        const node = {
            id: 'frame-resp-4',
            type: 'FRAME',
            style: { background: { type: 'image', animate: 'breathe', value: 'https://example.com/desktop.jpg' } },
            responsiveOverrides: {
                tablet: { style: { background: { type: 'image', animate: 'breathe', value: 'https://example.com/tablet.jpg' } } },
            },
            children: [],
        } as any;
        const tabletContext = { ...baseContext, device: () => 'tablet' as const };
        const { container } = render(() => <FrameNode node={node} context={tabletContext} />);
        const layer = container.querySelector('[data-breathe-id]') as HTMLElement;
        expect(layer).toBeTruthy();
        expect(layer.style.backgroundImage).toContain('https://example.com/tablet.jpg');
    });
});

describe('FrameNode — accordion-item behavior (Phase A2a, 2026-08-21)', () => {
    function accordionNode(overrides: Record<string, unknown> = {}) {
        return {
            id: 'acc-1',
            type: 'FRAME',
            props: { behavior: { type: 'accordion-item', ...overrides } },
            children: [
                // NOTE: type 'text' (lowercase) — NOT 'TEXT' — matches the real `ENodeType.TEXT`
                // registry key (see node.constants.ts). These children render through
                // NodeChildrenList -> nodeRegistry (unlike the root node.type here, which is never
                // looked up since FrameNode is rendered directly), so an uppercase string would
                // silently resolve to the "unregistered node type" fallback <div> instead of
                // TextNode's real output — masking what these tests are meant to verify.
                { id: 'trigger-1', type: 'text', props: { text: 'Câu hỏi 1' }, children: [] },
                { id: 'body-1', type: 'text', props: { text: 'Câu trả lời 1' }, children: [] },
                { id: 'body-2', type: 'text', props: { text: 'Chi tiết thêm' }, children: [] },
            ],
        } as any;
    }

    it('renders child[0] inside a real <button>, children[1:] inside a separate body container', () => {
        const { container, getByText } = render(() => <FrameNode node={accordionNode()} context={baseContext} />);
        const button = container.querySelector('button');
        expect(button).toBeTruthy();
        expect(button!.textContent).toBe('Câu hỏi 1');
        // Body content is present in the DOM (default closed still renders it, just height:0 —
        // see the next test for the closed-state height assertion; this test only checks WHICH
        // content lives in the button vs the body container).
        expect(getByText('Câu trả lời 1')).toBeTruthy();
        expect(getByText('Chi tiết thêm')).toBeTruthy();
        expect(button!.textContent).not.toContain('Câu trả lời 1');
    });

    it('defaults to closed (height:0) when defaultOpen is unset, with aria-expanded="false"', () => {
        const { container } = render(() => <FrameNode node={accordionNode()} context={baseContext} />);
        const button = container.querySelector('button')!;
        expect(button.getAttribute('aria-expanded')).toBe('false');
        // NOT `querySelectorAll('div')[1]`: NodeRenderer (NodeRenderer.tsx) wraps EVERY child —
        // including the trigger's own TEXT child inside <button> — in its own `<div data-node-id=...>`,
        // so that div (nested inside the button) precedes the accordion's own body <div> in document
        // order. The body wrapper is reliably identified structurally instead: it's the <button>'s
        // next sibling (see the accordion branch in FrameNode.tsx — root div's only two children
        // are the <button> and the body <div ref={bodyRef}>).
        const body = button.nextElementSibling as HTMLElement;
        expect(body.style.height).toBe('0px');
    });

    it('defaultOpen:true renders the body at full height with aria-expanded="true", no click needed', () => {
        const { container } = render(() => <FrameNode node={accordionNode({ defaultOpen: true })} context={baseContext} />);
        const button = container.querySelector('button')!;
        expect(button.getAttribute('aria-expanded')).toBe('true');
        const body = button.nextElementSibling as HTMLElement;
        expect(body.style.height).toBe('auto');
    });

    it('clicking the trigger button toggles aria-expanded and the body height', () => {
        const { container } = render(() => <FrameNode node={accordionNode()} context={baseContext} />);
        const button = container.querySelector('button')!;
        const body = button.nextElementSibling as HTMLElement;
        expect(button.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(button);
        expect(button.getAttribute('aria-expanded')).toBe('true');
        // GSAP's .to() call is async/animated in a real browser, but this codebase's jsdom test
        // environment has no real rAF-driven layout — assert on the SIGNAL-DRIVEN state (aria-
        // expanded, which updates synchronously with the click) rather than the animated height,
        // which is a live/manual check per this task's own test-scope note below.
    });

    it('a Frame with no behavior (or a non-accordion type) renders its existing plain <div> unchanged — no <button>, no extra wrapper divs', () => {
        const node = { id: 'plain-1', type: 'FRAME', children: [{ id: 'c1', type: 'text', props: { text: 'Hello' }, children: [] }] } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        expect(container.querySelector('button')).toBeNull();
        // Exactly 2 divs: the Frame's own root div, plus the ONE div NodeRenderer (NodeRenderer.tsx)
        // always wraps around every child node (see its `data-node-id` wrapper) — that wrapper is
        // present for ANY node type, accordion or not, so it's part of the existing/unchanged
        // baseline, not something this task adds. TextNode itself renders a plain <p>, no div of
        // its own. The real assertion this task cares about is the one above: no <button>, i.e. no
        // accordion-specific branch was taken — this count just confirms no EXTRA (button/body)
        // divs were injected on top of that unchanged baseline.
        expect(container.querySelectorAll('div').length).toBe(2);
    });

    // final-review fix (Critical #1): the body wrapper's JSX used to bind `height` REACTIVELY
    // (`height: open() ? 'auto' : '0px'`), which made Solid's own render-effect write the
    // DESTINATION height straight into the DOM as part of the same synchronous reactive flush
    // triggered by the click — before the `createEffect` below it ever called `gsap.to()`. GSAP
    // then read a "current" value that was already equal to its target, so the tween was a no-op
    // (instant jump, not an animation). jsdom has no real layout engine so a test can't observe
    // the visual animation itself, but it CAN observe whether the DOM was pre-written before GSAP
    // got a chance to run — which is the actual mechanism of the bug.
    it('GSAP owns the height transition exclusively — Solid does not pre-write the destination height before GSAP animates (Fix 1)', () => {
        const gsapToSpy = vi.spyOn(gsap, 'to');
        const { container } = render(() => <FrameNode node={accordionNode()} context={baseContext} />);
        const button = container.querySelector('button')!;
        const body = button.nextElementSibling as HTMLElement;
        expect(body.style.height).toBe('0px');

        fireEvent.click(button); // open
        expect(button.getAttribute('aria-expanded')).toBe('true');
        // GSAP applies its tween asynchronously (next tick/rAF) — jsdom never advances that inside
        // this synchronous test. If Solid's reactive JSX binding had ALREADY written the
        // destination height straight into the DOM as part of this click's reactive flush (the
        // bug this test guards against), the element's inline height would already read 'auto'
        // right here. After the fix, nothing but GSAP ever touches this element's height post-
        // mount, so the DOM must still show the PRE-click value at this exact synchronous
        // checkpoint — proving GSAP's tween, once it does run, has a real 'from' value to animate
        // away from instead of starting already equal to its target.
        expect(body.style.height).toBe('0px');
        expect(gsapToSpy).toHaveBeenCalledWith(body, expect.objectContaining({ height: 'auto' }));

        gsapToSpy.mockClear();
        fireEvent.click(button); // close
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(gsapToSpy).toHaveBeenCalledWith(body, expect.objectContaining({ height: 0 }));

        gsapToSpy.mockRestore();
    });

    // final-review fix (Important #2): the bespoke AccordionListNode.tsx this feature replaces
    // conditionally REMOVED the body from the DOM entirely when closed (`{open() && (...)}`). The
    // new generic version always mounts it, just visually collapsed via height:0/overflow:hidden —
    // so without `inert`, any link/button an admin composes inside a closed accordion item stays
    // tabbable and screen-reader-visible.
    //
    // NOTE: asserted via the `.inert` DOM property, not `hasAttribute('inert')`. Solid's compiler
    // (babel-plugin-jsx-dom-expressions) classifies `inert` as an "HTMLElement prop" and compiles
    // it to a plain property assignment (`node.inert = value`), matching real browsers, which
    // implement `inert` as a property that reflects into both the attribute and the accessibility
    // tree/tab order. jsdom 28 (this test env) does not implement the `inert` IDL property at all —
    // confirmed directly: `'inert' in document.createElement('div')` is `false` — so
    // `hasAttribute('inert')` can never observe it here regardless of correctness; `.inert` is the
    // faithful proxy for what a real browser would do with Solid's compiled output.
    it('body wrapper is inert while closed and not inert once opened (Fix 2)', () => {
        const { container } = render(() => <FrameNode node={accordionNode()} context={baseContext} />);
        const button = container.querySelector('button')!;
        const body = button.nextElementSibling as HTMLElement & { inert: boolean };
        expect(body.inert).toBe(true);
        fireEvent.click(button);
        expect(body.inert).toBe(false);
    });

    // final-review fix (Important #3): `all: unset` on the trigger reset EVERY CSS property,
    // including `outline-style` → `none`, which beat the browser's own `:focus-visible` ring — a
    // keyboard user tabbing to the trigger saw no visible focus indicator at all.
    it('trigger button does not blanket-reset with all:unset, leaving the native focus-visible outline intact (Fix 3)', () => {
        const { container } = render(() => <FrameNode node={accordionNode()} context={baseContext} />);
        const button = container.querySelector('button')!;
        expect(button.style.getPropertyValue('all')).toBe('');
        expect(button.style.outline).not.toBe('none');
    });

    // final-review fix round 3 (#3): the accordion branch returns its own button/body JSX
    // BEFORE `{videoLayer()}`/`{breatheLayer()}` are ever called — it renders NEITHER layer —
    // but the shared `style()` computed used to add `isolation:isolate`/`overflow:hidden`
    // unconditionally whenever `isBreatheBackground()` was true, regardless of which branch was
    // rendering. That forced `overflow:hidden` onto an accordion's outer wrapper for no visual
    // benefit (no layer there to isolate), which could clip legitimate accordion content meant
    // to overflow (e.g. a dropdown/tooltip inside the body). `isAccordion()` now excludes both
    // the video and breathe side-effect styles on this branch.
    it('does NOT get isolation:isolate/overflow:hidden on the outer wrapper when it has a breathe background (Fix round 3, #3)', () => {
        const node = accordionNode();
        node.style = { background: { type: 'image', animate: 'breathe', value: 'https://example.com/bg.jpg' } };
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const root = container.firstElementChild as HTMLElement;
        expect(root.style.isolation).toBe('');
        expect(root.style.overflow).toBe('');
        // Confirms the reason the styles should be absent: neither layer is actually rendered
        // on this branch, so there is nothing for isolation/overflow to be protecting.
        expect(container.querySelector('[data-breathe-id]')).toBeNull();
        expect(container.querySelector('video')).toBeNull();
    });

    it('does NOT get isolation:isolate on the outer wrapper when it has a video background (Fix round 3, #3)', () => {
        const node = accordionNode();
        node.style = { background: { type: 'video', value: 'https://example.com/bg.mp4' } };
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const root = container.firstElementChild as HTMLElement;
        expect(root.style.isolation).toBe('');
        expect(container.querySelector('video')).toBeNull();
    });
});
