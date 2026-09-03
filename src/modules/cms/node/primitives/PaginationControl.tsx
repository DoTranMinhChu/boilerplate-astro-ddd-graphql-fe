// src/modules/cms/node/primitives/PaginationControl.tsx
//
// Node-level data binding (2026-08-17) — Prev/Next control shared by TableNode.tsx and
// CardListNode.tsx. Two pagination modes, intentionally never sharing one source of truth
// for "the current page": 'reload' reads it from the real URL (`context.queryParams`) and
// renders plain `<a>` tags (a real SSR request per click, no client JS needed); 'client'
// reads it from a local Solid signal and calls back into the caller's resource re-fetch.
import { Show, createSignal } from 'solid-js';
import type { CollectionRepeat, NodeRenderContext } from '../node.types';
import { ERepeatPaginationMode } from '../node.types';
import { t } from '@/shared/i18n/t';

export interface PaginationState {
    page: () => number;
    setPage: (p: number) => void;
}

/** One local page-signal per mounted list node. Only 'client' mode reads/writes it — 'reload'
 * mode's Prev/Next are plain `<a>` tags that trigger a real navigation (a brand new component
 * mount with a fresh page-1 signal on the next render is exactly correct there; the real page
 * number for 'reload' mode always comes from `context.queryParams`, read directly by
 * `fetchRepeatEntries`/`fetchRepeatEntryCount`, never from this signal). */
export function usePaginationState(): PaginationState {
    const [page, setPage] = createSignal(1);
    return { page, setPage };
}

/** Reads the CURRENT page: for 'reload' mode from the URL (`context.queryParams`), for 'client'
 * mode from the local signal — the two modes never share one source of truth (see file header). */
export function resolveCurrentPage(pagination: NonNullable<CollectionRepeat['pagination']>, context: NodeRenderContext, clientPage: number): number {
    if (pagination.mode === ERepeatPaginationMode.CLIENT) return clientPage;
    const raw = context.queryParams[pagination.paramName ?? 'page'];
    const parsed = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

/** Builds `?page=N` preserving every OTHER existing query param — used only by 'reload' mode's
 * `<a href>`. Reads from `context.queryParams` (identical at SSR and hydration time) rather than
 * `window.location.search`, since the href must already be correct in the SSR'd HTML. */
function buildPageHref(paramName: string, page: number, queryParams: Record<string, string>): string {
    const params = new URLSearchParams(queryParams);
    params.set(paramName, String(page));
    return `?${params.toString()}`;
}

export function PaginationControl(props: {
    pagination: NonNullable<CollectionRepeat['pagination']>;
    context: NodeRenderContext;
    currentPage: number;
    totalCount: number;
    onClientPageChange?: (page: number) => void;
}) {
    const totalPages = () => Math.max(1, Math.ceil(props.totalCount / props.pagination.pageSize));
    const hasPrev = () => props.currentPage > 1;
    const hasNext = () => props.currentPage < totalPages();
    const paramName = () => props.pagination.paramName ?? 'page';

    return (
        <div class="flex items-center justify-center gap-3 py-4">
            <Show
                when={props.pagination.mode === ERepeatPaginationMode.RELOAD}
                fallback={
                    <>
                        <button type="button" disabled={!hasPrev()} class="rounded border border-neutral-300 px-3 py-1 text-sm disabled:opacity-40" onClick={() => props.onClientPageChange?.(props.currentPage - 1)}>{t('cms.node.pagination.prev')}</button>
                        <span class="text-sm text-neutral-500">{t('cms.node.pagination.pageOf').replace('{current}', String(props.currentPage)).replace('{total}', String(totalPages()))}</span>
                        <button type="button" disabled={!hasNext()} class="rounded border border-neutral-300 px-3 py-1 text-sm disabled:opacity-40" onClick={() => props.onClientPageChange?.(props.currentPage + 1)}>{t('cms.node.pagination.next')}</button>
                    </>
                }
            >
                <Show when={hasPrev()} fallback={<span class="rounded border border-neutral-200 px-3 py-1 text-sm text-neutral-300">{t('cms.node.pagination.prev')}</span>}>
                    <a href={buildPageHref(paramName(), props.currentPage - 1, props.context.queryParams)} class="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50">{t('cms.node.pagination.prev')}</a>
                </Show>
                <span class="text-sm text-neutral-500">{t('cms.node.pagination.pageOf').replace('{current}', String(props.currentPage)).replace('{total}', String(totalPages()))}</span>
                <Show when={hasNext()} fallback={<span class="rounded border border-neutral-200 px-3 py-1 text-sm text-neutral-300">{t('cms.node.pagination.next')}</span>}>
                    <a href={buildPageHref(paramName(), props.currentPage + 1, props.context.queryParams)} class="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50">{t('cms.node.pagination.next')}</a>
                </Show>
            </Show>
        </div>
    );
}
