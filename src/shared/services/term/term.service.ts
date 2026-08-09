import {
  $, fragment, query, mutation, GetOutput,
  Term,
  PaginationArgsInput,
  CreateTermInput,
  UpdateTermInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type TermDTO = GetOutput<typeof TermService.fragment>;
export type TermPaginationCursor = PaginationCursor<TermDTO>;

// 1 mục bên trong 1 Taxonomy (vd "Tin tức" trong taxonomy "Danh mục tin tức") — xem
// TermTreeEditor.tsx cho UI cây/danh sách phẳng dựng từ getAllTerm bên dưới.
export class TermService extends CrudService {
  static apiName = 'term' as const;
  static displayName = 'Term';

  static fragment = fragment(Term, (i) => [
    i.taxonomyId,
    i.slug,
    i.label,
    i.parentId,
    i.order,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);

  static getOneTerm = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneTerm", (root) => [
        root.getOneTerm({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneTerm as TermDTO;
  };

  // `input.filter` nhận `{ taxonomyId }` — đúng khuôn getAllContentEntry lọc theo
  // contentTypeId (xem term.resolver.ts phía BE, cùng cơ chế filter object/JSON qua
  // PaginationArgsInput.filter). TermTreeEditor luôn gọi limit lớn (không phân trang —
  // số term trong 1 taxonomy hiếm khi vượt vài trăm) rồi tự dựng cây từ parentId.
  static getAllTerm = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllTerm", (root) => [
        root.getAllTerm({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllTerm as TermPaginationCursor;
  };

  static createTerm = async (args: { data: CreateTermInput }) => {
    const res = await this.mutationApi({
      document: mutation("createTerm", (root) => [
        root.createTerm({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createTerm as TermDTO;
  };

  static updateTerm = async (args: { id: string, data: UpdateTermInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateTerm", (root) => [
        root.updateTerm({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateTerm as TermDTO;
  };

  static deleteTerm = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteTerm", (root) => [
        root.deleteTerm({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteTerm;
  };
}
