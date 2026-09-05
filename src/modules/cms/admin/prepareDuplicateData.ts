import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

/** Nhân bản (mục D.5 design) — shallow clone `data`, xoá giá trị field `unique`/
 * `autoGenerateFrom` để buộc admin nhập/generate lại trước khi lưu (tránh đụng unique
 * constraint ngay khi mở form nhân bản). */
export function prepareDuplicateData(sourceData: Record<string, any>, fields: FieldDefinitionDTO[]): Record<string, any> {
    const clone = { ...sourceData };
    for (const field of fields) {
        if (field?.unique || field?.autoGenerateFrom) {
            clone[field.key!] = undefined;
        }
    }
    return clone;
}
