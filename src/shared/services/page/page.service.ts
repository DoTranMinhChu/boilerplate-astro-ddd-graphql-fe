import {
  $, fragment, query, mutation, GetOutput,
  Page,
  PaginationArgsInput,
  CreatePageInput,
  UpdatePageInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { SectionService } from '../section/section.service';
import { ContentEntryService } from '../contentEntry/contentEntry.service';
import { PaginationCursor } from '@/core/api/types';

export type PageDTO = GetOutput<typeof PageService.fragment>;
export type PagePaginationCursor = PaginationCursor<PageDTO>;

export class PageService extends CrudService {
  static apiName = 'page' as const;
  static displayName = 'Page';

  static fragment = fragment(Page, (i) => [
    i.internalName,
    i.path,
    i.pageType,
    i.templateKey,
    i.parentPageId,
    i.contentTypeId,
    i.status,
    i.publishedAt,
    i.scheduledAt,
    i.locale,
    i.seo(() => this.seoFragment),
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);

  static getOnePage = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOnePage", (root) => [
        root.getOnePage({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOnePage as PageDTO;
  };

  static getAllPage = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllPage", (root) => [
        root.getAllPage({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllPage as PagePaginationCursor;
  };

  static createPage = async (args: { data: CreatePageInput }) => {
    const res = await this.mutationApi({
      document: mutation("createPage", (root) => [
        root.createPage({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createPage as PageDTO;
  };

  static updatePage = async (args: { id: string, data: UpdatePageInput }) => {
    const res = await this.mutationApi({
      document: mutation("updatePage", (root) => [
        root.updatePage({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updatePage as PageDTO;
  };

  static publishPage = async (args: { id: string, label?: string }) => {
    const res = await this.mutationApi({
      document: mutation("publishPage", (root) => [
        root.publishPage({ id: $('id'), label: $('label') }, () => this.fragment),
      ]),
      variables: { id: args.id, label: args.label ?? '' },
    });
    return res.publishPage as PageDTO;
  };

  static unpublishPage = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("unpublishPage", (root) => [
        root.unpublishPage({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.unpublishPage as PageDTO;
  };

  static deletePage = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deletePage", (root) => [
        root.deletePage({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deletePage;
  };

  /**
   * Query công khai duy nhất mà FE catch-all route ([...path].astro) gọi lúc
   * SSR (mục 2/25 spec CMS) — không cần token, chạy an toàn trong Astro
   * frontmatter (GraphQL.query dùng getServerConfig, không đụng localStorage).
   */
  static pageResolver = async (args: { path: string }) => {
    const res = await this.queryApi({
      document: query("pageResolver", (root) => [
        root.pageResolver({ path: $('path') }, (r) => [
          r.page(() => this.fragment),
          r.sections(() => SectionService.fragment),
          r.seo(() => this.seoFragment),
          r.entry(() => ContentEntryService.fragment),
          r.params,
        ]),
      ]),
      variables: args,
    });
    return res.pageResolver;
  };

  /**
   * Bản preview (yêu cầu đăng nhập) — bỏ qua điều kiện PUBLISHED, cho phép admin
   * xem trang/entry đang Draft trước khi publish (mục 13 spec CMS). Gọi từ Solid
   * admin app (đã có JWT qua AuthProvider), KHÔNG gọi được từ Astro SSR public.
   */
  static previewPageResolver = async (args: { path: string }) => {
    const res = await this.queryApi({
      document: query("previewPageResolver", (root) => [
        root.previewPageResolver({ path: $('path') }, (r) => [
          r.page(() => this.fragment),
          r.sections(() => SectionService.fragment),
          r.seo(() => this.seoFragment),
          r.entry(() => ContentEntryService.fragment),
          r.params,
        ]),
      ]),
      variables: args,
    });
    return res.previewPageResolver;
  };

  /** Public: path pattern của trang COLLECTION_DETAIL đang publish cho 1 contentTypeId
   * (dùng để tự build link tới từng entry trong section list động — mục 9 spec CMS). */
  static getPublicDetailPathByContentType = async (args: { contentTypeId: string }) => {
    const res = await this.queryApi({
      document: query("getPublicDetailPathByContentType", (root) => [
        root.getPublicDetailPathByContentType({ contentTypeId: $('contentTypeId') }),
      ]),
      variables: args,
    });
    return res.getPublicDetailPathByContentType;
  };
}