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

    // Phase 3 bugfix — the merge used to stop at sub-group level, so these nested objects were
    // REPLACED wholesale and the unmentioned fields silently fell back to applyNodeStyle's `?? 0`.
    it('merges nested objects inside a sub-group (spacing.padding) instead of replacing them', () => {
        const base: StyleObject = { spacing: { padding: { t: 20, r: 20, b: 20, l: 20 }, gap: 12 } };
        const merged = mergeStyleOverride(base, { spacing: { padding: { t: 8 } } });
        expect(merged.spacing).toEqual({ padding: { t: 8, r: 20, b: 20, l: 20 }, gap: 12 });
    });

    it('merges border.radius per corner instead of replacing the whole radius object', () => {
        const base: StyleObject = { border: { width: 1, style: 'solid', color: '#000', radius: { tl: 4, tr: 4, br: 4, bl: 4 } } };
        const merged = mergeStyleOverride(base, { border: { radius: { tl: 16 } } });
        expect(merged.border).toEqual({ width: 1, style: 'solid', color: '#000', radius: { tl: 16, tr: 4, br: 4, bl: 4 } });
    });

    it('ignores explicitly-undefined override fields rather than wiping the base value', () => {
        const base: StyleObject = { typography: { color: '#111', size: 16 } };
        const merged = mergeStyleOverride(base, { typography: { size: undefined } });
        expect(merged.typography).toEqual({ color: '#111', size: 16 });
    });

    it('never returns a sub-object of base or override by reference', () => {
        const base: StyleObject = { typography: { color: '#111' } };
        const override = { typography: { size: 20 } };
        const merged = mergeStyleOverride(base, override);
        expect(merged.typography).not.toBe(base.typography);
        expect(merged.typography).not.toBe(override.typography);
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

    it('merges the one nested sub-object (constraints) rather than replacing it', () => {
        const base: LayoutProps = { x: 10, constraints: { horizontal: 'left', vertical: 'top' } };
        const merged = mergeLayoutOverride(base, { constraints: { horizontal: 'center' } });
        expect(merged.constraints).toEqual({ horizontal: 'center', vertical: 'top' });
    });
});
