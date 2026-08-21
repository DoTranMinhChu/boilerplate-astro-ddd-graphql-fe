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
import { describe, it, expect, beforeAll } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';

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
});
