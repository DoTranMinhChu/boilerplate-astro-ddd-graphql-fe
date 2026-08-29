// src/modules/cms/chrome/SiteFooter.test.tsx
// @vitest-environment jsdom
//
// Same jsdom `matchMedia` gap as SiteHeader.test.tsx: SiteFooter.tsx statically imports
// `@/modules/cms/animation/useAnimate`, which statically imports `./presetRegistry`, which calls
// `gsap.registerPlugin(ScrollTrigger)` at MODULE-EVALUATION time — that registration reads
// `matchMedia`, which jsdom's `window` doesn't implement. Fixed the same way: stub
// `window.matchMedia` first, then reach `./SiteFooter` via a dynamic `import()` inside `beforeAll`
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

let SiteFooter: typeof import('./SiteFooter')['SiteFooter'];

beforeAll(async () => {
    ({ SiteFooter } = await import('./SiteFooter'));
}, 30000);

describe('SiteFooter', () => {
    it('renders with theme-token classes, not hardcoded hex (except the untouched OrbGlow)', () => {
        const { container } = render(() => <SiteFooter />);
        const footer = container.querySelector('footer')!;
        expect(footer.className).toContain('var(--color-surface)');
        // OrbGlow's own internal .ed-orb-gold class is untouched — only check SiteFooter's
        // OWN className strings, not descendant elements it doesn't control.
        expect(footer.className).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    });

    it('menu-driven column-header link hover uses the accent color token', () => {
        const { container } = render(() => (
            <SiteFooter footerMenuId="menu-1" />
        ));
        // No menu items resolve in this test (MenuService call isn't mocked), so this just
        // confirms the default-columns fallback path also carries no hardcoded hex anywhere
        // inside the footer's own static markup.
        const footer = container.querySelector('footer')!;
        expect(footer.innerHTML).not.toMatch(/#ed6aa8/);
        expect(footer.innerHTML).not.toMatch(/#b8b8b8/);
        expect(footer.innerHTML).not.toMatch(/#b4b4b4/);
        expect(footer.innerHTML).not.toMatch(/#f2f2f2/);
        expect(footer.innerHTML).not.toMatch(/#020202/);
    });

    it('variant unset: renders the default oversized-logo layout (today\'s exact rendering)', () => {
        const { container } = render(() => <SiteFooter />);
        const logo = container.querySelector('p')!; // the oversized logoText <p>
        expect(logo.className).toContain('md:text-[7vw]');
    });

    it('variant "minimal": no oversized logo, no outline-text band', () => {
        const { container } = render(() => <SiteFooter variant="minimal" logoText="Brand" />);
        const html = container.innerHTML;
        expect(html).not.toContain('7vw');
        expect(container.querySelector('[data-testid="footer-outline-text"]')).toBeNull();
    });

    it('variant "centered": columns are center-aligned', () => {
        const { container } = render(() => <SiteFooter variant="centered" />);
        const grid = container.querySelector('.grid')!;
        expect(grid.className).toContain('text-center');
    });

    it('variant "split-cta": renders exactly 2 blocks, no columns/outline-text', () => {
        const { container } = render(() => <SiteFooter variant="split-cta" />);
        // Positive, self-sufficient structural check: splitCtaEl()'s own grid div
        // (footer > outer-wrapper-div > grid-div) must have exactly 2 direct children
        // (the contact block + the heading/cta block) — this only passes when split-cta
        // rendering is genuinely the 2-block layout, unlike the data-testid absence checks
        // below which would also pass if split-cta rendered nothing at all.
        const grid = container.querySelector('footer > div > div')!;
        expect(grid.children.length).toBe(2);
        expect(container.querySelectorAll('[data-testid="footer-column"]').length).toBe(0);
        expect(container.querySelector('[data-testid="footer-outline-text"]')).toBeNull();
    });

    // I1 (final whole-branch review) — the outline-text band's `-webkit-text-stroke` was the one
    // hardcoded color that survived the plan's color-token conversion (`rgba(255,255,255,.08)`,
    // missed by prior greps which only checked hex + Tailwind named colors, never `rgba()`).
    // Checked only for 'default'/'centered' (the variants that actually render the outline-text
    // band — 'minimal'/'split-cta' render no such element at all, see the variant tests above).
    it('outline-text stroke uses a theme-token color-mix, not a hardcoded rgba() value (I1 fix)', () => {
        for (const variant of ['default', 'centered'] as const) {
            const { container, unmount } = render(() => <SiteFooter variant={variant} />);
            const outline = container.querySelector('[data-testid="footer-outline-text"]') as HTMLElement;
            expect(outline).not.toBeNull();
            expect(outline.getAttribute('style') || '').not.toMatch(/rgba\(/);
            expect(outline.style.getPropertyValue('-webkit-text-stroke')).toContain('var(--color-foreground)');
            unmount();
        }
    });

    it('variant with an unrecognized/invalid string falls back to the "default" layout, not split-cta', () => {
        const { container } = render(() => <SiteFooter variant={'bogus' as any} />);
        // default layout renders the oversized logo (a <p>) and the outline-text band;
        // split-cta renders neither (no logoEl() call at all, no outline-text band), so this
        // distinguishes "safely fell back to default" from "silently fell back to split-cta".
        const logo = container.querySelector('p')!;
        expect(logo.className).toContain('md:text-[7vw]');
        expect(container.querySelector('[data-testid="footer-outline-text"]')).not.toBeNull();
    });
});
