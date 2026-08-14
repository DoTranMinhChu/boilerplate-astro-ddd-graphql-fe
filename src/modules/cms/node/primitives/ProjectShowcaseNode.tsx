// src/modules/cms/node/primitives/ProjectShowcaseNode.tsx
import { createSignal, createResource, createEffect, Show, onCleanup, onMount } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import type { SectionDataSource } from '@/modules/cms/cms.types';
import { fetchDataSourceEntries } from '../fetchDataSourceEntries';
import { OrbGlow } from './editorialShared/OrbGlow';
import { LineArrowButton } from './editorialShared/LineArrowButton';
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

/** Node primitive tương đương `ProjectShowcaseSection.tsx`. Section gốc dùng
 * `props.section.entries` (đã resolve SẴN ở SSR — `resolveCmsPageProps.ts`); Node primitive
 * KHÔNG đi qua đường đó, tự fetch qua `fetchDataSourceEntries` (Task 1) thay vào đó, đọc
 * `props.node.props.dataSource`/`fieldMapping` (giữ nguyên shape Section cũ — spec §3) — vẫn
 * render đủ dữ liệu ở SSR HTML nhờ Astro-Solid's implicit <Suspense> + renderToStringAsync
 * (kiểm chứng thật, Phase 0 M2c). Carousel state machine giữ đúng 1:1 (`showProject`/
 * `resetTimer`, 430ms/700ms, autoplay mặc định 2300ms). */
export function ProjectShowcaseNode(props: NodeComponentProps) {
    const content = () => (props.node.props?.content ?? {}) as ProjectShowcaseNodeContent;
    const mapping = () => (props.node.props?.fieldMapping ?? {}) as Record<string, string>;
    const dataSource = () => props.node.props?.dataSource as SectionDataSource | undefined;

    const [entriesResource] = createResource(
        () => ({ dataSource: dataSource(), locale: props.context.locale, pathParams: props.context.pathParams, queryParams: props.context.queryParams }),
        (args) => fetchDataSourceEntries(args.dataSource, { locale: args.locale, pathParams: args.pathParams, queryParams: args.queryParams }),
    );

    const items = (): ShowcaseItem[] => (entriesResource() || []).map((entry) => {
        const data = entry.data || {};
        const of = (slot: string) => { const key = mapping()[slot]; return key ? data[key] : undefined; };
        return {
            title: of('heading'),
            image: of('image'),
            description: of('description'),
            client: of('client'),
            year: of('year'),
            category: of('category'),
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
