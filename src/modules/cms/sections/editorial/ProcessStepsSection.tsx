import { For } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer } from '../sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';
import '../editorialEffects.css';

const _ = animate;

export interface ProcessStep {
    title?: string;
    text?: string;
}

export interface ProcessStepsContent {
    heading?: string;
    steps?: ProcessStep[];
}

export function ProcessStepsSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as ProcessStepsContent;
    const steps = () => content().steps || [];

    return (
        <section class="bg-[#020202] py-20 text-[#f2f2f2]">
            <div class="mx-auto max-w-[1720px] px-[5vw]">
                <h2 use:animate={getLayer(props.section, 'heading')} class="m-0 mb-16 font-light" style={{ 'font-size': 'clamp(32px, 3.5vw, 56px)' }}>
                    {content().heading}
                </h2>
                <div use:animate={getLayer(props.section, 'steps')} class="grid grid-cols-1 gap-10 md:grid-cols-5">
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
