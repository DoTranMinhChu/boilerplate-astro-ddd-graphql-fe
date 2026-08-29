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
export function SiteHeader(props: { currentPath: string; logoText?: string; navLinks?: NavLink[]; headerMenuId?: string; animation?: AnimationLayer[]; availableTranslations?: PageTranslationLink[] }) {
    const [hidden, setHidden] = createSignal(false);
    const [mobileOpen, setMobileOpen] = createSignal(false);
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
        lastScroll = current;
    };

    onMount(() => {
        window.addEventListener('scroll', onScroll, { passive: true });
        onCleanup(() => window.removeEventListener('scroll', onScroll));
    });

    const isActive = (href: string) => props.currentPath === href || (href === '/trang-chu' && props.currentPath === '/');

    return (
        <header
            class="sticky top-0 z-40 border-b border-[var(--color-border)]/[.06] bg-[var(--color-background)]/95 backdrop-blur transition-transform duration-300"
            style={{ transform: hidden() ? 'translateY(-100%)' : 'translateY(0)' }}
        >
            <div class="mx-auto flex h-16 max-w-[1720px] items-center justify-between px-[4.5vw] text-[var(--color-foreground)]">
                <a href="/trang-chu" use:animate={layerFor('logo')} class="text-2xl font-medium tracking-tight">{logoText()}</a>

                <nav use:animate={layerFor('nav')} class="hidden items-center gap-8 text-sm font-bold md:flex">
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

                {/* Bộ chuyển ngôn ngữ (Phase 3 mục 3, Task 15) — chỉ render khi trang đang xem có
                    ≥1 bản dịch PUBLISHED khác locale (availableTranslations rỗng/undefined thì ẩn
                    hẳn, không phải lỗi — vd site chưa dùng i18n). Desktop: dropdown hover (đúng
                    khuôn dropdown menu con phía trên); mobile: danh sách phẳng trong panel. */}
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

                <button type="button" class="flex h-7 w-9 flex-col justify-center gap-1.5 md:hidden" aria-label="Mở menu" onClick={() => setMobileOpen((v) => !v)}>
                    <span class="block h-px bg-[var(--color-foreground)]" />
                    <span class="block h-px bg-[var(--color-foreground)]" />
                </button>
            </div>

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
