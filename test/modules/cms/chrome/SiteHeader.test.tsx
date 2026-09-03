// src/modules/cms/chrome/SiteHeader.test.tsx
// @vitest-environment jsdom
//
// Same jsdom `matchMedia` gap already hit + fixed by FrameNode.test.tsx (and the other
// primitive-test files it lists): SiteHeader.tsx statically imports
// `@/modules/cms/node/useNodeAnimation`, which statically imports `./applyAnimationTimeline`,
// which calls `gsap.registerPlugin(ScrollTrigger)` at MODULE-EVALUATION time — that registration
// reads `matchMedia`, which jsdom's `window` doesn't implement. Fixed the same way: stub
// `window.matchMedia` first, then reach `./SiteHeader` via a dynamic `import()` inside `beforeAll`
// — static imports are hoisted above any top-level stub placed after them, so a plain top-level
// assignment wouldn't run early enough.
// (Task 7, Motion System Unification: SiteHeader.tsx migrated from the old useAnimate/
// presetRegistry system to this AnimationTimeline/nodeAnimation one — this comment/stub updated
// to match, the underlying jsdom gap is identical either way.)
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

let SiteHeader: typeof import('@modules/cms/chrome/SiteHeader')['SiteHeader'];

beforeAll(async () => {
    ({ SiteHeader } = await import('@modules/cms/chrome/SiteHeader'));
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

    // N1 (post-re-review fix, regression) — a prior fix wrapped `ctaEl()`/`translationsEl()`/
    // `mobileButtonEl()` in a trailing `<div class="flex items-center gap-6">` to fix
    // `layoutVariant="split"` (see the "split" test below), but applied it to the SHARED
    // fallback branch used by BOTH 'split' and 'logo-left' (the default) — silently changing
    // 'logo-left' too. Pre-this-whole-plan (and correctly, post-N1-fix), a header with no
    // CTA/availableTranslations renders the mobile-menu `<button>` as a FLAT sibling of
    // `header > div` — `logo`, `nav`, `button` (3 elements; `ctaEl()`/`translationsEl()` render
    // nothing when unset, via their own `<Show>` guards). The regression instead nested that same
    // button one level deeper inside an always-present (even when visually empty) wrapper `<div>`
    // — `logo`, `nav`, `wrapperDiv > button`. Both states have an IDENTICAL raw `children.length`
    // of 3 (jsdom doesn't apply real CSS `display:none`-removed-from-flex semantics the way a
    // browser does, so a plain child-count assertion alone cannot distinguish them) — the actual
    // regression is structural: whether the last child is the `<button>` itself (correct) or a
    // `<div>` wrapping it (bug, changes `justify-between`'s real-browser flex-item count from 2
    // effective items to 3). Asserting `tagName` on the last child is what actually catches it —
    // verified by temporarily reverting the N1 fix: this assertion fails (`DIV`, not `BUTTON`)
    // against the pre-fix code and passes against the fix.
    it('layoutVariant unset (logo-left): CTA/translations/mobile-button render as flat siblings, not wrapped in an extra div (N1 regression fix)', () => {
        const { container } = render(() => <SiteHeader currentPath="/" />);
        const inner = container.querySelector('header > div')!;
        expect(inner.children.length).toBe(3);
        expect(inner.children[2].tagName).toBe('BUTTON');
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

    // Post-Phase-8 dogfooding find — phone (urgent-care hotline in the header)
    it('phone unset: no phone link rendered', () => {
        const { container } = render(() => <SiteHeader currentPath="/" />);
        expect(container.querySelector('[data-testid="header-phone"]')).toBeNull();
    });

    it('phone set: renders a tel: link with digits/+ only, label keeps the human-readable format', () => {
        const { container } = render(() => <SiteHeader currentPath="/" phone="0909 123 456" />);
        const phone = container.querySelector('[data-testid="header-phone"]') as HTMLAnchorElement;
        expect(phone).not.toBeNull();
        expect(phone.textContent).toContain('0909 123 456');
        expect(phone.getAttribute('href')).toBe('tel:0909123456');
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

    // Task 8 — motion tokens (chrome brand-aware & editable). Hardcoded Tailwind
    // `duration-*` classes are replaced with the `--motion-hover`/`--motion-ease-standard`
    // CSS vars already injected onto `<body>` by resolveThemeCssVars.ts, applied inline so the
    // theme (not a fixed Tailwind class) controls the actual timing.
    it('scroll-hide transition uses the theme motion-hover duration token, not a hardcoded class', () => {
        const { container } = render(() => <SiteHeader currentPath="/" />);
        const header = container.querySelector('header')!;
        expect(header.className).not.toContain('duration-300');
        // I2 (final whole-branch review) — the var() reference now carries a fallback
        // (`300ms`, Tailwind's own duration-300 value) so the declaration doesn't silently drop
        // when a theme has no `motion.duration` set (every admin-created theme today, since
        // Theme Manager never exposes a form field for it).
        expect((header as HTMLElement).style.transitionDuration).toBe('var(--motion-hover, 300ms)');
    });

    it('desktop nav dropdown transition uses the theme motion-hover duration token, not a hardcoded class', async () => {
        vi.mocked(MenuService.getMenuItemsByMenu).mockResolvedValue(MOCK_MENU_ITEMS);
        const { container } = render(() => <SiteHeader currentPath="/" headerMenuId="menu-1" />);
        await waitFor(() => {
            const dropdown = container.querySelector('div[class*="left-0"][class*="top-full"]');
            expect(dropdown).not.toBeNull();
        });
        const dropdown = container.querySelector('div[class*="left-0"][class*="top-full"]')!;
        expect(dropdown.className).not.toContain('duration-150');
        // I2 (final whole-branch review) — fallback added, see the scroll-hide test above.
        // N3 (post-re-review fix) — this dropdown was `duration-150` pre-this-plan (not 300ms
        // like the header's own scroll-hide transition), so its fallback must match: 150ms.
        expect((dropdown as HTMLElement).style.transitionDuration).toBe('var(--motion-hover, 150ms)');
    });

    it('language-switcher dropdown transition uses the theme motion-hover duration token, not a hardcoded class', () => {
        const { container } = render(() => (
            <SiteHeader currentPath="/" availableTranslations={[{ locale: 'en', path: '/en' }]} />
        ));
        const dropdown = container.querySelector('div[class*="right-0"][class*="top-full"]')!;
        expect(dropdown.className).not.toContain('duration-150');
        // N3 (post-re-review fix) — same correction as the nav dropdown test above: this dropdown
        // was also `duration-150` pre-this-plan, so its fallback is 150ms, not 300ms.
        expect((dropdown as HTMLElement).style.transitionDuration).toBe('var(--motion-hover, 150ms)');
    });

    // I3 (final whole-branch review) — layoutVariant="split" previously had zero test coverage
    // (a disclosed gap from the original plan's own Step 2 test list). This proves the new
    // trailing wrapper (ctaEl/translationsEl/mobileButtonEl grouped together) renders and
    // contains all 3 elements, which is what stops the CTA from landing on top of the
    // absolutely-centered nav under `justify-between`.
    it('layoutVariant "split": CTA/translations/mobile-button are grouped in one trailing wrapper', () => {
        const { container } = render(() => (
            <SiteHeader
                currentPath="/"
                layoutVariant="split"
                cta={{ label: 'Liên hệ', href: '/lien-he', variant: 'primary' }}
                availableTranslations={[{ locale: 'en', path: '/en' }]}
            />
        ));
        const inner = container.querySelector('header > div')!;
        // 3 direct children in the fallback branch's flex row: logo, nav, trailing wrapper —
        // down from 5 pre-fix (logo, nav, cta, translations, mobile-button).
        expect(inner.children.length).toBe(3);
        const wrapper = inner.children[2] as HTMLElement;
        expect(wrapper.querySelector('[data-testid="header-cta"]')).not.toBeNull();
        expect(wrapper.querySelector('button[aria-label="Mở menu"]')).not.toBeNull();
        expect(wrapper.querySelector('button[aria-label="Chuyển ngôn ngữ"]')).not.toBeNull();
        // N4 (post-re-review fix) — the assertions above (3 children, CTA inside child[2]) would
        // ALSO pass for 'logo-left' if N1's fix were undone (i.e. they don't distinguish split's
        // own actual defining behavior). The real thing 'split' does that 'logo-left' doesn't is
        // pull <nav> out of flow and absolutely-center it — assert that directly via navClass().
        const nav = inner.querySelector('nav')!;
        expect(nav.className).toContain('absolute');
    });

    // N4 (post-re-review fix) — the negative case: 'logo-left' (unset) must NOT get the
    // absolutely-centered nav treatment, so the "split" test above genuinely distinguishes the
    // two variants rather than asserting something true of both.
    it('layoutVariant unset (logo-left): <nav> is NOT absolutely positioned (N4 fix, distinguishes from split)', () => {
        const { container } = render(() => <SiteHeader currentPath="/" />);
        const nav = container.querySelector('nav')!;
        expect(nav.className).not.toContain('absolute');
    });

    // I4 (final whole-branch review) — the admin form exposes cta.label/href/variant as 3
    // independent optional fields, so an admin can clear label/href back to '' while the `cta`
    // object itself stays truthy. The old `<Show when={props.cta}>` guard would have rendered a
    // broken empty pill button; requiring both label AND href now hides it entirely.
    it('cta with empty label/href: no CTA button rendered (I4 fix)', () => {
        const { container } = render(() => (
            <SiteHeader currentPath="/" cta={{ label: '', href: '', variant: 'primary' }} />
        ));
        expect(container.querySelector('[data-testid="header-cta"]')).toBeNull();
    });

    // M7 (final whole-branch review) — onScroll() now runs once inside onMount, before the
    // listener is registered, so a page loaded already scrolled (deep-link / scroll-restoration)
    // starts with the correct overlaySolid state instead of assuming scroll 0. jsdom's `render`
    // (from @solidjs/testing-library) mounts synchronously and `window.scrollY`/`innerHeight`
    // are plain writable jsdom properties, so they can be set before `render()` runs and read
    // by the `onMount` callback during that same synchronous mount — no `waitFor` needed since
    // there's no async boundary between mount and the onMount effect running.
    it('bgVariant "transparent-overlay": already-scrolled on mount starts solid, not transparent (M7 fix)', () => {
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 1000 });
        const { container } = render(() => <SiteHeader currentPath="/" bgVariant="transparent-overlay" />);
        const header = container.querySelector('header')!;
        expect(header.className).toContain('bg-[var(--color-background)]/95');
        // Reset so later tests in this file (which assume scroll 0) aren't polluted.
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    });

    // N2 (post-re-review fix, regression) — the M7 fix above called the FULL `onScroll()` inside
    // `onMount`, which ALSO computes `setHidden(current > lastScroll && current > 200)`. Since
    // `lastScroll` is still its `0` initializer at mount time, this set `hidden` to `true`
    // immediately for ANY `scrollY > 200` on load — sliding the header off-screen
    // (`translateY(-100%)`) the instant the page loads, for every `bgVariant`, not just
    // 'transparent-overlay'. The M7 test above only ever checked the background class, never the
    // transform, so it never caught this. Fixed by seeding `lastScroll` from the current scroll
    // position and calling `setOverlaySolid(...)` directly in `onMount`, without touching
    // `hidden` at all at mount time (matching pre-this-fix-round behavior, where `hidden` only
    // ever changes in response to a real scroll event). Verified by temporarily reverting the N2
    // fix: this assertion fails (`translateY(-100%)`) against the pre-fix code and passes against
    // the fix.
    it('already-scrolled on mount does NOT hide the header (N2 regression fix)', () => {
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 1000 });
        const { container } = render(() => <SiteHeader currentPath="/" />);
        const header = container.querySelector('header')! as HTMLElement;
        expect(header.style.transform).toBe('translateY(0)');
        // Reset so later tests in this file (which assume scroll 0) aren't polluted.
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    });

    // User visual-quality review (Post-Phase-8 extension) — reproduced live at a common laptop
    // viewport (1440px): with no `shrink-0`/`whitespace-nowrap` on the nav links/CTA, a flex row
    // slightly short on space shrinks each item below its natural single-line width instead of
    // the row overflowing — multi-word nav labels ("Dịch vụ", "Hỏi đáp") and the CTA ("Đặt lịch
    // khám") each wrapped mid-label onto 2 lines, and the whole header still ended up wider than
    // the viewport (a horizontal scrollbar on the page). No nav label should ever wrap.
    it('nav links, logo, and CTA all carry shrink-0 + whitespace-nowrap, so none can wrap mid-label under space pressure', () => {
        const { container } = render(() => (
            <SiteHeader currentPath="/" navLinks={[{ label: 'Dịch vụ', href: '/dich-vu' }]} cta={{ label: 'Đặt lịch khám', href: '#dat-lich', variant: 'primary' }} />
        ));
        const nav = container.querySelector('nav[data-anim-target="nav"]')!;
        expect(nav.className).toContain('shrink-0');
        expect(nav.className).toContain('whitespace-nowrap');
        const logo = container.querySelector('a[data-anim-target="logo"]')!;
        expect(logo.className).toContain('shrink-0');
        expect(logo.className).toContain('whitespace-nowrap');
        const cta = container.querySelector('[data-testid="header-cta"]')!;
        expect(cta.className).toContain('shrink-0');
        expect(cta.className).toContain('whitespace-nowrap');
    });
});
