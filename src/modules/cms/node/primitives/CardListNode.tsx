// src/modules/cms/node/primitives/CardListNode.tsx
//
// Node-level data binding (2026-08-17) — self-contained list primitive, same shape/rationale
// as TableNode.tsx (see that file's header comment). `columns` (grid column count) is a plain
// `props` field, NOT `style` — it's a data-driven layout decision (how many cards per row for
// THIS entry set), not a visual style property.
//
// Post-Phase-8 visual-quality dogfooding find (real bug, reproduced live at 390px on a "related
// products" Card List): the grid wrapper below rendered a HARDCODED `repeat(${columns()}, ...)`
// with no breakpoint awareness at all — every Card List on every page kept its desktop column
// count (3) all the way down to a 390px phone, squeezing each card to ~110px (tiny cropped image,
// wrapped title, gap rendered but visually negligible against 3 columns that narrow) — exactly
// the "quá xấu và thô ráp, responsive cũng quá tệ" the user reported. An earlier version of this
// comment claimed responsive column count "reuses the existing responsiveOverrides mechanism at
// the STYLE level" — that was aspirational, not real: this component never called
// `applyNodeStyle`/`resolveEffectiveStyle` (unlike EVERY other primitive in this directory —
// FrameNode.tsx, ImageNode.tsx, TextNode.tsx, etc. all thread `props.context.device()` through
// one of those two helpers), and NodeDataSourceTab.tsx's Card List column field is a single flat
// number with no per-breakpoint control in the Inspector UI. Building a whole new
// responsiveOverrides-backed per-breakpoint columns field (new Inspector UI + GraphQL/DB field)
// would be disproportionate to the actual defect, and would still leave every ALREADY-BUILT Card
// List instance broken on mobile until an admin manually revisited each one. `effectiveColumns()`
// instead derives a sane default straight from `props.context.device()` — same source every other
// primitive already reads — so the fix applies to every existing and future Card List instance
// with zero admin action.
//
// Cross-site review (2026-09-01, REVIEW-2026-09-01.md §A.4) — `CardBody`/`CardListRow`/
// `FeaturedCard` below used to hardcode Tailwind's literal `bg-white`/`border-neutral-200`/
// `text-neutral-900`/`text-neutral-600`/`bg-primary-100`/`text-primary-700`/`text-primary-600`
// classes directly — real theme tokens (`--color-*`, see `resolveThemeCssVars.ts`) never entered
// the picture at all, unlike every other primitive in this directory. Confirmed live on VELTRA
// (dark/neon theme): every card rendered as a stark white box with barely-visible gray price
// text, completely disconnected from the page's own dark art-direction. Fixed by switching every
// one of those classes to the `bg-[var(--color-surface)]` / `text-[var(--color-foreground)]` /
// etc. arbitrary-value form already proven safe in this codebase (SiteHeader.tsx uses the same
// pattern extensively) — NOT the `grid-cols-[7fr_5fr]`-style multi-token arbitrary value that was
// found broken in this same file's `variant:'featured'` layout; a single CSS custom property
// inside brackets has always resolved correctly here.
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
        <div class="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-shadow hover:shadow-lg">
            <Show when={props.s.imageField && props.data[props.s.imageField]}>
                <div class="overflow-hidden">
                    <img src={props.data[props.s.imageField!]} class="aspect-4/3 w-full object-cover transition-transform duration-300 group-hover:scale-105" alt="" />
                </div>
            </Show>
            <div class="flex flex-1 flex-col p-4">
                <Show when={props.s.badgeField && props.data[props.s.badgeField]}>
                    <span class="mb-2 inline-block w-fit rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">{props.data[props.s.badgeField!]}</span>
                </Show>
                <Show when={props.s.titleField && props.data[props.s.titleField]}>
                    <h3 class="font-semibold text-[var(--color-foreground)]">{props.data[props.s.titleField!]}</h3>
                </Show>
                <Show when={props.s.subtitleField && props.data[props.s.subtitleField]}>
                    <p class="mt-1 font-semibold text-[var(--color-primary)]">{formatSlotValue(props.data[props.s.subtitleField!], props.s.subtitleField)}</p>
                </Show>
                <Show when={props.s.descriptionField && props.data[props.s.descriptionField]}>
                    <p class="mt-2 text-sm text-[var(--color-foreground-muted)]">{formatSlotValue(props.data[props.s.descriptionField!], props.s.descriptionField)}</p>
                </Show>
                <Show when={props.s.ctaLabelField && props.data[props.s.ctaLabelField]}>
                    <span class="mt-3 inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--color-primary)]">
                        {props.data[props.s.ctaLabelField!]}
                        <Show when={props.entry.__detailHref}><span aria-hidden="true">→</span></Show>
                    </span>
                </Show>
            </div>
        </div>
    );
}

/** `variant:'list'` (Post-Phase-8 dogfooding find — see this file's header comment): forcing
 * `columns:1` on the grid variant was the only lever available before this existed, and it
 * stretched the `aspect-4/3` image to the FULL row width — one service card filling the whole
 * viewport height. A real horizontal row instead: a small FIXED-size square image/icon on the
 * left (never grows with row width), title+subtitle+description stacked in the middle, and a
 * trailing "→" affordance on the right when the row is clickable — the "icon, text, chevron"
 * list pattern real sites use for a services/features list, distinct in COMPOSITION (not just
 * narrower columns) from the product grid sitting right above it on the same page. */
function CardListRow(props: { s: CardSlotsCfg; data: Record<string, any>; entry: Record<string, any> }) {
    return (
        <div class="group flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-shadow hover:shadow-lg">
            <Show when={props.s.imageField && props.data[props.s.imageField]}>
                <img src={props.data[props.s.imageField!]} class="h-14 w-14 shrink-0 rounded-lg object-cover" alt="" />
            </Show>
            <div class="min-w-0 flex-1">
                <Show when={props.s.badgeField && props.data[props.s.badgeField]}>
                    <span class="mb-1 inline-block w-fit rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">{props.data[props.s.badgeField!]}</span>
                </Show>
                <div class="flex flex-wrap items-baseline gap-x-2">
                    <Show when={props.s.titleField && props.data[props.s.titleField]}>
                        <h3 class="font-semibold text-[var(--color-foreground)]">{props.data[props.s.titleField!]}</h3>
                    </Show>
                    <Show when={props.s.subtitleField && props.data[props.s.subtitleField]}>
                        <span class="font-semibold text-[var(--color-primary)]">{formatSlotValue(props.data[props.s.subtitleField!], props.s.subtitleField)}</span>
                    </Show>
                </div>
                <Show when={props.s.descriptionField && props.data[props.s.descriptionField]}>
                    <p class="mt-1 truncate text-sm text-[var(--color-foreground-muted)]">{formatSlotValue(props.data[props.s.descriptionField!], props.s.descriptionField)}</p>
                </Show>
            </div>
            <Show when={props.entry.__detailHref}>
                <span aria-hidden="true" class="shrink-0 text-[var(--color-foreground-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]">→</span>
            </Show>
        </div>
    );
}

/** `variant:'featured'` — the "1 large + N small" asymmetric layout real editorial/blog
 * listings use (target-reference gap found in the Post-Phase-8 dogfooding pass's Blog section:
 * every Card List instance on the site, blog included, only ever had the uniform-grid or
 * uniform-row choice above, so a "Bài viết nổi bật" listing rendered as 3 identical cards with
 * no visual hierarchy). The first entry renders as `FeaturedCard` (bigger image, larger title,
 * full description) beside a stacked column of the remaining entries as `CardListRow` — reusing
 * that existing sub-component rather than inventing a third "small card" shape. Requires at
 * least 1 entry; with exactly 1 entry the second grid column is simply empty (no special-casing
 * needed, `entries().slice(1)` is `[]`).  */
function FeaturedCard(props: { s: CardSlotsCfg; data: Record<string, any>; entry: Record<string, any> }) {
    return (
        <div class="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-shadow hover:shadow-lg sm:flex-row">
            <Show when={props.s.imageField && props.data[props.s.imageField]}>
                <div class="overflow-hidden sm:w-1/2">
                    <img src={props.data[props.s.imageField!]} class="aspect-4/3 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" alt="" />
                </div>
            </Show>
            <div class="flex flex-1 flex-col justify-center p-6">
                <Show when={props.s.badgeField && props.data[props.s.badgeField]}>
                    <span class="mb-3 inline-block w-fit rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">{props.data[props.s.badgeField!]}</span>
                </Show>
                <Show when={props.s.titleField && props.data[props.s.titleField]}>
                    <h3 class="text-xl font-bold text-[var(--color-foreground)] sm:text-2xl">{props.data[props.s.titleField!]}</h3>
                </Show>
                <Show when={props.s.subtitleField && props.data[props.s.subtitleField]}>
                    <p class="mt-2 font-semibold text-[var(--color-primary)]">{formatSlotValue(props.data[props.s.subtitleField!], props.s.subtitleField)}</p>
                </Show>
                <Show when={props.s.descriptionField && props.data[props.s.descriptionField]}>
                    <p class="mt-3 text-sm text-[var(--color-foreground-muted)]">{formatSlotValue(props.data[props.s.descriptionField!], props.s.descriptionField)}</p>
                </Show>
                <Show when={props.s.ctaLabelField && props.data[props.s.ctaLabelField]}>
                    <span class="mt-4 inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--color-primary)]">
                        {props.data[props.s.ctaLabelField!]}
                        <Show when={props.entry.__detailHref}><span aria-hidden="true">→</span></Show>
                    </span>
                </Show>
            </div>
        </div>
    );
}

/** Shared `__detailHref` link-wrap, factored out so `featured` doesn't duplicate the
 * `<Show>`/`<a>` branch already in the `grid`/`list` `<For>` body below. */
function EntryLink(props: { entry: Record<string, any>; children: any }) {
    return (
        <Show when={props.entry.__detailHref} fallback={props.children}>
            <a href={props.entry.__detailHref} class="block h-full">
                {props.children}
            </a>
        </Show>
    );
}

export function CardListNode(props: NodeComponentProps) {
    const slots = createMemo<CardSlotsCfg>(() => props.node.props?.slots ?? {});
    const columns = createMemo<number>(() => props.node.props?.columns ?? 3);
    const variant = createMemo<'grid' | 'list' | 'featured'>(() => {
        const v = props.node.props?.variant;
        return v === 'list' || v === 'featured' ? v : 'grid';
    });
    // See this file's header comment for why this reads `device()` directly instead of going
    // through `responsiveOverrides`: 1 column on mobile, capped at 2 on tablet (never MORE than
    // the admin's configured desktop count, so a Card List already set to 1 or 2 columns doesn't
    // grow on tablet), the admin's own value on desktop.
    const effectiveColumns = createMemo<number>(() => {
        const device = props.context.device();
        if (device === 'mobile') return 1;
        if (device === 'tablet') return Math.min(columns(), 2);
        return columns();
    });
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

    // `variant:'list'` stacks rows in a single flex column (no column-count concept at all —
    // `effectiveColumns()`/the "Số cột lưới" field are 'grid'-only, matching NodeDataSourceTab.tsx
    // hiding that control entirely once 'list' is picked).
    const wrapperStyle = () => (variant() === 'list'
        ? { display: 'flex', 'flex-direction': 'column' as const, gap: '0.75rem' }
        : { display: 'grid', 'grid-template-columns': `repeat(${effectiveColumns()}, minmax(0, 1fr))`, gap: '1.25rem' });

    return (
        <div>
            <Show
                when={variant() === 'featured'}
                fallback={
                    <div style={wrapperStyle()}>
                        <For each={entries() ?? []}>
                            {(entry) => {
                                const s = slots();
                                const data = entry.data ?? {};
                                // Post-Phase-8 visual-quality dogfooding find: the WHOLE card/row is
                                // now the click target when `linkToDetail` resolved an `__detailHref`
                                // for this entry (the small text-only `ctaLabelField` link below was
                                // the only way in before — easy to miss, and required an admin to
                                // ALSO configure a CTA label field just to make cards clickable at
                                // all). `CardBody`/`CardListRow` are real sub-components (not a
                                // shared JSX value reused across both `<Show>` branches below) — each
                                // branch mounts its OWN independent DOM subtree, avoiding any
                                // ambiguity about a single DOM node living under two different
                                // possible parents.
                                const body = () => (variant() === 'list'
                                    ? <CardListRow s={s} data={data} entry={entry} />
                                    : <CardBody s={s} data={data} entry={entry} />);
                                return <EntryLink entry={entry}>{body()}</EntryLink>;
                            }}
                        </For>
                    </div>
                }
            >
                <div class="flex flex-col gap-6 lg:flex-row lg:items-stretch">
                    <Show when={entries()[0]}>
                        {(first) => (
                            <div class="lg:w-7/12">
                                <EntryLink entry={first()}>
                                    <FeaturedCard s={slots()} data={first().data ?? {}} entry={first()} />
                                </EntryLink>
                            </div>
                        )}
                    </Show>
                    <div class="flex flex-col gap-4 lg:w-5/12">
                        <For each={entries().slice(1)}>
                            {(entry) => (
                                <EntryLink entry={entry}>
                                    <CardListRow s={slots()} data={entry.data ?? {}} entry={entry} />
                                </EntryLink>
                            )}
                        </For>
                    </div>
                </div>
            </Show>
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
