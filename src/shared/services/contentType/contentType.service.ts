import { 
  $, fragment, query, mutation, GetOutput,
  ContentType,
  PaginationArgsInput,
  CreateContentTypeInput,
  UpdateContentTypeInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type ContentTypeDTO = GetOutput<typeof ContentTypeService.fragment>;
export type ContentTypePaginationCursor = PaginationCursor<ContentTypeDTO>;

export class ContentTypeService extends CrudService {
  static apiName = 'contentType' as const;
  static displayName = 'ContentType';

  static fragment = fragment(ContentType, (i) => [
    i.key,
    i.label,
    i.icon,
    i.fields((f) => [
      f.key, f.label, f.type, f.required, f.options,
      f.relationTarget, f.relationMultiple, f.showInListing, f.mockValue,
      // Task 5 (Phase 2c): taxonomyId/taxonomyMultiple (field TAXONOMY), relationDisplayField
      // ("Hiển thị theo field" của RELATION), minLength/maxLength/pattern (TEXT/RICHTEXT),
      // min/max (NUMBER) — thiếu các dòng này thì input/mutation ghi xuống được (input type
      // BE đã hỗ trợ từ Task 1-4) nhưng đọc lại (getOneContentType/getAllContentType) sẽ
      // không thấy giá trị vừa lưu, trông như bị "mất" mỗi khi mở lại form sửa.
      f.taxonomyId, f.taxonomyMultiple, f.relationDisplayField,
      f.minLength, f.maxLength, f.pattern, f.min, f.max, f.unique, f.autoGenerateFrom, f.isRepeaterTitleSource,
      // displayVariant (Task 3): kiểu hiển thị của REPEATER trên trang công khai
      // (list/cards/accordion) — chỉ có ý nghĩa ở field REPEATER cấp cao nhất, nhưng khai
      // báo ở cả 2 nơi (như isRepeaterTitleSource) cho nhất quán fragment.
      f.displayVariant,
      // REPEATER field kê khai sub-field của 1 item qua itemFields (1 cấp, không đệ quy —
      // backend/spec không hỗ trợ REPEATER lồng REPEATER) — thiếu dòng này thì Task 5's
      // renderControlledFieldControl không có gì để render bên trong ContentEntryRepeaterInput.
      f.itemFields((sf) => [
        sf.key, sf.label, sf.type, sf.required, sf.options,
        sf.relationTarget, sf.relationMultiple, sf.showInListing, sf.mockValue,
        sf.taxonomyId, sf.taxonomyMultiple, sf.relationDisplayField,
        sf.minLength, sf.maxLength, sf.pattern, sf.min, sf.max, sf.unique, sf.autoGenerateFrom, sf.isRepeaterTitleSource,
        sf.displayVariant,
      ]),
    ]),
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);

  static getOneContentType = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneContentType", (root) => [
        root.getOneContentType({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneContentType as ContentTypeDTO;
  };

  /** Fragment RIÊNG cho màn Content Type admin — thêm contentVisibilityRules, thứ
   * KHÔNG được lộ ra fragment công khai (`fragment` ở trên, dùng bởi
   * resolveCmsPageProps.ts trên MỌI trang public) vì nó mô tả CHÍNH XÁC cái gì đang
   * bị ẩn với ai (xem Global Constraints trong plan Phase 2b). */
  static adminFragment = fragment(ContentType, (i) => [
    i.key, i.label, i.icon,
    i.fields((f) => [
      f.key, f.label, f.type, f.required, f.options,
      f.relationTarget, f.relationMultiple, f.showInListing, f.mockValue,
      // Xem giải thích ở `fragment` bên trên — cùng bộ field mới của Task 5.
      f.taxonomyId, f.taxonomyMultiple, f.relationDisplayField,
      f.minLength, f.maxLength, f.pattern, f.min, f.max, f.unique, f.autoGenerateFrom, f.isRepeaterTitleSource,
      f.displayVariant,
      f.itemFields((sf) => [
        sf.key, sf.label, sf.type, sf.required, sf.options,
        sf.relationTarget, sf.relationMultiple, sf.showInListing, sf.mockValue,
        sf.taxonomyId, sf.taxonomyMultiple, sf.relationDisplayField,
        sf.minLength, sf.maxLength, sf.pattern, sf.min, sf.max, sf.unique, sf.autoGenerateFrom, sf.isRepeaterTitleSource,
        sf.displayVariant,
      ]),
    ]),
    i.contentVisibilityRules((r) => [r.field, r.operator, r.value]),
    i.id, i.createdAt, i.updatedAt, i.deletedAt,
  ]);

  static getOneContentTypeAdmin = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneContentType", (root) => [
        root.getOneContentType({ id: $('id') }, () => this.adminFragment),
      ]),
      variables: args,
    });
    return res.getOneContentType as GetOutput<typeof ContentTypeService.adminFragment>;
  };

  static getAllContentType = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllContentType", (root) => [
        root.getAllContentType({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllContentType as ContentTypePaginationCursor;
  };

  static createContentType = async (args: { data: CreateContentTypeInput }) => {
    const res = await this.mutationApi({
      document: mutation("createContentType", (root) => [
        root.createContentType({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createContentType as ContentTypeDTO;
  };

  static updateContentType = async (args: { id: string, data: UpdateContentTypeInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateContentType", (root) => [
        root.updateContentType({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateContentType as ContentTypeDTO;
  };

  static deleteContentType = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteContentType", (root) => [
        root.deleteContentType({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteContentType;
  };
}