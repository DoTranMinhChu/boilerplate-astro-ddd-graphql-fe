import type { GenericDataSourceFilter } from '@/modules/cms/cms.types';

export interface ResolvedFieldFilter {
    field: string;
    operator: string;
    value: string;
}

/**
 * Biến GenericDataSourceFilter[] (mục 3 design) thành filter cụ thể để gửi qua
 * getPublicContentEntries's `filters` arg — mỗi filter tự chọn giá trị từ 1 trong 3
 * nguồn (gõ tay / path param / query param). Filter thiếu giá trị (vd valueSource =
 * "pathParam" nhưng trang hiện tại không có param đó) bị BỎ QUA hoàn toàn — không gửi
 * 1 điều kiện rỗng/undefined lên server (server sẽ hiểu nhầm "so khớp với undefined").
 *
 * PURE — không đụng DOM/GraphQL, dễ test độc lập nếu cần sau này.
 */
export function resolveGenericDataSource(
    filters: GenericDataSourceFilter[],
    ctx: { pathParams: Record<string, string>; queryParams: Record<string, string> },
): ResolvedFieldFilter[] {
    const resolved: ResolvedFieldFilter[] = [];
    for (const f of filters) {
        let value: string | undefined;
        if (f.valueSource === 'static') value = f.staticValue;
        else if (f.valueSource === 'pathParam') value = f.paramName ? ctx.pathParams[f.paramName] : undefined;
        else if (f.valueSource === 'queryParam') value = f.paramName ? ctx.queryParams[f.paramName] : undefined;

        if (value === undefined || value === '') continue;
        resolved.push({ field: f.field, operator: f.operator || '$eq', value });
    }
    return resolved;
}
