import { For, Show, createResource } from 'solid-js';
import { OrbGlow } from '@/modules/cms/node/primitives/editorialShared/OrbGlow';
import type { FooterColumn } from '@/shared/services/footerPreset/footerPreset.service';
import { MenuService } from '@/shared/services/menu/menu.service';
import { buildMenuTree, resolveMenuItemHref } from '@/modules/cms/chrome/menuTree';
import { nodeAnimation } from '@/modules/cms/node/useNodeAnimation';
import type { AnimationTimeline } from '@/modules/cms/node/animationTimeline.types';
import '@/modules/cms/node/primitives/editorialShared/editorialEffects.css';

// use:nodeAnimation cần import `nodeAnimation` được reference tĩnh — giữ dòng dưới để
// Solid không tree-shake mất import khi chỉ dùng qua directive (xem HeroSection.tsx).
void nodeAnimation;

const DEFAULT_COLUMNS: FooterColumn[] = [
    { title: 'Địa chỉ', lines: ['Số 7, ngõ 37, phố Tây Kết,', 'Hai Bà Trưng, Hà Nội,', 'Việt Nam, 10000'] },
    { title: 'Dịch vụ', lines: ['Chiến lược thương hiệu', 'Thiết kế bao bì', 'Thiết kế kết cấu', 'In ấn & Sản xuất'] },
    { title: 'Kết nối', lines: ['Facebook', 'Instagram', 'Youtube'] },
];

export interface SiteFooterProps {
    logoText?: string;
    hotlineLabel?: string;
    hotline?: string;
    footerHeading?: string;
    footerEmail?: string;
    footerColumns?: FooterColumn[];
    footerMenuId?: string;
    footerOutlineText?: string;
    animation?: AnimationTimeline;
    /** Mirrors FooterPresetDTO.variant (Task 2) — kept as a local literal union rather than
     * importing the DTO type, same convention as SiteHeader's bgVariant/layoutVariant (Task 5). */
    variant?: 'default' | 'minimal' | 'centered' | 'split-cta';
}

/** Site-wide footer — same scope note as SiteHeader: not (yet) a per-page Section,
 * wraps every public route via CmsPageShell.astro. Content comes từ FooterPreset
 * mà trang đang render được gán (xem PageResolver.resolveHeaderFooter phía BE),
 * với default khi chưa cấu hình gì. */
export function SiteFooter(props: SiteFooterProps) {
    // Menu Manager (Task 4/5, Phase 3) — cùng lý do/pattern với SiteHeader: khi có
    // `footerMenuId`, ưu tiên render cây Menu này THAY `footerColumns` cũ (cấp 1 = tiêu đề cột,
    // cấp 2 = dòng link, `targetType=NONE` render text không link), fallback nếu không có/rỗng.
    const [menuItems] = createResource(
        () => props.footerMenuId,
        async (menuId) => {
            try {
                return await MenuService.getMenuItemsByMenu({ menuId });
            } catch {
                return [];
            }
        },
    );
    const menuTree = () => buildMenuTree(menuItems());
    const usingMenu = () => !!props.footerMenuId && menuTree().length > 0;

    const columns = () => (props.footerColumns?.length ? props.footerColumns : DEFAULT_COLUMNS);

    // variant (Task 7) — mirrors SiteHeader's bgVariant/layoutVariant convention (Task 5/6):
    // structurally different renders of the same primitive, so each variant gets its own
    // Show-gated branch below (same pattern FrameNode.tsx uses for `behavior.type`), composed
    // from the shared element-functions below (same logoEl/navEl-style extraction SiteHeader
    // uses) so default/minimal/centered/split-cta don't hand-duplicate the shared markup.
    const variant = () => props.variant ?? 'default';

    // logoEl — 'default'/'centered' keep today's oversized text-[15vw]/md:text-[7vw] logo;
    // 'minimal' drops to normal text-2xl font-medium (matching SiteHeader's own logo scale, per
    // the brief's exact class string — SiteHeader's logoEl also has tracking-tight, deliberately
    // NOT copied here since the brief's spec string for 'minimal' is just `text-2xl font-medium`).
    const logoEl = (oversized: boolean) => (
        <p data-anim-target="logo" class={oversized ? 'text-[15vw] font-medium leading-[.85] tracking-tight md:text-[7vw]' : 'text-2xl font-medium'}>
            {props.logoText || 'Catbox'}
        </p>
    );

    // contactEl — shared by default/centered (as the grid's 2nd column) and split-cta (as its
    // left block). `centered` swaps the pt-2/md:pt-10 offset (which stagger-offsets this block
    // downward on desktop to visually compensate for sitting next to the oversized left-aligned
    // logo column) for items-center, since that left-alignment-specific compensation doesn't
    // apply once the whole grid is centered.
    const contactEl = (centered: boolean) => (
        <div data-anim-target="contact" class={centered ? 'flex flex-col items-center' : 'flex flex-col pt-2 md:pt-10'}>
            <span class="text-sm text-[var(--color-foreground-muted)]">{props.hotlineLabel || 'Hotline tư vấn'}</span>
            <strong class="mt-2 text-lg">{props.hotline || '096 988 00 60'}</strong>
        </div>
    );

    const headingEl = () => (
        <h2 data-anim-target="heading" class="m-0 text-2xl font-light leading-snug md:text-4xl">
            {props.footerHeading || 'Sẵn sàng kể cho chúng tôi câu chuyện thương hiệu của bạn?'}
        </h2>
    );

    const ctaEl = () => (
        <Show when={props.footerEmail || true}>
            <a href={`mailto:${props.footerEmail || 'hello@catbox.vn'}`} class="mt-8 flex items-center justify-between border-b border-[var(--color-border)]/[.28] py-6 font-bold">
                {props.footerEmail || 'hello@catbox.vn'} <span class="text-3xl font-extralight">→</span>
            </a>
        </Show>
    );

    // columnsMenuEl — shared by default/centered only (split-cta explicitly doesn't render this,
    // minimal keeps it). `data-testid="footer-column"` added on both the fallback (footerColumns)
    // and menu-driven (menuTree) branches so variant behavior is assertable regardless of which
    // branch resolves.
    const columnsMenuEl = () => (
        <Show
            when={usingMenu()}
            fallback={
                <For each={columns()}>
                    {(col) => (
                        <div data-testid="footer-column">
                            <h3 class="border-b border-[var(--color-border)]/[.18] pb-3 text-sm">{col.title}</h3>
                            <p class="mt-3 text-xs leading-relaxed text-[var(--color-foreground-muted)]">
                                <For each={col.lines}>{(line, i) => <>{i() > 0 && <br />}{line}</>}</For>
                            </p>
                        </div>
                    )}
                </For>
            }
        >
            <For each={menuTree()}>
                {(node) => {
                    const href = resolveMenuItemHref(node);
                    return (
                        <div data-testid="footer-column">
                            {href ? (
                                <a href={href} class="block border-b border-[var(--color-border)]/[.18] pb-3 text-sm hover:text-[var(--color-accent)]">{node.label}</a>
                            ) : (
                                <h3 class="border-b border-[var(--color-border)]/[.18] pb-3 text-sm">{node.label}</h3>
                            )}
                            <p class="mt-3 flex flex-col gap-1 text-xs leading-relaxed text-[var(--color-foreground-muted)]">
                                <For each={node.children}>
                                    {(child) => {
                                        const childHref = resolveMenuItemHref(child);
                                        return childHref ? (
                                            <a href={childHref} class="hover:text-[var(--color-accent)]">{child.label}</a>
                                        ) : (
                                            <span>{child.label}</span>
                                        );
                                    }}
                                </For>
                            </p>
                        </div>
                    );
                }}
            </For>
        </Show>
    );

    // outlineTextEl's stroke color (I1, final whole-branch review) — the one hardcoded color
    // value that survived the plan's Task 3/4 color-token conversion (it fell between the two:
    // Task 3 deferred it as "decorative, not a semantic color", Task 4 never picked it back up).
    // `color-mix(in srgb, var(--color-foreground) 8%, transparent)` reproduces the exact same 8%
    // opacity the hardcoded `rgba(255,255,255,.08)` had, but token-driven so it tracks the active
    // theme's foreground color instead of being permanently white.
    const outlineTextEl = () => (
        <div data-testid="footer-outline-text" data-anim-target="outlineText" class="mt-14 select-none overflow-hidden whitespace-nowrap text-[10vw] font-black leading-none tracking-tight text-transparent md:text-[6.5vw]" style={{ '-webkit-text-stroke': '1px color-mix(in srgb, var(--color-foreground) 8%, transparent)' }}>
            {props.footerOutlineText || 'PROFESSIONAL PACKAGING PRINTING SOLUTIONS'}
        </div>
    );

    // defaultEl — byte-for-byte today's prior rendering, just composed from the shared
    // element-functions above and with the 2 data-testids added.
    const defaultEl = () => (
        <div class="relative z-[2] mx-auto max-w-[1720px] px-[5vw]">
            <div class="grid grid-cols-1 gap-10 md:grid-cols-[34%_18%_1fr]">
                {logoEl(true)}
                {contactEl(false)}
                <div class="border-t border-[var(--color-border)]/[.28] pt-6 md:pt-7">
                    {headingEl()}
                    {ctaEl()}
                    <div data-anim-target="columns" class="grid grid-cols-1 gap-8 pt-8 sm:grid-cols-3">
                        {columnsMenuEl()}
                    </div>
                </div>
            </div>
            {outlineTextEl()}
        </div>
    );

    // minimalEl — same grid shape, normal-scale logo, no outline-text band at all (regardless of
    // footerOutlineText prop — the variant's whole point is a lower-visual-weight footer).
    const minimalEl = () => (
        <div class="relative z-[2] mx-auto max-w-[1720px] px-[5vw]">
            <div class="grid grid-cols-1 gap-10 md:grid-cols-[34%_18%_1fr]">
                {logoEl(false)}
                {contactEl(false)}
                <div class="border-t border-[var(--color-border)]/[.28] pt-6 md:pt-7">
                    {headingEl()}
                    {ctaEl()}
                    <div data-anim-target="columns" class="grid grid-cols-1 gap-8 pt-8 sm:grid-cols-3">
                        {columnsMenuEl()}
                    </div>
                </div>
            </div>
        </div>
    );

    // centeredEl — same content/columns as default, outer grid gets text-center (cascades to all
    // descendant text incl. column titles/lines via inheritance) and the contact column swaps its
    // left-alignment-specific pt offset for items-center (see contactEl above).
    const centeredEl = () => (
        <div class="relative z-[2] mx-auto max-w-[1720px] px-[5vw]">
            <div class="grid grid-cols-1 gap-10 md:grid-cols-[34%_18%_1fr] text-center">
                {logoEl(true)}
                {contactEl(true)}
                <div class="border-t border-[var(--color-border)]/[.28] pt-6 md:pt-7">
                    {headingEl()}
                    {ctaEl()}
                    <div data-anim-target="columns" class="grid grid-cols-1 gap-8 pt-8 sm:grid-cols-3">
                        {columnsMenuEl()}
                    </div>
                </div>
            </div>
            {outlineTextEl()}
        </div>
    );

    // splitCtaEl — 2-block 50/50 grid, no columns/menu section and no outline-text band. The
    // right block reuses headingEl/ctaEl but WITHOUT the default/centered variants' border-t
    // wrapper — that border visually attached the heading block to the logo column on its left,
    // which doesn't exist in this 2-block layout (judgment call, brief doesn't fully specify the
    // right block's own wrapper classes).
    const splitCtaEl = () => (
        <div class="relative z-[2] mx-auto max-w-[1720px] px-[5vw]">
            <div class="grid grid-cols-1 gap-10 md:grid-cols-2">
                {contactEl(false)}
                <div>
                    {headingEl()}
                    {ctaEl()}
                </div>
            </div>
        </div>
    );

    return (
        <footer
            use:nodeAnimation={props.animation}
            class="relative overflow-hidden border-t border-[var(--color-border)]/[.04] bg-[var(--color-surface)] pb-16 pt-14 text-[var(--color-foreground)]"
        >
            <OrbGlow color="gold" />
            <Show
                when={variant() === 'minimal'}
                fallback={
                    <Show
                        when={variant() === 'centered'}
                        fallback={
                            <Show when={variant() === 'split-cta'} fallback={defaultEl()}>
                                {splitCtaEl()}
                            </Show>
                        }
                    >
                        {centeredEl()}
                    </Show>
                }
            >
                {minimalEl()}
            </Show>
        </footer>
    );
}
