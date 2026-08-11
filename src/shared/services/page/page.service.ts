import {
  $, fragment, query, mutation, GetOutput,
  Page,
  PaginationArgsInput,
  CreatePageInput,
  UpdatePageInput
} from '@shared/generated/typed-graphql';
import type { PageTranslationDTO } from '@/modules/cms/cms.types';
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
export type PageDTO = Omit<RawPageDTO, 'style' | 'seoFieldMapping'> & { style?: PageStyle; seoFieldMapping?: Record<string, string> };
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
    // Phase 3 mục 3 (Task 15): resolveCmsPageProps.ts đọc field này để gọi getPageTranslations —
    // thiếu select thì resolved.page.translationGroupId luôn undefined dù BE đã có cột (Task 10-14),
    // cùng lớp bug đã gặp với seoFieldMapping (xem comment ngay dưới).
    i.translationGroupId,
    i.seo(() => this.seoFragment),
    i.style,
    // Mục δ Task 5: `page.seoFieldMapping` (JSONB scalar Mixed, giống `style`) — nguồn động
    // DUY NHẤT resolveCmsPageProps.ts dùng để "kéo" SEO từ pageEntry.data. Thiếu dòng này thì
    // GraphQL không select field -> resolved.page.seoFieldMapping luôn undefined dù BE đã có
    // cột (Task 1) — không chỉ là vấn đề kiểu TS, còn khiến toàn bộ Task 5 vô tác dụng lúc chạy.
    i.seoFieldMapping,
    // Task 23: resolveCmsPageProps.ts đọc rootNodeId để quyết định có gọi
    // NodeService.getNodesByPage hay không (gate cùng cờ isNodeTreeEnabled()) — thiếu
    // select thì resolved.page.rootNodeId luôn undefined dù BE đã có cột (BE Task 8),
    // cùng lớp bug select-thiếu-field như seoFieldMapping/translationGroupId ở trên.
    // `dataBinding` (JSONB Mixed, giống `style`) select kèm cho đủ field BE Task 8 — Task 23
    // chỉ đọc rootNodeId, không đọc dataBinding, nên KHÔNG cần override type nó ở đây (xem
    // PageDTO ngay dưới) — để lại `string | undefined` thô của codegen cho tới khi có việc
    // thật sự cần đọc cấu trúc bên trong.
    i.rootNodeId,
    i.dataBinding,
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
          // Phase 3 mục 3 (Task 15): locale ĐÃ RESOLVE của request (BE tách prefix "/en/..."
          // trước khi match page, Task 14) — resolveCmsPageProps.ts dùng để loại đúng bản đang
          // xem khỏi getPageTranslations(). Thiếu dòng này thì `resolved.locale` luôn undefined
          // dù field đã có trên schema (cùng lớp bug select-thiếu-field như seoFieldMapping/
          // translationGroupId ở trên).
          r.locale,
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
          r.locale,
        ]),
      ]),
      variables: args,
    });
    return res.previewPageResolver;
  };

  /** Public: binding (path pattern + N param) của trang Chi tiết đang publish cho 1
   * contentTypeId — dùng để tự build link tới từng entry trong section list động (mục 9 spec
   * CMS). Fix Important #3 (γ final review): trước đây chỉ trả về `path` (String), buộc FE
   * hardcode field key/param name là "slug" ở mọi nơi gọi — nay trả nguyên object để gọi nơi tự
   * đọc đúng `fieldKey`/`paramName`, không đoán.
   *
   * Phase 3 mục 2: path Chi tiết có thể cần NHIỀU param — `paramName`/`fieldKey` đơn đổi sang
   * `bindings` (mảng), mỗi phần tử ứng 1 param. Select `bindings { paramName fieldKey }` thay
   * `paramName fieldKey` đơn trước đây.
   *
   * Trả `DetailPathBindingDTO | undefined` — ép kiểu field non-null như GraphQL schema đã bảo
   * đảm (`path`/`bindings` đều non-null trên DetailPathBinding, từng `paramName`/`fieldKey`
   * trong `bindings` đều `String!`), vì typed-graphql-builder sinh field type optional bất kể
   * schema non-null (hạn chế codegen chung của service này, cùng lý do `asJsonTyped` tồn tại ở
   * resolveCmsPageProps.ts). */
  static getPublicDetailPathByContentType = async (args: { contentTypeId: string; locale?: string }): Promise<DetailPathBindingDTO | undefined> => {
    const res = await this.queryApi({
      document: query("getPublicDetailPathByContentType", (root) => [
        root.getPublicDetailPathByContentType({ contentTypeId: $('contentTypeId'), locale: $('locale') }, (b) => [
          b.path, b.bindings((i) => [i.paramName, i.fieldKey]),
        ]),
      ]),
      // Critical #1 fix (Task 16 review, mục B đọc NGƯỢC): locale của trang đang xem — không
      // truyền, content type có Page dịch ở ≥2 locale có thể trả về binding của locale SAI (BE
      // fallback về candidate cũ nhất bất kể locale khi thiếu arg này).
      variables: { contentTypeId: args.contentTypeId, locale: args.locale ?? null } as any,
    });
    return res.getPublicDetailPathByContentType as DetailPathBindingDTO | undefined;
  };

  /** "+ Thêm bản dịch" (Phase 3 mục 3, Task 15) — nhân bản page hiện có (+ toàn bộ Section con,
   * xem PageService.createTranslation phía BE) sang 1 locale mới, giữ translationGroupId. Bản
   * dịch mới LUÔN bắt đầu Draft — admin tự sửa nội dung ở Page Builder rồi publish riêng. */
  static createPageTranslation = async (args: { pageId: string, locale: string }) => {
    const res = await this.mutationApi({
      document: mutation("createPageTranslation", (root) => [
        root.createPageTranslation({ pageId: $('pageId'), locale: $('locale') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createPageTranslation as PageDTO;
  };

  /** Public: nguồn cho bộ chuyển ngôn ngữ ở SiteHeader (Phase 3 mục 3, Task 15) — mọi bản dịch
   * PUBLISHED khác locale hiện tại trong CÙNG translationGroupId. Không dùng `getAllPage` (yêu
   * cầu STAFF_ROLES) — gọi từ resolveCmsPageProps.ts lúc SSR public, không có JWT. */
  static getPageTranslations = async (args: { translationGroupId: string, excludeLocale?: string }): Promise<PageTranslationDTO[]> => {
    const res = await this.queryApi({
      document: query("getPageTranslations", (root) => [
        root.getPageTranslations({ translationGroupId: $('translationGroupId'), excludeLocale: $('excludeLocale') }, (t) => [
          t.locale, t.path,
        ]),
      ]),
      variables: { translationGroupId: args.translationGroupId, excludeLocale: args.excludeLocale ?? null } as any,
    });
    return (res.getPageTranslations || []).filter((t): t is PageTranslationDTO => !!t?.locale && !!t?.path);
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