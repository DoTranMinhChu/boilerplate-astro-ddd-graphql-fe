import {
  $, fragment, query, mutation, GetOutput,
  Redirect,
  PaginationArgsInput,
  CreateRedirectInput,
  UpdateRedirectInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type RedirectDTO = GetOutput<typeof RedirectService.fragment>;
export type RedirectPaginationCursor = PaginationCursor<RedirectDTO>;

export class RedirectService extends CrudService {
  static apiName = 'redirect' as const;
  static displayName = 'Redirect';

  static fragment = fragment(Redirect, (i) => [
    i.fromPath,
    i.toPath,
    i.statusCode,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);

  
  static getOneRedirect = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneRedirect", (root) => [
        root.getOneRedirect({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneRedirect as RedirectDTO;
  };

  static getAllRedirect = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllRedirect", (root) => [
        root.getAllRedirect({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllRedirect as RedirectPaginationCursor;
  };

  static createRedirect = async (args: { data: CreateRedirectInput }) => {
    const res = await this.mutationApi({
      document: mutation("createRedirect", (root) => [
        root.createRedirect({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createRedirect as RedirectDTO;
  };

  static updateRedirect = async (args: { id: string, data: UpdateRedirectInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateRedirect", (root) => [
        root.updateRedirect({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateRedirect as RedirectDTO;
  };

  static deleteRedirect = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteRedirect", (root) => [
        root.deleteRedirect({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteRedirect;
  };

  /** Public: tra Redirect Manager (mục 17 spec CMS) — [...path].astro gọi
   * TRƯỚC khi trả 404 khi pageResolver không match page nào. */
  static getPublicRedirect = async (args: { fromPath: string }) => {
    const res = await this.queryApi({
      document: query("getPublicRedirect", (root) => [
        root.getPublicRedirect({ fromPath: $('fromPath') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getPublicRedirect;
  };
}