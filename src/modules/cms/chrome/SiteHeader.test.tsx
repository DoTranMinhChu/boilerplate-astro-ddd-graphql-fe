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
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@solidjs/testing-library';
import { MenuService } from '@/shared/services/menu/menu.service';

// Task 6 mega-menu tests — MenuService is mocked the same way NodePalette.test.tsx already
// established for a service call used by a component reached via this file's own dynamic
// `import()` (see the `beforeAll` below): a top-level (hoisted) `vi.mock` + per-test
// `vi.mocked(...).mockResolvedValue(...)`. `vi.mock` is hoisted above ALL imports (including ones
// reached via a later dynamic `import()`), so it reliably intercepts SiteHeader.tsx's own static
// `import { MenuService } from '@/shared/services/menu/menu.service'` even though SiteHeader
// itself is only reached dynamically below.
vi.mock('@/shared/services/menu/menu.service', () => ({
    MenuService: { getMenuItemsByMenu: vi.fn() },
}));

// One top-level menu item ('Dịch vụ') with 2 children — the minimal shape buildMenuTree()
// (menuTree.ts) needs to produce a MenuTreeNode with children.length > 0, which is what makes
// navEl() render the dropdown <div> under test. Cast `as any` for targetType (EMenuItemTargetType
// generated enum — plain string literals are runtime-equivalent and match this file's existing
// lightweight-mock convention, e.g. NodePalette.test.tsx's `{ edges: [] } as any`).
const MOCK_MENU_ITEMS = [
    { id: 'm1', menuId: 'menu-1', parentId: '', order: 0, label: 'Dịch vụ', targetType: 'URL', url: '/dich-vu' },
    { id: 'm1a', menuId: 'menu-1', parentId: 'm1', order: 0, label: 'Thiết kế', targetType: 'URL', url: '/thiet-ke' },
    { id: 'm1b', menuId: 'menu-1', parentId: 'm1', order: 1, label: 'Thi công', targetType: 'URL', url: '/thi-cong' },
] as any;

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

beforeEach(() => {
    vi.mocked(MenuService.getMenuItemsByMenu).mockReset();
    // Default: empty result — matches `headerMenuId` being unset in most tests below, so the
    // `createResource` fetcher (whose source is `() => props.headerMenuId`) never even runs for
    // those; this default only matters for the mega-menu tests that DO pass a `headerMenuId` and
    // override it via `mockResolvedValue(MOCK_MENU_ITEMS)`.
    vi.mocked(MenuService.getMenuItemsByMenu).mockResolvedValue([]);
});

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

    // Task 6 — CTA button (chrome brand-aware & editable)
    it('cta unset: no CTA button rendered', () => {
        const { container } = render(() => <SiteHeader currentPath="/" />);
        expect(container.querySelector('[data-testid="header-cta"]')).toBeNull();
    });

    it('cta set: renders a themed button with the right label/href/variant class', () => {
        const { container } = render(() => (
            <SiteHeader currentPath="/" cta={{ label: 'Liên hệ', href: '/lien-he', variant: 'primary' }} />
        ));
        const cta = container.querySelector('[data-testid="header-cta"]') as HTMLAnchorElement;
        expect(cta).not.toBeNull();
        expect(cta.textContent).toBe('Liên hệ');
        expect(cta.getAttribute('href')).toBe('/lien-he');
        expect(cta.className).toContain('var(--color-primary)');
    });

    it('cta variant "secondary": uses the secondary color tokens', () => {
        const { container } = render(() => (
            <SiteHeader currentPath="/" cta={{ label: 'Xem thêm', href: '/xem-them', variant: 'secondary' }} />
        ));
        const cta = container.querySelector('[data-testid="header-cta"]')!;
        expect(cta.className).toContain('var(--color-secondary)');
    });

    // Task 6 — mega-menu (chrome brand-aware & editable). Both tests below drive the dropdown
    // through the real `headerMenuId` + mocked `MenuService.getMenuItemsByMenu` path (see the
    // top-level `vi.mock` + `MOCK_MENU_ITEMS` above) rather than the `navLinks` fallback, since
    // only menu-tree items carry the `children`/dropdown structure the mega-menu class applies
    // to — `navLinks` is a flat list with no dropdown at all. The dropdown <div> is located via
    // `left-0` + `top-full` (unique to the nav-item dropdown in this file — the translations
    // dropdown next to it uses `right-0`, and `availableTranslations` isn't passed here so that
    // block doesn't even render), then awaited via `waitFor` since `menuItems` is an async
    // `createResource` (mock resolves on a microtask, not synchronously within `render`).
    it('megaMenu false/unset: dropdown is a narrow single-column list (today\'s default)', async () => {
        vi.mocked(MenuService.getMenuItemsByMenu).mockResolvedValue(MOCK_MENU_ITEMS);
        const { container } = render(() => <SiteHeader currentPath="/" headerMenuId="menu-1" />);
        await waitFor(() => {
            const dropdown = container.querySelector('div[class*="left-0"][class*="top-full"]');
            expect(dropdown).not.toBeNull();
        });
        const dropdown = container.querySelector('div[class*="left-0"][class*="top-full"]')!;
        expect(dropdown.className).toContain('min-w-[180px]');
        expect(dropdown.className).not.toContain('grid-cols-3');
    });

    it('megaMenu true: dropdown renders a multi-column grid class', async () => {
        vi.mocked(MenuService.getMenuItemsByMenu).mockResolvedValue(MOCK_MENU_ITEMS);
        const { container } = render(() => <SiteHeader currentPath="/" headerMenuId="menu-1" megaMenu={true} />);
        await waitFor(() => {
            const dropdown = container.querySelector('div[class*="left-0"][class*="top-full"]');
            expect(dropdown).not.toBeNull();
        });
        const dropdown = container.querySelector('div[class*="left-0"][class*="top-full"]')!;
        expect(dropdown.className).toContain('grid grid-cols-3');
    });
});
