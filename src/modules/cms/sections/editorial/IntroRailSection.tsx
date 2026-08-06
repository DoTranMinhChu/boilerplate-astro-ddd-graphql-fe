import { For, Show } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer } from '../sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';
import { OrbGlow } from './OrbGlow';
import { LineArrowButton } from './LineArrowButton';
import '../editorialEffects.css';

const _ = animate;

export interface IntroRailFeature {
    /** Ảnh admin tự tải lên (không phải icon chọn từ danh sách có sẵn) — minh
     * hoạ tự do cho từng USP. */
    image?: string;
    text: string;
}

/** Legacy shape (trước khi khối USP thành danh sách tự do) — 3 slot cố định,
 * dùng ICON (không phải ảnh). Vẫn đọc được để trang đã publish trước đây không
 * vỡ layout — chỉ hiện text, không có ảnh (icon cũ không map được sang ảnh),
 * KHÔNG dùng cho dữ liệu mới (xem features() bên dưới). */
interface LegacyIntroRailFeatures {
    feature1Icon?: string; feature1Text?: string;
    feature2Icon?: string; feature2Text?: string;
    feature3Icon?: string; feature3Text?: string;
}

export interface IntroRailContent extends LegacyIntroRailFeatures {
    railTitle?: string;
    railArrowHref?: string;
    railServiceTitle?: string;
    railServiceText?: string;
    heading?: string;
    lead?: string;
    /** Danh sách USP tự do — thêm bao nhiêu tuỳ ý, không giới hạn 3 như trước. */
    features?: IntroRailFeature[];
    /** Số cột mỗi hàng khi hiển thị `features` (2/3/4...) — mặc định 3. */
    featureColumns?: number;
}

const FEATURE_GRID_COLS: Record<number, string> = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
};

function withBreaks(text?: string) {
    return (text || '').split('\n');
}

export function IntroRailSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as IntroRailContent;
    const features = (): IntroRailFeature[] => {
        if (content().features?.length) return content().features!;
        // Fallback cho section tạo trước khi có danh sách tự do (3 slot cố định,
        // dùng icon) — chỉ còn text, không có ảnh (icon cũ không map sang ảnh được).
        return [
            { text: content().feature1Text },
            { text: content().feature2Text },
            { text: content().feature3Text },
        ].filter((f) => f.text) as IntroRailFeature[];
    };
    const featureCols = () => FEATURE_GRID_COLS[content().featureColumns || 3] || FEATURE_GRID_COLS[3];

    return (
        <section class="relative overflow-hidden bg-[#020202] text-[#f2f2f2]" style={{ 'min-height': '950px', 'padding-top': '130px', 'padding-bottom': '100px' }}>
            <OrbGlow color="magenta" />
            <div class="relative z-[2] mx-auto grid max-w-[1720px] grid-cols-1 gap-10 px-[5vw] md:grid-cols-[360px_minmax(0,1fr)]">
                <aside use:animate={getLayer(props.section, 'rail')} class="relative pt-4">
                    <h2 class="m-0 text-xl leading-tight">
                        <For each={withBreaks(content().railTitle)}>{(line, i) => <>{i() > 0 && <br />}{line}</>}</For>
                    </h2>
                    <LineArrowButton href={content().railArrowHref || '#services'} label="Xem dịch vụ" />
                    <Show when={content().railServiceTitle}>
                        <div class="mt-[560px] md:absolute md:top-[610px] md:mt-0">
                            <h3 class="m-0 text-xl">{content().railServiceTitle}</h3>
                            <p class="mt-2 max-w-[250px] text-sm leading-relaxed text-[#9b9b9b]">{content().railServiceText}</p>
                        </div>
                    </Show>
                </aside>

                <div class="relative z-[2] border-b border-white/[.14] pb-16 md:pb-[150px]">
                    <h1
                        use:animate={getLayer(props.section, 'heading')}
                        class="m-0 font-light leading-[1.05] tracking-[-.025em]"
                        style={{ 'font-size': 'clamp(40px, 4vw, 68px)' }}
                    >
                        <For each={withBreaks(content().heading)}>{(line, i) => <>{i() > 0 && <br />}{line}</>}</For>
                    </h1>
                    <div
                        use:animate={getLayer(props.section, 'lead')}
                        class="mt-10 mb-14 max-w-[1050px] text-xl font-semibold leading-normal md:mb-[72px] [&_p]:m-0"
                        innerHTML={DOMPurify.sanitize(content().lead || '')}
                    />
                    <div use:animate={getLayer(props.section, 'features')} class={`grid grid-cols-1 gap-16 md:gap-[90px] ${featureCols()}`}>
                        <For each={features()}>
                            {(f) => (
                                <article class="group">
                                    <Show when={f.image}>
                                        <img
                                            src={f.image}
                                            alt=""
                                            class="h-16 w-16 rounded-xl object-cover transition-transform duration-300 group-hover:scale-110"
                                        />
                                    </Show>
                                    {/* USP text giờ soạn qua CKEditor (bold/canh lề/...) — render HTML đã
                                        sanitize thay vì text thường; DOMPurify no-op an toàn với dữ liệu cũ
                                        (plain text từ shape legacy, xem features() ở trên). */}
                                    <div class="mt-4 max-w-[230px] leading-snug text-[#a8a8a8] [&_p]:m-0" innerHTML={DOMPurify.sanitize(f.text)} />
                                </article>
                            )}
                        </For>
                    </div>
                </div>
            </div>
        </section>
    );
}
