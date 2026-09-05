import { describe, it, expect } from 'vitest';
import { assignDefaultGridPositions } from '@/modules/cms/admin/assignDefaultGridPositions';

const FIELDS = [{ key: 'title' }, { key: 'price' }, { key: 'description' }] as any;

describe('assignDefaultGridPositions', () => {
    it('keeps already-placed fields exactly as they are', () => {
        const existing = [{ fieldKey: 'title', colStart: 1, colSpan: 6, row: 0 }];
        const result = assignDefaultGridPositions(FIELDS, existing);
        expect(result.find((r) => r.fieldKey === 'title')).toEqual(existing[0]);
    });

    it('appends unplaced fields as full-width rows after the max already-used row', () => {
        const existing = [{ fieldKey: 'title', colStart: 1, colSpan: 6, row: 2 }];
        const result = assignDefaultGridPositions(FIELDS, existing);
        const price = result.find((r) => r.fieldKey === 'price')!;
        const description = result.find((r) => r.fieldKey === 'description')!;
        expect(price).toEqual({ fieldKey: 'price', colStart: 1, colSpan: 12, row: 3 });
        expect(description).toEqual({ fieldKey: 'description', colStart: 1, colSpan: 12, row: 4 });
    });

    it('starts at row 0 when nothing is placed yet', () => {
        const result = assignDefaultGridPositions([{ key: 'title' }] as any, []);
        expect(result).toEqual([{ fieldKey: 'title', colStart: 1, colSpan: 12, row: 0 }]);
    });

    it('drops placements for fields that no longer exist on the content type', () => {
        const existing = [{ fieldKey: 'deletedField', colStart: 1, colSpan: 6, row: 0 }];
        const result = assignDefaultGridPositions([{ key: 'title' }] as any, existing);
        expect(result.find((r) => r.fieldKey === 'deletedField')).toBeUndefined();
        expect(result.find((r) => r.fieldKey === 'title')).toBeTruthy();
    });
});
