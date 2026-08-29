import { For, Show, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import type { NavLink } from '@/shared/services/headerPreset/headerPreset.service';
import { MenuService } from '@/shared/services/menu/menu.service';
import { buildMenuTree, resolveMenuItemHref } from '@/modules/cms/chrome/menuTree';
import type { AnimationLayer } from '@/modules/cms/cms.types';

// use:animate cần import `animate` được reference tĩnh — giữ dòng dưới để Solid
// không tree-shake mất import khi chỉ dùng qua directive (xem HeroSection.tsx).
const _ = animate;

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
    animation?: AnimationLayer[];
    availableTranslations?: PageTranslationLink[];
    /** Mirrors HeaderPresetDTO.bgVariant (Task 2) — kept as a local literal union rather than
     * importing the DTO type, same convention as `navLinks: NavLink[]` above (the DTO's raw
     * codegen type is the untyped GraphQL `String` scalar, not this literal union). */
    bgVariant?: 'solid' | 'transparent-overlay' | 'blur';
    /** Mirrors HeaderPresetDTO.layoutVariant (Task 2) — same convention as `bgVariant` above. */
    layoutVariant?: 'logo-left' | 'centered' | 'split';
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
    const layerFor = (target: string) => props.animation?.find((l) => l.target === target);

    const onScroll = () => {
        const current = window.scrollY;
        setHidden(current > lastScroll && current > 200);
        setOverlaySolid(window.scrollY > window.innerHeight);
        lastScroll = current;
    };

    onMount(() => {
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

    // logoEl/navContent/translationsEl/mobileButtonEl (Task 5) — extracted so the same markup
    // can be composed into two different parent structures below (logo-left/split's flat flex
    // row vs centered's 3-col grid) without duplicating the Menu-tree/nav-links and translations
    // Show/For blocks. Each is a function (not a bound JSX value) so Solid mounts a fresh element
    // per call — safe here because layoutVariant's branches are mutually exclusive, so only one
    // branch's calls ever actually run per render.
    // navClass (Task 5, layoutVariant "split") — 'split' pulls <nav> out of normal flex flow and
    // absolutely centers it against the <header> (which gets `relative` added below, split-only);
    // 'logo-left'/'centered' keep the original static classes unchanged.
    const navClass = () =>
        layoutVariant() === 'split'
            ? 'absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-sm font-bold md:flex'
            : 'hidden items-center gap-8 text-sm font-bold md:flex';

    const logoEl = () => (
        <a href="/trang-chu" use:animate={layerFor('logo')} class="text-2xl font-medium tracking-tight">{logoText()}</a>
    );

    const navEl = () => (
        <nav use:animate={layerFor('nav')} class={navClass()}>
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
                                    <div class="invisible absolute left-0 top-full z-50 min-w-[180px] translate-y-1 rounded-md border border-[var(--color-border)]/[.08] bg-[var(--color-background)]/95 py-2 opacity-0 shadow-lg backdrop-blur transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
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
                <div class="invisible absolute right-0 top-full z-50 min-w-[120px] translate-y-1 rounded-md border border-[var(--color-border)]/[.08] bg-[var(--color-background)]/95 py-2 opacity-0 shadow-lg backdrop-blur transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
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

    const mobileButtonEl = () => (
        <button type="button" class="flex h-7 w-9 flex-col justify-center gap-1.5 md:hidden" aria-label="Mở menu" onClick={() => setMobileOpen((v) => !v)}>
            <span class="block h-px bg-[var(--color-foreground)]" />
            <span class="block h-px bg-[var(--color-foreground)]" />
        </button>
    );

    return (
        <header
            class={`sticky top-0 z-40 border-b border-[var(--color-border)]/[.06] ${bgClass()} transition-transform duration-300${layoutVariant() === 'split' ? ' relative' : ''}`}
            style={{ transform: hidden() ? 'translateY(-100%)' : 'translateY(0)' }}
        >
            {/* layoutVariant (Task 5) — 'centered' needs a structurally different parent (3-col
                grid, logo in its own middle wrapper, nav+translations+mobile-button grouped into
                one right-hand wrapper since a 3-col grid has no more use for the old
                justify-between spacing) than 'logo-left'/'split' (identical flat flex row for
                both — 'split' differs ONLY in <nav>'s own class, handled reactively by
                navClass() above, which pulls it out of flow and absolutely centers it against
                the `relative` <header> set above). Nav has no inherent "which side" concept for
                'centered', so per the brief the full nav goes in the right column and the left
                column is left deliberately empty (simplest-correct fallback). There is no
                separate CTA element to place yet — SiteHeader's props don't wire HeaderCta in
                this task — so the "right-hand group" here is nav + translations + mobile-button,
                the same set of elements 'logo-left' already renders. */}
            <Show
                when={layoutVariant() === 'centered'}
                fallback={
                    <div class="mx-auto flex h-16 max-w-[1720px] items-center justify-between px-[4.5vw] text-[var(--color-foreground)]">
                        {logoEl()}
                        {navEl()}
                        {translationsEl()}
                        {mobileButtonEl()}
                    </div>
                }
            >
                <div class="mx-auto grid h-16 max-w-[1720px] grid-cols-3 items-center px-[4.5vw] text-[var(--color-foreground)]">
                    <div />
                    <div class="justify-self-center">{logoEl()}</div>
                    <div class="flex items-center justify-end gap-6">
                        {navEl()}
                        {translationsEl()}
                        {mobileButtonEl()}
                    </div>
                </div>
            </Show>

            <Show when={mobileOpen()}>
                <nav class="flex flex-col gap-1 border-t border-[var(--color-border)]/[.08] bg-[var(--color-background)] px-6 py-4 text-[var(--color-foreground)] md:hidden">
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
