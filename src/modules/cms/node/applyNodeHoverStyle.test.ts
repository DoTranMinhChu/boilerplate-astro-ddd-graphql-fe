// src/modules/cms/node/applyNodeHoverStyle.test.ts
import { describe, it, expect } from 'vitest';
import { buildHoverCss } from './applyNodeHoverStyle';

describe('buildHoverCss', () => {
    it('returns null when style.hover is unset', () => {
        expect(buildHoverCss({ id: 'n1', style: {} })).toBeNull();
        expect(buildHoverCss({ id: 'n1' })).toBeNull();
    });

    it('returns null when there is no node id', () => {
        expect(buildHoverCss({ style: { hover: { effects: { opacity: 0.5 } } } })).toBeNull();
    });

    it('builds a self-scoped rule (default scope) targeting the node\'s own rendered child (not the data-node-id wrapper itself), with !important', () => {
        const css = buildHoverCss({ id: 'card-1', style: { hover: { border: { width: 1, color: '#d4a62b' } } } });
        expect(css).toBe('[data-node-id="card-1"]:hover > * { border: 1px solid #d4a62b !important; }');
    });

    it('builds a parent-scoped rule using the descendant combinator, reaching into the own node\'s rendered child, with !important', () => {
        const css = buildHoverCss({ id: 'logo-1', parentId: 'card-1', style: { hover: { scope: 'parent', effects: { grayscale: 0 } } } });
        expect(css).toBe('[data-node-id="card-1"]:hover [data-node-id="logo-1"] > * { filter: grayscale(0%) !important; }');
    });

    it('returns null for scope "parent" when the node has no parentId', () => {
        expect(buildHoverCss({ id: 'orphan-1', style: { hover: { scope: 'parent', effects: { opacity: 1 } } } })).toBeNull();
    });

    it('returns null when hover is set but resolves to zero CSS properties', () => {
        expect(buildHoverCss({ id: 'n1', style: { hover: {} } })).toBeNull();
    });

    it('composes multiple hover properties (transform lift + background + effects) into one rule body', () => {
        const css = buildHoverCss({
            id: 'card-2',
            style: { hover: { transform: { translateY: -6 }, background: { type: 'color', value: '#141414' }, effects: { opacity: 1 } } },
        });
        expect(css).toBe('[data-node-id="card-2"]:hover > * { background-color: #141414 !important; opacity: 1 !important; transform: translate(0px, -6px) !important; }');
    });

    it('supports a text-color-only hover override (e.g. a muted label brightening on hover)', () => {
        const css = buildHoverCss({ id: 'label-1', parentId: 'card-1', style: { hover: { scope: 'parent', typography: { color: '#f2f2f2' } } } });
        expect(css).toBe('[data-node-id="card-1"]:hover [data-node-id="label-1"] > * { color: #f2f2f2 !important; }');
    });

    it('does not leak the scope field itself into the emitted CSS text', () => {
        const css = buildHoverCss({ id: 'card-3', style: { hover: { scope: 'self', effects: { opacity: 0.8 } } } });
        expect(css).toBe('[data-node-id="card-3"]:hover > * { opacity: 0.8 !important; }');
    });
});
