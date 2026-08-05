import { For, Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer } from '../sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';
import { OrbGlow } from './OrbGlow';
import { LineArrowButton } from './LineArrowButton';
import { FEATURE_ICONS, type FeatureIconKey } from './FeatureIcons';
import '../editorialEffects.css';

const _ = animate;

export interface IntroRailContent {
    railTitle?: string;
    railArrowHref?: string;
    railServiceTitle?: string;
    railServiceText?: string;
    heading?: string;
    lead?: string;
    feature1Icon?: FeatureIconKey; feature1Text?: string;
    feature2Icon?: FeatureIconKey; feature2Text?: string;
    feature3Icon?: FeatureIconKey; feature3Text?: string;
}

function withBreaks(text?: string) {
    return (text || '').split('\n');
}

export function IntroRailSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as IntroRailContent;
    const features = () => [
        { icon: content().feature1Icon || 'design', text: content().feature1Text },
        { icon: content().feature2Icon || 'quality', text: content().feature2Text },
        { icon: content().feature3Icon || 'price', text: content().feature3Text },
    ].filter((f) => f.text) as { icon: FeatureIconKey; text: string }[];

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
                    <p use:animate={getLayer(props.section, 'lead')} class="mt-10 mb-14 max-w-[1050px] text-xl font-semibold leading-normal md:mb-[72px]">
                        {content().lead}
                    </p>
                    <div use:animate={getLayer(props.section, 'features')} class="grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-[90px]">
                        <For each={features()}>
                            {(f) => {
                                const Icon = FEATURE_ICONS[f.icon];
                                return (
                                    <article class="ed-feature">
                                        <Icon />
                                        <p class="max-w-[230px] leading-snug text-[#a8a8a8]">{f.text}</p>
                                    </article>
                                );
                            }}
                        </For>
                    </div>
                </div>
            </div>
        </section>
    );
}
