import { describe, it, expect } from 'vitest';
import { gridItemStyle } from '@/modules/cms/admin/gridItemStyle';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

const FIELD = { key: 'title', label: 'Title' } as unknown as FieldDefinitionDTO;

describe('gridItemStyle', () => {
    it('maps a placement to grid-column/grid-row CSS', () => {
        const result = gridItemStyle(FIELD, [{ fieldKey: 'title', colStart: 3, colSpan: 4, row: 1 }]);
        expect(result).toEqual({ 'grid-column': '3 / span 4', 'grid-row': '2' });
    });

    it('returns undefined when the field has no placement in the given layout', () => {
        expect(gridItemStyle(FIELD, [])).toBeUndefined();
    });
});
