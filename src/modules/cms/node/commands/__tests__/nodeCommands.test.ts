import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore } from 'solid-js/store';
import { createRoot } from 'solid-js';
import {
    createAddNodeCommand,
    createDeleteNodesCommand,
    createUpdateNodePropertyCommand,
    createMoveNodeCommand,
    createMoveNodesCommand,
} from '../nodeCommands';
import { NodeService } from '@/shared/services/node/node.service';

vi.mock('@/shared/services/node/node.service', () => ({
    NodeService: {
        createNode: vi.fn(),
        deleteNode: vi.fn(),
        updateNode: vi.fn(),
        moveNode: vi.fn(),
        reorderNodes: vi.fn(),
    },
}));

// NOTE: real generated `Node`/`CreateNodeInput`/`MoveNodeInput` field types (node.service.ts
// -> src/shared/generated/typed-graphql.ts) type EVERY field as `T | undefined` — there is no
// `null` anywhere in the real schema-derived types (root-level nodes have `parentId: undefined`,
// not `null`). The brief's guessed test fixtures used `parentId: null`; fixed here to `undefined`
// to match reality (this is exactly the kind of drift Task 4's brief warned about). vitest's
// `toEqual`/`toHaveBeenCalledWith` treat an explicit `undefined`-valued property the same as an
// absent one, so this doesn't weaken any assertion below.
type TestNode = { id: string; pageId: string; parentId: string | undefined; type: string; order: number; [k: string]: any };

function makeStore(initial: TestNode[]) {
    return createRoot(() => createStore<TestNode[]>(initial));
}

beforeEach(() => vi.clearAllMocks());

describe('createAddNodeCommand', () => {
    it('execute() creates the node via NodeService and adds it to the store', async () => {
        const [nodes, setNodes] = makeStore([]);
        (NodeService.createNode as any).mockResolvedValue({ id: 'new-1', pageId: 'page-1', parentId: undefined, type: 'frame', order: 0 });

        const cmd = createAddNodeCommand({ pageId: 'page-1', parentId: undefined, type: 'frame', order: 0 }, () => nodes, setNodes);
        await cmd.execute();

        expect(NodeService.createNode).toHaveBeenCalledWith({ data: { pageId: 'page-1', parentId: undefined, type: 'frame', order: 0 } });
        expect(nodes.some((n) => n.id === 'new-1')).toBe(true);
    });

    it('undo() deletes the created node and removes it from the store', async () => {
        const [nodes, setNodes] = makeStore([]);
        (NodeService.createNode as any).mockResolvedValue({ id: 'new-1', pageId: 'page-1', parentId: undefined, type: 'frame', order: 0 });
        const cmd = createAddNodeCommand({ pageId: 'page-1', parentId: undefined, type: 'frame', order: 0 }, () => nodes, setNodes);
        await cmd.execute();

        await cmd.undo();

        expect(NodeService.deleteNode).toHaveBeenCalledWith({ id: 'new-1' });
        expect(nodes.some((n) => n.id === 'new-1')).toBe(false);
    });
});

describe('createDeleteNodesCommand', () => {
    it('execute() removes the selected nodes (and their descendants) from the store and calls deleteNode once per directly-selected root', async () => {
        const initial: TestNode[] = [
            { id: 'parent', pageId: 'p', parentId: undefined, type: 'frame', order: 0 },
            { id: 'child', pageId: 'p', parentId: 'parent', type: 'text', order: 0 },
            { id: 'other', pageId: 'p', parentId: undefined, type: 'text', order: 1 },
        ];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.deleteNode as any).mockResolvedValue(undefined);

        const cmd = createDeleteNodesCommand(['parent'], () => nodes, setNodes);
        await cmd.execute();

        expect(NodeService.deleteNode).toHaveBeenCalledTimes(1);
        expect(NodeService.deleteNode).toHaveBeenCalledWith({ id: 'parent' });
        expect(nodes.some((n) => n.id === 'parent')).toBe(false);
        expect(nodes.some((n) => n.id === 'child')).toBe(false); // descendant also removed locally
        expect(nodes.some((n) => n.id === 'other')).toBe(true); // untouched sibling stays
    });

    it('execute() dedupes overlapping/duplicate root ids so deleteNode is called only once per real root, not once per raw entry', async () => {
        const initial: TestNode[] = [
            { id: 'parent', pageId: 'p', parentId: undefined, type: 'frame', order: 0 },
            { id: 'child', pageId: 'p', parentId: 'parent', type: 'text', order: 0 },
            { id: 'other', pageId: 'p', parentId: undefined, type: 'text', order: 1 },
        ];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.deleteNode as any).mockResolvedValue(undefined);

        // 'child' is a descendant of 'parent' (already covered by parent's cascade-delete),
        // and 'parent' also appears twice (literal duplicate) — both overlap cases in one array.
        const cmd = createDeleteNodesCommand(['parent', 'child', 'parent', 'other'], () => nodes, setNodes);
        await cmd.execute();

        // Only 2 REAL roots: 'parent' (covers 'child' via cascade) and 'other' — 'child' and the
        // duplicate 'parent' must NOT trigger extra deleteNode calls against an already-deleted node.
        expect(NodeService.deleteNode).toHaveBeenCalledTimes(2);
        expect(NodeService.deleteNode).toHaveBeenCalledWith({ id: 'parent' });
        expect(NodeService.deleteNode).toHaveBeenCalledWith({ id: 'other' });
        expect(nodes).toHaveLength(0);
    });

    it('undo() recreates the deleted nodes (parent before child) via createNode', async () => {
        const initial: TestNode[] = [
            { id: 'parent', pageId: 'p', parentId: undefined, type: 'frame', order: 0 },
            { id: 'child', pageId: 'p', parentId: 'parent', type: 'text', order: 0 },
        ];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.deleteNode as any).mockResolvedValue(undefined);
        let created = 0;
        (NodeService.createNode as any).mockImplementation(async ({ data }: any) => {
            created += 1;
            return { ...data, id: `recreated-${created}` };
        });

        const cmd = createDeleteNodesCommand(['parent'], () => nodes, setNodes);
        await cmd.execute();
        await cmd.undo();

        expect(NodeService.createNode).toHaveBeenCalledTimes(2); // parent + child
        expect(nodes).toHaveLength(2);
        // Parent must be created before child (child's parentId must resolve to the NEW parent id).
        const recreatedParent = nodes.find((n) => n.type === 'frame')!;
        const recreatedChild = nodes.find((n) => n.type === 'text')!;
        expect(recreatedChild.parentId).toBe(recreatedParent.id);
    });

    // Review-finding fix: undo() recreates the ENTIRE deleted snapshot (root + every
    // descendant) under brand-new ids. `getRootIdsAfterLastOp` is the escape hatch that
    // exposes ONLY the original root id(s) (remapped to their new ids) — NOT the recreated
    // descendants — so a caller can select exactly the right node(s) post-undo.
    // See resyncSelectionAfterHistoryOp.test.ts for the full end-to-end selection repro.
    it('getRootIdsAfterLastOp() returns only the recreated ROOT id after undo() — not its recreated descendants', async () => {
        const initial: TestNode[] = [
            { id: 'root', pageId: 'p', parentId: undefined, type: 'frame', order: 0 },
            { id: 'child-1', pageId: 'p', parentId: 'root', type: 'text', order: 0 },
            { id: 'child-2', pageId: 'p', parentId: 'root', type: 'text', order: 1 },
        ];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.deleteNode as any).mockResolvedValue(undefined);
        let created = 0;
        (NodeService.createNode as any).mockImplementation(async ({ data }: any) => {
            created += 1;
            return { ...data, id: `recreated-${created}` };
        });

        const cmd = createDeleteNodesCommand(['root'], () => nodes, setNodes);
        // Before undo() has ever run, it reflects the original construction-time root id.
        expect(cmd.getRootIdsAfterLastOp()).toEqual(['root']);

        await cmd.execute();
        await cmd.undo();

        const recreatedRoot = nodes.find((n) => n.type === 'frame')!;
        expect(cmd.getRootIdsAfterLastOp()).toEqual([recreatedRoot.id]);
        // Exactly 1 id — the 2 recreated children must NOT be included.
        expect(cmd.getRootIdsAfterLastOp()).toHaveLength(1);
    });

    it('getRootIdsAfterLastOp() returns only the ORIGINALLY-SELECTED roots when multiple non-overlapping roots are deleted together', async () => {
        const initial: TestNode[] = [
            { id: 'root-a', pageId: 'p', parentId: undefined, type: 'frame', order: 0 },
            { id: 'child-a', pageId: 'p', parentId: 'root-a', type: 'text', order: 0 },
            { id: 'root-b', pageId: 'p', parentId: undefined, type: 'frame', order: 1 },
        ];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.deleteNode as any).mockResolvedValue(undefined);
        let created = 0;
        (NodeService.createNode as any).mockImplementation(async ({ data }: any) => {
            created += 1;
            return { ...data, id: `recreated-${created}` };
        });

        const cmd = createDeleteNodesCommand(['root-a', 'root-b'], () => nodes, setNodes);
        await cmd.execute();
        await cmd.undo();

        expect(cmd.getRootIdsAfterLastOp()).toHaveLength(2);
        const recreatedFrames = nodes.filter((n) => n.type === 'frame').map((n) => n.id);
        expect(new Set(cmd.getRootIdsAfterLastOp())).toEqual(new Set(recreatedFrames));
        // The recreated child must NOT be among the returned root ids.
        const recreatedChild = nodes.find((n) => n.type === 'text')!;
        expect(cmd.getRootIdsAfterLastOp()).not.toContain(recreatedChild.id);
    });
});

describe('createUpdateNodePropertyCommand', () => {
    it('execute() applies the "after" patch to the store and persists via updateNode', async () => {
        const initial: TestNode[] = [{ id: 'n1', pageId: 'p', parentId: undefined, type: 'text', order: 0, props: { text: 'old' } }];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.updateNode as any).mockResolvedValue(undefined);

        const cmd = createUpdateNodePropertyCommand('n1', { props: { text: 'old' } }, { props: { text: 'new' } }, () => nodes, setNodes);
        await cmd.execute();

        expect(nodes.find((n) => n.id === 'n1')?.props.text).toBe('new');
        expect(NodeService.updateNode).toHaveBeenCalled();
    });

    it('undo() restores the "before" patch', async () => {
        const initial: TestNode[] = [{ id: 'n1', pageId: 'p', parentId: undefined, type: 'text', order: 0, props: { text: 'old' } }];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.updateNode as any).mockResolvedValue(undefined);
        const cmd = createUpdateNodePropertyCommand('n1', { props: { text: 'old' } }, { props: { text: 'new' } }, () => nodes, setNodes);
        await cmd.execute();

        await cmd.undo();

        expect(nodes.find((n) => n.id === 'n1')?.props.text).toBe('old');
    });

    it('execute() reverts the store to its pre-patch state and rethrows when updateNode rejects', async () => {
        const initial: TestNode[] = [{ id: 'n1', pageId: 'p', parentId: undefined, type: 'text', order: 0, props: { text: 'old' } }];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.updateNode as any).mockRejectedValue(new Error('network down'));

        const cmd = createUpdateNodePropertyCommand('n1', { props: { text: 'old' } }, { props: { text: 'new' } }, () => nodes, setNodes);

        await expect(cmd.execute()).rejects.toThrow('network down');
        // Store must be back to the pre-patch state — NOT left showing the optimistic 'new' patch.
        expect(nodes.find((n) => n.id === 'n1')?.props.text).toBe('old');
    });
});

describe('createMoveNodeCommand', () => {
    it('execute() calls moveNode for the moved node and reorderNodes for affected siblings, updates the store', async () => {
        const initial: TestNode[] = [
            { id: 'a', pageId: 'p', parentId: 'root', type: 'frame', order: 0 },
            { id: 'b', pageId: 'p', parentId: 'root', type: 'frame', order: 1 },
        ];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.moveNode as any).mockResolvedValue(undefined);
        (NodeService.reorderNodes as any).mockResolvedValue(undefined);

        // Move 'a' to after 'b'.
        const cmd = createMoveNodeCommand('a', 'root', 1, () => nodes, setNodes);
        await cmd.execute();

        expect(NodeService.moveNode).toHaveBeenCalledWith({ data: { id: 'a', newParentId: 'root', newOrder: 1 } });
        expect(NodeService.reorderNodes).toHaveBeenCalledWith({ items: [{ id: 'b', order: 0 }] });
        expect(nodes.find((n) => n.id === 'a')?.order).toBe(1);
        expect(nodes.find((n) => n.id === 'b')?.order).toBe(0);
    });

    it('undo() restores the original parentId/order for the moved node and every renumbered sibling', async () => {
        const initial: TestNode[] = [
            { id: 'a', pageId: 'p', parentId: 'root', type: 'frame', order: 0 },
            { id: 'b', pageId: 'p', parentId: 'root', type: 'frame', order: 1 },
        ];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.moveNode as any).mockResolvedValue(undefined);
        (NodeService.reorderNodes as any).mockResolvedValue(undefined);
        const cmd = createMoveNodeCommand('a', 'root', 1, () => nodes, setNodes);
        await cmd.execute();

        await cmd.undo();

        expect(nodes.find((n) => n.id === 'a')?.order).toBe(0);
        expect(nodes.find((n) => n.id === 'b')?.order).toBe(1);
    });
});

describe('createMoveNodesCommand (Task 6 Critical-finding fix — multi-select drag batch)', () => {
    // Reviewer's exact traced repro: siblings A(0) B(1) C(2) D(3) under one parent. Select
    // A and C (NON-contiguous — B and D are NOT selected) and drag both to after D.
    // The old `composeCommand`-of-N-independent-`createMoveNodeCommand`s approach undid this
    // wrong (produced A(0) B(1) D(2) C(3) — C/D swapped relative to the true original).
    // `createMoveNodesCommand`'s snapshot-and-restore undo() must reproduce the EXACT
    // original full state, not just "A and C are back roughly where they were".
    it('undo() after a non-contiguous multi-select drag restores the FULL original order exactly (reviewer repro)', async () => {
        const initial: TestNode[] = [
            { id: 'A', pageId: 'p', parentId: 'root', type: 'frame', order: 0 },
            { id: 'B', pageId: 'p', parentId: 'root', type: 'frame', order: 1 },
            { id: 'C', pageId: 'p', parentId: 'root', type: 'frame', order: 2 },
            { id: 'D', pageId: 'p', parentId: 'root', type: 'frame', order: 3 },
        ];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.moveNode as any).mockResolvedValue(undefined);
        (NodeService.reorderNodes as any).mockResolvedValue(undefined);

        // Select A and C, drag both to "after D" (baseIndex 4 == targetIdx(D)=3 + 1, exactly
        // as LayersPanel.tsx's handleDrop computes it for an 'after' zone drop on the last row).
        const cmd = createMoveNodesCommand(['A', 'C'], 'root', 4, () => nodes, setNodes);
        await cmd.execute();

        // Forward result must match the reviewer's traced (and already-correct) forward math:
        // B(0) D(1) A(2) C(3).
        const byId = (id: string) => nodes.find((n) => n.id === id);
        expect(byId('B')?.order).toBe(0);
        expect(byId('D')?.order).toBe(1);
        expect(byId('A')?.order).toBe(2);
        expect(byId('C')?.order).toBe(3);

        await cmd.undo();

        // Full state must be back to the EXACT original — including B and D's relative
        // order, not just "A and C moved back somewhere".
        expect(byId('A')).toMatchObject({ parentId: 'root', order: 0 });
        expect(byId('B')).toMatchObject({ parentId: 'root', order: 1 });
        expect(byId('C')).toMatchObject({ parentId: 'root', order: 2 });
        expect(byId('D')).toMatchObject({ parentId: 'root', order: 3 });
    });

    it('undo() after a non-contiguous cross-parent multi-select drag restores the FULL original state in BOTH parent groups exactly', async () => {
        // Parent 'P': A(0) B(1) C(2) D(3). Parent 'Q': E(0) F(1). Select A and C (out of P,
        // interleaved with untouched B/D) and drag both into Q, appended after F.
        const initial: TestNode[] = [
            { id: 'A', pageId: 'p', parentId: 'P', type: 'frame', order: 0 },
            { id: 'B', pageId: 'p', parentId: 'P', type: 'frame', order: 1 },
            { id: 'C', pageId: 'p', parentId: 'P', type: 'frame', order: 2 },
            { id: 'D', pageId: 'p', parentId: 'P', type: 'frame', order: 3 },
            { id: 'E', pageId: 'p', parentId: 'Q', type: 'frame', order: 0 },
            { id: 'F', pageId: 'p', parentId: 'Q', type: 'frame', order: 1 },
        ];
        const [nodes, setNodes] = makeStore(initial);
        (NodeService.moveNode as any).mockResolvedValue(undefined);
        (NodeService.reorderNodes as any).mockResolvedValue(undefined);

        // baseIndex 2 == Q's sibling count (E,F) before any insertion — "append after F".
        const cmd = createMoveNodesCommand(['A', 'C'], 'Q', 2, () => nodes, setNodes);
        await cmd.execute();

        const byId = (id: string) => nodes.find((n) => n.id === id);
        // Forward: P loses A and C, keeps B/D renumbered 0..1; Q gains A then C appended
        // after E/F.
        expect(byId('B')).toMatchObject({ parentId: 'P', order: 0 });
        expect(byId('D')).toMatchObject({ parentId: 'P', order: 1 });
        expect(byId('E')).toMatchObject({ parentId: 'Q', order: 0 });
        expect(byId('F')).toMatchObject({ parentId: 'Q', order: 1 });
        expect(byId('A')).toMatchObject({ parentId: 'Q', order: 2 });
        expect(byId('C')).toMatchObject({ parentId: 'Q', order: 3 });

        await cmd.undo();

        // Full state in BOTH parent groups must be back to the EXACT original.
        expect(byId('A')).toMatchObject({ parentId: 'P', order: 0 });
        expect(byId('B')).toMatchObject({ parentId: 'P', order: 1 });
        expect(byId('C')).toMatchObject({ parentId: 'P', order: 2 });
        expect(byId('D')).toMatchObject({ parentId: 'P', order: 3 });
        expect(byId('E')).toMatchObject({ parentId: 'Q', order: 0 });
        expect(byId('F')).toMatchObject({ parentId: 'Q', order: 1 });
    });
});
