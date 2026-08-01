import {
  $, fragment, query, mutation, GetOutput,
  Unit,
  PaginationArgsInput,
  CreateUnitInput,
  UpdateUnitInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type UnitDTO = GetOutput<typeof UnitService.fragment>;
export type UnitPaginationCursor = PaginationCursor<UnitDTO>;

export class UnitService extends CrudService {
  static apiName = 'unit' as const;
  static displayName = 'Đơn vị tính';

  static fragment = fragment(Unit, (i) => [
    i.id,
    i.name,
    i.code,
    i.group,
    i.description,
    i.isActivated,
    i.tenantId,
    i.tenant((t) => [t.id, t.name, t.code]),
    i.agencyId,
    i.createdAt,
    i.updatedAt,
  ]);

  static getOneUnit = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneUnit", (root) => [
        root.getOneUnit({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneUnit as UnitDTO;
  };

  static getAllUnit = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllUnit", (root) => [
        root.getAllUnit({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllUnit as UnitPaginationCursor;
  };

  static createUnit = async (args: { data: CreateUnitInput }) => {
    const res = await this.mutationApi({
      document: mutation("createUnit", (root) => [
        root.createUnit({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createUnit as UnitDTO;
  };

  static updateUnit = async (args: { id: string, data: UpdateUnitInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateUnit", (root) => [
        root.updateUnit({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateUnit as UnitDTO;
  };

  static deleteUnit = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteUnit", (root) => [
        root.deleteUnit({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteUnit;
  };
}
