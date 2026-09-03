import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore } from 'solid-js/store';
import { createRoot } from 'solid-js';
import { computeResyncedSelectionIds, hasRootIdsAfterLastOp } from '@modules/cms/node/commands/resyncSelectionAfterHistoryOp';
import { createDeleteNodesCommand, createAddNodeCommand } from '@modules/cms/node/commands/nodeCommands';
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

type TestNode = { id: string; pageId: string; parentId: string | undefined; type: string; order: number; [k: string]: any };

function makeStore(initial: TestNode[]) {
    return createRoot(() => createStore<TestNode[]>(initial));
}

beforeEach(() => vi.clearAllMocks());

describe('hasRootIdsAfterLastOp', () => {
    it('is false for a plain Command (Add/Move/MoveNodes/UpdateProperty — no escape hatch)', () => {
        const plainCommand = { label: 'x', execute: async () => {}, undo: async () => {} };
        expect(hasRootIdsAfterLastOp(plainCommand)).toBe(false);
    });

    it('is true for createDeleteNodesCommand\'s returned Command', () => {
        const [nodes, setNodes] = makeStore([]);
        const cmd = createDeleteNodesCommand(['a'], () => nodes, setNodes);
        expect(hasRootIdsAfterLastOp(cmd)).toBe(true);
    });
});

describe('computeResyncedSelectionIds', () => {
    it('generic diff: selects every id newly present after the op (redo-of-add, or delete-undo with no override)', () => {
        const result = computeResyncedSelectionIds(new Set(['a']), ['a', 'b'], new Set(['a']));
        expect(result).toEqual(new Set(['b']));
    });

    it('generic diff: drops previously-selected ids that vanished when nothing new appeared (undo-of-add)', () => {
        const result = computeResyncedSelectionIds(new Set(['a', 'b']), ['a'], new Set(['b']));
        expect(result).toEqual(new Set());
    });

    it('generic diff: keeps previously-selected ids that are still present when nothing new appeared', () => {
        const result = computeResyncedSelectionIds(new Set(['a', 'b']), ['a', 'b'], new Set(['a']));
        expect(result).toEqual(new Set(['a']));
    });

    it('override wins outright, even when other ids are also newly present (delete-undo: selects only the root, not the recreated descendants)', () => {
        const result = computeResyncedSelectionIds(
            new Set([]),
            ['recreated-root', 'recreated-child-1', 'recreated-child-2'],
            new Set([]),
            ['recreated-root'],
        );
        expect(result).toEqual(new Set(['recreated-root']));
    });

    it('override filters out ids that no longer exist post-op (redo-of-delete: the previous root id is gone again)', () => {
        const result = computeResyncedSelectionIds(new Set(['recreated-root']), [], new Set(['recreated-root']), ['recreated-root']);
        expect(result).toEqual(new Set());
    });
});

describe('reviewer repro — root + 2 children: select root, delete (cascades to 3), undo -> select ONLY the recreated root', () => {
    it('createDeleteNodesCommand.undo() + computeResyncedSelectionIds together select exactly the recreated root, not its 2 recreated children', async () => {
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

        // Select the root (only) and delete it — cascades to all 3 nodes.
        const selectedBeforeDelete = new Set(['root']);
        const cmd = createDeleteNodesCommand(['root'], () => nodes, setNodes);
        await cmd.execute();

        expect(nodes).toHaveLength(0); // all 3 nodes removed from the store, as today

        // Undo the delete — recreates root + 2 children under brand-new ids.
        const beforeUndoIds = new Set(nodes.map((n) => n.id).filter((id): id is string => !!id)); // empty
        await cmd.undo();
        expect(nodes).toHaveLength(3); // root + 2 children recreated

        const afterUndoIds = nodes.map((n) => n.id).filter((id): id is string => !!id);
        expect(afterUndoIds).toHaveLength(3);

        // The escape hatch must expose ONLY the recreated root's new id, not the 2 recreated
        // children — this is the crux of the review finding.
        expect(hasRootIdsAfterLastOp(cmd)).toBe(true);
        const overrideIds = hasRootIdsAfterLastOp(cmd) ? cmd.getRootIdsAfterLastOp() : undefined;
        expect(overrideIds).toHaveLength(1);

        const recreatedRoot = nodes.find((n) => n.type === 'frame')!;
        const recreatedChildren = nodes.filter((n) => n.type === 'text');
        expect(overrideIds).toEqual([recreatedRoot.id]);

        // Full resync (as NodeBuilder.page.tsx's resyncSelectionAfterHistoryOp does) must
        // select EXACTLY the recreated root's new id — not the 2 recreated children's ids too.
        const nextSelectedIds = computeResyncedSelectionIds(beforeUndoIds, afterUndoIds, selectedBeforeDelete, overrideIds);
        expect(nextSelectedIds).toEqual(new Set([recreatedRoot.id]));
        recreatedChildren.forEach((child) => expect(nextSelectedIds.has(child.id!)).toBe(false));
    });

    it('control case: createAddNodeCommand has no escape hatch, so the generic diff (which already selects exactly the 1 created id) is used', () => {
        const [nodes, setNodes] = makeStore([]);
        const cmd = createAddNodeCommand({ pageId: 'p', parentId: undefined, type: 'frame', order: 0 }, () => nodes, setNodes);
        expect(hasRootIdsAfterLastOp(cmd)).toBe(false);
    });
});
