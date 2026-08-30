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
import { formatNumberValue, isCurrencyKey } from '../formatFieldValue';

/** Post-Phase-8 visual-quality dogfooding pass: the "Phụ đề" slot (every listing/related Card
 * List built this session binds it to a price field) rendered the raw JS number with zero
 * formatting — same "320000" complaint as ContentDetailNode.tsx, fixed there via
 * `formatNumberFieldValue`. This component has no field-schema fetch at all (only a slot's raw
 * field KEY, never its admin-authored label — a real Content Type fetch per Card List would be
 * its own cost/complexity for a component this simple), so it can't reuse that exact helper;
 * `isCurrencyKey` matches the field KEY convention instead (every price field built this session
 * is literally keyed "gia" — see formatFieldValue.ts's own doc comment for the anchoring
 * rationale). A numeric slot value that ISN'T recognized as currency still gets thousands-grouped
 * (never wrong to format a big raw number more readably), just without the "₫" suffix. */
function formatSlotValue(value: unknown, fieldKey: string | undefined): string {
    if (typeof value !== 'number') return String(value);
    const formatted = formatNumberValue(value);
    return isCurrencyKey(fieldKey) ? `${formatted} ₫` : formatted;
}

function CardBody(props: { s: CardSlotsCfg; data: Record<string, any>; entry: Record<string, any> }) {
    return (
        <div class="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-shadow hover:shadow-lg">
            <Show when={props.s.imageField && props.data[props.s.imageField]}>
                <div class="overflow-hidden">
                    <img src={props.data[props.s.imageField!]} class="aspect-4/3 w-full object-cover transition-transform duration-300 group-hover:scale-105" alt="" />
                </div>
            </Show>
            <div class="flex flex-1 flex-col p-4">
                <Show when={props.s.badgeField && props.data[props.s.badgeField]}>
                    <span class="mb-2 inline-block w-fit rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">{props.data[props.s.badgeField!]}</span>
                </Show>
                <Show when={props.s.titleField && props.data[props.s.titleField]}>
                    <h3 class="font-semibold text-neutral-900">{props.data[props.s.titleField!]}</h3>
                </Show>
                <Show when={props.s.subtitleField && props.data[props.s.subtitleField]}>
                    <p class="mt-1 font-semibold text-primary-600">{formatSlotValue(props.data[props.s.subtitleField!], props.s.subtitleField)}</p>
                </Show>
                <Show when={props.s.descriptionField && props.data[props.s.descriptionField]}>
                    <p class="mt-2 text-sm text-neutral-600">{formatSlotValue(props.data[props.s.descriptionField!], props.s.descriptionField)}</p>
                </Show>
                <Show when={props.s.ctaLabelField && props.data[props.s.ctaLabelField]}>
                    <span class="mt-3 inline-flex w-fit items-center gap-1 text-sm font-medium text-primary-600">
                        {props.data[props.s.ctaLabelField!]}
                        <Show when={props.entry.__detailHref}><span aria-hidden="true">→</span></Show>
                    </span>
                </Show>
            </div>
        </div>
    );
}

export function CardListNode(props: NodeComponentProps) {
    const slots = createMemo<CardSlotsCfg>(() => props.node.props?.slots ?? {});
    const columns = createMemo<number>(() => props.node.props?.columns ?? 3);
    const paginationState = usePaginationState();
    const pagination = () => props.node.repeat?.pagination;
    const currentPage = createMemo(() => pagination() ? resolveCurrentPage(pagination()!, props.context, paginationState.page()) : 1);

    // Single `createResource`, PLAIN arrow-function source — see TableNode.tsx's identical
    // comment for the 2 real bugs (2 sibling resources; wrapping the source in `createMemo`)
    // found live before landing on this exact shape, matching every other repeat-consuming
    // primitive in this codebase (MixedFeedNode.tsx et al.).
    const [listData] = createResource(
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
    const entries = () => listData()?.entries ?? [];
    const totalCount = () => listData()?.totalCount ?? 0;

    return (
        <div>
            <div style={{ display: 'grid', 'grid-template-columns': `repeat(${columns()}, minmax(0, 1fr))`, gap: '1.25rem' }}>
                <For each={entries() ?? []}>
                    {(entry) => {
                        const s = slots();
                        const data = entry.data ?? {};
                        // Post-Phase-8 visual-quality dogfooding find: the WHOLE card is now the
                        // click target when `linkToDetail` resolved an `__detailHref` for this
                        // entry (the small text-only `ctaLabelField` link below was the only way
                        // in before — easy to miss, and required an admin to ALSO configure a CTA
                        // label field just to make cards clickable at all). `CardBody` is a real
                        // sub-component (not a shared JSX value reused across both `<Show>`
                        // branches below) — each branch mounts its OWN independent DOM subtree,
                        // avoiding any ambiguity about a single DOM node living under two
                        // different possible parents.
                        return (
                            <Show when={entry.__detailHref} fallback={<CardBody s={s} data={data} entry={entry} />}>
                                <a href={entry.__detailHref} class="block h-full">
                                    <CardBody s={s} data={data} entry={entry} />
                                </a>
                            </Show>
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
