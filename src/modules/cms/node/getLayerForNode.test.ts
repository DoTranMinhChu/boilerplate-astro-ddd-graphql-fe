// src/modules/cms/node/getLayerForNode.test.ts
import { describe, it, expect } from 'vitest';
import { getLayerForNode } from './getLayerForNode';
import type { NodeTree } from './node.types';

function node(legacyAnimation?: unknown): NodeTree {
    return {
        id: 'n1',
        pageId: 'p1',
        parentId: undefined,
        order: 0,
        type: 'media-hero',
        layoutMode: 'flow',
        style: {},
        layout: {},
        props: { legacyAnimation },
        dataBinding: { mode: 'static' },
        responsiveOverrides: {},
        createdAt: '',
        updatedAt: '',
        deletedAt: undefined,
        animationRef: undefined,
        children: [],
    } as unknown as NodeTree;
}

describe('getLayerForNode', () => {
    it('returns the layer whose target matches', () => {
        const n = node([{ target: 'caption', preset: 'fade-up' }, { target: 'heading', preset: 'fade-in' }]);
        expect(getLayerForNode(n, 'caption')).toEqual({ target: 'caption', preset: 'fade-up' });
    });

    it('returns undefined when no layer matches the target', () => {
        const n = node([{ target: 'caption', preset: 'fade-up' }]);
        expect(getLayerForNode(n, 'heading')).toBeUndefined();
    });

    it('returns undefined when props.legacyAnimation is missing', () => {
        const n = node(undefined);
        expect(getLayerForNode(n, 'caption')).toBeUndefined();
    });

    it('returns undefined when props itself is missing', () => {
        const n = { ...node(undefined), props: undefined } as unknown as NodeTree;
        expect(getLayerForNode(n, 'caption')).toBeUndefined();
    });
});
