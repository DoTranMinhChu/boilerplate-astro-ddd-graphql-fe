// src/modules/cms/admin/dataWorkspaceConfig.ts
//
// Pure helpers cho ContentType editor's config tabs (Task 5, content-workspace-design.md
// mục C/E) — không phụ thuộc Solid/UI, chỉ tính toán từ FieldDefinitionDTO[] để 3 tab
// "Hiển thị danh sách"/"Thêm & Sửa"/"Tìm kiếm" biết field/mode nào hợp lệ để hiện.
import { EFieldType } from '@shared/generated/typed-graphql';
import type { FieldDefinitionDTO, ViewMode } from '@/modules/cms/cms.types';

const ALL_VIEW_MODES: ViewMode[] = ['table', 'card', 'list', 'grid', 'gallery', 'kanban'];
const IMAGE_CENTRIC_MODES: ViewMode[] = ['grid', 'gallery'];
const SEARCHABLE_ELIGIBLE_TYPES = new Set([EFieldType.TEXT, EFieldType.RICHTEXT, EFieldType.SELECT, EFieldType.NUMBER]);

/** Content Type list / Content Entry list config tab (mục C design) — Grid/Gallery chỉ có ý
 * nghĩa khi content type có ít nhất 1 field ảnh; ẩn hẳn khỏi danh sách chọn được (không chỉ
 * disable) khi không có field IMAGE/GALLERY nào, thay vì để admin bật 1 mode luôn trống rỗng. */
export function getAvailableViewModes(fields: FieldDefinitionDTO[]): ViewMode[] {
    const hasImageField = fields.some((f) => f?.type === EFieldType.IMAGE || f?.type === EFieldType.GALLERY);
    return hasImageField ? ALL_VIEW_MODES : ALL_VIEW_MODES.filter((m) => !IMAGE_CENTRIC_MODES.includes(m));
}

/** Kanban's `kanbanGroupFieldKey` chỉ hợp lệ trên field kiểu SELECT (mục C design). */
export function getSelectFieldOptions(fields: FieldDefinitionDTO[]): { value: string; label: string }[] {
    return fields
        .filter((f) => f?.type === EFieldType.SELECT)
        .map((f) => ({ value: f!.key!, label: f!.label! }));
}

/** Field type hợp lý để search JSONB động (mục E design) — RELATION/TAXONOMY/IMAGE/... không
 * có giá trị text để ILIKE có ý nghĩa. */
export function getSearchableEligibleFields(fields: FieldDefinitionDTO[]): FieldDefinitionDTO[] {
    return fields.filter((f) => f?.type && SEARCHABLE_ELIGIBLE_TYPES.has(f.type as EFieldType));
}
