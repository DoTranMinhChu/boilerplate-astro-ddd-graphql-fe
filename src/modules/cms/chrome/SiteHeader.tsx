import { For, Show, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import type { HeaderCta, NavLink } from '@/shared/services/headerPreset/headerPreset.service';
import { MenuService } from '@/shared/services/menu/menu.service';
import { buildMenuTree, resolveMenuItemHref } from '@/modules/cms/chrome/menuTree';
import { nodeAnimation } from '@/modules/cms/node/useNodeAnimation';
import type { AnimationTimeline } from '@/modules/cms/node/animationTimeline.types';

// use:nodeAnimation cần import `nodeAnimation` được reference tĩnh — giữ dòng dưới để
// Solid không tree-shake mất import khi chỉ dùng qua directive (xem HeroSection.tsx).
void nodeAnimation;

const DEFAULT_NAV_LINKS: NavLink[] = [
    { label: 'Trang chủ', href: '/trang-chu' },
    { label: 'Giới thiệu', href: '/gioi-thieu' },
    { label: 'Dịch vụ', href: '/dich-vu' },
    { label: 'Dự án', href: '/du-an' },
    { label: 'Bài viết', href: '/bai-viet' },
    { label: 'Liên hệ', href: '/lien-he' },
];

/** Bộ chuyển ngôn ngữ (Phase 3 mục 3, Task 15) — 1 bản dịch PUBLISHED khác locale
 * đang xem, cùng translationGroupId (xem resolveCmsPageProps.ts `availableTranslations`). */
export interface PageTranslationLink {
    locale: string;
    path: string;
}

/** Site-wide navigation header for the editorial section family — NOT part of the
 * per-page Section model (see PageBuilder), it wraps every public route via
 * CmsPageShell.astro. Content comes from the HeaderPreset the current page resolves
 * to (own choice or the default preset — see PageResolver.resolveHeaderFooter);
 * falls back to sensible defaults when nothing has been configured yet, so the
 * site never renders with an empty nav.
 * Sticky (not overlay-fixed) so no section needs header-height offset padding.
 * Mobile nav is a simple collapse, not the reference design's full-screen
 * editorial menu — a deliberately smaller scope for now. */
export function SiteHeader(props: {
    currentPath: string;
    logoText?: string;
    navLinks?: NavLink[];
    headerMenuId?: string;
    animation?: AnimationTimeline;
    availableTranslations?: PageTranslationLink[];
    /** Mirrors HeaderPresetDTO.bgVariant (Task 2) — kept as a local literal union rather than
     * importing the DTO type, same convention as `navLinks: NavLink[]` above (the DTO's raw
     * codegen type is the untyped GraphQL `String` scalar, not this literal union). */
    bgVariant?: 'solid' | 'transparent-overlay' | 'blur';
    /** Mirrors HeaderPresetDTO.layoutVariant (Task 2) — same convention as `bgVariant` above. */
    layoutVariant?: 'logo-left' | 'centered' | 'split';
    /** Mirrors HeaderPresetDTO.cta (Task 2/6) — imported directly (not re-declared as a local
     * literal union like bgVariant/layoutVariant above) since HeaderCta is already its own named
     * interface in headerPreset.service.ts, same convention as `navLinks?: NavLink[]`. */
    cta?: HeaderCta;
    /** Mirrors HeaderPresetDTO.megaMenu (Task 2/6) — when true, the desktop dropdown under a
     * menu-tree item with children renders as a 3-col grid instead of today's narrow single-
     * column list. */
    megaMenu?: boolean;
    /** Mirrors HeaderPresetDTO.phone (Post-Phase-8 dogfooding find) — an urgent-care/hotline
     * number rendered as a plain `tel:` link, desktop next to the CTA and in the mobile nav
     * panel. Omitted entirely when unset, same convention as `cta`. */
    phone?: string;
}) {
    const [hidden, setHidden] = createSignal(false);
    const [mobileOpen, setMobileOpen] = createSignal(false);
    const [overlaySolid, setOverlaySolid] = createSignal(false);
    let lastScroll = 0;

    // Menu Manager (Task 4/5, Phase 3) — khi HeaderPreset có `headerMenuId`, ưu tiên render cây
    // Menu này THAY `navLinks` cũ (fallback bên dưới nếu không có/rỗng, không regression cho
    // site chưa migrate — xem "Global Constraints" plan Phase 3). `getMenuItemsByMenu` là query
    // công khai (@GQLPublic phía BE, Task 3), an toàn gọi từ SSR không có session — Astro-Solid
    // bọc component trong <Suspense> + renderToStringAsync (@astrojs/solid-js server.js) nên
    // resource này ĐƯỢC chờ xong trước khi flush HTML, không có nháy nội dung rỗng cho crawler.
    const [menuItems] = createResource(
        () => props.headerMenuId,
        async (menuId) => {
            try {
                return await MenuService.getMenuItemsByMenu({ menuId });
            } catch {
                return [];
            }
        },
    );
    const menuTree = () => buildMenuTree(menuItems());
    const usingMenu = () => !!props.headerMenuId && menuTree().length > 0;

    const links = () => (props.navLinks?.length ? props.navLinks : DEFAULT_NAV_LINKS);
    const logoText = () => props.logoText || 'Catbox';

    const onScroll = () => {
        const current = window.scrollY;
        setHidden(current > lastScroll && current > 200);
        setOverlaySolid(window.scrollY > window.innerHeight);
        lastScroll = current;
    };

    onMount(() => {
        // M7 (final whole-branch review) — initialize overlaySolid so a page loaded via deep-link
        // or browser scroll-restoration (mid-page on first paint) starts with the correct
        // solid/transparent header state instead of always assuming scroll position 0 (transparent
        // header) until the next scroll event fires.
        // N2 (post-re-review fix) — this used to call the full `onScroll()` on mount, which ALSO
        // computes `setHidden(current > lastScroll && current > 200)`. `lastScroll` is still its
        // `let lastScroll = 0` initial value at mount time, so calling `onScroll()` here set
        // `hidden` to `true` immediately for any `scrollY > 200` on load — sliding the header
        // off-screen (`translateY(-100%)`) the instant the page loads, for every `bgVariant`, not
        // just the transparent-overlay case this fix was meant to help. `hidden` must only ever
        // change in response to a REAL scroll event (pre-this-fix-round behavior), never at mount
        // time. Fixed by seeding `lastScroll` from the current position (so the next real scroll
        // event measures "did the user scroll further down from here", not from a stale 0) and
        // setting `overlaySolid` directly — without touching `hidden` at all.
        lastScroll = window.scrollY;
        setOverlaySolid(window.scrollY > window.innerHeight);
        window.addEventListener('scroll', onScroll, { passive: true });
        onCleanup(() => window.removeEventListener('scroll', onScroll));
    });

    const isActive = (href: string) => props.currentPath === href || (href === '/trang-chu' && props.currentPath === '/');

    // bgVariant (Task 5) — 'transparent-overlay' starts fully transparent (for hero-overlaying
    // headers) and solidifies once scrolled past one viewport height, reusing the existing
    // scroll-tracking infra above; 'blur' is a permanently translucent glass background;
    // 'solid'/unset keeps today's exact rendering.
    const bgVariant = () => props.bgVariant ?? 'solid';
    const bgClass = () => {
        if (bgVariant() === 'transparent-overlay') {
            return overlaySolid() ? 'bg-[var(--color-background)]/95 backdrop-blur' : '';
        }
        if (bgVariant() === 'blur') return 'bg-[var(--color-background)]/60 backdrop-blur-lg';
        return 'bg-[var(--color-background)]/95 backdrop-blur'; // 'solid', today's default
    };

    // layoutVariant (Task 5) — 'logo-left' (default) keeps the existing flex/justify-between
    // markup unchanged. 'split' needs the <header> itself position:relative so the absolutely-
    // centered <nav> wrapper can anchor to it; applied conditionally so 'logo-left'/'centered'
    // stay byte-for-byte the prior markup.
    const layoutVariant = () => props.layoutVariant ?? 'logo-left';

    // megaMenu (Task 6) — toggles the desktop dropdown (under a menu-tree item with children)
    // between today's narrow single-column list and a 3-col grid, reused by both layoutVariant
    // branches below since it only changes navEl()'s own internal dropdown class.
    const megaMenu = () => props.megaMenu ?? false;

    // logoEl/navContent/translationsEl/mobileButtonEl (Task 5) — extracted so the same markup
    // can be composed into two different parent structures below (logo-left/split's flat flex
    // row vs centered's 3-col grid) without duplicating the Menu-tree/nav-links and translations
    // Show/For blocks. Each is a function (not a bound JSX value) so Solid mounts a fresh element
    // per call — safe here because layoutVariant's branches are mutually exclusive, so only one
    // branch's calls ever actually run per render.
    // navClass (Task 5, layoutVariant "split") — 'split' pulls <nav> out of normal flex flow and
    // absolutely centers it against the <header> (which gets `relative` added below, split-only);
    // 'logo-left'/'centered' keep the original static classes unchanged.
    // User visual-quality review (Post-Phase-8 extension) found this live at a common laptop
    // viewport (1440px): with no `whitespace-nowrap`/`flex-shrink-0` here, a flex row that
    // doesn't have quite enough space defaults to SHRINKING each item below its natural
    // single-line width rather than the row itself overflowing — multi-word nav labels ("Dịch
    // vụ", "Hỏi đáp") and the CTA ("Đặt lịch khám") each wrapped mid-label onto 2 lines, and the
    // shrunk-then-wrapped row still ended up wider than the viewport, adding a horizontal
    // scrollbar to the whole page. No nav label should ever wrap — `shrink-0` stops the browser
    // from allocating less than each link's natural width; `whitespace-nowrap` is the second,
    // independent layer of defense (the link's OWN text can still wrap even at full width if a
    // theme's font/letter-spacing pushes it wider than expected).
    const navClass = () =>
        layoutVariant() === 'split'
            ? 'absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 whitespace-nowrap text-sm font-bold md:flex'
            : 'hidden shrink-0 items-center gap-8 whitespace-nowrap text-sm font-bold md:flex';

    const logoEl = () => (
        <a href="/trang-chu" data-anim-target="logo" class="shrink-0 whitespace-nowrap text-2xl font-medium tracking-tight">{logoText()}</a>
    );

    const navEl = () => (
        <nav data-anim-target="nav" class={navClass()}>
            <Show
                when={usingMenu()}
                fallback={
                    <For each={links()}>
                        {(link) => (
                            <a href={link.href} class={`border-b pb-1 transition-colors ${isActive(link.href) ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-transparent hover:text-[var(--color-accent)]'}`}>
                                {link.label}
                            </a>
                        )}
                    </For>
                }
            >
                <For each={menuTree()}>
                    {(node) => {
                        const href = resolveMenuItemHref(node);
                        return (
                            <div class="group relative">
                                {href ? (
                                    <a href={href} class={`border-b pb-1 transition-colors ${isActive(href) ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-transparent group-hover:text-[var(--color-accent)]'}`}>
                                        {node.label}
                                    </a>
                                ) : (
                                    <span class="cursor-default border-b border-transparent pb-1 transition-colors group-hover:text-[var(--color-accent)]">{node.label}</span>
                                )}
                                <Show when={node.children.length}>
                                    <div
                                        class={`invisible absolute left-0 top-full z-50 translate-y-1 rounded-md border border-[var(--color-border)]/[.08] bg-[var(--color-background)]/95 py-2 opacity-0 shadow-lg backdrop-blur transition-opacity group-hover:visible group-hover:opacity-100 ${megaMenu() ? 'grid grid-cols-3 gap-2 min-w-[480px] px-4' : 'min-w-[180px]'}`}
                                        // N3 (post-re-review fix) — this dropdown was `duration-150` pre-this-plan (see
                                        // `git show 026b771:src/modules/cms/chrome/SiteHeader.tsx`), not `duration-300`
                                        // like the header's own scroll-hide transition — fallback corrected to match.
                                        style={{ 'transition-duration': 'var(--motion-hover, 150ms)' }}
                                    >
                                        <For each={node.children}>
                                            {(child) => {
                                                const childHref = resolveMenuItemHref(child);
                                                return childHref ? (
                                                    <a href={childHref} class="block whitespace-nowrap px-4 py-2 text-xs font-semibold hover:bg-[var(--color-foreground)]/[.06] hover:text-[var(--color-accent)]">
                                                        {child.label}
                                                    </a>
                                                ) : (
                                                    <span class="block whitespace-nowrap px-4 py-2 text-xs font-semibold text-[var(--color-foreground-muted)]">{child.label}</span>
                                                );
                                            }}
                                        </For>
                                    </div>
                                </Show>
                            </div>
                        );
                    }}
                </For>
            </Show>
        </nav>
    );

    // Bộ chuyển ngôn ngữ (Phase 3 mục 3, Task 15) — chỉ render khi trang đang xem có
    // ≥1 bản dịch PUBLISHED khác locale (availableTranslations rỗng/undefined thì ẩn
    // hẳn, không phải lỗi — vd site chưa dùng i18n). Desktop: dropdown hover (đúng
    // khuôn dropdown menu con phía trên); mobile: danh sách phẳng trong panel.
    const translationsEl = () => (
        <Show when={(props.availableTranslations?.length ?? 0) > 0}>
            <div class="group relative hidden md:block">
                <button type="button" aria-label="Chuyển ngôn ngữ" class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--color-foreground)] transition-colors hover:text-[var(--color-accent)]">
                    <span aria-hidden="true">🌐</span>
                    Ngôn ngữ
                </button>
                <div
                    class="invisible absolute right-0 top-full z-50 min-w-[120px] translate-y-1 rounded-md border border-[var(--color-border)]/[.08] bg-[var(--color-background)]/95 py-2 opacity-0 shadow-lg backdrop-blur transition-opacity group-hover:visible group-hover:opacity-100"
                    // N3 (post-re-review fix) — this dropdown was `duration-150` pre-this-plan too
                    // (same as the nav dropdown above) — fallback corrected from 300ms to 150ms.
                    style={{ 'transition-duration': 'var(--motion-hover, 150ms)' }}
                >
                    <For each={props.availableTranslations}>
                        {(tr) => (
                            <a href={tr.path} class="block whitespace-nowrap px-4 py-2 text-xs font-semibold uppercase hover:bg-[var(--color-foreground)]/[.06] hover:text-[var(--color-accent)]">
                                {tr.locale}
                            </a>
                        )}
                    </For>
                </div>
            </div>
        </Show>
    );

    // ctaEl (Task 6) — mirrors the logoEl/navEl/translationsEl/mobileButtonEl function-group
    // pattern Task 5 established, so it composes into both layoutVariant branches below the same
    // way translationsEl/mobileButtonEl already do. Desktop-only (`hidden md:inline-flex`, same
    // convention as translationsEl's `hidden md:block`) — per the brief's Step 3 scope, this task
    // does not add a mobile-menu counterpart (translationsEl's mobile block is pre-existing scope
    // from Task 15, not something this task's CTA needs to replicate).
    // I4 (final whole-branch review) — `<Show when={props.cta}>` was a bare truthiness check on
    // the whole object; the admin form (manageHeaderPresets.page.tsx) exposes `cta.label`/
    // `cta.href`/`cta.variant` as 3 independent optional fields, so an admin can end up with a
    // truthy `{ label: '', href: '', variant: null }` after clearing them — rendering a colored
    // pill with no visible text and a self-reloading empty href, with no way to ever fully remove
    // a CTA once created. Requiring both a non-empty label AND href before rendering anything
    // closes both problems (clearing either field now hides the CTA entirely).
    const ctaEl = () => (
        <Show when={props.cta?.label && props.cta?.href}>
            <a
                data-testid="header-cta"
                href={props.cta!.href}
                class={
                    props.cta!.variant === 'secondary'
                        ? 'hidden shrink-0 items-center whitespace-nowrap rounded-full border border-[var(--color-secondary)] px-4 py-1.5 text-sm font-semibold text-[var(--color-secondary)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-on-secondary)] md:inline-flex'
                        : 'hidden shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-sm font-semibold text-[var(--color-on-primary)] transition-opacity hover:opacity-90 md:inline-flex'
                }
            >
                {props.cta!.label}
            </a>
        </Show>
    );

    // phoneEl (Post-Phase-8 dogfooding find) — mirrors ctaEl's `<Show when={...}>` + desktop-only
    // convention exactly (`hidden ... md:inline-flex`). Digits/`+` only in the `tel:` href (a
    // human-readable "0909 123 456" is friendlier in the visible label than a raw "0909123456",
    // but `tel:` links need the separators stripped to dial correctly on mobile).
    const phoneEl = () => (
        <Show when={props.phone}>
            <a
                data-testid="header-phone"
                href={`tel:${props.phone!.replace(/[^\d+]/g, '')}`}
                class="hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-bold text-[var(--color-foreground)] transition-colors hover:text-[var(--color-accent)] md:inline-flex"
            >
                <span aria-hidden="true">📞</span>
                {props.phone}
            </a>
        </Show>
    );

    const mobileButtonEl = () => (
        <button type="button" class="flex h-7 w-9 flex-col justify-center gap-1.5 md:hidden" aria-label="Mở menu" onClick={() => setMobileOpen((v) => !v)}>
            <span class="block h-px bg-[var(--color-foreground)]" />
            <span class="block h-px bg-[var(--color-foreground)]" />
        </button>
    );

    return (
        // M5 (final whole-branch review) — the conditional `' relative'` appended here for
        // layoutVariant==='split' was dead: `position: sticky` already makes this element a
        // "positioned" element per the CSS spec (any position value other than `static`
        // qualifies), so it already establishes the containing block navClass()'s `absolute`
        // <nav> anchors to — an explicit `relative` alongside `sticky` adds nothing. Removed
        // rather than kept-with-a-comment since it's simpler and nothing depended on it (no
        // existing test asserted the `relative` class, and jsdom doesn't compute real layout
        // positioning anyway, so this is a spec-level correctness call, not something a unit
        // test could have caught either way).
        <header
            use:nodeAnimation={props.animation}
            class={`sticky top-0 z-40 border-b border-[var(--color-border)]/[.06] ${bgClass()} transition-transform`}
            style={{
                transform: hidden() ? 'translateY(-100%)' : 'translateY(0)',
                'transition-duration': 'var(--motion-hover, 300ms)',
                'transition-timing-function': 'var(--motion-ease-standard, cubic-bezier(.4,0,.2,1))',
            }}
        >
            {/* layoutVariant (Task 5) — 'centered' needs a structurally different parent (3-col
                grid, logo in its own middle wrapper, nav+translations+mobile-button grouped into
                one right-hand wrapper since a 3-col grid has no more use for the old
                justify-between spacing) than 'logo-left'/'split' (identical flat flex row for
                both — 'split' differs ONLY in <nav>'s own class, handled reactively by
                navClass() above, which pulls it out of flow and absolutely centers it against
                the `relative` <header> set above). Nav has no inherent "which side" concept for
                'centered', so per the brief the full nav goes in the right column and the left
                column is left deliberately empty (simplest-correct fallback). ctaEl() (Task 6)
                is inserted into the "right-hand group" here between navEl() and translationsEl()
                — same relative order as the 'logo-left'/'split' branch above — so the "right-hand
                group" is nav + cta + translations + mobile-button in both branches. */}
            {/* I3 (final whole-branch review) — 'split' pulls navEl() out of flow (absolute,
                centered against the header via navClass() above), which leaves exactly 3 in-flow
                flex items at desktop width in the fallback branch below: logo, cta, translations
                (mobileButtonEl() is md:hidden). `justify-between` with 3 items centers the MIDDLE
                one — which for 'split' is the CTA, landing it directly on top of the absolutely-
                centered nav. Grouping ctaEl()/translationsEl()/mobileButtonEl() into one trailing
                wrapper (same fix 'centered' already applies to its own right-hand group above)
                fixes 'split'.
                N1 (post-re-review fix) — that wrapper div was ORIGINALLY applied unconditionally
                to this whole fallback branch, which is ALSO used by 'logo-left' (the default).
                That silently changed 'logo-left' too: with no cta/availableTranslations, the
                trailing group renders nothing visible, but the wrapper <div> itself is still a
                real (zero-width) flex child — so 'logo-left' went from 2 flex items (logo, nav)
                to 3 (logo, nav, empty wrapper), and `justify-between` now centers `nav` in the
                middle of the free space instead of pinning it to the right edge. Fixed by making
                the wrapper conditional on `layoutVariant() === 'split'` only; 'logo-left' renders
                the same 3 elements as flat siblings inside a Fragment (no wrapper DOM element),
                restoring its exact pre-this-plan flex-item count/positioning. jsdom's `children`
                doesn't strip `display:none` elements the way a real browser's flex layout does,
                so the DOM still shows 3 children (logo, nav, mobileButtonEl's own <button>) either
                way — the regression test instead asserts the structural difference that drives the
                real positioning: the 3rd child is the flat `<button>` itself (logo-left), not a
                wrapper `<div>` around it (split). */}
            <Show
                when={layoutVariant() === 'centered'}
                fallback={
                    <div class="mx-auto flex h-16 max-w-[1720px] items-center justify-between px-[4.5vw] text-[var(--color-foreground)]">
                        {logoEl()}
                        {navEl()}
                        {layoutVariant() === 'split' ? (
                            <div class="flex items-center gap-6">
                                {phoneEl()}
                                {ctaEl()}
                                {translationsEl()}
                                {mobileButtonEl()}
                            </div>
                        ) : (
                            <>
                                {phoneEl()}
                                {ctaEl()}
                                {translationsEl()}
                                {mobileButtonEl()}
                            </>
                        )}
                    </div>
                }
            >
                <div class="mx-auto grid h-16 max-w-[1720px] grid-cols-3 items-center px-[4.5vw] text-[var(--color-foreground)]">
                    <div />
                    <div class="justify-self-center">{logoEl()}</div>
                    <div class="flex items-center justify-end gap-6">
                        {navEl()}
                        {phoneEl()}
                        {ctaEl()}
                        {translationsEl()}
                        {mobileButtonEl()}
                    </div>
                </div>
            </Show>

            <Show when={mobileOpen()}>
                <nav class="flex flex-col gap-1 border-t border-[var(--color-border)]/[.08] bg-[var(--color-background)] px-6 py-4 text-[var(--color-foreground)] md:hidden">
                    <Show when={props.phone}>
                        <a
                            href={`tel:${props.phone!.replace(/[^\d+]/g, '')}`}
                            class="mb-2 flex items-center gap-1.5 border-b border-[var(--color-border)]/[.08] pb-3 text-sm font-bold"
                        >
                            <span aria-hidden="true">📞</span>
                            {props.phone}
                        </a>
                    </Show>
                    <Show when={(props.availableTranslations?.length ?? 0) > 0}>
                        <div class="mb-2 flex items-center gap-3 border-b border-[var(--color-border)]/[.08] pb-3">
                            <For each={props.availableTranslations}>
                                {(tr) => (
                                    <a
                                        href={tr.path}
                                        class="rounded-full border border-[var(--color-border)]/[.12] px-3 py-1 text-xs font-bold uppercase text-[var(--color-foreground)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        {tr.locale}
                                    </a>
                                )}
                            </For>
                        </div>
                    </Show>
                    <Show
                        when={usingMenu()}
                        fallback={
                            <For each={links()}>
                                {(link) => (
                                    <a href={link.href} class={`py-2 text-sm font-semibold ${isActive(link.href) ? 'text-[var(--color-accent)]' : ''}`} onClick={() => setMobileOpen(false)}>
                                        {link.label}
                                    </a>
                                )}
                            </For>
                        }
                    >
                        <For each={menuTree()}>
                            {(node) => {
                                const href = resolveMenuItemHref(node);
                                return (
                                    <div>
                                        {href ? (
                                            <a href={href} class={`py-2 text-sm font-semibold ${isActive(href) ? 'text-[var(--color-accent)]' : ''}`} onClick={() => setMobileOpen(false)}>
                                                {node.label}
                                            </a>
                                        ) : (
                                            <span class="block py-2 text-sm font-semibold text-[var(--color-foreground-muted)]">{node.label}</span>
                                        )}
                                        <Show when={node.children.length}>
                                            <div class="ml-4 flex flex-col gap-1 border-l border-[var(--color-border)]/[.08] pl-3">
                                                <For each={node.children}>
                                                    {(child) => {
                                                        const childHref = resolveMenuItemHref(child);
                                                        return childHref ? (
                                                            <a href={childHref} class="py-1.5 text-xs font-semibold text-[var(--color-foreground-muted)] hover:text-[var(--color-accent)]" onClick={() => setMobileOpen(false)}>
                                                                {child.label}
                                                            </a>
                                                        ) : (
                                                            <span class="block py-1.5 text-xs font-semibold text-[var(--color-foreground-muted)]">{child.label}</span>
                                                        );
                                                    }}
                                                </For>
                                            </div>
                                        </Show>
                                    </div>
                                );
                            }}
                        </For>
                    </Show>
                </nav>
            </Show>
        </header>
    );
}
