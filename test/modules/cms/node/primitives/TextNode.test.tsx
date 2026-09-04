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
import { describe, it, expect, beforeAll, vi, type Mock } from 'vitest';
import { render } from '@solidjs/testing-library';
import type { StyleObject } from '@modules/cms/node/node.types';

// final-review fix (Critical #1 regression guard): every existing "typography role -> semantic
// tag" test below only ever asserted the TAG NAME rendered correctly — none of them proved the
// `use:nodeAnimation` directive's animation setup actually RAN against the real element, which is
// exactly the class of gap that let the `<Dynamic ... use:nodeAnimation={...}>` regression ship
// invisibly (Solid's `use:` directive only compiles to a real directive call on a native,
// compile-time-known tag; on `<Dynamic>` it silently degrades to a dead `setAttribute`). Mocking
// `applyAnimationTimeline` (the function `useNodeAnimation.ts`'s `nodeAnimation` directive calls
// from inside its `onMount`) lets these new tests prove the directive's setup logic genuinely
// executed against the mounted DOM element, not just that the tag name is correct.
//
// Task 10 (perf/scale): `applyAnimationTimeline` is now async (returns `Promise<() => void>`) —
// `useNodeAnimation.ts`'s directive calls `.then()` on its return value, which throws if the mock
// returns a bare function instead of a thenable. Resolved value wrapped in `Promise.resolve(...)`
// accordingly; every assertion below only checks the mock's CALL (which still happens
// synchronously, inside `onMount`, before the `.then()`), not anything from inside the `.then()`
// callback, so no other change is needed here.
vi.mock('@modules/cms/node/applyAnimationTimeline', () => ({
    applyAnimationTimeline: vi.fn(() => Promise.resolve(() => {})),
}));
import { applyAnimationTimeline } from '@modules/cms/node/applyAnimationTimeline';

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

let TextNode: typeof import('@modules/cms/node/primitives/TextNode')['TextNode'];

beforeAll(async () => {
    ({ TextNode } = await import('@modules/cms/node/primitives/TextNode'));
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

    // User visual-quality review (Post-Phase-8 extension): reproduced live on VELTRA's stat band —
    // "42000" at the theme's large display font-size wrapped mid-digit ("4200" / "0" on the next
    // line) once its box got narrow relative to the rendered text width. A stat number must never
    // wrap mid-digit regardless of container width or animation-frame timing.
    it('the count-up <p> wrapper always sets white-space:nowrap, so a large number can never wrap mid-digit', () => {
        const node = { id: 'n1', type: 'text', props: { text: '42000', countUp: true }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        expect(container.querySelector('p')?.style.whiteSpace).toBe('nowrap');
    });
});

describe('TextNode — typography role -> semantic tag (Task 11)', () => {
    it.each([
        ['display', 'H1'], ['h1', 'H1'], ['h2', 'H2'], ['h3', 'H3'], ['h4', 'H4'],
        ['bodyLg', 'P'], ['body', 'P'], ['small', 'P'], ['caption', 'P'],
    ] as const)('role "%s" renders a <%s> tag', (role, expectedTag) => {
        const node = { id: 'n1', type: 'text', props: { text: 'Hello' }, style: { typography: { role } }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        const el = container.querySelector(expectedTag.toLowerCase());
        expect(el).not.toBeNull();
        expect(el?.textContent).toBe('Hello');
    });

    it('renders a <p> (unchanged default) when no role is set', () => {
        const node = { id: 'n1', type: 'text', props: { text: 'Hello' }, style: {}, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        expect(container.querySelector('p')).not.toBeNull();
        expect(container.querySelector('h1,h2,h3,h4')).toBeNull();
    });
});

describe('TextNode — spotlightReveal data-label (SpotlightList close-out, 2026-08-22)', () => {
    it('renders data-label matching its own text when spotlightReveal is true', () => {
        const node = { id: 'n1', type: 'text', props: { text: 'Bán lẻ', spotlightReveal: true }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        expect(container.querySelector('p')?.getAttribute('data-label')).toBe('Bán lẻ');
    });

    it('does not render data-label when spotlightReveal is unset (regression guard)', () => {
        const node = { id: 'n1', type: 'text', props: { text: 'Bán lẻ' }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        expect(container.querySelector('p')?.hasAttribute('data-label')).toBe(false);
    });
});

describe('TextNode — animationRef directive actually runs on the plain-text branch (Critical #1 fix)', () => {
    it('runs the nodeAnimation directive\'s setup (applyAnimationTimeline) against the real <Dynamic>-rendered element (role -> <h1>), not just a matching tag name', () => {
        (applyAnimationTimeline as Mock).mockClear();
        const timeline = { trigger: 'onLoad', keyframes: [{ property: 'opacity', to: 1, duration: 0.4 }] };
        const node = { id: 'n1', type: 'text', props: { text: 'Animated Heading' }, style: { typography: { role: 'h1' } }, animationRef: timeline, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        const h1 = container.querySelector('h1');
        expect(h1).not.toBeNull();
        expect(h1!.textContent).toBe('Animated Heading');
        // The bug this guards: on the `<Dynamic>` branch, `use:nodeAnimation` used to compile to a
        // dead `setAttribute`, so `applyAnimationTimeline` (called from inside the directive's own
        // `onMount`) NEVER fired for this branch at all — the tag rendered correctly, but the
        // animation setup silently never ran.
        expect(applyAnimationTimeline).toHaveBeenCalledTimes(1);
        const [calledEl, calledTimeline] = (applyAnimationTimeline as Mock).mock.calls[0];
        expect(calledEl).toBe(h1);
        expect(calledTimeline).toEqual(timeline);
    });

    it('also runs for the default (no role, plain <p>) tag on the same Dynamic branch', () => {
        (applyAnimationTimeline as Mock).mockClear();
        const timeline = { trigger: 'onLoad', keyframes: [{ property: 'opacity', to: 1, duration: 0.4 }] };
        const node = { id: 'n1', type: 'text', props: { text: 'Plain animated' }, animationRef: timeline, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        const p = container.querySelector('p');
        expect(p).not.toBeNull();
        expect(applyAnimationTimeline).toHaveBeenCalledTimes(1);
        expect((applyAnimationTimeline as Mock).mock.calls[0][0]).toBe(p);
    });

    it('does not run applyAnimationTimeline when animationRef is unset (regression guard — no false positive)', () => {
        (applyAnimationTimeline as Mock).mockClear();
        const node = { id: 'n1', type: 'text', props: { text: 'No animation' }, style: { typography: { role: 'h2' } }, children: [] } as any;
        render(() => <TextNode node={node} context={baseContext} />);
        expect(applyAnimationTimeline).not.toHaveBeenCalled();
    });
});
