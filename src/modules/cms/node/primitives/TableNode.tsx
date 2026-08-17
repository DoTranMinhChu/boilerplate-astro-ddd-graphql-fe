// src/modules/cms/node/primitives/TableNode.tsx
//
// Node-level data binding (2026-08-17) — self-contained list primitive: resolves + iterates
// `node.repeat` INTERNALLY (one <table>, N rows), unlike FRAME's `repeat` (a template its
// PARENT clones — see SELF_RESOLVING_REPEAT_NODE_TYPES in node.constants.ts for why this must
// never be treated as a sibling-cloning template by a repeat-cloning parent's expansion).
// Column mapping (`node.props.columns`) is configured via the admin's Data Source Inspector
// tab (NodeDataSourceTab.tsx), not the generic Content tab — TABLE's `fieldSchema` is empty.
import { For, Show, createResource, createMemo } from 'solid-js';
import type { NodeComponentProps } from '../nodeRegistry';
import { fetchRepeatEntries, fetchRepeatEntryCount } from '../nodeDataBinding';
import { PaginationControl, usePaginationState, resolveCurrentPage } from './PaginationControl';
import type { TableColumnCfg } from '../node.types';
import { t } from '@/shared/i18n/t';

function formatCell(value: any, displayType: TableColumnCfg['displayType']) {
    if (value === undefined || value === null || value === '') return '';
    switch (displayType) {
        case 'image': return <img src={value} class="h-10 w-10 rounded object-cover" alt="" />;
        case 'link': return <a href={value} class="text-primary-600 underline">{value}</a>;
        case 'date': return new Date(value).toLocaleDateString();
        case 'boolean': return value ? t('cms.node.table.boolTrue') : t('cms.node.table.boolFalse');
        default: return String(value);
    }
}

export function TableNode(props: NodeComponentProps) {
    const columns = createMemo<TableColumnCfg[]>(() => props.node.props?.columns ?? []);
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
            <table class="w-full border-collapse text-sm">
                <thead>
                    <tr class="border-b border-neutral-200 text-left">
                        <For each={columns()}>{(col) => <th class="px-3 py-2 font-medium text-neutral-600">{col.headerLabel}</th>}</For>
                    </tr>
                </thead>
                <tbody>
                    <For each={entries() ?? []}>
                        {(entry) => (
                            <tr class="border-b border-neutral-100">
                                <For each={columns()}>{(col) => <td class="px-3 py-2">{formatCell(entry.data?.[col.fieldKey], col.displayType)}</td>}</For>
                            </tr>
                        )}
                    </For>
                </tbody>
            </table>
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
