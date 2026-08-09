import {
  $, fragment, query, mutation, GetOutput,
  Taxonomy,
  PaginationArgsInput,
  CreateTaxonomyInput,
  UpdateTaxonomyInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type TaxonomyDTO = GetOutput<typeof TaxonomyService.fragment>;
export type TaxonomyPaginationCursor = PaginationCursor<TaxonomyDTO>;

// Đúng khuôn contentType.service.ts (mục "Bước 1" — Task 4 brief): Taxonomy là 1 nhóm phân
// loại (vd "Danh mục tin tức", "Thẻ sản phẩm"), Term (term.service.ts) là các mục bên trong.
export class TaxonomyService extends CrudService {
  static apiName = 'taxonomy' as const;
  static displayName = 'Taxonomy';

  static fragment = fragment(Taxonomy, (i) => [
    i.key,
    i.label,
    i.hierarchical,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);

  static getOneTaxonomy = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneTaxonomy", (root) => [
        root.getOneTaxonomy({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneTaxonomy as TaxonomyDTO;
  };

  static getAllTaxonomy = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllTaxonomy", (root) => [
        root.getAllTaxonomy({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllTaxonomy as TaxonomyPaginationCursor;
  };

  static createTaxonomy = async (args: { data: CreateTaxonomyInput }) => {
    const res = await this.mutationApi({
      document: mutation("createTaxonomy", (root) => [
        root.createTaxonomy({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createTaxonomy as TaxonomyDTO;
  };

  static updateTaxonomy = async (args: { id: string, data: UpdateTaxonomyInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateTaxonomy", (root) => [
        root.updateTaxonomy({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateTaxonomy as TaxonomyDTO;
  };

  static deleteTaxonomy = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteTaxonomy", (root) => [
        root.deleteTaxonomy({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteTaxonomy;
  };
}
