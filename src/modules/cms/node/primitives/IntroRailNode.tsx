// src/modules/cms/node/primitives/IntroRailNode.tsx
import { For, Show } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import { OrbGlow } from '../../sections/editorial/OrbGlow';
import { LineArrowButton } from '../../sections/editorial/LineArrowButton';
import '../../sections/editorialEffects.css';

const _ = animate;

export interface IntroRailFeature {
    image?: string;
    text: string;
}

/** Legacy shape (trước khi khối USP thành danh sách tự do) — 3 slot cố định, dùng ICON (không
 * phải ảnh). Vẫn đọc được để data migrate từ Section cũ không vỡ layout — chỉ hiện text, không
 * có ảnh (icon cũ không map được sang ảnh), KHÔNG dùng cho dữ liệu mới (xem features() bên dưới). */
interface LegacyIntroRailFeatures {
    feature1Icon?: string; feature1Text?: string;
    feature2Icon?: string; feature2Text?: string;
    feature3Icon?: string; feature3Text?: string;
}

export interface IntroRailNodeContent extends LegacyIntroRailFeatures {
    railTitle?: string;
    railArrowHref?: string;
    railServiceTitle?: string;
    railServiceText?: string;
    heading?: string;
    lead?: string;
    features?: IntroRailFeature[];
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

/** Node primitive tương đương `IntroRailSection.tsx`. */
export function IntroRailNode(props: NodeComponentProps) {
    const content = () => (props.node.props?.content ?? {}) as IntroRailNodeContent;
    const features = (): IntroRailFeature[] => {
        if (content().features?.length) return content().features!;
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
                <aside use:animate={getLayerForNode(props.node, 'rail')} class="relative pt-4">
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
                        use:animate={getLayerForNode(props.node, 'heading')}
                        class="m-0 font-light leading-[1.05] tracking-[-.025em]"
                        style={{ 'font-size': 'clamp(40px, 4vw, 68px)' }}
                    >
                        <For each={withBreaks(content().heading)}>{(line, i) => <>{i() > 0 && <br />}{line}</>}</For>
                    </h1>
                    <div
                        use:animate={getLayerForNode(props.node, 'lead')}
                        class="mt-10 mb-14 max-w-[1050px] text-xl font-semibold leading-normal md:mb-[72px] [&_p]:m-0"
                        innerHTML={DOMPurify.sanitize(content().lead || '')}
                    />
                    <div use:animate={getLayerForNode(props.node, 'features')} class={`grid grid-cols-1 gap-16 md:gap-[90px] ${featureCols()}`}>
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
