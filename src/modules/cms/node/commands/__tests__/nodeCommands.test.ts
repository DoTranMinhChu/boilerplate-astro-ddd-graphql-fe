import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore } from 'solid-js/store';
import { createRoot } from 'solid-js';
import {
    createAddNodeCommand,
    createDeleteNodesCommand,
    createUpdateNodePropertyCommand,
    createMoveNodeCommand,
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
