// src/modules/cms/node/mergeResponsiveOverride.test.ts
import { describe, it, expect } from 'vitest';
import { mergeStyleOverride, mergeLayoutOverride } from './mergeResponsiveOverride';
import type { StyleObject, LayoutProps } from './node.types';

describe('mergeStyleOverride', () => {
    it('returns base unchanged when override is undefined', () => {
        const base: StyleObject = { typography: { color: '#111', size: 16 } };
        expect(mergeStyleOverride(base, undefined)).toEqual(base);
    });

    it('merges a sub-group field-by-field, preserving base fields the override does not mention', () => {
        const base: StyleObject = { typography: { color: '#111', size: 16, fontFamily: 'Inter' } };
        const merged = mergeStyleOverride(base, { typography: { size: 24 } });
        expect(merged.typography).toEqual({ color: '#111', size: 24, fontFamily: 'Inter' });
    });

    it('leaves sub-groups the override does not mention completely untouched', () => {
        const base: StyleObject = { typography: { color: '#111' }, background: { type: 'color', value: '#fff' } };
        const merged = mergeStyleOverride(base, { typography: { color: '#222' } });
        expect(merged.background).toEqual({ type: 'color', value: '#fff' });
    });

    it('replaces the whole shadow array rather than merging entries', () => {
        const base: StyleObject = { shadow: [{ x: 0, y: 2, blur: 4, spread: 0, color: '#000' }] };
        const merged = mergeStyleOverride(base, { shadow: [] });
        expect(merged.shadow).toEqual([]);
    });
});

describe('mergeLayoutOverride', () => {
    it('returns base unchanged when override is undefined', () => {
        const base: LayoutProps = { x: 10, y: 20, width: 100 };
        expect(mergeLayoutOverride(base, undefined)).toEqual(base);
    });

    it('shallow-merges individual fields, preserving fields the override does not set', () => {
        const base: LayoutProps = { x: 10, y: 20, width: 100, height: 50 };
        const merged = mergeLayoutOverride(base, { width: 200 });
        expect(merged).toEqual({ x: 10, y: 20, width: 200, height: 50 });
    });
});
