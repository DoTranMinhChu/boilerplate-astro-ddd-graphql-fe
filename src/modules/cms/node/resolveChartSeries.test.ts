import { describe, it, expect } from 'vitest';
import { resolveChartSeries } from './resolveChartSeries';

describe('resolveChartSeries', () => {
    it('resolves static series (no entries needed)', () => {
        const result = resolveChartSeries({
            mode: 'static',
            staticSeries: [{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }],
        }, []);
        expect(result).toEqual([{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }]);
    });

    it('resolves one point per repeat entry, reading labelField/valueField from entry.data', () => {
        const entries = [
            { data: { month: 'Jan', revenue: 100 } },
            { data: { month: 'Feb', revenue: 150 } },
        ];
        const result = resolveChartSeries({ mode: 'repeat', labelField: 'month', valueField: 'revenue' }, entries);
        expect(result).toEqual([{ label: 'Jan', value: 100 }, { label: 'Feb', value: 150 }]);
    });

    it('defaults a missing/non-numeric valueField to 0 rather than throwing', () => {
        const entries = [{ data: { month: 'Jan' } }];
        const result = resolveChartSeries({ mode: 'repeat', labelField: 'month', valueField: 'revenue' }, entries);
        expect(result).toEqual([{ label: 'Jan', value: 0 }]);
    });

    it('falls back to the entry index as label when labelField is unset', () => {
        const entries = [{ data: { revenue: 5 } }, { data: { revenue: 9 } }];
        const result = resolveChartSeries({ mode: 'repeat', valueField: 'revenue' }, entries);
        expect(result).toEqual([{ label: '1', value: 5 }, { label: '2', value: 9 }]);
    });

    it('returns an empty array for mode static with no staticSeries configured', () => {
        expect(resolveChartSeries({ mode: 'static' }, [])).toEqual([]);
    });
});
