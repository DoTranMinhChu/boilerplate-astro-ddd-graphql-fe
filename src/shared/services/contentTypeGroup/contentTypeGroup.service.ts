import {
    $, fragment, query, mutation, GetOutput,
    ContentTypeGroup,
    PaginationArgsInput,
    CreateContentTypeGroupInput,
    UpdateContentTypeGroupInput,
    ReorderContentTypeGroupItemInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type ContentTypeGroupDTO = GetOutput<typeof ContentTypeGroupService.fragment>;
export type ContentTypeGroupPaginationCursor = PaginationCursor<ContentTypeGroupDTO>;

export class ContentTypeGroupService extends CrudService {
    static apiName = 'contentTypeGroup' as const;
    static displayName = 'ContentTypeGroup';

    static fragment = fragment(ContentTypeGroup, (i) => [
        i.name, i.icon, i.color, i.order,
        i.id, i.createdAt, i.updatedAt, i.deletedAt,
    ]);

    static getOneContentTypeGroup = async (args: { id: string }) => {
        const res = await this.queryApi({
            document: query('getOneContentTypeGroup', (root) => [
                root.getOneContentTypeGroup({ id: $('id') }, () => this.fragment),
            ]),
            variables: args,
        });
        return res.getOneContentTypeGroup as ContentTypeGroupDTO;
    };

    static getAllContentTypeGroup = async (args: { input: PaginationArgsInput }) => {
        const res = await this.queryApi({
            document: query('getAllContentTypeGroup', (root) => [
                root.getAllContentTypeGroup({ input: $('input') }, (n) => [
                    n.edges((e) => [e.node(() => this.fragment), e.cursor]),
                    n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage]),
                ]),
            ]),
            variables: args,
        });
        return res.getAllContentTypeGroup as ContentTypeGroupPaginationCursor;
    };

    static createContentTypeGroup = async (args: { data: CreateContentTypeGroupInput }) => {
        const res = await this.mutationApi({
            document: mutation('createContentTypeGroup', (root) => [
                root.createContentTypeGroup({ data: $('data') }, () => this.fragment),
            ]),
            variables: args,
        });
        return res.createContentTypeGroup as ContentTypeGroupDTO;
    };

    static updateContentTypeGroup = async (args: { id: string; data: UpdateContentTypeGroupInput }) => {
        const res = await this.mutationApi({
            document: mutation('updateContentTypeGroup', (root) => [
                root.updateContentTypeGroup({ id: $('id'), data: $('data') }, () => this.fragment),
            ]),
            variables: args,
        });
        return res.updateContentTypeGroup as ContentTypeGroupDTO;
    };

    static deleteContentTypeGroup = async (args: { id: string }) => {
        const res = await this.mutationApi({
            document: mutation('deleteContentTypeGroup', (root) => [
                root.deleteContentTypeGroup({ id: $('id') }),
            ]),
            variables: args,
        });
        return res.deleteContentTypeGroup;
    };

    static reorderContentTypeGroups = async (args: { items: ReorderContentTypeGroupItemInput[] }) => {
        const res = await this.mutationApi({
            document: mutation('reorderContentTypeGroups', (root) => [
                root.reorderContentTypeGroups({ items: $('items') }),
            ]),
            variables: args,
        });
        return res.reorderContentTypeGroups;
    };
}
