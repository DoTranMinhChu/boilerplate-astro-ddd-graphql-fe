// src/shared/services/activityLog/activityLog.service.ts
//
// Tra cứu nhật ký hoạt động (append-only) — toàn tenant hoặc theo từng entity.
// BE: getAllActivityLog (phân trang) + getEntityActivityTimeline (timeline 1 entity).

import {
    $, fragment, query, GetOutput,
    ActivityLog,
    PaginationArgsInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type ActivityLogDTO = GetOutput<typeof ActivityLogService.fragment>;
export type ActivityLogPaginationCursor = PaginationCursor<ActivityLogDTO>;

export class ActivityLogService extends CrudService {
    static apiName = 'activityLog' as const;
    static displayName = 'nhật ký hoạt động';

    static fragment = fragment(ActivityLog, (i) => [
        i.id,
        i.actorType,
        i.actorAccountId,
        i.actorFarmerId,
        i.actorName,
        i.action,
        i.entityType,
        i.entityId,
        i.summary,
        i.payload,
        i.relatedEntityType,
        i.relatedEntityId,
        i.ipAddress,
        i.tenantId,
        i.tenant((t) => [t.id, t.name, t.code]),
        i.createdAt,
    ]);

    /** Danh sách nhật ký toàn tenant — phân trang cursor. */
    static getAllActivityLog = async (args: { input: PaginationArgsInput }) => {
        const res = await this.queryApi({
            document: query('getAllActivityLog', (root) => [
                root.getAllActivityLog({ input: $('input') }, (n) => [
                    n.edges((e) => [e.node(() => this.fragment), e.cursor]),
                    n.pageInfo((p) => [
                        p.endCursor, p.hasNextPage, p.hasPreviousPage,
                        p.limit, p.startCursor, p.totalCount, p.totalPage,
                    ]),
                ]),
            ]),
            variables: args,
        });
        return res.getAllActivityLog as ActivityLogPaginationCursor;
    };

    /** Timeline của một entity cụ thể (mới nhất trước). */
    static getEntityTimeline = async (args: { entityType: string; entityId: string }) => {
        const res = await this.queryApi({
            document: query('getEntityActivityTimeline', (root) => [
                root.getEntityActivityTimeline(
                    { entityType: $('entityType'), entityId: $('entityId') },
                    () => this.fragment,
                ),
            ]),
            variables: args,
        });
        return (res.getEntityActivityTimeline ?? []) as ActivityLogDTO[];
    };
}
