// src/modules/cms/node/primitives/SpotlightListNode.tsx
import { For, onCleanup } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import { LineArrowButton } from './editorialShared/LineArrowButton';
import './editorialShared/editorialEffects.css';

const _ = animate;

export interface SpotlightListNodeContent {
    railTitle?: string;
    railText?: string;
    railArrowHref?: string;
    items?: string[];
}

/** Node primitive tương đương `SpotlightListSection.tsx` — giữ đúng pointer-follow lerp
 * (factor 0.24, ngưỡng dừng 0.15) qua CSS custom property `--spot-x`. */
export function SpotlightListNode(props: NodeComponentProps) {
    const content = () => (props.node.props?.content ?? {}) as SpotlightListNodeContent;
    const items = () => content().items || [];

    let listRef: HTMLDivElement | undefined;
    let target = 0;
    let current = 0;
    let frame = 0;

    const render = () => {
        current += (target - current) * 0.24;
        listRef?.style.setProperty('--spot-x', `${current}px`);
        if (Math.abs(target - current) > 0.15) {
            frame = window.requestAnimationFrame(render);
        } else {
            current = target;
            listRef?.style.setProperty('--spot-x', `${current}px`);
            frame = 0;
        }
    };

    const onMove = (e: PointerEvent) => {
        if (!listRef) return;
        const bounds = listRef.getBoundingClientRect();
        target = Math.max(0, Math.min(bounds.width, e.clientX - bounds.left));
        if (!frame) frame = window.requestAnimationFrame(render);
    };
    const onEnter = (e: PointerEvent) => {
        if (!listRef) return;
        const bounds = listRef.getBoundingClientRect();
        target = e.clientX - bounds.left;
        current = target;
        listRef.style.setProperty('--spot-x', `${current}px`);
        listRef.classList.add('is-spotlight-active');
    };
    const onLeave = () => listRef?.classList.remove('is-spotlight-active');

    onCleanup(() => { if (typeof window !== 'undefined') window.cancelAnimationFrame(frame); });

    return (
        <section class="relative bg-[#020202] pb-20 pt-[60px] text-[#f2f2f2]" style={{ 'min-height': '720px' }}>
            <div class="mx-auto grid max-w-[1720px] grid-cols-1 gap-10 px-[5vw] md:grid-cols-[360px_minmax(0,1fr)]">
                <aside use:animate={getLayerForNode(props.node, 'rail')} class="pt-5">
                    <h2 class="m-0 text-xl leading-tight">{content().railTitle}</h2>
                    <div class="mt-2 max-w-[250px] text-sm leading-relaxed text-[#9b9b9b] [&_p]:m-0" innerHTML={DOMPurify.sanitize(content().railText || '')} />
                    <LineArrowButton href={content().railArrowHref || '#clients'} label="Xem khách hàng" />
                </aside>

                <div
                    ref={listRef}
                    use:animate={getLayerForNode(props.node, 'list')}
                    class="ed-industry-list border-b border-white/[.14]"
                    role="list"
                    onPointerEnter={onEnter}
                    onPointerMove={onMove}
                    onPointerLeave={onLeave}
                >
                    <For each={items()}>
                        {(label) => <button role="listitem" data-label={label} tabIndex={0}>{label}</button>}
                    </For>
                </div>
            </div>
        </section>
    );
}
