import { For, createSignal } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer } from '../sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';
import '../editorialEffects.css';
import { t } from '@/shared/i18n/t';
import type { BlockFieldDefinition } from '@/shared/components/fields/blockField.types';

const _ = animate;

export interface AccordionEntry {
    title?: string;
    body?: string;
}

export interface AccordionListContent {
    heading?: string;
    items?: AccordionEntry[];
}

export const accordionListFieldSchema = (): BlockFieldDefinition[] => [
    { key: 'heading', label: t('cms.sections.fields.heading'), type: 'TEXT' },
    {
        key: 'items',
        label: t('cms.sections.editorial.accordionItems'),
        type: 'REPEATER',
        itemFields: [
            { key: 'title', label: t('cms.sections.editorial.accordionTitle'), type: 'TEXT' },
            { key: 'body', label: t('cms.sections.editorial.accordionBody'), type: 'RICHTEXT' },
        ],
    },
];

/** Reused for both the Services capability list and the Contact FAQ — a plain
 * multi-open accordion, no external library, keyboard-accessible via <button>. */
export function AccordionListSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as AccordionListContent;
    const items = () => content().items || [];
    const [openSet, setOpenSet] = createSignal<Set<number>>(new Set([0]));

    const toggle = (index: number) => {
        const next = new Set(openSet());
        if (next.has(index)) next.delete(index); else next.add(index);
        setOpenSet(next);
    };

    return (
        <section class="bg-[#020202] py-20 text-[#f2f2f2]">
            <div class="mx-auto max-w-[900px] px-[5vw]">
                <h2 use:animate={getLayer(props.section, 'heading')} class="m-0 mb-12 font-light" style={{ 'font-size': 'clamp(32px, 3.5vw, 56px)' }}>
                    {content().heading}
                </h2>
                <div use:animate={getLayer(props.section, 'items')} class="border-t border-white/[.14]">
                    <For each={items()}>
                        {(item, index) => {
                            const open = () => openSet().has(index());
                            return (
                                <div class="border-b border-white/[.14]">
                                    <button
                                        type="button"
                                        class="flex w-full items-center justify-between gap-4 py-6 text-left"
                                        onClick={() => toggle(index())}
                                        aria-expanded={open()}
                                    >
                                        <span class="text-xl font-light">{item.title}</span>
                                        <span class="text-2xl font-thin text-[#9b9b9b]">{open() ? '−' : '+'}</span>
                                    </button>
                                    {open() && <p class="max-w-2xl pb-6 leading-relaxed text-[#b8b8b8]">{item.body}</p>}
                                </div>
                            );
                        }}
                    </For>
                </div>
            </div>
        </section>
    );
}
