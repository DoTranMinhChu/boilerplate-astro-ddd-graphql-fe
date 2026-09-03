// src/shared/components/fields/contentEntryFieldRenderer.tsx
//
// Extract từ manageContentEntries.page.tsx (Phase 4 Task 4) -- render input theo `FieldDefinitionDTO`/
// EFieldType (12 kiểu: TEXT/RICHTEXT/NUMBER/BOOLEAN/DATE/SELECT/IMAGE/GALLERY/VIDEO/LINK/RELATION/
// TAXONOMY/REPEATER). KHÁC HẲN SchemaFieldsEditor (BlockFieldDefinition, 10 kiểu, dùng cho Section
// content). Dùng chung cho: Content Entry admin form (nơi hàm này SINH RA), Form Builder public
// (FormSection.tsx, Task 5), Booking admin availability UI nếu cần (Task 20-21).
//
// DI CHUYỂN NGUYÊN VĂN (không đổi logic) từ manageContentEntries.page.tsx -- xem lịch sử git file đó
// cho các comment giải thích gốc của từng nhánh switch/registry.
import type { JSX } from 'solid-js';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { InputDate } from '@core/components/control/InputDate';
import { Toggle } from '@core/components/control/Toggle';
import { Select } from '@core/components/control/Select';
import { InputImage } from '@core/components/control/InputImage';
import { Editor } from '@core/components/control/Editor';
import { RelationFieldInput } from '@/modules/cms/admin/RelationFieldInput';
import { TaxonomyFieldInput } from '@/modules/cms/admin/TaxonomyFieldInput';
import { ContentEntryRepeaterInput } from '@/modules/cms/admin/ContentEntryRepeaterInput';
import { t } from '@/shared/i18n/t';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { EFieldType } from '@/shared/generated/typed-graphql';

/** 1 field ở chế độ CONTROLLED (dùng bên trong ContentEntryRepeaterInput — 1 item của
 * REPEATER không có path <Datatable.Field name="..."> ổn định). RelationFieldInput hỗ
 * trợ cả 2 chế độ (xem RelationFieldInput.tsx) nên RELATION trong repeater cũng dùng
 * dropdown chọn thật khi field có relationTarget, chỉ rơi về ô nhập ID tay cho field cũ
 * chưa cấu hình relationTarget (giống hệt logic ambient-mode ở registry bên dưới). */
function renderControlledFieldControl(field: FieldDefinitionDTO, value: any, onChange: (v: any) => void) {
    switch (field.type) {
        case EFieldType.RICHTEXT:
            return <Editor value={value} onChange={onChange} fieldless />;
        case EFieldType.NUMBER:
            return <InputNumber value={value} onChange={onChange} placeholder={field.label} fieldless />;
        case EFieldType.BOOLEAN:
            return <Toggle value={value} onChange={onChange} fieldless />;
        case EFieldType.DATE:
            return <InputDate mode="date" value={value} onChange={onChange} fieldless />;
        case EFieldType.SELECT:
            return <Select options={(field.options || []).filter((o): o is string => !!o).map((o) => ({ value: o, label: o }))} value={value} onChange={onChange} clearable fieldless />;
        case EFieldType.IMAGE:
            return <InputImage value={value} onChange={onChange} valueMode="url" fieldless />;
        case EFieldType.GALLERY:
            return <InputImage multiple={20} value={value} onChange={onChange} valueMode="url" fieldless />;
        case EFieldType.VIDEO:
            return <Input value={value} onChange={onChange} placeholder={t('cms.contentEntries.fields.videoUrlPlaceholder')} fieldless />;
        case EFieldType.LINK:
            return <Input value={value} onChange={onChange} placeholder={t('cms.contentEntries.fields.linkPlaceholder')} fieldless />;
        case EFieldType.RELATION:
            return field.relationTarget
                ? <RelationFieldInput contentTypeId={field.relationTarget} multiple={field.relationMultiple} displayField={field.relationDisplayField} value={value} onChange={onChange} fieldless />
                : <Input value={value} onChange={onChange} placeholder={t('cms.contentEntries.fields.relationPlaceholder')} fieldless />;
        case EFieldType.TAXONOMY:
            return field.taxonomyId
                ? <TaxonomyFieldInput taxonomyId={field.taxonomyId} multiple={field.taxonomyMultiple} value={value} onChange={onChange} fieldless />
                : <p class="text-xs text-neutral-400">Chưa cấu hình Taxonomy cho field này.</p>;
        case EFieldType.REPEATER:
            // Cast: FieldDefinitionDTO.itemFields được GraphQL fragment (contentType.service.ts)
            // chọn field con ở đúng 1 cấp (không đệ quy itemFields của itemFields — REPEATER
            // lồng REPEATER không được hỗ trợ), nên type của nó hẹp hơn FieldDefinitionDTO đúng
            // 1 trường (thiếu itemFields ở cấp con) chứ không phải shape sai — an toàn để cast.
            return (
                <ContentEntryRepeaterInput
                    itemFields={(field.itemFields || []) as FieldDefinitionDTO[]}
                    renderField={renderControlledFieldControl}
                    value={value}
                    onChange={onChange}
                    fieldless
                />
            );
        default:
            return <Input value={value} onChange={onChange} placeholder={field.label} fieldless />;
    }
}

/** Render đúng control theo FieldDefinition.type — không hardcode field theo 1
 * loại content cụ thể (mục 4.6/23 spec CMS: admin không thấy JSON thô). Registry
 * thay cho switch (Phase 2a) — thêm 1 kiểu field mới là thêm 1 dòng, không phải
 * tìm đúng chỗ trong 1 khối switch dài. */
const contentEntryFieldRegistry: Partial<Record<string, (field: FieldDefinitionDTO) => JSX.Element>> = {
    RICHTEXT: () => <Editor />,
    NUMBER: (field) => <InputNumber placeholder={field.label} />,
    BOOLEAN: (field) => <Toggle text={field.label} />,
    DATE: () => <InputDate mode="date" />,
    SELECT: (field) => <Select options={(field.options || []).filter((o): o is string => !!o).map((o) => ({ value: o, label: o }))} clearable />,
    IMAGE: () => <InputImage valueMode="url" />,
    GALLERY: () => <InputImage multiple={20} valueMode="url" />,
    VIDEO: (field) => <Input placeholder={t('cms.contentEntries.fields.videoUrlPlaceholder')} />,
    LINK: (field) => <Input placeholder={t('cms.contentEntries.fields.linkPlaceholder')} />,
    RELATION: (field) => {
        // relationTarget được cấu hình từ trang Content Types (FieldDefinitionArrayInput)
        // — field cũ tạo trước khi có bộ chọn này sẽ không có relationTarget, rơi về ô
        // nhập ID tay như trước (tương thích ngược) thay vì render 1 dropdown rỗng vô dụng.
        return field.relationTarget
            ? <RelationFieldInput contentTypeId={field.relationTarget} multiple={field.relationMultiple} displayField={field.relationDisplayField} />
            : <Input placeholder={t('cms.contentEntries.fields.relationPlaceholder')} />;
    },
    TAXONOMY: (field) => field.taxonomyId
        ? <TaxonomyFieldInput taxonomyId={field.taxonomyId} multiple={field.taxonomyMultiple} />
        : <p class="text-xs text-neutral-400">Chưa cấu hình Taxonomy cho field này.</p>,
    REPEATER: (field) => (
        <ContentEntryRepeaterInput
            itemFields={(field.itemFields || []) as FieldDefinitionDTO[]}
            renderField={renderControlledFieldControl}
        />
    ),
};

function renderFieldControl(field: FieldDefinitionDTO) {
    const renderer = contentEntryFieldRegistry[field.type as string];
    return renderer ? renderer(field) : <Input placeholder={field.label} />;
}

export { renderControlledFieldControl, contentEntryFieldRegistry, renderFieldControl };
