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
import { render } from '@solidjs/testing-library';

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
