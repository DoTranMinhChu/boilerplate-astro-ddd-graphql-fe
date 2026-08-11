// src/shared/services/form/form.service.ts
//
// Mirror contentType.service.ts (Phase 4 Task 4) — CRUD cho Form (Form Builder, mục 1 kế hoạch
// Phase 4). `Form.notifyEmail` KHÔNG có @Field trên ObjectType 'Form' (bỏ vì lý do bảo mật — xem
// fix Task 3 review) nên KHÔNG thể chọn field này trong `fragment`/`getOneForm`/`getAllForm` dù
// client có yêu cầu — muốn đọc lại giá trị hiện tại phải gọi RIÊNG `getFormNotifyEmail(id)`
// (staff-only). Ghi `notifyEmail` khi lưu vẫn qua CreateFormInput/UpdateFormInput như thường
// (Input type độc lập với ObjectType, không bị ảnh hưởng).
import {
  $, fragment, query, mutation, GetOutput,
  Form,
  FormSubmission,
  PaginationArgsInput,
  CreateFormInput,
  UpdateFormInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type FormDTO = GetOutput<typeof FormService.fragment>;
export type FormPaginationCursor = PaginationCursor<FormDTO>;
export type FormSubmissionDTO = GetOutput<typeof FormService.submissionFragment>;

export class FormService extends CrudService {
  static apiName = 'form' as const;
  static displayName = 'Form';

  // Cùng bộ field FieldDefinition với ContentTypeService.fragment (contentType.service.ts) —
  // Form.fields dùng lại đúng shape FieldDefinition/FieldDefinitionInput của Content Type, không
  // định nghĩa field riêng cho Form.
  static fragment = fragment(Form, (i) => [
    i.key,
    i.label,
    i.fields((f) => [
      f.key, f.label, f.type, f.required, f.options,
      f.relationTarget, f.relationMultiple, f.showInListing, f.mockValue,
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
    i.visibilityRules,
    i.submitLabel,
    i.successMessage,
    i.id, i.createdAt, i.updatedAt, i.deletedAt,
  ]);

  static getOneForm = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneForm", (root) => [
        root.getOneForm({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneForm as FormDTO;
  };

  static getAllForm = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllForm", (root) => [
        root.getAllForm({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllForm as FormPaginationCursor;
  };

  /** Staff-only — xem comment đầu file. Gọi riêng khi cần hiện `notifyEmail` (vd mở modal sửa
   * 1 Form), gộp kết quả vào FormDTO trước khi đổ vào form (itemQuery của manageForms.page.tsx). */
  static getFormNotifyEmail = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getFormNotifyEmail", (root) => [
        root.getFormNotifyEmail({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.getFormNotifyEmail as string | undefined;
  };

  static createForm = async (args: { data: CreateFormInput }) => {
    const res = await this.mutationApi({
      document: mutation("createForm", (root) => [
        root.createForm({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createForm as FormDTO;
  };

  static updateForm = async (args: { id: string, data: UpdateFormInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateForm", (root) => [
        root.updateForm({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateForm as FormDTO;
  };

  static deleteForm = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteForm", (root) => [
        root.deleteForm({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteForm;
  };

  // ── FormSubmission (Task 5 public FormSection + xem submissions ở admin) ──────────────────
  static submissionFragment = fragment(FormSubmission, (i) => [
    i.formId, i.data, i.id, i.createdAt, i.updatedAt, i.deletedAt,
  ]);

  /** KHÔNG phân trang (schema BE trả mảng thẳng, không PaginatedXxx) — phù hợp khối lượng
   * submission của 1 Form trong màn "Xem submissions" (admin tải hết 1 lần, không cần cursor). */
  static getAllFormSubmission = async (args: { formId: string }) => {
    const res = await this.queryApi({
      document: query("getAllFormSubmission", (root) => [
        root.getAllFormSubmission({ formId: $('formId') }, () => this.submissionFragment),
      ]),
      variables: args,
    });
    return (res.getAllFormSubmission || []).filter((s): s is FormSubmissionDTO => !!s);
  };

  /** Public — dùng bởi FormSection.tsx (Task 5), không cần đăng nhập. `data` là Mixed (JSON tự
   * do theo `Form.fields` của form đang gửi) — genql suy ra kiểu tham số là string nhưng giá trị
   * thực tế gửi lên là object JSON, ép kiểu `any` khi gọi. */
  static createPublicFormSubmission = async (args: { formId: string; data: any }) => {
    const res = await this.mutationApi({
      document: mutation("createPublicFormSubmission", (root) => [
        root.createPublicFormSubmission({ formId: $('formId'), data: $('data') }, () => this.submissionFragment),
      ]),
      variables: args,
    });
    return res.createPublicFormSubmission as FormSubmissionDTO;
  };
}
