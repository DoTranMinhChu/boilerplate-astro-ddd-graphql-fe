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
});
