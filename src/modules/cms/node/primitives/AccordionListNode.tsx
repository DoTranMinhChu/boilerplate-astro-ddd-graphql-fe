// src/modules/cms/node/primitives/AccordionListNode.tsx
import { For, createSignal } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import './editorialShared/editorialEffects.css';

const _ = animate;

export interface AccordionEntry {
    title?: string;
    body?: string;
}

export interface AccordionListNodeContent {
    heading?: string;
    items?: AccordionEntry[];
}

/** Node primitive tương đương `AccordionListSection.tsx` — plain multi-open accordion, không
 * dùng thư viện ngoài, giữ nguyên `createSignal<Set<number>>` toggle state. Section's
 * `accordionListFieldSchema()` export KHÔNG port sang đây — đó là schema cho Page Builder's
 * Section-type form (khu vực admin cấu hình Section, không phải Node primitive, dùng Inspector
 * chung cho mọi Node — xem Global Constraints). */
export function AccordionListNode(props: NodeComponentProps) {
    const content = () => (props.node.props?.content ?? {}) as AccordionListNodeContent;
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
                <h2 use:animate={getLayerForNode(props.node, 'heading')} class="m-0 mb-12 font-light" style={{ 'font-size': 'clamp(32px, 3.5vw, 56px)' }}>
                    {content().heading}
                </h2>
                <div use:animate={getLayerForNode(props.node, 'items')} class="border-t border-white/[.14]">
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
                                    {open() && (
                                        <div
                                            class="max-w-2xl pb-6 leading-relaxed text-[#b8b8b8] [&_p]:m-0"
                                            innerHTML={DOMPurify.sanitize(item.body || '')}
                                        />
                                    )}
                                </div>
                            );
                        }}
                    </For>
                </div>
            </div>
        </section>
    );
}
