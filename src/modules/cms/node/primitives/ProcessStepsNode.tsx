// src/modules/cms/node/primitives/ProcessStepsNode.tsx
import { For } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import './editorialShared/editorialEffects.css';

const _ = animate;

export interface ProcessStep {
    title?: string;
    text?: string;
}

export interface ProcessStepsNodeContent {
    heading?: string;
    steps?: ProcessStep[];
}

/** Node primitive tương đương `ProcessStepsSection.tsx` — fully static, numbered steps. */
export function ProcessStepsNode(props: NodeComponentProps) {
    const content = () => (props.node.props?.content ?? {}) as ProcessStepsNodeContent;
    const steps = () => content().steps || [];

    return (
        <section class="bg-[#020202] py-20 text-[#f2f2f2]">
            <div class="mx-auto max-w-[1720px] px-[5vw]">
                <h2 use:animate={getLayerForNode(props.node, 'heading')} class="m-0 mb-16 font-light" style={{ 'font-size': 'clamp(32px, 3.5vw, 56px)' }}>
                    {content().heading}
                </h2>
                <div use:animate={getLayerForNode(props.node, 'steps')} class="grid grid-cols-1 gap-10 md:grid-cols-5">
                    <For each={steps()}>
                        {(step, index) => (
                            <div class="border-t border-white/[.14] pt-6">
                                <p class="m-0 text-sm text-[#8e8e8e]">{String(index() + 1).padStart(2, '0')}</p>
                                <p class="mt-4 text-lg font-medium">{step.title}</p>
                                <p class="mt-2 text-sm leading-relaxed text-[#9b9b9b]">{step.text}</p>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </section>
    );
}
