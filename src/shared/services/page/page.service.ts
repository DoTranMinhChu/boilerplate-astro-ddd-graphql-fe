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
import { HeaderPresetService } from '../headerPreset/headerPreset.service';
import { FooterPresetService } from '../footerPreset/footerPreset.service';
import { PaginationCursor } from '@/core/api/types';
import type { PageStyle, DetailPathBindingDTO } from '@/modules/cms/cms.types';

// `style` là scalar Mixed (JSON tự do — xem PageStyle) — typed-graphql-builder sinh ra
// kiểu `string` cho nó (xem hạn chế codegen ghi ở đầu cms.types.ts). Override ở đây,
// điểm cast duy nhất cho service này, thay vì `as any` rải rác từng nơi dùng.
type RawPageDTO = GetOutput<typeof PageService.fragment>;
export type PageDTO = Omit<RawPageDTO, 'style'> & { style?: PageStyle };
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
    i.headerPresetId,
    i.footerPresetId,
    i.status,
    i.publishedAt,
    i.scheduledAt,
    i.locale,
    i.seo(() => this.seoFragment),
    i.style,
    // Mục δ Task 5: `page.seoFieldMapping` (JSONB scalar Mixed, giống `style`) — nguồn động
    // DUY NHẤT resolveCmsPageProps.ts dùng để "kéo" SEO từ pageEntry.data. Thiếu dòng này thì
    // GraphQL không select field -> resolved.page.seoFieldMapping luôn undefined dù BE đã có
    // cột (Task 1) — không chỉ là vấn đề kiểu TS, còn khiến toàn bộ Task 5 vô tác dụng lúc chạy.
    i.seoFieldMapping,
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
          r.header(() => HeaderPresetService.fragment),
          r.footer(() => FooterPresetService.fragment),
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
          r.header(() => HeaderPresetService.fragment),
          r.footer(() => FooterPresetService.fragment),
        ]),
      ]),
      variables: args,
    });
    return res.previewPageResolver;
  };

  /** Public: binding (path pattern + paramName + fieldKey) của trang Chi tiết đang publish
   * cho 1 contentTypeId — dùng để tự build link tới từng entry trong section list động (mục
   * 9 spec CMS). Fix Important #3 (γ final review): trước đây chỉ trả về `path` (String),
   * buộc FE hardcode field key/param name là "slug" ở mọi nơi gọi — nay trả nguyên object để
   * gọi nơi tự đọc đúng `fieldKey`/`paramName`, không đoán.
   *
   * Trả `DetailPathBindingDTO | undefined` — ép kiểu field non-null như GraphQL schema đã bảo
   * đảm (3 field đều `String!` trên DetailPathBinding), vì typed-graphql-builder sinh field
   * type `string | undefined` bất kể schema non-null (hạn chế codegen chung của service này,
   * cùng lý do `asJsonTyped` tồn tại ở resolveCmsPageProps.ts). */
  static getPublicDetailPathByContentType = async (args: { contentTypeId: string }): Promise<DetailPathBindingDTO | undefined> => {
    const res = await this.queryApi({
      document: query("getPublicDetailPathByContentType", (root) => [
        root.getPublicDetailPathByContentType({ contentTypeId: $('contentTypeId') }, (b) => [
          b.path, b.paramName, b.fieldKey,
        ]),
      ]),
      variables: args,
    });
    return res.getPublicDetailPathByContentType as DetailPathBindingDTO | undefined;
  };

  /** Public: mọi URL công khai (trang tĩnh + entry của trang Chi tiết) cho sitemap.xml. */
  static getSitemapUrls = async () => {
    const res = await this.queryApi({
      document: query("getSitemapUrls", (root) => [
        root.getSitemapUrls((u) => [u.path, u.updatedAt, u.priority, u.changeFreq]),
      ]),
      variables: {},
    });
    return res.getSitemapUrls;
  };
}