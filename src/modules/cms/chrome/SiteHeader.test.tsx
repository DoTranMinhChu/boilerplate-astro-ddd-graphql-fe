// src/modules/cms/chrome/SiteHeader.test.tsx
// @vitest-environment jsdom
//
// Same jsdom `matchMedia` gap already hit + fixed by FrameNode.test.tsx (and the other
// primitive-test files it lists): SiteHeader.tsx statically imports
// `@/modules/cms/animation/useAnimate`, which statically imports `./presetRegistry`, which calls
// `gsap.registerPlugin(ScrollTrigger)` at MODULE-EVALUATION time — that registration reads
// `matchMedia`, which jsdom's `window` doesn't implement. Fixed the same way: stub
// `window.matchMedia` first, then reach `./SiteHeader` via a dynamic `import()` inside `beforeAll`
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

let SiteHeader: typeof import('./SiteHeader')['SiteHeader'];

beforeAll(async () => {
    ({ SiteHeader } = await import('./SiteHeader'));
}, 30000);

describe('SiteHeader', () => {
    it('renders with theme-token background/foreground classes, not hardcoded hex', () => {
        const { container } = render(() => <SiteHeader currentPath="/" />);
        const header = container.querySelector('header')!;
        expect(header.className).toContain('var(--color-background)');
        expect(header.className).not.toMatch(/#[0-9a-fA-F]{3,6}/);
        expect(header.className).not.toContain('bg-black');
    });

    it('active nav link uses the accent color token', () => {
        const { container } = render(() => (
            <SiteHeader currentPath="/trang-chu" navLinks={[{ label: 'Trang chủ', href: '/trang-chu' }]} />
        ));
        // Scoped to `nav` — the logo link ALSO has href="/trang-chu" always (it's the default
        // home link, not a color-bearing element) and renders before `nav` in DOM order, so an
        // unscoped `a[href="/trang-chu"]` selector matches the logo first, not the nav item this
        // test means to assert on.
        const link = container.querySelector('nav a[href="/trang-chu"]')!;
        expect(link.className).toContain('var(--color-accent)');
        expect(link.className).not.toContain('#ed6aa8');
    });

    // Task 5 — bgVariant + layoutVariant (chrome brand-aware & editable)
    it('bgVariant "blur": renders a translucent+blur background at all scroll positions', () => {
        const { container } = render(() => <SiteHeader currentPath="/" bgVariant="blur" />);
        const header = container.querySelector('header')!;
        expect(header.className).toContain('backdrop-blur-lg');
        expect(header.className).toContain('/60');
    });

    it('bgVariant "transparent-overlay": starts with no background class', () => {
        const { container } = render(() => <SiteHeader currentPath="/" bgVariant="transparent-overlay" />);
        const header = container.querySelector('header')!;
        expect(header.className).not.toContain('bg-[var(--color-background)]');
    });

    it('bgVariant unset: defaults to solid (today\'s exact rendering)', () => {
        const { container } = render(() => <SiteHeader currentPath="/" />);
        const header = container.querySelector('header')!;
        expect(header.className).toContain('bg-[var(--color-background)]/95');
    });

    it('layoutVariant "centered": logo is in the middle column, nav split left/right', () => {
        const { container } = render(() => (
            <SiteHeader currentPath="/" layoutVariant="centered" navLinks={[{ label: 'A', href: '/a' }, { label: 'B', href: '/b' }]} />
        ));
        const inner = container.querySelector('header > div')!;
        expect(inner.className).toContain('grid-cols-3');
    });

    it('layoutVariant unset: defaults to logo-left (today\'s exact rendering)', () => {
        const { container } = render(() => <SiteHeader currentPath="/" />);
        const inner = container.querySelector('header > div')!;
        expect(inner.className).toContain('justify-between');
    });
});
