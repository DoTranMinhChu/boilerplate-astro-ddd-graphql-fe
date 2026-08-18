// src/modules/cms/node/primitives/ProjectShowcaseNode.tsx
import { createSignal, createResource, createEffect, Show, onCleanup, onMount } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import { fetchRepeatEntries } from '../nodeDataBinding';
import { OrbGlow } from './editorialShared/OrbGlow';
import { LineArrowButton } from './editorialShared/LineArrowButton';
import type { ShowcaseSlotsCfg } from '../node.types';
import './editorialShared/editorialEffects.css';

const _ = animate;

export interface ProjectShowcaseNodeContent {
    heading?: string;
    subtitle?: string;
    introArrowHref?: string;
    autoplayMs?: number;
}

interface ShowcaseItem {
    title?: string;
    client?: string;
    year?: string;
    category?: string;
    description?: string;
    image?: string;
}

/** Node primitive tương đương `ProjectShowcaseSection.tsx`. Canvas Editor v2, Task 15: migrated
 * off node.props.dataSource/fieldMapping onto node.repeat + node.props.slots (ShowcaseSlotsCfg)
 * — see spec §1.4. Carousel state machine unchanged (showProject/resetTimer, 430ms/700ms,
 * autoplay default 2300ms). */
export function ProjectShowcaseNode(props: NodeComponentProps) {
    const content = () => (props.node.props?.content ?? {}) as ProjectShowcaseNodeContent;
    const slots = () => (props.node.props?.slots ?? {}) as ShowcaseSlotsCfg;

    const [entriesResource] = createResource(
        () => ({ repeat: props.node.repeat, locale: props.context.locale, pathParams: props.context.pathParams, queryParams: props.context.queryParams }),
        (args) => (args.repeat ? fetchRepeatEntries(args.repeat, { locale: args.locale, pathParams: args.pathParams, queryParams: args.queryParams }) : Promise.resolve([])),
    );

    const items = (): ShowcaseItem[] => (entriesResource() || []).map((entry) => {
        const data = entry.data || {};
        const of = (slotKey: keyof ShowcaseSlotsCfg) => { const key = slots()[slotKey]; return key ? data[key] : undefined; };
        return {
            title: of('headingField'),
            image: of('imageField'),
            description: of('descriptionField'),
            client: of('clientField'),
            year: of('yearField'),
            category: of('categoryField'),
        };
    });

    const [active, setActive] = createSignal(0);
    const [switching, setSwitching] = createSignal(false);
    let animating = false;
    let timer: number | undefined;

    const current = () => items()[active()];
    const next = () => items()[(active() + 1) % (items().length || 1)];

    const showProject = (targetIndex: number) => {
        const list = items();
        if (!list.length || animating || targetIndex === active()) return;
        animating = true;
        setSwitching(true);
        window.setTimeout(() => {
            setActive((targetIndex + list.length) % list.length);
            setSwitching(false);
            window.setTimeout(() => { animating = false; }, 700);
        }, 430);
    };

    const resetTimer = () => {
        if (typeof window === 'undefined') return;
        window.clearInterval(timer);
        const list = items();
        if (list.length < 2) return;
        timer = window.setInterval(() => showProject(active() + 1), content().autoplayMs ?? 2300);
    };
    onMount(resetTimer);
    // Fix (final whole-branch review, Important #2): entries arrive asynchronously via
    // createResource (unlike the original Section, where props.section.entries was already
    // SSR-resolved at mount) — onMount(resetTimer) alone fires while items() is still empty,
    // so the autoplay timer's `if (list.length < 2) return` guard trips and nothing ever
    // re-arms it. Re-arm whenever the resource actually resolves with usable data.
    createEffect(() => {
        if (entriesResource()) resetTimer();
    });
    onCleanup(() => { if (typeof window !== 'undefined') window.clearInterval(timer); });

    return (
        <section class="relative overflow-hidden bg-[#020202] pt-20 text-[#f2f2f2]">
            <OrbGlow color="cyan" />
            <div use:animate={getLayerForNode(props.node, 'heading')} class="relative z-[2] mx-auto max-w-[1720px] px-[3vw] pb-24 pt-[70px] text-center md:pb-[160px]">
                <h2 class="ed-texture-title">{content().heading || 'CREATIVE DESIGN'}</h2>
                <p class="mt-12 text-sm">{content().subtitle}</p>
                <LineArrowButton href={content().introArrowHref || '#projects'} label="Xem dự án" centered />
            </div>

            <Show when={items().length > 0}>
                <div use:animate={getLayerForNode(props.node, 'showcase')} class="relative z-[2] mx-auto max-w-[1720px] px-[5vw] pb-24 md:pb-[140px]">
                    <div class="ed-project-stage">
                        <figure class={`ed-project-media ${switching() ? 'switching' : ''}`}>
                            <img src={current()?.image} alt={current()?.title} />
                            <span class="ed-corner-arrow">↗</span>
                        </figure>

                        <div class={`ed-project-copy ${switching() ? 'switching' : ''}`}>
                            <div class="ed-ghost-title" aria-hidden="true">{current()?.title}</div>
                            <h3>{current()?.title}</h3>
                            <p>{current()?.description}</p>
                            <dl>
                                <Show when={current()?.year}><div><dt>Năm</dt><dd>{current()?.year}</dd></div></Show>
                                <Show when={current()?.client}><div><dt>Khách hàng</dt><dd>{current()?.client}</dd></div></Show>
                                <Show when={current()?.category}><div><dt>Hạng mục</dt><dd>{current()?.category}</dd></div></Show>
                            </dl>
                        </div>

                        <Show when={items().length > 1}>
                            <button type="button" class="ed-project-next" aria-label="Dự án tiếp theo" onClick={() => { showProject(active() + 1); resetTimer(); }}>
                                <img src={next()?.image} alt="" />
                            </button>
                        </Show>
                    </div>

                    <Show when={items().length > 1}>
                        <div class="ed-project-pagination">
                            <button type="button" aria-label="Dự án trước" onClick={() => { showProject(active() - 1); resetTimer(); }}>‹</button>
                            <span><strong>{active() + 1}</strong> / {items().length}</span>
                            <button type="button" aria-label="Dự án tiếp theo" onClick={() => { showProject(active() + 1); resetTimer(); }}>›</button>
                        </div>
                    </Show>
                </div>
            </Show>
        </section>
    );
}
