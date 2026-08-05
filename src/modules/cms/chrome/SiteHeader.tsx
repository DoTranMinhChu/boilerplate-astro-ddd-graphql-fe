import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import type { NavLink } from '@/shared/services/headerPreset/headerPreset.service';
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
export function SiteHeader(props: { currentPath: string; logoText?: string; navLinks?: NavLink[]; animation?: AnimationLayer[] }) {
    const [hidden, setHidden] = createSignal(false);
    const [mobileOpen, setMobileOpen] = createSignal(false);
    let lastScroll = 0;

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
                    <For each={links()}>
                        {(link) => (
                            <a href={link.href} class={`border-b pb-1 transition-colors ${isActive(link.href) ? 'border-[#ed6aa8] text-[#ed6aa8]' : 'border-transparent hover:text-[#ed6aa8]'}`}>
                                {link.label}
                            </a>
                        )}
                    </For>
                </nav>

                <button type="button" class="flex h-7 w-9 flex-col justify-center gap-1.5 md:hidden" aria-label="Mở menu" onClick={() => setMobileOpen((v) => !v)}>
                    <span class="block h-px bg-white" />
                    <span class="block h-px bg-white" />
                </button>
            </div>

            <Show when={mobileOpen()}>
                <nav class="flex flex-col gap-1 border-t border-white/[.08] bg-black px-6 py-4 text-[#f2f2f2] md:hidden">
                    <For each={links()}>
                        {(link) => (
                            <a href={link.href} class={`py-2 text-sm font-semibold ${isActive(link.href) ? 'text-[#ed6aa8]' : ''}`} onClick={() => setMobileOpen(false)}>
                                {link.label}
                            </a>
                        )}
                    </For>
                </nav>
            </Show>
        </header>
    );
}
