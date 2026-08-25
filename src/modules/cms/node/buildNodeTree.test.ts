// src/modules/cms/node/buildNodeTree.test.ts
import { describe, it, expect } from 'vitest';
import { buildNodeTree } from './buildNodeTree';
import type { NodeDTO } from './node.types';
import { MAX_TREE_DEPTH } from './node.constants';

function n(id: string, parentId: string | undefined, order: number): NodeDTO {
    return { id, pageId: 'p1', parentId, order, type: 'frame', layoutMode: 'flow', style: {}, layout: {}, props: {}, dataBinding: { mode: 'static' }, responsiveOverrides: {}, createdAt: '', updatedAt: '', deletedAt: undefined, animationRef: undefined, componentDefinitionId: undefined };
}

describe('buildNodeTree', () => {
    it('nests children under their parent, ordered by `order`', () => {
        const flat = [n('root', undefined, 0), n('b', 'root', 1), n('a', 'root', 0)];
        const tree = buildNodeTree(flat);
        expect(tree).toHaveLength(1);
        expect(tree[0].id).toBe('root');
        expect(tree[0].children.map((c) => c.id)).toEqual(['a', 'b']);
    });

    it('supports multiple root nodes', () => {
        const flat = [n('root1', undefined, 0), n('root2', undefined, 1)];
        const tree = buildNodeTree(flat);
        expect(tree.map((t) => t.id)).toEqual(['root1', 'root2']);
    });

    it('nests 3+ levels deep', () => {
        const flat = [n('a', undefined, 0), n('b', 'a', 0), n('c', 'b', 0)];
        const tree = buildNodeTree(flat);
        expect(tree[0].children[0].children[0].id).toBe('c');
    });

    it('drops nodes past MAX_TREE_DEPTH instead of infinite-looping on corrupt data', () => {
        // Vòng lặp giả (dữ liệu hỏng): a's parent is a — không nên treo tiến trình.
        const flat: NodeDTO[] = [{ ...n('a', 'a', 0) }];
        const tree = buildNodeTree(flat);
        expect(tree).toEqual([]); // self-parented node có parentId không tồn tại ở root level → bị bỏ qua an toàn
    });

    it('truncates a real chain deeper than MAX_TREE_DEPTH, dropping levels beyond the cap', () => {
        // Real (non-cyclic) parent chain: n0 -> n1 -> n2 -> ... -> n35, i.e. 36 levels,
        // well past MAX_TREE_DEPTH (30) — built with a loop rather than hand-written.
        const flat: NodeDTO[] = [n('n0', undefined, 0)];
        for (let i = 1; i <= 35; i++) {
            flat.push(n(`n${i}`, `n${i - 1}`, 0));
        }
        const tree = buildNodeTree(flat);

        let node = tree[0];
        expect(node.id).toBe('n0');
        for (let depth = 0; depth < MAX_TREE_DEPTH; depth++) {
            expect(node.children).toHaveLength(1);
            node = node.children[0];
        }
        // After walking MAX_TREE_DEPTH levels down we land on the node at that depth;
        // its children are truncated even though deeper nodes (n31..n35) exist in the input.
        expect(node.id).toBe(`n${MAX_TREE_DEPTH}`);
        expect(node.children).toEqual([]);
    });
});
