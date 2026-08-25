import { describe, it, expect } from 'vitest';
import { resolveChartSeries, normalizeStaticSeries } from './resolveChartSeries';

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

    // Final-review fix (Critical): `staticSeries` is authored through the Inspector's
    // 'repeater' control (nodeRegistry.ts) — an ARRAY of `{label, value}` rows, where a
    // freshly-added row's `value` is `undefined` until the admin types a number, and the
    // legacy `code` control persisted a RAW STRING. Every shape the field can actually
    // produce is exercised here; nothing may throw, because a throw escapes into the
    // per-node ErrorBoundary and blanks the chart.
    describe('static series shapes the Inspector field can actually produce', () => {
        it('reads the repeater control\'s array-of-{label,value} rows', () => {
            const result = resolveChartSeries({
                mode: 'static',
                staticSeries: [{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }],
            }, []);
            expect(result).toEqual([{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }]);
        });

        it('degrades a freshly-added repeater row (both sub-fields still undefined) to a usable point', () => {
            const result = resolveChartSeries({ mode: 'static', staticSeries: [{ label: undefined, value: undefined }] }, []);
            expect(result).toEqual([{ label: '1', value: 0 }]);
        });

        it('coerces a numeric-string value (InputNumber can round-trip a string) to a number', () => {
            const result = resolveChartSeries({ mode: 'static', staticSeries: [{ label: 'Jan', value: '10' }] }, []);
            expect(result).toEqual([{ label: 'Jan', value: 10 }]);
        });

        it('parses the legacy code-control shape: a raw JSON string', () => {
            const result = resolveChartSeries({
                mode: 'static',
                staticSeries: '[{"label":"Jan","value":10},{"label":"Feb","value":20}]',
            }, []);
            expect(result).toEqual([{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }]);
        });

        it('returns [] rather than throwing on a malformed JSON string', () => {
            expect(() => resolveChartSeries({ mode: 'static', staticSeries: '[{label: Jan' }, [])).not.toThrow();
            expect(resolveChartSeries({ mode: 'static', staticSeries: '[{label: Jan' }, [])).toEqual([]);
        });

        it('returns [] for an empty/whitespace string, a non-array JSON value, and a bare object', () => {
            expect(resolveChartSeries({ mode: 'static', staticSeries: '' }, [])).toEqual([]);
            expect(resolveChartSeries({ mode: 'static', staticSeries: '   ' }, [])).toEqual([]);
            expect(resolveChartSeries({ mode: 'static', staticSeries: '{"label":"Jan"}' }, [])).toEqual([]);
            expect(resolveChartSeries({ mode: 'static', staticSeries: { label: 'Jan', value: 1 } }, [])).toEqual([]);
            expect(resolveChartSeries({ mode: 'static', staticSeries: 42 }, [])).toEqual([]);
            expect(resolveChartSeries({ mode: 'static', staticSeries: null }, [])).toEqual([]);
        });

        it('always returns real numbers, so Math.max(...values) never yields NaN', () => {
            const points = resolveChartSeries({
                mode: 'static',
                staticSeries: [{ label: 'a' }, { label: 'b', value: 'oops' }, { label: 'c', value: 3 }],
            }, []);
            expect(points.every((p) => typeof p.value === 'number' && Number.isFinite(p.value))).toBe(true);
            expect(Math.max(...points.map((p) => p.value))).toBe(3);
        });
    });
});

describe('normalizeStaticSeries', () => {
    it('never throws for any input shape', () => {
        for (const input of [undefined, null, 0, '', '[', '{}', {}, [], [null], [1, 2], true, () => {}]) {
            expect(() => normalizeStaticSeries(input)).not.toThrow();
            expect(Array.isArray(normalizeStaticSeries(input))).toBe(true);
        }
    });
});
