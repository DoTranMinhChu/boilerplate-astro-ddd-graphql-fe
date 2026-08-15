import { describe, it, expect } from 'vitest';
import { flattenVisibleTree } from '../flattenTree';

type Row = { id: string; parentId: string | null; order: number };

describe('flattenVisibleTree', () => {
    it('flattens a nested tree depth-first, in order', () => {
        const nodes: Row[] = [
            { id: 'root', parentId: null, order: 0 },
            { id: 'child1', parentId: 'root', order: 0 },
            { id: 'child2', parentId: 'root', order: 1 },
            { id: 'grandchild', parentId: 'child1', order: 0 },
        ];
        const result = flattenVisibleTree(nodes, new Set());
        expect(result.map((r) => r.id)).toEqual(['root', 'child1', 'grandchild', 'child2']);
        expect(result.map((r) => r.depth)).toEqual([0, 1, 2, 1]);
    });

    it('skips descendants of a collapsed node entirely', () => {
        const nodes: Row[] = [
            { id: 'root', parentId: null, order: 0 },
            { id: 'child1', parentId: 'root', order: 0 },
            { id: 'grandchild', parentId: 'child1', order: 0 },
            { id: 'sibling', parentId: 'root', order: 1 },
        ];
        const result = flattenVisibleTree(nodes, new Set(['child1']));
        expect(result.map((r) => r.id)).toEqual(['root', 'child1', 'sibling']);
    });

    it('marks hasChildren correctly', () => {
        const nodes: Row[] = [
            { id: 'root', parentId: null, order: 0 },
            { id: 'leaf', parentId: 'root', order: 0 },
        ];
        const result = flattenVisibleTree(nodes, new Set());
        expect(result.find((r) => r.id === 'root')?.hasChildren).toBe(true);
        expect(result.find((r) => r.id === 'leaf')?.hasChildren).toBe(false);
    });

    it('handles multiple root-level siblings in order', () => {
        const nodes: Row[] = [
            { id: 'b', parentId: null, order: 1 },
            { id: 'a', parentId: null, order: 0 },
        ];
        const result = flattenVisibleTree(nodes, new Set());
        expect(result.map((r) => r.id)).toEqual(['a', 'b']);
    });

    it('returns an empty array for an empty tree', () => {
        expect(flattenVisibleTree([], new Set())).toEqual([]);
    });
});
