// src/modules/cms/node/primitives/CardListNode.tsx
//
// Node-level data binding (2026-08-17) — self-contained list primitive, same shape/rationale
// as TableNode.tsx (see that file's header comment). `columns` (grid column count) is a plain
// `props` field, NOT `style` — it's a data-driven layout decision (how many cards per row for
// THIS entry set), not a visual style property. Responsive column count reuses the existing
// `responsiveOverrides` mechanism at the STYLE level (a grid-template-columns override in the
// Style tab), not a second props-level override — an admin who wants fewer cards per row on
// mobile sets that, same as any other Frame-based grid layout already works.
import { For, Show, createResource, createMemo } from 'solid-js';
import type { NodeComponentProps } from '../nodeRegistry';
import { fetchRepeatEntries, fetchRepeatEntryCount } from '../nodeDataBinding';
import { PaginationControl, usePaginationState, resolveCurrentPage } from './PaginationControl';
import type { CardSlotsCfg } from '../node.types';

export function CardListNode(props: NodeComponentProps) {
    const slots = createMemo<CardSlotsCfg>(() => props.node.props?.slots ?? {});
    const columns = createMemo<number>(() => props.node.props?.columns ?? 3);
    const paginationState = usePaginationState();
    const pagination = () => props.node.repeat?.pagination;
    const currentPage = createMemo(() => pagination() ? resolveCurrentPage(pagination()!, props.context, paginationState.page()) : 1);

    const fetchKey = createMemo(() => ({ repeat: props.node.repeat, page: currentPage() }));
    const [entries] = createResource(fetchKey, async ({ repeat, page }) => {
        if (!repeat) return [];
        const prefetched = props.context.prefetchedRepeatEntries?.get(props.node.id ?? '');
        if (prefetched && page === 1) return prefetched;
        const queryParams = repeat.pagination?.mode === 'client'
            ? { ...props.context.queryParams, [repeat.pagination.paramName ?? 'page']: String(page) }
            : props.context.queryParams;
        return fetchRepeatEntries(repeat, { locale: props.context.locale, pathParams: props.context.pathParams, queryParams, contextEntryId: props.context.contextEntryId });
    });
    const [totalCount] = createResource(() => props.node.repeat, async (repeat) => repeat ? fetchRepeatEntryCount(repeat, { locale: props.context.locale, pathParams: props.context.pathParams, queryParams: props.context.queryParams, contextEntryId: props.context.contextEntryId }) : 0);

    return (
        <div>
            <div style={{ display: 'grid', 'grid-template-columns': `repeat(${columns()}, minmax(0, 1fr))`, gap: '1rem' }}>
                <For each={entries() ?? []}>
                    {(entry) => {
                        const s = slots();
                        const data = entry.data ?? {};
                        return (
                            <div class="overflow-hidden rounded-xl border border-neutral-200">
                                <Show when={s.imageField && data[s.imageField]}>
                                    <img src={data[s.imageField!]} class="h-40 w-full object-cover" alt="" />
                                </Show>
                                <div class="p-4">
                                    <Show when={s.badgeField && data[s.badgeField]}>
                                        <span class="mb-2 inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">{data[s.badgeField!]}</span>
                                    </Show>
                                    <Show when={s.titleField && data[s.titleField]}>
                                        <h3 class="font-semibold">{data[s.titleField!]}</h3>
                                    </Show>
                                    <Show when={s.subtitleField && data[s.subtitleField]}>
                                        <p class="text-sm text-neutral-500">{data[s.subtitleField!]}</p>
                                    </Show>
                                    <Show when={s.descriptionField && data[s.descriptionField]}>
                                        <p class="mt-2 text-sm text-neutral-600">{data[s.descriptionField!]}</p>
                                    </Show>
                                    <Show when={entry.__detailHref && s.ctaLabelField && data[s.ctaLabelField]}>
                                        <a href={entry.__detailHref} class="mt-3 inline-block text-sm font-medium text-primary-600">{data[s.ctaLabelField!]}</a>
                                    </Show>
                                </div>
                            </div>
                        );
                    }}
                </For>
            </div>
            <Show when={pagination()}>
                <PaginationControl
                    pagination={pagination()!}
                    context={props.context}
                    currentPage={currentPage()}
                    totalCount={totalCount() ?? 0}
                    onClientPageChange={paginationState.setPage}
                />
            </Show>
        </div>
    );
}
