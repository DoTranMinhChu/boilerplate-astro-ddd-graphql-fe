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

/** Site-wide navigation header for the editorial section family — NOT part of the
 * per-page Section model (see PageBuilder), it wraps every public route via
 * CmsPageShell.astro. Content comes from the HeaderPreset the current page resolves
 * to (own choice or the default preset — see PageResolver.resolveHeaderFooter);
 * falls back to sensible defaults when nothing has been configured yet, so the
 * site never renders with an empty nav.
 * Sticky (not overlay-fixed) so no section needs header-height offset padding.
 * Mobile nav is a simple collapse, not the reference design's full-screen
 * editorial menu — a deliberately smaller scope for now. */
export function SiteHeader(props: { currentPath: string; logoText?: string; navLinks?: NavLink[]; headerMenuId?: string; animation?: AnimationLayer[] }) {
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
            class="sticky top-0 z-40 border-b border-white/[.06] bg-black/95 backdrop-blur transition-transform duration-300"
            style={{ transform: hidden() ? 'translateY(-100%)' : 'translateY(0)' }}
        >
            <div class="mx-auto flex h-16 max-w-[1720px] items-center justify-between px-[4.5vw] text-[#f2f2f2]">
                <a href="/trang-chu" use:animate={layerFor('logo')} class="text-2xl font-medium tracking-tight">{logoText()}</a>

                <nav use:animate={layerFor('nav')} class="hidden items-center gap-8 text-sm font-bold md:flex">
                    <Show
                        when={usingMenu()}
                        fallback={
                            <For each={links()}>
                                {(link) => (
                                    <a href={link.href} class={`border-b pb-1 transition-colors ${isActive(link.href) ? 'border-[#ed6aa8] text-[#ed6aa8]' : 'border-transparent hover:text-[#ed6aa8]'}`}>
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
                                            <a href={href} class={`border-b pb-1 transition-colors ${isActive(href) ? 'border-[#ed6aa8] text-[#ed6aa8]' : 'border-transparent group-hover:text-[#ed6aa8]'}`}>
                                                {node.label}
                                            </a>
                                        ) : (
                                            <span class="cursor-default border-b border-transparent pb-1 transition-colors group-hover:text-[#ed6aa8]">{node.label}</span>
                                        )}
                                        <Show when={node.children.length}>
                                            <div class="invisible absolute left-0 top-full z-50 min-w-[180px] translate-y-1 rounded-md border border-white/[.08] bg-black/95 py-2 opacity-0 shadow-lg backdrop-blur transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
                                                <For each={node.children}>
                                                    {(child) => {
                                                        const childHref = resolveMenuItemHref(child);
                                                        return childHref ? (
                                                            <a href={childHref} class="block whitespace-nowrap px-4 py-2 text-xs font-semibold hover:bg-white/[.06] hover:text-[#ed6aa8]">
                                                                {child.label}
                                                            </a>
                                                        ) : (
                                                            <span class="block whitespace-nowrap px-4 py-2 text-xs font-semibold text-[#8a8a8a]">{child.label}</span>
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

                <button type="button" class="flex h-7 w-9 flex-col justify-center gap-1.5 md:hidden" aria-label="Mở menu" onClick={() => setMobileOpen((v) => !v)}>
                    <span class="block h-px bg-white" />
                    <span class="block h-px bg-white" />
                </button>
            </div>

            <Show when={mobileOpen()}>
                <nav class="flex flex-col gap-1 border-t border-white/[.08] bg-black px-6 py-4 text-[#f2f2f2] md:hidden">
                    <Show
                        when={usingMenu()}
                        fallback={
                            <For each={links()}>
                                {(link) => (
                                    <a href={link.href} class={`py-2 text-sm font-semibold ${isActive(link.href) ? 'text-[#ed6aa8]' : ''}`} onClick={() => setMobileOpen(false)}>
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
                                            <a href={href} class={`py-2 text-sm font-semibold ${isActive(href) ? 'text-[#ed6aa8]' : ''}`} onClick={() => setMobileOpen(false)}>
                                                {node.label}
                                            </a>
                                        ) : (
                                            <span class="block py-2 text-sm font-semibold text-[#8a8a8a]">{node.label}</span>
                                        )}
                                        <Show when={node.children.length}>
                                            <div class="ml-4 flex flex-col gap-1 border-l border-white/[.08] pl-3">
                                                <For each={node.children}>
                                                    {(child) => {
                                                        const childHref = resolveMenuItemHref(child);
                                                        return childHref ? (
                                                            <a href={childHref} class="py-1.5 text-xs font-semibold text-[#c9c9c9] hover:text-[#ed6aa8]" onClick={() => setMobileOpen(false)}>
                                                                {child.label}
                                                            </a>
                                                        ) : (
                                                            <span class="block py-1.5 text-xs font-semibold text-[#6f6f6f]">{child.label}</span>
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
