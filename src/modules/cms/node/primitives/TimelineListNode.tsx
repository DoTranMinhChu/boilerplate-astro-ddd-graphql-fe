// src/modules/cms/node/primitives/TimelineListNode.tsx
import { For } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import '../../sections/editorial/editorialEffects.css';

const _ = animate;

export interface TimelineEntry {
    year?: string;
    text?: string;
}

export interface TimelineListNodeContent {
    heading?: string;
    timeline?: TimelineEntry[];
}

/** Node primitive tương đương `TimelineListSection.tsx` — fully static. */
export function TimelineListNode(props: NodeComponentProps) {
    const content = () => (props.node.props?.content ?? {}) as TimelineListNodeContent;
    const items = () => content().timeline || [];

    return (
        <section class="bg-[#020202] py-20 text-[#f2f2f2]">
            <div class="mx-auto max-w-[900px] px-[5vw]">
                <h2 use:animate={getLayerForNode(props.node, 'heading')} class="m-0 mb-16 font-light" style={{ 'font-size': 'clamp(32px, 3.5vw, 56px)' }}>
                    {content().heading}
                </h2>
                <div use:animate={getLayerForNode(props.node, 'timeline')} class="border-l border-white/[.14]">
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
