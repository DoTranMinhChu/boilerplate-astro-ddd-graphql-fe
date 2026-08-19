// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { resolveBindableContentType } from './resolveBindableContentType';
import { ENodeType } from './node.constants';
import type { NodeTree } from './node.types';

function makeNode(overrides: Partial<NodeTree>): NodeTree {
    return { id: 'n1', type: ENodeType.FRAME, order: 0, layoutMode: 'flow', children: [], ...overrides } as NodeTree;
}

function byId(nodes: NodeTree[]): Map<string, NodeTree> {
    return new Map(nodes.map((n) => [n.id ?? '', n]));
}

describe('resolveBindableContentType', () => {
    it('returns undefined when the node has no repeat-bearing ancestor', () => {
        const leaf = makeNode({ id: 'text-1', type: ENodeType.TEXT });
        expect(resolveBindableContentType('text-1', byId([leaf]))).toBeUndefined();
    });

    it('resolves via source:"own" (default when source is unset) using contentTypeKey', () => {
        const frame = makeNode({ id: 'frame-1', repeat: { contentTypeKey: 'ct-product' } as any });
        const text = makeNode({ id: 'text-1', type: ENodeType.TEXT, parentId: 'frame-1' });
        expect(resolveBindableContentType('text-1', byId([frame, text]))).toBe('ct-product');
    });

    it('resolves via source:"own" explicitly set, same as unset', () => {
        const frame = makeNode({ id: 'frame-1', repeat: { source: 'own', contentTypeKey: 'ct-product' } as any });
        expect(resolveBindableContentType('frame-1', byId([frame]))).toBe('ct-product');
    });

    it('resolves via source:"backlink" using sourceContentTypeId', () => {
        const frame = makeNode({ id: 'frame-1', repeat: { source: 'backlink', sourceContentTypeId: 'ct-comment' } as any });
        const img = makeNode({ id: 'img-1', type: ENodeType.IMAGE, parentId: 'frame-1' });
        expect(resolveBindableContentType('img-1', byId([frame, img]))).toBe('ct-comment');
    });

    it('resolves via source:"related" using the FE-only relatedContentTypeKey assumption', () => {
        const frame = makeNode({ id: 'frame-1', repeat: { source: 'related', relatedContentTypeKey: 'ct-tag' } as any });
        expect(resolveBindableContentType('frame-1', byId([frame]))).toBe('ct-tag');
    });

    it('never resolves via source:"mixed", but keeps walking up past it', () => {
        const outer = makeNode({ id: 'outer', repeat: { source: 'own', contentTypeKey: 'ct-outer' } as any });
        const mixedFrame = makeNode({ id: 'mixed-1', repeat: { source: 'mixed', sources: [] } as any, parentId: 'outer' });
        const text = makeNode({ id: 'text-1', type: ENodeType.TEXT, parentId: 'mixed-1' });
        expect(resolveBindableContentType('text-1', byId([outer, mixedFrame, text]))).toBe('ct-outer');
    });

    it('skips a repeat with no resolvable content type yet (e.g. contentTypeKey unset) and keeps walking up', () => {
        const outer = makeNode({ id: 'outer', repeat: { source: 'own', contentTypeKey: 'ct-outer' } as any });
        const unconfigured = makeNode({ id: 'inner', repeat: { source: 'own' } as any, parentId: 'outer' });
        const text = makeNode({ id: 'text-1', type: ENodeType.TEXT, parentId: 'inner' });
        expect(resolveBindableContentType('text-1', byId([outer, unconfigured, text]))).toBe('ct-outer');
    });

    it('resolves for the repeat-bearing node itself, not just its descendants', () => {
        const frame = makeNode({ id: 'frame-1', repeat: { contentTypeKey: 'ct-product' } as any });
        expect(resolveBindableContentType('frame-1', byId([frame]))).toBe('ct-product');
    });

    it('cardinality is irrelevant — "many" resolves exactly like "one"', () => {
        const many = makeNode({ id: 'frame-many', repeat: { cardinality: 'many', contentTypeKey: 'ct-list' } as any });
        const one = makeNode({ id: 'frame-one', repeat: { cardinality: 'one', contentTypeKey: 'ct-detail' } as any });
        expect(resolveBindableContentType('frame-many', byId([many]))).toBe('ct-list');
        expect(resolveBindableContentType('frame-one', byId([one]))).toBe('ct-detail');
    });

    it('returns undefined for an unknown nodeId', () => {
        expect(resolveBindableContentType('nonexistent', byId([]))).toBeUndefined();
    });
});
