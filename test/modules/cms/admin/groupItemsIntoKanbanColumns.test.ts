import { describe, it, expect } from 'vitest';
import { groupItemsIntoKanbanColumns } from '@/modules/cms/admin/groupItemsIntoKanbanColumns';

const FIELD_OPTIONS = [{ value: 'DRAFT', label: 'Bản nháp' }, { value: 'PUBLISHED', label: 'Đã xuất bản' }];
const ITEMS = [
    { id: '1', status: 'DRAFT' },
    { id: '2', status: 'PUBLISHED' },
    { id: '3', status: 'PUBLISHED' },
    { id: '4', status: undefined },
    { id: '5', status: 'SOME_DELETED_OPTION' },
];

describe('groupItemsIntoKanbanColumns', () => {
    it('groups items by field value into 1 column per configured option, in option order', () => {
        const columns = groupItemsIntoKanbanColumns(ITEMS as any, FIELD_OPTIONS, (i) => i.status, 'Chưa phân loại');
        expect(columns.map((c) => c.value)).toEqual(['DRAFT', 'PUBLISHED', '__unassigned__']);
        expect(columns[0].items.map((i: any) => i.id)).toEqual(['1']);
        expect(columns[1].items.map((i: any) => i.id)).toEqual(['2', '3']);
    });

    it('puts items with an empty/unmatched value into the trailing "unassigned" column', () => {
        const columns = groupItemsIntoKanbanColumns(ITEMS as any, FIELD_OPTIONS, (i) => i.status, 'Chưa phân loại');
        const unassigned = columns[columns.length - 1];
        expect(unassigned.label).toBe('Chưa phân loại');
        expect(unassigned.items.map((i: any) => i.id)).toEqual(['4', '5']);
    });

    it('omits the unassigned column entirely when every item matches a real option', () => {
        const columns = groupItemsIntoKanbanColumns(
            [{ id: '1', status: 'DRAFT' }] as any, FIELD_OPTIONS, (i: any) => i.status, 'Chưa phân loại',
        );
        expect(columns.find((c) => c.value === '__unassigned__')).toBeUndefined();
    });
});
