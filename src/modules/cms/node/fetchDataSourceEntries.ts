// src/modules/cms/node/fetchDataSourceEntries.ts
// Phase 0 M2b: 3 widget "tự chứa" (PROJECT_SHOWCASE/LOGO_GRID/FEATURED_ENTRY) đọc CÙNG 1 shape
// SectionDataSource ({mode, ids, query:{contentTypeId,limit,sort}, genericFilters}) mà
// CONTENT_GRID Section cũ dùng (props.node.props.dataSource, KHÔNG đổi shape — spec §3), nhưng tự
// fetch qua createResource (không được SSR resolve sẵn thành props.section.entries như Section).
// Tách 1 hàm dùng CHUNG 3 nơi — tránh lặp cùng logic mode manual/dynamic + resolveGenericDataSource
// 3 lần (cùng nguyên tắc DRY nodeDataBinding.ts's fetchRepeatEntries 'own' branch đã áp dụng).
import type { SectionDataSource } from '@/modules/cms/cms.types';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { resolveGenericDataSource } from '@/modules/cms/api/genericDataSource';

export interface FetchDataSourceEntriesCtx {
    locale?: string;
    pathParams: Record<string, string>;
    queryParams: Record<string, string>;
}

export async function fetchDataSourceEntries(dataSource: SectionDataSource | undefined, ctx: FetchDataSourceEntriesCtx): Promise<Record<string, any>[]> {
    const ds = dataSource ?? {};
    if (!ds.query?.contentTypeId) return [];

    if (ds.mode === 'manual') {
        const res = await ContentEntryService.getPublicContentEntries({ contentTypeId: ds.query.contentTypeId, ids: ds.ids, locale: ctx.locale });
        return (res ?? []).filter((e) => e != null) as Record<string, any>[];
    }

    const rawFilter = Array.isArray(ds.genericFilters) ? ds.genericFilters : [];
    const filters = resolveGenericDataSource(rawFilter, { pathParams: ctx.pathParams, queryParams: ctx.queryParams });
    const res = await ContentEntryService.getPublicContentEntries({
        contentTypeId: ds.query.contentTypeId,
        filters: filters.length ? filters : undefined,
        sortField: ds.query.sort?.field,
        sortDirection: ds.query.sort?.direction,
        limit: ds.query.limit,
        locale: ctx.locale,
    });
    return (res ?? []).filter((e) => e != null) as Record<string, any>[];
}
