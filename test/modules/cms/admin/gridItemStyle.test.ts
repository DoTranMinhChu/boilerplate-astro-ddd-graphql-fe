import { describe, it, expect } from 'vitest';
import { gridItemStyle } from '@/modules/cms/admin/gridItemStyle';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

const FIELD = { key: 'title', label: 'Title' } as unknown as FieldDefinitionDTO;

describe('gridItemStyle', () => {
    it('maps a placement to grid-column/grid-row (with span) CSS, default align stretch, no min-height', () => {
        const result = gridItemStyle(FIELD, [{ fieldKey: 'title', colStart: 3, colSpan: 4, rowStart: 1, rowSpan: 2 }]);
        expect(result).toEqual({ 'grid-column': '3 / span 4', 'grid-row': '2 / span 2', 'align-self': 'stretch' });
    });

    it('carries an explicit align through instead of defaulting', () => {
        const result = gridItemStyle(FIELD, [{ fieldKey: 'title', colStart: 1, colSpan: 12, rowStart: 0, rowSpan: 1, align: 'start' }]);
        expect(result!['align-self']).toBe('start');
    });

    it('adds min-height only when explicitly set', () => {
        const result = gridItemStyle(FIELD, [{ fieldKey: 'title', colStart: 1, colSpan: 12, rowStart: 0, rowSpan: 1, minHeight: 120 }]);
        expect(result).toEqual({ 'grid-column': '1 / span 12', 'grid-row': '1 / span 1', 'align-self': 'stretch', 'min-height': '120px' });
    });

    it('returns undefined when the field has no placement in the given layout', () => {
        expect(gridItemStyle(FIELD, [])).toBeUndefined();
    });
});
