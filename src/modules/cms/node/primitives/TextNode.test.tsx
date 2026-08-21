// src/modules/cms/node/primitives/TextNode.test.tsx
// @vitest-environment jsdom
//
// Same jsdom `matchMedia` gap already hit + fixed by nodeRegistry.test.ts/CustomCodeNode.test.ts/
// ContentDetailNode.test.tsx/FeaturedEntryNode.test.tsx/ProjectShowcaseNode.test.tsx/
// LogoGridNode.test.tsx/MixedFeedNode.test.tsx: TextNode.tsx statically imports
// `../useNodeAnimation`, which statically imports `./applyAnimationTimeline`, which calls
// `gsap.registerPlugin(ScrollTrigger)` at MODULE-EVALUATION time — that registration reads
// `matchMedia`, which jsdom's `window` doesn't implement. Fixed the same way: stub
// `window.matchMedia` first, then reach `./TextNode` via a dynamic `import()` inside `beforeAll`
// — static imports are hoisted above any top-level stub placed after them, so a plain top-level
// assignment wouldn't run early enough.
import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@solidjs/testing-library';
import type { StyleObject } from '../node.types';

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

// jsdom does not implement IntersectionObserver. TextNode's new count-up mode ports
// StatMetricsNode's CountUpValue, which calls `new IntersectionObserver(...)` in onMount —
// without this stub that constructor call throws under jsdom. No existing test-setup file in
// this repo provides one (StatMetricsNode.tsx itself has no test file), so this is the first
// test to need it. The stub's observe() never actually fires a callback, so the count-up
// animation never progresses in these tests — that's expected; tests here assert the initial
// (pre-intersection) render state, not the live animation (manual/live-verification only).
if (!('IntersectionObserver' in window)) {
    (window as any).IntersectionObserver = class {
        constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
            return [];
        }
    };
}

let TextNode: typeof import('./TextNode')['TextNode'];

beforeAll(async () => {
    ({ TextNode } = await import('./TextNode'));
}, 30000);

// Matches the established primitive-test convention in this directory (see
// LogoGridNode.test.tsx) — a plain `as any` context/node rather than a full typed fixture.
const baseContext = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;

function makeNode(style: StyleObject, text = 'CAT BOX') {
    return { id: 'n1', type: 'TEXT', props: { text }, style, children: [] } as any;
}

describe('TextNode — typography.color rendering', () => {
    it('renders a plain <p> with inline color for solid mode', () => {
        const { container } = render(() => <TextNode node={makeNode({ typography: { color: { type: 'solid', value: '#f2f2f2ff' } } })} context={baseContext} />);
        const p = container.querySelector('p');
        expect(p).toBeTruthy();
        expect(p!.textContent).toBe('CAT BOX');
        // jsdom (matching real-browser CSSOM serialization) canonicalizes a fully-opaque hex8
        // to rgb() when read back off a rendered element's `.style` — genuine unchanged
        // behavior of the existing (Task 4) solid branch, not something this task touches.
        expect(p!.style.color).toBe('rgb(242, 242, 242)');
        expect(container.querySelector('video')).toBeNull();
    });

    it('renders a plain <p> with background-clip:text for image mode', () => {
        const { container } = render(() => (
            <TextNode node={makeNode({ typography: { color: { type: 'image', value: 'https://example.com/a.jpg' } } })} context={baseContext} />
        ));
        const p = container.querySelector('p');
        expect(p).toBeTruthy();
        // Same DOM-round-trip canonicalization as above: the CSSOM getter quotes url(...).
        expect(p!.style.backgroundImage).toBe('url("https://example.com/a.jpg")');
        expect(container.querySelector('video')).toBeNull();
    });

    it('renders a <video> + SVG mask pair for video mode, with the real text as an accessible label', () => {
        const { container } = render(() => (
            <TextNode node={makeNode({ typography: { color: { type: 'video', value: 'https://example.com/clip.mp4' } } }, 'TETTA')} context={baseContext} />
        ));
        const video = container.querySelector('video');
        expect(video).toBeTruthy();
        expect(video!.getAttribute('src')).toBe('https://example.com/clip.mp4');
        expect(video!.hasAttribute('autoplay')).toBe(true);
        expect(video!.hasAttribute('muted')).toBe(true);
        expect(video!.hasAttribute('loop')).toBe(true);
        expect(container.querySelector('svg mask text')?.textContent).toBe('TETTA');
        expect(container.querySelector('[aria-label="TETTA"]')).toBeTruthy();
    });

    it('video mode is masked to the video element via a generated element id (mask/-webkit-mask both point at it)', () => {
        const { container } = render(() => (
            <TextNode node={makeNode({ typography: { color: { type: 'video', value: 'https://example.com/clip.mp4' } } })} context={baseContext} />
        ));
        const video = container.querySelector('video') as HTMLVideoElement;
        const mask = container.querySelector('svg mask') as SVGMaskElement;
        expect(mask.id).toBeTruthy();
        // Same DOM-round-trip canonicalization as the solid/image tests above: the CSSOM
        // getter quotes the url(...) argument.
        expect(video.style.getPropertyValue('mask')).toBe(`url("#${mask.id}")`);
        expect(video.style.getPropertyValue('-webkit-mask')).toBe(`url("#${mask.id}")`);
    });

    // final-review fix (Important #2): TypographyColorControl's STARTER_VALUE seeds `video: ''`
    // the instant an admin picks "Video" from the type dropdown — before this fix, `isVideoFill()`
    // had no guard on `value` being non-empty, so the node fell into the video branch and rendered
    // `<video src="">`, which browsers resolve against the current document URL (i.e. can attempt
    // to load the HTML page itself as a media source).
    it('falls back to the plain <p> (not a <video>) when type is "video" but value is empty', () => {
        const { container } = render(() => (
            <TextNode node={makeNode({ typography: { color: { type: 'video', value: '' } } }, 'CAT BOX')} context={baseContext} />
        ));
        const p = container.querySelector('p');
        expect(p).toBeTruthy();
        expect(p!.textContent).toBe('CAT BOX');
        expect(container.querySelector('video')).toBeNull();
    });
});

describe('TextNode — rich text (local-repeater close-out, 2026-08-21)', () => {
    it('renders sanitized HTML via innerHTML into a <div> (NOT <p>) when props.richText is true', () => {
        // final-review fix: rich text is block content (<p>...</p>) by construction (every
        // richtext-control field in this codebase produces that shape) — a <p> cannot legally
        // contain another <p>, and setting innerHTML with block content on a <p> only "works"
        // client-side; the SSR'd/re-parsed page auto-closes the outer <p> and hoists the real
        // content out as siblings of an empty styled <p>, silently detaching every inline style,
        // the hover-CSS system, and use:nodeAnimation from the actual visible content.
        const node = { id: 'n1', type: 'text', props: { text: '<p>Xin <strong>chào</strong></p>', richText: true }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        // The OUTER wrapper (the styled/animated element) must be a <div> — the <p> inside is
        // the sanitized content itself (fine, a <p> may nest inside a <div>), the bug this test
        // guards is a <p> WRAPPER, which cannot legally contain block content.
        expect(container.firstElementChild?.tagName).toBe('DIV');
        const wrapper = container.querySelector('div')!;
        expect(wrapper.innerHTML).toContain('<strong>chào</strong>');
    });

    it('strips a script tag via DOMPurify even when richText is true', () => {
        const node = { id: 'n1', type: 'text', props: { text: '<img src=x onerror="alert(1)">safe text', richText: true }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        expect(container.querySelector('div')!.innerHTML).not.toContain('onerror');
        expect(container.textContent).toContain('safe text');
    });

    it('plain-text mode is unaffected when richText is unset (regression guard)', () => {
        const node = { id: 'n1', type: 'text', props: { text: '<p>literal tags shown as text</p>' }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        expect(container.querySelector('p')!.textContent).toBe('<p>literal tags shown as text</p>');
    });
});

describe('TextNode — count-up (StatMetrics close-out, 2026-08-21)', () => {
    it('renders the count-up mechanism when countUp is true and the resolved value is numeric', () => {
        const node = { id: 'n1', type: 'text', props: { text: '500', countUp: true }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        // Initial render is 0 (animation hasn't fired yet — IntersectionObserver hasn't intersected in jsdom)
        expect(container.querySelector('span')?.textContent).toBe('0');
    });

    it('falls back to plain rendering when countUp is true but the value is not numeric', () => {
        const node = { id: 'n1', type: 'text', props: { text: 'not a number', countUp: true }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        expect(container.textContent).toBe('not a number');
    });

    it('plain-text mode is unaffected when countUp is unset (regression guard)', () => {
        const node = { id: 'n1', type: 'text', props: { text: '500' }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        expect(container.querySelector('p')?.textContent).toBe('500');
    });

    it('falls back to plain rendering (not an animated "0") when the bound value is empty/missing', () => {
        const node = { id: 'n1', type: 'text', props: { text: '', countUp: true }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        expect(container.querySelector('span')).toBeNull();
        expect(container.querySelector('p')?.textContent).toBe('');
    });

    it('does not count-up an itemIndex-bound value, preserving its zero-padded ordinal string', () => {
        const node = { id: 'n1', type: 'text', props: { countUp: true }, dataBinding: { mode: 'itemIndex' }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={{ ...baseContext, contextEntryIndex: 0 }} />);
        expect(container.querySelector('span')).toBeNull();
        expect(container.querySelector('p')?.textContent).toBe('01');
    });
});
