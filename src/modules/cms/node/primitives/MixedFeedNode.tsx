// src/modules/cms/node/primitives/MixedFeedNode.tsx
// Phase 0 M2b: tự chứa — TÁI DÙNG fetchRepeatEntries({source:'mixed'}) đã có từ M2a (dormant, đã
// test) qua createResource, rồi tự map field theo TỪNG entry's contentTypeId riêng (đọc
// props.node.props.dataSource.sources[].fieldMapping) — phần MixedFeedSection gốc's
// resolveSectionDataSource làm ở SSR, giờ làm ở đây vì Node primitive tự fetch client-side
// (spec §4).
//
// Final whole-branch review fix (Important #2/#3): props.node.props.layoutPreset (số cột lưới)
// và legacyAnimation (getLayer 'heading'/'grid') đã bị bỏ sót ở lần viết đầu —
// migrateSectionsToNodes.ts giờ ghi cả 2, restore ở đây. Theme/dark-mode (resolveTheme của
// Section) VẪN CHƯA port — sectionCssVars/resolveTheme/themeBackgroundClass đọc SectionDTO, không
// tương thích NodeTree; giữ nền sáng cố định như ContentDetailNode, ghi backlog M3.
import { createResource, For, Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import { fetchRepeatEntries } from '../nodeDataBinding';
import type { MixedFeedSource } from '@/modules/cms/cms.types';

const _ = animate;

export interface MixedFeedNodeContent {
    heading?: string;
}

export interface MixedFeedNodeDataSource {
    sources?: MixedFeedSource[];
    limit?: number;
}

const GRID_COLS: Record<string, string> = {
    'grid-2': 'md:grid-cols-2',
    'grid-3': 'md:grid-cols-3',
    'grid-4': 'md:grid-cols-4',
};

export function MixedFeedNode(props: NodeComponentProps) {
    const dataSource = () => (props.node.props?.dataSource ?? {}) as MixedFeedNodeDataSource;
    const content = () => (props.node.props?.content ?? {}) as MixedFeedNodeContent;
    const cols = () => GRID_COLS[(props.node.props?.layoutPreset as string) || 'grid-3'] || GRID_COLS['grid-3'];

    const [entries] = createResource(
        () => ({ sources: dataSource().sources, limit: dataSource().limit, locale: props.context.locale, pathParams: props.context.pathParams, queryParams: props.context.queryParams }),
        (args) => fetchRepeatEntries(
            { source: 'mixed', sources: args.sources, limit: args.limit, linkToDetail: true },
            { locale: args.locale, pathParams: args.pathParams, queryParams: args.queryParams },
        ),
    );

    const sourceByType = () => new Map((dataSource().sources ?? []).map((s) => [s.contentTypeId, s]));

    return (
        <Show when={entries()?.length}>
            <section class="px-6 py-14 md:py-20">
                <div class="mx-auto max-w-6xl">
                    <Show when={content().heading}>
                        <h2 use:animate={getLayerForNode(props.node, 'heading')} class="mb-8 text-2xl font-bold tracking-tight">{content().heading}</h2>
                    </Show>
                    <div use:animate={getLayerForNode(props.node, 'grid')} class={`grid grid-cols-1 gap-6 ${cols()}`}>
                        <For each={entries() || []}>
                            {(entry) => {
                                const fieldMapping = sourceByType().get(entry.contentTypeId as string)?.fieldMapping || {};
                                const data = (entry.data || {}) as Record<string, unknown>;
                                const heading = fieldMapping.heading ? data[fieldMapping.heading] : undefined;
                                const image = fieldMapping.image ? data[fieldMapping.image] : undefined;
                                const description = fieldMapping.description ? data[fieldMapping.description] : undefined;
                                return (
                                    <a href={entry.__detailHref as string | undefined} class="group block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-lg">
                                        <Show when={image}>
                                            <div class="aspect-[4/3] overflow-hidden bg-neutral-100">
                                                <img src={image as string} alt={String(heading ?? '')} class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                                            </div>
                                        </Show>
                                        <div class="p-4">
                                            <Show when={heading}><p class="font-semibold text-neutral-900">{heading as string}</p></Show>
                                            <Show when={description}><p class="mt-1 line-clamp-2 text-sm text-neutral-500">{description as string}</p></Show>
                                        </div>
                                    </a>
                                );
                            }}
                        </For>
                    </div>
                </div>
            </section>
        </Show>
    );
}
