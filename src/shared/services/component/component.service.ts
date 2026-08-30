import {
    $, fragment, query, mutation, GetOutput,
    ComponentDefinition,
    PaginationArgsInput,
    CreateComponentFromSelectionInput,
    SetComponentPropSchemaInput,
    InsertComponentInstanceInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

// `propSchema` là scalar Mixed (JSON tự do, xem PropDescriptorInput ở BE) — typed-graphql-builder
// sinh ra kiểu `string` cho nó (cùng hạn chế codegen ghi ở đầu node.service.ts/page.service.ts).
// Chưa có nơi nào đọc cấu trúc bên trong propSchema nên để lại `string | undefined` thô của
// codegen, chưa override type tại đây (cùng lý do PageService.dataBinding đang để nguyên).
export type ComponentDefinitionDTO = GetOutput<typeof ComponentService.fragment>;
export type ComponentPaginationCursor = PaginationCursor<ComponentDefinitionDTO>;

export class ComponentService extends CrudService {
    static apiName = 'component' as const;
    static displayName = 'Component';

    static fragment = fragment(ComponentDefinition, (i) => [
        i.id, i.key, i.label, i.icon, i.definitionPageId, i.propSchema, i.category,
        i.createdAt, i.updatedAt, i.deletedAt,
    ]);

    static getOneComponent = async (args: { id: string }) => {
        const res = await this.queryApi({
            document: query('getOneComponent', (root) => [root.getOneComponent({ id: $('id') }, () => this.fragment)]),
            variables: args,
        });
        return res.getOneComponent as ComponentDefinitionDTO;
    };

    static getComponentByDefinitionPageId = async (args: { pageId: string }) => {
        const res = await this.queryApi({
            document: query('getComponentByDefinitionPageId', (root) => [root.getComponentByDefinitionPageId({ pageId: $('pageId') }, () => this.fragment)]),
            variables: args,
        });
        return res.getComponentByDefinitionPageId as ComponentDefinitionDTO | null;
    };

    static getAllComponent = async (args: { input: PaginationArgsInput }) => {
        const res = await this.queryApi({
            document: query('getAllComponent', (root) => [
                root.getAllComponent({ input: $('input') }, (n) => [
                    n.edges((e) => [e.node(() => this.fragment), e.cursor]),
                    n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage]),
                ]),
            ]),
            variables: args,
        });
        return res.getAllComponent as ComponentPaginationCursor;
    };

    static createComponentFromSelection = async (args: { data: CreateComponentFromSelectionInput }) => {
        const res = await this.mutationApi({
            document: mutation('createComponentFromSelection', (root) => [root.createComponentFromSelection({ data: $('data') }, () => this.fragment)]),
            variables: args,
        });
        return res.createComponentFromSelection as ComponentDefinitionDTO;
    };

    static setComponentPropSchema = async (args: { data: SetComponentPropSchemaInput }) => {
        const res = await this.mutationApi({
            document: mutation('setComponentPropSchema', (root) => [root.setComponentPropSchema({ data: $('data') }, () => this.fragment)]),
            variables: args,
        });
        return res.setComponentPropSchema as ComponentDefinitionDTO;
    };

    static insertComponentInstance = async (args: { data: InsertComponentInstanceInput }) => {
        const res = await this.mutationApi({
            document: mutation('insertComponentInstance', (root) => [root.insertComponentInstance({ data: $('data') })]),
            variables: args,
        });
        return res.insertComponentInstance as string[];
    };

    static publishComponent = async (args: { id: string }) => {
        const res = await this.mutationApi({
            document: mutation('publishComponent', (root) => [root.publishComponent({ id: $('id') }, () => this.fragment)]),
            variables: args,
        });
        return res.publishComponent as ComponentDefinitionDTO;
    };

    static detachComponentInstance = async (args: { instanceRootId: string }) => {
        const res = await this.mutationApi({
            document: mutation('detachComponentInstance', (root) => [root.detachComponentInstance({ instanceRootId: $('instanceRootId') })]),
            variables: args,
        });
        return res.detachComponentInstance;
    };

    static deleteComponentDefinition = async (args: { id: string; force?: boolean }) => {
        const res = await this.mutationApi({
            document: mutation('deleteComponentDefinition', (root) => [root.deleteComponentDefinition({ id: $('id'), force: $('force') })]),
            // `force` optional ở call-site nhưng biến GraphQL sinh bởi $('force') đòi non-optional
            // boolean (cùng lý do PageService.pageResolver/getPageTranslations phải `?? null`/`?? ''`
            // cho các optional arg khác) — mặc định false khi không truyền.
            variables: { id: args.id, force: args.force ?? false },
        });
        return res.deleteComponentDefinition;
    };
}
