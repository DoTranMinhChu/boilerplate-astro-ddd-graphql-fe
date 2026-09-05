import { describe, it, expect } from 'vitest';
import { getAvailableViewModes, getSelectFieldOptions, getSearchableEligibleFields } from '@/modules/cms/admin/dataWorkspaceConfig';
import { EFieldType } from '@shared/generated/typed-graphql';

const IMAGE_FIELD = { key: 'photo', label: 'Ảnh', type: EFieldType.IMAGE };
const SELECT_FIELD = { key: 'status', label: 'Trạng thái', type: EFieldType.SELECT, options: ['DRAFT', 'PUBLISHED'] };
const TEXT_FIELD = { key: 'title', label: 'Tiêu đề', type: EFieldType.TEXT };
const NUMBER_FIELD = { key: 'price', label: 'Giá', type: EFieldType.NUMBER };
const RELATION_FIELD = { key: 'category', label: 'Danh mục', type: EFieldType.RELATION };

describe('getAvailableViewModes', () => {
    it('includes grid/gallery when the content type has an IMAGE field', () => {
        const modes = getAvailableViewModes([IMAGE_FIELD, TEXT_FIELD] as any);
        expect(modes).toEqual(['table', 'card', 'list', 'grid', 'gallery', 'kanban']);
    });

    it('excludes grid/gallery when there is no IMAGE/GALLERY field', () => {
        const modes = getAvailableViewModes([TEXT_FIELD, SELECT_FIELD] as any);
        expect(modes).toEqual(['table', 'card', 'list', 'kanban']);
    });
});

describe('getSelectFieldOptions', () => {
    it('returns only SELECT-type fields as {value,label} options', () => {
        expect(getSelectFieldOptions([TEXT_FIELD, SELECT_FIELD, RELATION_FIELD] as any))
            .toEqual([{ value: 'status', label: 'Trạng thái' }]);
    });

    it('returns an empty array when no SELECT field exists', () => {
        expect(getSelectFieldOptions([TEXT_FIELD] as any)).toEqual([]);
    });
});

describe('getSearchableEligibleFields', () => {
    it('keeps only TEXT/RICHTEXT/SELECT/NUMBER fields', () => {
        const fields = [TEXT_FIELD, NUMBER_FIELD, SELECT_FIELD, IMAGE_FIELD, RELATION_FIELD] as any;
        expect(getSearchableEligibleFields(fields).map((f: any) => f.key)).toEqual(['title', 'price', 'status']);
    });
});
