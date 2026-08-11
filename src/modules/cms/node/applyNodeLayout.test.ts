// src/modules/cms/node/applyNodeLayout.test.ts
import { describe, it, expect } from 'vitest';
import { applyContainerLayout, applyChildLayout } from './applyNodeLayout';
import type { NodeTree } from './node.types';

// NodeTree's non-JSON fields (pageId/parentId/order/type/layoutMode/id/createdAt/
// updatedAt/deletedAt/animationRef) come straight from the raw GraphQL-codegen'd
// NodeDTO, where every field is `string | undefined` (not `string | null`) — see
// node.service.ts / buildNodeTree.test.ts's `n()` helper for the same convention.
function node(overrides: Partial<NodeTree> = {}): NodeTree {
    return {
        id: 'x',
        pageId: 'p1',
        parentId: undefined,
        order: 0,
        type: 'frame',
        layoutMode: 'flow',
        style: {},
        layout: {},
        props: {},
        dataBinding: { mode: 'static' },
        responsiveOverrides: {},
        createdAt: '',
        updatedAt: '',
        deletedAt: undefined,
        animationRef: undefined,
        children: [],
        ...overrides,
    };
}

describe('applyContainerLayout — flow', () => {
    it('defaults to display:flex, column direction', () => {
        const css = applyContainerLayout(node({ layoutMode: 'flow', layout: {} }));
        expect(css.display).toBe('flex');
        expect(css['flex-direction']).toBe('column');
    });

    it('maps direction/wrap/justify/align/gap/grid', () => {
        const css = applyContainerLayout(node({
            layoutMode: 'flow',
            layout: { direction: 'row', wrap: true, justify: 'space-between', align: 'center', gap: 16, display: 'grid', gridTemplate: 'repeat(3, 1fr)' },
        }));
        expect(css.display).toBe('grid');
        expect(css['flex-direction']).toBe('row');
        expect(css['flex-wrap']).toBe('wrap');
        expect(css['justify-content']).toBe('space-between');
        expect(css['align-items']).toBe('center');
        expect(css.gap).toBe('16px');
        expect(css['grid-template-columns']).toBe('repeat(3, 1fr)');
    });
});

describe('applyContainerLayout — free', () => {
    it('sets position:relative on the free container itself', () => {
        const css = applyContainerLayout(node({ layoutMode: 'free' }));
        expect(css.position).toBe('relative');
    });
});

describe('applyChildLayout', () => {
    it('flow parent → maps item-level flex/grid props', () => {
        const css = applyChildLayout(node({ layout: { order: 2, grow: 1, shrink: 0, basis: '200px', alignSelf: 'end', gridColumn: '1 / 3' } }), 'flow');
        expect(css.order).toBe('2');
        expect(css['flex-grow']).toBe('1');
        expect(css['flex-shrink']).toBe('0');
        expect(css['flex-basis']).toBe('200px');
        expect(css['align-self']).toBe('end');
        expect(css['grid-column']).toBe('1 / 3');
    });

    it('free parent → absolute position + size + rotation + z-index', () => {
        const css = applyChildLayout(node({ layout: { x: 40, y: 80, width: 200, height: 100, rotation: 10, zIndex: 3 } }), 'free');
        expect(css.position).toBe('absolute');
        expect(css.left).toBe('40px');
        expect(css.top).toBe('80px');
        expect(css.width).toBe('200px');
        expect(css.height).toBe('100px');
        expect(css.transform).toBe('rotate(10deg)');
        expect(css['z-index']).toBe('3');
    });
});
