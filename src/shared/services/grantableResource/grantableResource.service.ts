// src/shared/services/grantableResource/grantableResource.service.ts
//
// Lấy reference data (id + tên rút gọn) cho picker scope trong UI phân quyền.
//
// API getGrantableResources gác bởi STAFF_PERMISSION_MANAGE (KHÔNG phải *_VIEW)
// → phá vòng lặp: người quản lý quyền vẫn chọn được tài nguyên để gán scope dù
// không có quyền VIEW tài nguyên đó.

import { $, query, GrantableResourceInput } from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';

export interface GrantableResourceItemDTO {
    id?: string;
    name?: string;
    code?: string;
    parentId?: string;
}

export interface GrantableResourceResultDTO {
    items?: Array<GrantableResourceItemDTO>;
    total?: number;
    bounded?: boolean;
}

export type { GrantableResourceInput };

/** Hình dạng trả về tương thích với Select.optionsQuery (edges + pageInfo). */
export interface GrantableEdgesResult {
    edges: Array<{ node: GrantableResourceItemDTO; cursor: string }>;
    pageInfo: { totalCount: number; hasNextPage: boolean; endCursor: string | null };
}

export class GrantableResourceService extends CrudService {
    /** Gọi raw — trả về { items, total, bounded }. */
    static async list(input: GrantableResourceInput): Promise<GrantableResourceResultDTO> {
        const res = await this.queryApi({
            document: query('getGrantableResources', (root) => [
                root.getGrantableResources({ input: $('input') }, (r) => [
                    r.items((i) => [i.id, i.name, i.code, i.parentId]),
                    r.total,
                    r.bounded,
                ]),
            ]),
            variables: { input },
        }) as any;
        return (res.getGrantableResources ?? { items: [], total: 0, bounded: false }) as GrantableResourceResultDTO;
    }

    /**
     * Adapter cho Select.optionsQuery — nhận `{ input: { search, filter, limit } }`
     * như getAllX và trả về `{ edges, pageInfo }`.
     *
     * `filter.id.$in` (nếu có) → resolve nhãn cho mục đã chọn sẵn.
     */
    static forSelect(resourceGroup: string) {
        return async (args: { input: any }): Promise<GrantableEdgesResult> => {
            const input = args?.input ?? {};
            const ids: string[] | undefined = input?.filter?.id?.$in;
            const result = await this.list({
                resourceGroup,
                search: input.search ?? undefined,
                ids: ids?.length ? ids : undefined,
                limit: input.limit ?? undefined,
            });
            const items = (result.items ?? []).filter(Boolean);
            return {
                edges: items.map((node) => ({ node, cursor: node.id ?? '' })),
                pageInfo: {
                    totalCount: result.total ?? items.length,
                    hasNextPage: false,
                    endCursor: null,
                },
            };
        };
    }
}
