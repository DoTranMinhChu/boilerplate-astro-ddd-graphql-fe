// src/modules/cms/node/nodeDataBinding.ts
// Node data-binding engine — resolves a node prop's actual value (static vs bound-to-
// contextEntry) và fetch entries cho node có `repeat` (collection binding). Xem
// docs/superpowers/specs/2026-08-12-nocode-visual-builder-v2-design.md §3.
import type { DataBinding, CollectionRepeat } from './node.types';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { resolveGenericDataSource } from '@/modules/cms/api/genericDataSource';

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
    contextEntry?: Record<string, any>;
}

/** Phase 0 M1 Task 8: hỗ trợ 4 `source` — 'own' (mặc định, dynamic/manual filter qua
 * GenericDataSourceFilter[] TÁI DÙNG Section's resolveGenericDataSource), 'related'/'backlink'
 * (cần contextEntry.id, tương đương RELATED_ENTRIES/BACKLINK_ENTRIES của Section), 'mixed'
 * (tương đương MIXED_FEED). Xem spec §2.3.
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

    if (source === 'related') {
        if (!ctx.contextEntry?.id) return [];
        const res = await ContentEntryService.getRelatedContentEntries({ input: { entryId: ctx.contextEntry.id, matchField: repeat.matchField, limit: repeat.limit, locale: ctx.locale } });
        return (res ?? []).filter((e) => e != null) as Record<string, any>[];
    }

    if (source === 'backlink') {
        if (!ctx.contextEntry?.id || !repeat.sourceContentTypeId) return [];
        const res = await ContentEntryService.getBacklinkContentEntries({ input: { entryId: ctx.contextEntry.id, sourceContentTypeId: repeat.sourceContentTypeId, matchField: repeat.matchField, limit: repeat.limit, locale: ctx.locale } });
        return (res ?? []).filter((e) => e != null) as Record<string, any>[];
    }

    if (source === 'mixed') {
        if (!repeat.sources?.length) return [];
        const res = await ContentEntryService.getMixedContentEntries({ input: { sources: repeat.sources, limit: repeat.limit, locale: ctx.locale } });
        return (res ?? []).filter((e) => e != null) as Record<string, any>[];
    }

    // source === 'own' — `contentTypeKey` is optional on CollectionRepeat (shape shared with
    // the other 3 sources, which don't need it) but semantically required here; guard + early
    // return (same convention as the related/backlink branches above) instead of letting a
    // misconfigured node crash with a GraphQL variable error, and narrows the type for TS.
    if (!repeat.contentTypeKey) return [];

    if (repeat.mode === 'manual') {
        const res = await ContentEntryService.getPublicContentEntries({ contentTypeId: repeat.contentTypeKey, ids: repeat.entryIds, locale: ctx.locale });
        return (res ?? []).filter((e) => e != null) as Record<string, any>[];
    }

    const filters = resolveGenericDataSource(repeat.filter ?? [], { pathParams: ctx.pathParams, queryParams: ctx.queryParams });
    const res = await ContentEntryService.getPublicContentEntries({
        contentTypeId: repeat.contentTypeKey,
        filters: filters.length ? filters : undefined,
        sortField: repeat.sort?.field,
        sortDirection: repeat.sort?.direction,
        limit: repeat.limit,
        locale: ctx.locale,
    });
    return (res ?? []).filter((e) => e != null) as Record<string, any>[];
}
