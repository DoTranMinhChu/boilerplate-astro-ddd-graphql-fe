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
import { formatNumberValue, isCurrencyKey } from '../formatFieldValue';

// Post-Phase-8 visual-quality dogfooding fix: a numeric column (e.g. Món ăn's "Giá") rendered
// its raw value ("65000") with no thousands separator or currency symbol — the exact "số thì
// hiển thị quá tệ chưa được format" complaint the user raised, now reproduced live in a real
// Table bound to content entries. CardListNode.tsx's formatSlotValue already solved this for
// cards; mirrored here so every repeat-consuming primitive formats numbers consistently.
function formatCell(value: any, displayType: TableColumnCfg['displayType'], fieldKey: string | undefined) {
    if (value === undefined || value === null || value === '') return '';
    switch (displayType) {
        case 'image': return <img src={value} class="h-10 w-10 rounded object-cover" alt="" />;
        case 'link': return <a href={value} class="text-primary-600 underline">{value}</a>;
        case 'date': return new Date(value).toLocaleDateString();
        case 'boolean': return value ? t('cms.node.table.boolTrue') : t('cms.node.table.boolFalse');
        default:
            if (typeof value !== 'number') return String(value);
            return isCurrencyKey(fieldKey) ? `${formatNumberValue(value)} ₫` : formatNumberValue(value);
    }
}

export function TableNode(props: NodeComponentProps) {
    const columns = createMemo<TableColumnCfg[]>(() => props.node.props?.columns ?? []);
    const paginationState = usePaginationState();
    const pagination = () => props.node.repeat?.pagination;
    const currentPage = createMemo(() => pagination() ? resolveCurrentPage(pagination()!, props.context, paginationState.page()) : 1);

    // Single `createResource`, PLAIN arrow-function source (not `createMemo`-wrapped) — every
    // existing repeat-consuming primitive in this codebase (MixedFeedNode.tsx,
    // ContentDetailNode.tsx, ProjectShowcaseNode.tsx) uses exactly this shape, verified live to
    // render fully in the SSR HTML via Astro-Solid's implicit Suspense + `renderToStringAsync`.
    // Two real bugs found via live click-through (not static review) before landing on this
    // exact shape: (1) 2 sibling `createResource` calls in one primitive, and (2) wrapping the
    // source in `createMemo` first — both independently caused a pending resource to be read
    // inside this node's own `<ErrorBoundary>` (NodeRenderer.tsx) with no enclosing `<Suspense>`,
    // thrown/caught as a fake error (`[CMS] Lỗi khi render node "table": Promise`) instead of
    // being awaited by SSR. Matching the proven 1-resource/plain-arrow-source shape exactly
    // fixed both.
    const [data] = createResource(
        () => ({ repeat: props.node.repeat, page: currentPage() }),
        async ({ repeat, page }) => {
            if (!repeat) return { entries: [] as Record<string, any>[], totalCount: 0 };
            const prefetched = props.context.prefetchedRepeatEntries?.get(props.node.id ?? '');
            const queryParams = repeat.pagination?.mode === 'client'
                ? { ...props.context.queryParams, [repeat.pagination.paramName ?? 'page']: String(page) }
                : props.context.queryParams;
            const ctx = { locale: props.context.locale, pathParams: props.context.pathParams, queryParams, contextEntryId: props.context.contextEntryId };
            const [entries, totalCount] = await Promise.all([
                prefetched && page === 1 ? Promise.resolve(prefetched) : fetchRepeatEntries(repeat, ctx),
                fetchRepeatEntryCount(repeat, ctx),
            ]);
            return { entries, totalCount };
        },
    );
    const entries = () => data()?.entries ?? [];
    const totalCount = () => data()?.totalCount ?? 0;

    return (
        <div>
            <table class="w-full border-collapse text-sm">
                <thead>
                    <tr class="border-b border-neutral-200 text-left">
                        <For each={columns()}>{(col) => <th class="px-3 py-3 font-medium text-neutral-500">{col.headerLabel}</th>}</For>
                    </tr>
                </thead>
                <tbody>
                    <For each={entries() ?? []}>
                        {(entry) => {
                            // Post-Phase-8 visual-quality dogfooding fix: TableNode never used
                            // `entry.__detailHref` (unlike CardListNode.tsx's identical fix) — a
                            // Table's `linkToDetail` toggle (NodeDataSourceTab.tsx applies to
                            // every repeat-capable node type, not just Card List) had no effect
                            // here at all. Real menu/price-list content (Món ăn, Dịch vụ, ...) is
                            // a natural fit for Table's 2-column "name | price" row layout, and a
                            // real menu is expected to be clickable through to its own detail —
                            // found live wiring up Hương Việt's "Thực đơn" section. A `<tr>` can't
                            // legally be wrapped in an `<a>` (invalid table content model), so the
                            // row navigates via onClick instead — same visible affordance
                            // (cursor-pointer + hover background) real "clickable row" UI patterns
                            // use everywhere else on the web.
                            const href = () => entry.__detailHref as string | undefined;
                            return (
                                <tr
                                    class={`border-b border-neutral-100 ${href() ? 'cursor-pointer transition-colors hover:bg-neutral-50' : ''}`}
                                    onClick={href() ? () => { window.location.href = href()!; } : undefined}
                                >
                                    <For each={columns()}>{(col) => <td class="px-3 py-3">{formatCell(entry.data?.[col.fieldKey], col.displayType, col.fieldKey)}</td>}</For>
                                </tr>
                            );
                        }}
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
