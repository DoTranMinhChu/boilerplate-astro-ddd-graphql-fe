import { describe, it, expect } from 'vitest';
import { computeMoveReorder } from '../computeReorder';

type Row = { id: string; parentId: string | null; order: number };

describe('computeMoveReorder', () => {
    it('reordering within the same parent: moving the first item to the last position renumbers all siblings 0..N-1', () => {
        const all: Row[] = [
            { id: 'a', parentId: 'p', order: 0 },
            { id: 'b', parentId: 'p', order: 1 },
            { id: 'c', parentId: 'p', order: 2 },
        ];
        // Move 'a' to after 'c' (i.e. to the end).
        const result = computeMoveReorder(all, 'a', 'p', 2);

        // The moved node itself:
        expect(result.movedNode).toEqual({ id: 'a', parentId: 'p', order: 2 });
        // Every other affected sibling, renumbered to consecutive integers,
        // preserving their relative order (b, c shift down to fill the gap 'a' left):
        expect(result.siblingUpdates).toEqual([
            { id: 'b', order: 0 },
            { id: 'c', order: 1 },
        ]);
    });

    it('reparenting: moving a node to a new parent renumbers ONLY the siblings whose order actually changes, in BOTH the old and new parent groups', () => {
        const all: Row[] = [
            { id: 'a', parentId: 'p1', order: 0 },
            { id: 'b', parentId: 'p1', order: 1 },
            { id: 'x', parentId: 'p2', order: 0 },
            { id: 'y', parentId: 'p2', order: 1 },
        ];
        // Move 'a' out of p1 into p2, inserted at index 1 (between x and y).
        const result = computeMoveReorder(all, 'a', 'p2', 1);

        expect(result.movedNode).toEqual({ id: 'a', parentId: 'p2', order: 1 });
        // 'x' stays at order 0 -> 0 (unchanged by the insertion, since it sits BEFORE the
        // insertion index) — it must NOT appear in siblingUpdates (no point re-writing an
        // unchanged value). Only siblings whose order value actually moves are included:
        expect(result.siblingUpdates).toEqual(
            expect.arrayContaining([
                { id: 'b', order: 0 },  // old parent's remaining sibling, renumbered to fill the gap
                { id: 'y', order: 2 },  // new parent's sibling after the insertion point, shifted down
            ]),
        );
        expect(result.siblingUpdates).toHaveLength(2);
    });

    it('inserting as the first child of a currently-empty parent', () => {
        const all: Row[] = [
            { id: 'a', parentId: 'p1', order: 0 },
        ];
        const result = computeMoveReorder(all, 'a', 'p2', 0);
        expect(result.movedNode).toEqual({ id: 'a', parentId: 'p2', order: 0 });
        expect(result.siblingUpdates).toEqual([]);
    });

    it('moving a node to the SAME position it already occupies produces no sibling updates', () => {
        const all: Row[] = [
            { id: 'a', parentId: 'p', order: 0 },
            { id: 'b', parentId: 'p', order: 1 },
        ];
        const result = computeMoveReorder(all, 'a', 'p', 0);
        expect(result.movedNode).toEqual({ id: 'a', parentId: 'p', order: 0 });
        expect(result.siblingUpdates).toEqual([]);
    });

    it('root-level nodes (parentId null) are handled the same as any other parent group', () => {
        const all: Row[] = [
            { id: 'a', parentId: null, order: 0 },
            { id: 'b', parentId: null, order: 1 },
            { id: 'c', parentId: null, order: 2 },
        ];
        const result = computeMoveReorder(all, 'c', null, 0);
        expect(result.movedNode).toEqual({ id: 'c', parentId: null, order: 0 });
        expect(result.siblingUpdates).toEqual([
            { id: 'a', order: 1 },
            { id: 'b', order: 2 },
        ]);
    });
});
