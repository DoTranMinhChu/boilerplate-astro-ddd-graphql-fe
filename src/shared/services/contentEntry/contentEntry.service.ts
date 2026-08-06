import {
  $, fragment, query, mutation, GetOutput,
  ContentEntry,
  PaginationArgsInput,
  CreateContentEntryInput,
  UpdateContentEntryInput,
  RelatedEntriesQueryInput,
  MixedFeedQueryInput,
  BacklinkEntriesQueryInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type ContentEntryDTO = GetOutput<typeof ContentEntryService.fragment>;
export type ContentEntryPaginationCursor = PaginationCursor<ContentEntryDTO>;

export class ContentEntryService extends CrudService {
  static apiName = 'contentEntry' as const;
  static displayName = 'ContentEntry';

  static fragment = fragment(ContentEntry, (i) => [
    i.contentTypeId,
    i.slug,
    i.status,
    i.publishedAt,
    i.locale,
    i.data,
    i.seo(() => this.seoFragment),
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);

  static getOneContentEntry = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneContentEntry", (root) => [
        root.getOneContentEntry({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneContentEntry as ContentEntryDTO;
  };

  static getAllContentEntry = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllContentEntry", (root) => [
        root.getAllContentEntry({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllContentEntry as ContentEntryPaginationCursor;
  };

  static createContentEntry = async (args: { data: CreateContentEntryInput }) => {
    const res = await this.mutationApi({
      document: mutation("createContentEntry", (root) => [
        root.createContentEntry({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createContentEntry as ContentEntryDTO;
  };

  static updateContentEntry = async (args: { id: string, data: UpdateContentEntryInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateContentEntry", (root) => [
        root.updateContentEntry({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateContentEntry as ContentEntryDTO;
  };

  static deleteContentEntry = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteContentEntry", (root) => [
        root.deleteContentEntry({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteContentEntry;
  };

  /**
   * Public: nguồn dữ liệu cho section "dynamic data source" ở public site (mục 9
   * spec CMS) — không cần token. `ids` cho manual selection, `contentTypeId` (+
   * limit/sort) cho dynamic query; luôn ép status=PUBLISHED phía BE.
   */
  static getPublicContentEntries = async (args: {
    contentTypeId: string;
    ids?: string[];
    limit?: number;
    sortField?: string;
    sortDirection?: 'ASC' | 'DESC';
  }) => {
    const res = await this.queryApi({
      document: query("getPublicContentEntries", (root) => [
        root.getPublicContentEntries(
          {
            contentTypeId: $('contentTypeId'),
            // `ids` là list-typed arg ([String]) — dùng $('ids') làm biến bị lỗi thật
            // sự của typed-graphql-builder: khai báo biến GraphQL với type bị strip mất
            // dấu ngoặc list ("String" thay vì "[String]"), server báo "Variable of type
            // String used in position expecting [String]". Truyền literal array thẳng
            // (không qua $()) để né code path lỗi này.
            ids: args.ids ?? [],
            limit: $('limit'),
            sortField: $('sortField'),
            sortDirection: $('sortDirection'),
          },
          () => this.fragment,
        ),
      ]),
      // BE tự default limit=12/sortField=createdAt/sortDirection=DESC khi thiếu
      // (contentEntry.resolver.ts), nhưng DSL của typed-graphql-builder coi mọi
      // biến $() là bắt buộc bất kể backend optional hay không -> luôn truyền
      // đủ giá trị, không để `undefined` lọt vào variables.
      variables: {
        contentTypeId: args.contentTypeId,
        limit: args.limit ?? 12,
        sortField: args.sortField ?? 'createdAt',
        sortDirection: args.sortDirection ?? 'DESC',
      },
    });
    return res.getPublicContentEntries;
  };

  /** Public: khối "Nội dung liên quan" trên trang Chi tiết — xem findRelated() phía BE. */
  static getRelatedContentEntries = async (args: { input: RelatedEntriesQueryInput }) => {
    const res = await this.queryApi({
      document: query("getRelatedContentEntries", (root) => [
        root.getRelatedContentEntries({ input: $('input') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getRelatedContentEntries;
  };

  /** Public: khối "Nội dung tổng hợp" trộn nhiều Object Type — xem findMixed() phía BE. */
  static getMixedContentEntries = async (args: { input: MixedFeedQueryInput }) => {
    const res = await this.queryApi({
      document: query("getMixedContentEntries", (root) => [
        root.getMixedContentEntries({ input: $('input') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getMixedContentEntries;
  };

  /** Public: khối "Nội dung tham chiếu" (backlink) — xem findBacklinks() phía BE. */
  static getBacklinkContentEntries = async (args: { input: BacklinkEntriesQueryInput }) => {
    const res = await this.queryApi({
      document: query("getBacklinkContentEntries", (root) => [
        root.getBacklinkContentEntries({ input: $('input') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getBacklinkContentEntries;
  };
}