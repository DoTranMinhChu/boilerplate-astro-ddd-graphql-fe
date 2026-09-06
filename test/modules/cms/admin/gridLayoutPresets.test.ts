import { describe, it, expect } from 'vitest';
import { GRID_LAYOUT_PRESETS, presetToZones } from '@/modules/cms/admin/gridLayoutPresets';

describe('gridLayoutPresets', () => {
    it('defines exactly the 6 presets from the design, in order', () => {
        expect(GRID_LAYOUT_PRESETS.map((p) => p.key)).toEqual([
            'full', 'halfHalf', 'twoThirdOneThird', 'oneThirdTwoThird', 'threeCols', 'dashboard',
        ]);
    });

    it('each preset\'s single-row cells sum to exactly 12 columns (except dashboard, checked separately)', () => {
        for (const preset of GRID_LAYOUT_PRESETS) {
            for (const row of preset.rows) {
                const total = row.reduce((sum, c) => sum + c.colSpan, 0);
                expect(total).toBe(12);
            }
        }
    });

    it('presetToZones expands a 2-cell single-row preset at a given startRow', () => {
        const halfHalf = GRID_LAYOUT_PRESETS.find((p) => p.key === 'halfHalf')!;
        const zones = presetToZones(halfHalf, 3);
        expect(zones).toEqual([
            { colStart: 1, colSpan: 6, rowStart: 3, rowSpan: 1 },
            { colStart: 7, colSpan: 6, rowStart: 3, rowSpan: 1 },
        ]);
    });

    it('presetToZones expands the 3-row dashboard preset with sequential rowStart values', () => {
        const dashboard = GRID_LAYOUT_PRESETS.find((p) => p.key === 'dashboard')!;
        const zones = presetToZones(dashboard, 0);
        expect(zones).toEqual([
            { colStart: 1, colSpan: 12, rowStart: 0, rowSpan: 1 },
            { colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 1 },
            { colStart: 5, colSpan: 4, rowStart: 1, rowSpan: 1 },
            { colStart: 9, colSpan: 4, rowStart: 1, rowSpan: 1 },
            { colStart: 1, colSpan: 12, rowStart: 2, rowSpan: 1 },
        ]);
    });
});
