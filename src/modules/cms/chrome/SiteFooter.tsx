import { For, Show } from 'solid-js';
import { OrbGlow } from '@/modules/cms/sections/editorial/OrbGlow';
import { animate } from '@/modules/cms/animation/useAnimate';
import type { FooterColumn } from '@/shared/services/footerPreset/footerPreset.service';
import type { AnimationLayer } from '@/modules/cms/cms.types';
import '@/modules/cms/sections/editorialEffects.css';

// use:animate cần import `animate` được reference tĩnh — giữ dòng dưới để Solid
// không tree-shake mất import khi chỉ dùng qua directive (xem HeroSection.tsx).
const _ = animate;

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
    footerOutlineText?: string;
    animation?: AnimationLayer[];
}

/** Site-wide footer — same scope note as SiteHeader: not (yet) a per-page Section,
 * wraps every public route via CmsPageShell.astro. Content comes từ FooterPreset
 * mà trang đang render được gán (xem PageResolver.resolveHeaderFooter phía BE),
 * với default khi chưa cấu hình gì. */
export function SiteFooter(props: SiteFooterProps) {
    const columns = () => (props.footerColumns?.length ? props.footerColumns : DEFAULT_COLUMNS);
    const layerFor = (target: string) => props.animation?.find((l) => l.target === target);

    return (
        <footer class="relative overflow-hidden border-t border-white/[.04] bg-[#020202] pb-16 pt-14 text-[#f2f2f2]">
            <OrbGlow color="gold" />
            <div class="relative z-[2] mx-auto max-w-[1720px] px-[5vw]">
                <div class="grid grid-cols-1 gap-10 md:grid-cols-[34%_18%_1fr]">
                    <p use:animate={layerFor('logo')} class="text-[15vw] font-medium leading-[.85] tracking-tight md:text-[7vw]">{props.logoText || 'Catbox'}</p>
                    <div use:animate={layerFor('contact')} class="flex flex-col pt-2 md:pt-10">
                        <span class="text-sm text-[#b4b4b4]">{props.hotlineLabel || 'Hotline tư vấn'}</span>
                        <strong class="mt-2 text-lg">{props.hotline || '096 988 00 60'}</strong>
                    </div>
                    <div class="border-t border-white/[.28] pt-6 md:pt-7">
                        <h2 use:animate={layerFor('heading')} class="m-0 text-2xl font-light leading-snug md:text-4xl">
                            {props.footerHeading || 'Sẵn sàng kể cho chúng tôi câu chuyện thương hiệu của bạn?'}
                        </h2>
                        <Show when={props.footerEmail || true}>
                            <a href={`mailto:${props.footerEmail || 'hello@catbox.vn'}`} class="mt-8 flex items-center justify-between border-b border-white/[.28] py-6 font-bold">
                                {props.footerEmail || 'hello@catbox.vn'} <span class="text-3xl font-extralight">→</span>
                            </a>
                        </Show>
                        <div use:animate={layerFor('columns')} class="grid grid-cols-1 gap-8 pt-8 sm:grid-cols-3">
                            <For each={columns()}>
                                {(col) => (
                                    <div>
                                        <h3 class="border-b border-white/[.18] pb-3 text-sm">{col.title}</h3>
                                        <p class="mt-3 text-xs leading-relaxed text-[#b8b8b8]">
                                            <For each={col.lines}>{(line, i) => <>{i() > 0 && <br />}{line}</>}</For>
                                        </p>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </div>
                <div use:animate={layerFor('outlineText')} class="mt-14 select-none overflow-hidden whitespace-nowrap text-[10vw] font-black leading-none tracking-tight text-transparent md:text-[6.5vw]" style={{ '-webkit-text-stroke': '1px rgba(255,255,255,.08)' }}>
                    {props.footerOutlineText || 'PROFESSIONAL PACKAGING PRINTING SOLUTIONS'}
                </div>
            </div>
        </footer>
    );
}
