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
export function resolveBoundValue(binding: DataBinding, contextEntry: Record<string, any> | undefined, staticValue: any): any {
    if (binding.mode !== 'boundField' || !binding.field) return staticValue;
    if (!contextEntry || !(binding.field in contextEntry)) return staticValue;
    return contextEntry[binding.field];
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
    let entries: Record<string, any>[];

    if (source === 'related') {
        // Final-review fix Critical #1: entry id now comes from `ctx.contextEntryId`, NOT
        // `ctx.contextEntry.id` — `contextEntry` is the flat field-data map and never carries
        // an `id` key (see FetchRepeatCtx above).
        if (!ctx.contextEntryId) return [];
        const res = await ContentEntryService.getRelatedContentEntries({ input: { entryId: ctx.contextEntryId, matchField: repeat.matchField, limit: repeat.limit, locale: ctx.locale } });
        entries = (res ?? []).filter((e) => e != null) as Record<string, any>[];
        // Section gốc (RelatedEntriesSection qua resolveSectionDataSource.ts) resolve pattern
        // theo contentTypeId của ENTRY ĐẦU TIÊN trả về (mọi related-entry cùng content-type
        // với entry đang xem) — port nguyên cách đó, không đoán 1 cách khác.
        if (repeat.linkToDetail && entries.length) {
            const pattern = await PageService.getPublicDetailPathByContentType({ contentTypeId: entries[0].contentTypeId, locale: ctx.locale });
            entries = entries.map((e) => ({ ...e, __detailHref: resolveDetailHref(pattern ?? undefined, e.data) }));
        }
        return entries;
    }

    if (source === 'backlink') {
        if (!ctx.contextEntryId || !repeat.sourceContentTypeId) return [];
        const res = await ContentEntryService.getBacklinkContentEntries({ input: { entryId: ctx.contextEntryId, sourceContentTypeId: repeat.sourceContentTypeId, matchField: repeat.matchField, limit: repeat.limit, locale: ctx.locale } });
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
        if (!repeat.sources?.length) return [];
        const res = await ContentEntryService.getMixedContentEntries({ input: { sources: repeat.sources, limit: repeat.limit, locale: ctx.locale } });
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

    // source === 'own' — `contentTypeKey` is optional on CollectionRepeat (shape shared with
    // the other 3 sources, which don't need it) but semantically required here; guard + early
    // return (same convention as the related/backlink branches above) instead of letting a
    // misconfigured node crash with a GraphQL variable error, and narrows the type for TS.
    if (!repeat.contentTypeKey) return [];

    if (repeat.mode === 'manual') {
        const res = await ContentEntryService.getPublicContentEntries({ contentTypeId: repeat.contentTypeKey, ids: repeat.entryIds, locale: ctx.locale });
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
            limit: repeat.limit,
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
