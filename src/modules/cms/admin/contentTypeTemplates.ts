// src/modules/cms/admin/contentTypeTemplates.ts
//
// Task 18 — 3-template library (mục G design) for the "Dựa trên mẫu" (template) creation
// kind: hard-coded in the FE, same spirit as `kitStarter.ts` (Page kits). Picking a template
// prefills the EXISTING field builder (already filled in) — the admin can still edit before
// saving, this NEVER creates a Content Type directly.
import { EFieldType, type FieldDefinitionInput } from '@shared/generated/typed-graphql';
import type { ListViewConfig, FormConfig } from '@/modules/cms/cms.types';

export interface ContentTypeTemplate {
    key: string;
    label: string;
    fields: FieldDefinitionInput[];
    listViewConfig: ListViewConfig;
    formConfig: FormConfig;
}

export const CONTENT_TYPE_TEMPLATES: ContentTypeTemplate[] = [
    {
        key: 'article',
        label: 'Bài viết (Article)',
        fields: [
            { key: 'title', label: 'Tiêu đề', type: EFieldType.TEXT, required: true, showInListing: true, searchable: true },
            { key: 'slug', label: 'Slug', type: EFieldType.TEXT, unique: true, autoGenerateFrom: 'title' },
            { key: 'excerpt', label: 'Mô tả ngắn', type: EFieldType.TEXT, searchable: true },
            { key: 'content', label: 'Nội dung', type: EFieldType.RICHTEXT },
            { key: 'coverImage', label: 'Ảnh đại diện', type: EFieldType.IMAGE, showInListing: true },
            { key: 'status', label: 'Trạng thái', type: EFieldType.SELECT, options: ['DRAFT', 'PUBLISHED'], showInListing: true, searchable: true },
        ],
        listViewConfig: { defaultMode: 'table', enabledModes: ['table', 'card', 'list', 'gallery'], cardConfig: { imageFieldKey: 'coverImage', subtitleFieldKey: 'excerpt' } },
        formConfig: { defaultMode: 'fullPage', enabledModes: ['dialog', 'fullPage'] },
    },
    {
        key: 'product',
        label: 'Sản phẩm (Product)',
        fields: [
            { key: 'name', label: 'Tên sản phẩm', type: EFieldType.TEXT, required: true, showInListing: true, searchable: true },
            { key: 'slug', label: 'Slug', type: EFieldType.TEXT, unique: true, autoGenerateFrom: 'name' },
            { key: 'price', label: 'Giá (VND)', type: EFieldType.NUMBER, required: true, showInListing: true, searchable: true },
            { key: 'image', label: 'Ảnh sản phẩm', type: EFieldType.IMAGE, showInListing: true },
            { key: 'gallery', label: 'Bộ sưu tập ảnh', type: EFieldType.GALLERY },
            { key: 'status', label: 'Trạng thái', type: EFieldType.SELECT, options: ['DRAFT', 'PUBLISHED'], showInListing: true, searchable: true },
        ],
        listViewConfig: { defaultMode: 'table', enabledModes: ['table', 'card', 'list', 'grid', 'gallery', 'kanban'], kanbanGroupFieldKey: 'status', cardConfig: { imageFieldKey: 'image' } },
        formConfig: { defaultMode: 'dialog', enabledModes: ['dialog', 'drawer', 'fullPage'] },
    },
    {
        key: 'genericPage',
        label: 'Trang tổng quát',
        fields: [
            { key: 'title', label: 'Tiêu đề', type: EFieldType.TEXT, required: true, showInListing: true, searchable: true },
            { key: 'content', label: 'Nội dung', type: EFieldType.RICHTEXT },
            { key: 'status', label: 'Trạng thái', type: EFieldType.SELECT, options: ['DRAFT', 'PUBLISHED'], showInListing: true },
        ],
        listViewConfig: { defaultMode: 'table', enabledModes: ['table', 'list'] },
        formConfig: { defaultMode: 'dialog', enabledModes: ['dialog', 'fullPage'] },
    },
];
