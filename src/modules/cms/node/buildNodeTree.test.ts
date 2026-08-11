// src/modules/cms/node/buildNodeTree.test.ts
import { describe, it, expect } from 'vitest';
import { buildNodeTree } from './buildNodeTree';
import type { NodeDTO } from './node.types';

function n(id: string, parentId: string | undefined, order: number): NodeDTO {
    return { id, pageId: 'p1', parentId, order, type: 'frame', layoutMode: 'flow', style: {}, layout: {}, props: {}, dataBinding: { mode: 'static' }, responsiveOverrides: {}, createdAt: '', updatedAt: '', deletedAt: undefined, animationRef: undefined };
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
});
