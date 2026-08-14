import { $, fragment, query, mutation, GetOutput, Node, CreateNodeInput, UpdateNodeInput, MoveNodeInput } from '@shared/generated/typed-graphql';
import type { OperationContext } from '@urql/core';
import { CrudService } from '../crud.service';

// Raw shape (GraphQLMixed JSON fields typed as `string` by codegen — xem comment đầu
// cms.types.ts). Cùng convention với SectionDTO/section.service.ts: export raw type ở
// đây, override lại đúng 1 lần thành NodeDTO thật (StyleObject/LayoutProps/...) trong
// node.types.ts, KHÔNG cast rải rác `as any` ở từng method như đã từng làm tạm.
export type NodeDTO = GetOutput<typeof NodeService.fragment>;

export class NodeService extends CrudService {
    static apiName = 'node' as const;
    static fragment = fragment(Node, (i) => [
        i.pageId, i.parentId, i.order, i.type, i.layoutMode, i.style, i.layout, i.props,
        i.dataBinding, i.repeat, i.visibilityRules, i.responsiveOverrides, i.animationRef,
        i.id, i.createdAt, i.updatedAt, i.deletedAt,
    ]);

    // Phase 0 M3a: optional per-call `context` override (e.g. `{ requestPolicy: 'network-only'
    // }`) -- needed by NodeBuilder.page.tsx's reloadNodes, called right after
    // restorePageVersion, whose return type (PageVersion) shares no __typename with Node, so
    // urql's document cache has nothing to invalidate on; a cache-first refetch here could
    // serve stale, already-restored-over nodes. Same pattern as SectionService.getSectionsByPage.
    static getNodesByPage = async (args: { pageId: string }, context?: Partial<OperationContext>) => {
        const res = await this.queryApi({
            document: query('getNodesByPage', (root) => [root.getNodesByPage({ pageId: $('pageId') }, () => this.fragment)]),
            variables: args,
        }, context);
        return res.getNodesByPage as unknown as NodeDTO[];
    };

    static createNode = async (args: { data: CreateNodeInput }) => {
        const res = await this.mutationApi({
            document: mutation('createNode', (root) => [root.createNode({ data: $('data') }, () => this.fragment)]),
            variables: args,
        });
        return res.createNode as NodeDTO;
    };

    static updateNode = async (args: { id: string; data: UpdateNodeInput }) => {
        const res = await this.mutationApi({
            document: mutation('updateNode', (root) => [root.updateNode({ id: $('id'), data: $('data') }, () => this.fragment)]),
            variables: args,
        });
        return res.updateNode as NodeDTO;
    };

    static deleteNode = async (args: { id: string }) => {
        const res = await this.mutationApi({
            document: mutation('deleteNode', (root) => [root.deleteNode({ id: $('id') })]),
            variables: args,
        });
        return res.deleteNode;
    };

    static moveNode = async (args: { data: MoveNodeInput }) => {
        const res = await this.mutationApi({
            document: mutation('moveNode', (root) => [root.moveNode({ data: $('data') }, () => this.fragment)]),
            variables: args,
        });
        return res.moveNode as NodeDTO;
    };

    static duplicateNode = async (args: { id: string }) => {
        const res = await this.mutationApi({
            document: mutation('duplicateNode', (root) => [root.duplicateNode({ id: $('id') }, () => this.fragment)]),
            variables: args,
        });
        return res.duplicateNode as NodeDTO;
    };

    static reorderNodes = async (args: { items: { id: string; order: number }[] }) => {
        // Literal array (không qua $()) — cùng lý do đã ghi trong section.service.ts:
        // typed-graphql-builder strip mất list-brackets của biến kiểu list.
        const res = await this.mutationApi({
            document: mutation('reorderNodes', (root) => [root.reorderNodes({ items: args.items })]),
            variables: {},
        });
        return res.reorderNodes;
    };
}
