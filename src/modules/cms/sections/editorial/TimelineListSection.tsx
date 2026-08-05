import { For } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer } from '../sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';
import '../editorialEffects.css';

const _ = animate;

export interface TimelineEntry {
    year?: string;
    text?: string;
}

export interface TimelineListContent {
    heading?: string;
    timeline?: TimelineEntry[];
}

export function TimelineListSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as TimelineListContent;
    const items = () => content().timeline || [];

    return (
        <section class="bg-[#020202] py-20 text-[#f2f2f2]">
            <div class="mx-auto max-w-[900px] px-[5vw]">
                <h2 use:animate={getLayer(props.section, 'heading')} class="m-0 mb-16 font-light" style={{ 'font-size': 'clamp(32px, 3.5vw, 56px)' }}>
                    {content().heading}
                </h2>
                <div use:animate={getLayer(props.section, 'timeline')} class="border-l border-white/[.14]">
                    <For each={items()}>
                        {(entry) => (
                            <div class="relative py-8 pl-10">
                                <span class="absolute -left-[5px] top-10 h-[9px] w-[9px] rounded-full bg-[#ed6aa8]" />
                                <p class="m-0 text-sm font-semibold uppercase tracking-wide text-[#ed6aa8]">{entry.year}</p>
                                <p class="mt-2 max-w-xl leading-relaxed text-[#d0d0d0]">{entry.text}</p>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </section>
    );
}
