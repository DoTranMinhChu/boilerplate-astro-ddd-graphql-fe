import { For, Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer } from '../sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';
import '../editorialEffects.css';

const _ = animate;

export interface ContactColumn {
    title?: string;
    text?: string;
}

export interface ContactColumnsContent {
    heading?: string;
    hotlineLabel?: string;
    hotline?: string;
    email?: string;
    columns?: ContactColumn[];
}

export function ContactColumnsSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as ContactColumnsContent;
    const columns = () => content().columns || [];

    return (
        <section class="bg-[#020202] py-20 text-[#f2f2f2]">
            <div class="mx-auto max-w-[1720px] px-[5vw]">
                <div use:animate={getLayer(props.section, 'heading')} class="grid grid-cols-1 gap-10 border-b border-white/[.14] pb-14 md:grid-cols-2">
                    <h2 class="m-0 font-light" style={{ 'font-size': 'clamp(32px, 3.5vw, 56px)' }}>{content().heading}</h2>
                    <div>
                        <Show when={content().hotline}>
                            <p class="text-sm text-[#b4b4b4]">{content().hotlineLabel}</p>
                            <p class="mt-1 text-xl font-semibold">{content().hotline}</p>
                        </Show>
                        <Show when={content().email}>
                            <a href={`mailto:${content().email}`} class="mt-4 inline-block text-lg underline underline-offset-4">{content().email}</a>
                        </Show>
                    </div>
                </div>
                <div use:animate={getLayer(props.section, 'columns')} class="grid grid-cols-1 gap-10 pt-12 md:grid-cols-3">
                    <For each={columns()}>
                        {(col) => (
                            <div>
                                <h3 class="border-b border-white/[.18] pb-3 text-sm">{col.title}</h3>
                                <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#b8b8b8]">{col.text}</p>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </section>
    );
}
