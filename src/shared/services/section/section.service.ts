import { 
  $, fragment, query, mutation, GetOutput,
  Section,
  CreateSectionInput,
  UpdateSectionInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type SectionDTO = GetOutput<typeof SectionService.fragment>;
export type SectionPaginationCursor = PaginationCursor<SectionDTO>;

export class SectionService extends CrudService {
  static apiName = 'section' as const;
  static displayName = 'Section';

  static fragment = fragment(Section, (i) => [
    i.pageId,
    i.type,
    i.order,
    i.enabled,
    i.layoutPreset,
    i.theme,
    i.content,
    i.dataSource,
    i.fieldMapping,
    i.visibilityRules,
    i.responsiveSettings,
    i.animation,
    i.style,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);

  
  static getSectionsByPage = async (args: { pageId: string }) => {
    const res = await this.queryApi({
      document: query("getSectionsByPage", (root) => [
        root.getSectionsByPage({ pageId: $('pageId') }, () => this.fragment),
      ]),
      variables: args,
    });
    return (res.getSectionsByPage as unknown as SectionDTO[]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };

  /** `getSectionsByPage` trả mảng thô (không phân trang) — bọc thành
   * PaginationCursor giả để tái dùng nguyên khối <Datatable> (mục 23 spec CMS). */
  static getAllPageSections = async (pageId: string): Promise<SectionPaginationCursor> => {
    const items = await this.getSectionsByPage({ pageId });
    return {
      edges: items.map((node) => ({ node, cursor: node.id! })),
      pageInfo: { hasNextPage: false, hasPreviousPage: false, totalCount: items.length, totalPage: 1, limit: items.length },
    };
  };

  static reorderSections = async (args: { items: { id: string; order: number }[] }) => {
    // `items` là list-typed arg ([ReorderSectionItemInput]) — dùng $('items') làm biến
    // bị lỗi thật sự của typed-graphql-builder: nó khai báo biến GraphQL với type đã bị
    // strip mất dấu ngoặc list ("ReorderSectionItemInput" thay vì "[ReorderSectionItemInput]"),
    // khiến server báo "Variable of type X used in position expecting [X]". Truyền literal
    // array thẳng vào query (không qua $()) để né code path lỗi này — vẫn typesafe qua
    // VariabledInput<T> (DSL cho phép literal array thay Variable).
    const res = await this.mutationApi({
      document: mutation("reorderSections", (root) => [
        root.reorderSections({ items: args.items }),
      ]),
      variables: {},
    });
    return res.reorderSections;
  };

  static createSection = async (args: { data: CreateSectionInput }) => {
    const res = await this.mutationApi({
      document: mutation("createSection", (root) => [
        root.createSection({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createSection as SectionDTO;
  };

  static updateSection = async (args: { id: string, data: UpdateSectionInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateSection", (root) => [
        root.updateSection({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateSection as SectionDTO;
  };

  static duplicateSection = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("duplicateSection", (root) => [
        root.duplicateSection({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.duplicateSection as SectionDTO;
  };

  static deleteSection = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteSection", (root) => [
        root.deleteSection({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteSection;
  };
}