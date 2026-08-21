// src/modules/cms/node/nodeDataBinding.ts
// Node data-binding engine — resolves a node prop's actual value (static vs bound-to-
// contextEntry) và fetch entries cho node có `repeat` (collection binding). Xem
// docs/superpowers/specs/2026-08-12-nocode-visual-builder-v2-design.md §3.
import type { DataBinding, CollectionRepeat } from './node.types';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { resolveGenericDataSource } from '@/modules/cms/api/genericDataSource';
import { PageService } from '@/shared/services/page/page.service';
import { resolveDetailHref } from '@/modules/cms/api/resolveDetailHref';

/** Static value hay giá trị lấy từ field của context entry hiện tại. `static` luôn
 * thắng bất kể contextEntry có gì; `boundField` fallback về giá trị static nếu
 * không có context hoặc field không tồn tại (an toàn khi preview ngoài Page có
 * dataBinding, hoặc field bị đổi tên phía Content Type). */
export function resolveBoundValue(binding: DataBinding, contextEntry: Record<string, any> | undefined, staticValue: any, contextEntryIndex?: number): any {
    if (binding.mode === 'itemIndex') return String((contextEntryIndex ?? 0) + 1).padStart(2, '0');
    if (binding.mode !== 'boundField' || !binding.field) return staticValue;
    if (!contextEntry || !(binding.field in contextEntry)) return staticValue;
    return contextEntry[binding.field];
}

/** page (1-based, from `repeat.pagination.paramName` in `ctx.queryParams`) -> `offset` for the
 * BE's `offset` arg. Missing/non-numeric/< 1 page values fall back to page 1 (offset 0) — a
 * malformed `?page=` in the URL should degrade to "show the first page", never throw or send a
 * negative offset to the BE. */
function resolvePageOffset(pagination: NonNullable<CollectionRepeat['pagination']> | undefined, queryParams: Record<string, string>): number | undefined {
    if (!pagination) return undefined;
    const raw = queryParams[pagination.paramName ?? 'page'];
    const page = raw ? parseInt(raw, 10) : 1;
    const safePage = Number.isFinite(page) && page >= 1 ? page : 1;
    return (safePage - 1) * pagination.pageSize;
}

export interface FetchRepeatCtx {
    locale?: string;
    pathParams: Record<string, string>;
    queryParams: Record<string, string>;
    /** Final-review fix Critical #1: entry id of the CURRENT contextEntry — kept as a SEPARATE
     * id-only field (not nested inside a `contextEntry` object) because the flat field-data map
     * used elsewhere in this file's sibling (`resolveBoundValue`) never carries an `id` key, and
     * this function never reads field VALUES, only the id — no `contextEntry` field belongs on
     * this ctx type at all; re-adding one is exactly the shape-mismatch this fix closed. */
    contextEntryId?: string;
}

/** Phase 0 M1 Task 8: hỗ trợ 4 `source` — 'own' (mặc định, dynamic/manual filter qua
 * GenericDataSourceFilter[] TÁI DÙNG Section's resolveGenericDataSource), 'related'/'backlink'
 * (cần contextEntryId — id riêng, KHÔNG lồng trong 1 object field-data — tương đương
 * RELATED_ENTRIES/BACKLINK_ENTRIES của Section), 'mixed' (tương đương MIXED_FEED). Xem spec §2.3.
 *
 * `repeat.contentTypeKey` được truyền thẳng làm `contentTypeId` — codebase này không
 * có bảng tra key→id riêng, mọi nơi khác đều tham chiếu ContentType qua contentTypeId.
 *
 * GAP đã biết: `repeat.taxonomyFilter` (lọc theo taxonomy term) chưa có tham số tương
 * ứng ở getPublicContentEntries — hạ tầng BE chưa hỗ trợ, không phải thiếu ở đây. Nếu
 * có giá trị, chỉ cảnh báo console và bỏ qua (KHÔNG throw, KHÔNG âm thầm coi như đã lọc). */
export async function fetchRepeatEntries(repeat: CollectionRepeat, ctx: FetchRepeatCtx): Promise<Record<string, any>[]> {
    if (repeat.taxonomyFilter?.length) {
        console.warn('[nodeDataBinding] taxonomyFilter is not yet supported by getPublicContentEntries — ignoring.');
    }

    const source = repeat.source ?? 'own';
    // Node-level data binding (2026-08-17): `cardinality:'one'` forces every branch below to
    // fetch exactly 1 entry, regardless of `repeat.limit` — reuses this same function/pipeline
    // rather than a separate single-entry fetch path (see design doc §1). When pagination is
    // configured, `pagination.pageSize` — not `repeat.limit` — is the source of truth for how
    // many rows one page holds (avoids a footgun where the two could be edited out of sync; the
    // Data Source tab keeps them equal when it writes both, but this function doesn't rely on
    // that always holding).
    const effectiveLimit = repeat.cardinality === 'one' ? 1 : (repeat.pagination?.pageSize ?? repeat.limit);
    let entries: Record<string, any>[];

    if (source === 'related') {
        // Final-review fix Critical #1: entry id now comes from `ctx.contextEntryId`, NOT
        // `ctx.contextEntry.id` — `contextEntry` is the flat field-data map and never carries
        // an `id` key (see FetchRepeatCtx above).
        if (!ctx.contextEntryId) return [];
        const res = await ContentEntryService.getRelatedContentEntries({ input: { entryId: ctx.contextEntryId, matchField: repeat.matchField, limit: effectiveLimit, locale: ctx.locale } });
        entries = (res ?? []).filter((e) => e != null) as Record<string, any>[];
        // Section gốc (RelatedEntriesSection qua resolveSectionDataSource.ts) resolve pattern
        // theo contentTypeId của ENTRY ĐẦU TIÊN trả về (mọi related-entry cùng content-type
        // với entry đang xem) — port nguyên cách đó, không đoán 1 cách khác.
        // Final whole-branch review Minor #1: legacy guards `entries[0]?.contentTypeId` truthy
        // before calling the service (resolveCmsPageProps.ts's resolveSectionDataSource) — a
        // missing contentTypeId would otherwise send `undefined` into a GraphQL variable and
        // kill the whole block's fetch, not just leave cards unlinked. Mirrors the `mixed`
        // branch's `filter((id): id is string => !!id)` guard below.
        const relatedContentTypeId: string | undefined = entries[0]?.contentTypeId;
        if (repeat.linkToDetail && entries.length && relatedContentTypeId) {
            const pattern = await PageService.getPublicDetailPathByContentType({ contentTypeId: relatedContentTypeId, locale: ctx.locale });
            entries = entries.map((e) => ({ ...e, __detailHref: resolveDetailHref(pattern ?? undefined, e.data) }));
        }
        return entries;
    }

    if (source === 'backlink') {
        if (!ctx.contextEntryId || !repeat.sourceContentTypeId) return [];
        const res = await ContentEntryService.getBacklinkContentEntries({ input: { entryId: ctx.contextEntryId, sourceContentTypeId: repeat.sourceContentTypeId, matchField: repeat.matchField, limit: effectiveLimit, locale: ctx.locale } });
        entries = (res ?? []).filter((e) => e != null) as Record<string, any>[];
        // Re-review round 1 Minor: skip the network call entirely when there's nothing to
        // attach a href to, same as the `related`/`mixed` branches already do.
        if (repeat.linkToDetail && entries.length) {
            const pattern = await PageService.getPublicDetailPathByContentType({ contentTypeId: repeat.sourceContentTypeId, locale: ctx.locale });
            entries = entries.map((e) => ({ ...e, __detailHref: resolveDetailHref(pattern ?? undefined, e.data) }));
        }
        return entries;
    }

    if (source === 'mixed') {
        // Task 22 live-review fix — 2 real bugs found live, both in this branch:
        //
        // (1) The admin's "+ Thêm nguồn" (MixedSourcesEditor, Task 13) adds a new row with an
        // empty `contentTypeId` before the admin picks a real content type, and the canvas
        // re-renders immediately on every edit — filter incomplete sources out here, same
        // defensive pattern this function already uses for `relatedContentTypeId`/
        // `uniqueContentTypeIds` below (`!!id` guards), so a mid-configuration row never reaches
        // the network, but an already-configured sibling source still resolves fine.
        //
        // (2) `repeat.sources[]` (CollectionRepeat, node.types.ts) carries `fieldMapping` — a
        // FE-only concern MixedFeedNode.tsx's own `sourceByType()` reads directly off
        // `props.node.repeat.sources`, matching returned entries by `contentTypeId` — it was
        // NEVER meant to round-trip through the BE query itself. The real
        // `MixedFeedSourceInput` GraphQL type (ddd-graphql-be's contentEntry.dto.ts) only
        // declares `contentTypeId`/`limit`; sending `fieldMapping` in the variables makes the
        // ENTIRE query fail GraphQL's input coercion with a 400 ("Field \"fieldMapping\" is not
        // defined by type \"MixedFeedSourceInput\"") — confirmed live. This bug predates this
        // whole effort (the dormant M2a-era code already shaped `sources` this way) but was
        // never actually exercised with real fieldMapping data until Task 13 gave admins a UI
        // to configure one. Strip fieldMapping before sending; MixedFeedNode.tsx doesn't need
        // it back from the response, it already has it from node.repeat.sources.
        const configuredSources = (repeat.sources ?? [])
            .filter((s) => !!s.contentTypeId)
            .map((s) => ({ contentTypeId: s.contentTypeId, limit: s.limit }));
        if (!configuredSources.length) return [];
        const res = await ContentEntryService.getMixedContentEntries({ input: { sources: configuredSources, limit: effectiveLimit, locale: ctx.locale } });
        entries = (res ?? []).filter((e) => e != null) as Record<string, any>[];
        if (repeat.linkToDetail && entries.length) {
            // MixedFeedSection gốc resolve 1 pattern RIÊNG cho MỖI content-type góp mặt trong
            // feed (không dùng chung 1 pattern như related/backlink) — port nguyên cách đó.
            const uniqueContentTypeIds = [...new Set(entries.map((e) => e.contentTypeId).filter((id): id is string => !!id))];
            const patterns = await Promise.all(uniqueContentTypeIds.map((id) => PageService.getPublicDetailPathByContentType({ contentTypeId: id, locale: ctx.locale })));
            const patternByType = new Map(uniqueContentTypeIds.map((id, i) => [id, patterns[i]]));
            entries = entries.map((e) => ({ ...e, __detailHref: resolveDetailHref(patternByType.get(e.contentTypeId) ?? undefined, e.data) }));
        }
        return entries;
    }

    if (source === 'local') {
        // Final-review fix Important #1: this branch used to return ALL of `repeat.localItems`,
        // ignoring `limit`/`pagination` entirely, while `fetchRepeatEntryCount`'s local branch
        // already reports the TRUE unsliced length — Table/CardList call both in one Promise.all,
        // so the pagination UI showed e.g. "3 pages" while every page rendered all N items
        // identically. Slice using the exact same offset/limit semantics the `own` branch below
        // already uses (`effectiveLimit` computed once above; offset only applies to a real
        // 'many' list with pagination configured, same as `own`).
        const offset = repeat.cardinality === 'one' ? undefined : resolvePageOffset(repeat.pagination, ctx.queryParams);
        const sliceStart = offset ?? 0;
        // `effectiveLimit` can be undefined (no `limit`/`pagination.pageSize` set at all) — same
        // as the `own` branch sending `limit: undefined` to mean "no cap"; `.slice(start,
        // undefined)` takes everything from `start` to the end, unlike `.slice(start, NaN)`.
        const sliceEnd = effectiveLimit != null ? sliceStart + effectiveLimit : undefined;
        const sliced = (repeat.localItems ?? []).slice(sliceStart, sliceEnd);
        return sliced.map((item, i) => ({ id: `local-${sliceStart + i}`, data: item, contentTypeId: undefined }));
    }

    // source === 'own' — `contentTypeKey` is optional on CollectionRepeat (shape shared with
    // the other 3 sources, which don't need it) but semantically required here; guard + early
    // return (same convention as the related/backlink branches above) instead of letting a
    // misconfigured node crash with a GraphQL variable error, and narrows the type for TS.
    if (!repeat.contentTypeKey) return [];

    if (repeat.mode === 'manual') {
        const res = await ContentEntryService.getPublicContentEntries({ contentTypeId: repeat.contentTypeKey, ids: repeat.entryIds, limit: effectiveLimit, locale: ctx.locale });
        entries = (res ?? []).filter((e) => e != null) as Record<string, any>[];
    } else {
        // Final-review fix Important #2: defensive guard against a legacy/malformed `repeat.filter`
        // (pre-Task-7/8 rows may still have the OLD `Record<string, any>` shape instead of today's
        // `GenericDataSourceFilter[]` array) — `resolveGenericDataSource`'s `for...of` throws
        // `TypeError: filters is not iterable` on a non-array, which the per-node ErrorBoundary
        // swallows silently (blank frame, no visible error). Degrade to "no filter" instead.
        if (repeat.filter !== undefined && !Array.isArray(repeat.filter)) {
            console.warn('[nodeDataBinding] repeat.filter has a legacy shape (not an array) — ignoring, rendering unfiltered.');
        }
        const rawFilter = Array.isArray(repeat.filter) ? repeat.filter : [];
        const filters = resolveGenericDataSource(rawFilter, { pathParams: ctx.pathParams, queryParams: ctx.queryParams });
        const res = await ContentEntryService.getPublicContentEntries({
            contentTypeId: repeat.contentTypeKey,
            filters: filters.length ? filters : undefined,
            sortField: repeat.sort?.field,
            sortDirection: repeat.sort?.direction,
            limit: effectiveLimit,
            // Node-level data binding (2026-08-17) — offset only applies to a real 'many' list
            // with pagination configured; a cardinality:'one' fetch has no notion of a "page".
            offset: repeat.cardinality === 'one' ? undefined : resolvePageOffset(repeat.pagination, ctx.queryParams),
            locale: ctx.locale,
        });
        entries = (res ?? []).filter((e) => e != null) as Record<string, any>[];
    }

    if (repeat.linkToDetail && entries.length) {
        const pattern = await PageService.getPublicDetailPathByContentType({ contentTypeId: repeat.contentTypeKey, locale: ctx.locale });
        entries = entries.map((e) => ({ ...e, __detailHref: resolveDetailHref(pattern ?? undefined, e.data) }));
    }
    return entries;
}

/** Total-row count for a paginated Table/Card-List Node's Prev/Next control — ONLY meaningful
 * for the one shape that supports it: `source:'own'` (default), `mode:'dynamic'` (or unset),
 * `cardinality` NOT 'one'. Every other combination (related/backlink/mixed, manual ids,
 * single-entry) returns 0 without calling the service — count is either meaningless (single
 * entry) or unsupported server-side (the other 3 sources have no matching COUNT query, matching
 * `getPublicContentEntriesCount`'s BE signature which only takes contentTypeId+filters). */
export async function fetchRepeatEntryCount(repeat: CollectionRepeat, ctx: FetchRepeatCtx): Promise<number> {
    if (repeat.cardinality === 'one') return 0;
    if (repeat.source === 'local') return repeat.localItems?.length ?? 0;
    if ((repeat.source ?? 'own') !== 'own') return 0;
    if (repeat.mode === 'manual') return 0;
    if (!repeat.contentTypeKey) return 0;

    const rawFilter = Array.isArray(repeat.filter) ? repeat.filter : [];
    const filters = resolveGenericDataSource(rawFilter, { pathParams: ctx.pathParams, queryParams: ctx.queryParams });
    return ContentEntryService.getPublicContentEntriesCount({
        contentTypeId: repeat.contentTypeKey,
        filters: filters.length ? filters : undefined,
        locale: ctx.locale,
    });
}
