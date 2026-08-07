// ddd-graphql-fe/src/shared/components/fields/blockField.types.ts
//
// Field-schema cho khối (Section) trong Page Builder — CÙNG Ý TƯỞNG với
// FieldDefinition của Content Type (xem contentType.service.ts) nhưng khai báo
// ở code, không phải DB: khối "đặc thù" (Hero, CTA...) vẫn cần 1 component
// hiển thị viết tay riêng (giữ hiệu ứng/CSS đặc trưng), nhưng FORM CHỈNH SỬA
// của nó giờ được sinh ra từ mảng field khai báo dưới đây thay vì viết tay 1
// chuỗi <Show> riêng cho từng khối trong ContentTab.tsx.
//
// Khác FieldDefinition (ContentType) ở 2 điểm có chủ đích:
//  - Thêm REPEATER: danh sách lặp lại có cấu trúc (Timeline, Accordion, Lưới
//    logo...) — ContentType chưa có kiểu này (sẽ được đưa lên backend ở Phase 2,
//    dùng lại đúng UI component xây ở đây).
//  - `options` là { value, label } thay vì string[] — field của khối do dev
//    khai báo (không phải admin gõ tay), nên label cần dịch được (t()) như mọi
//    field khác, khác ContentType nơi admin tự gõ option nên chỉ cần string[].
export interface BlockSelectOption {
    value: string;
    label: string;
}

export interface BlockFieldDefinition {
    key: string;
    label: string;
    type: 'TEXT' | 'RICHTEXT' | 'NUMBER' | 'BOOLEAN' | 'IMAGE' | 'GALLERY' | 'LINK' | 'SELECT' | 'REPEATER';
    required?: boolean;
    placeholder?: string;
    /** Chỉ dùng khi type === 'SELECT'. */
    options?: BlockSelectOption[];
    /** Chỉ dùng khi type === 'REPEATER' — cấu trúc của MỖI item trong danh sách.
     * Hỗ trợ lồng 1 cấp (itemFields của 1 REPEATER lại chứa 1 REPEATER khác) —
     * đủ cho toàn bộ khối hiện có, không cần polish UI cho lồng sâu hơn. */
    itemFields?: BlockFieldDefinition[];
}
