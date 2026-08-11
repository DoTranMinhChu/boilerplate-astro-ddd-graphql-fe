import { describe, it, expect } from 'vitest';
import { resolveBoundValue } from './nodeDataBinding';

describe('resolveBoundValue', () => {
    it('mode "static" always returns the static value, ignoring contextEntry', () => {
        expect(resolveBoundValue({ mode: 'static' }, { title: 'from entry' }, 'static text')).toBe('static text');
    });

    it('mode "boundField" reads the field from contextEntry', () => {
        expect(resolveBoundValue({ mode: 'boundField', field: 'title' }, { title: 'Sản phẩm A', price: 100 }, 'fallback')).toBe('Sản phẩm A');
    });

    it('mode "boundField" with no contextEntry falls back to the static value', () => {
        expect(resolveBoundValue({ mode: 'boundField', field: 'title' }, undefined, 'fallback')).toBe('fallback');
    });

    it('mode "boundField" with a field missing on contextEntry falls back to the static value', () => {
        expect(resolveBoundValue({ mode: 'boundField', field: 'missingField' }, { title: 'x' }, 'fallback')).toBe('fallback');
    });
});
