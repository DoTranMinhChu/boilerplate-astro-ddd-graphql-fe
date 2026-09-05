// test/modules/cms/node/buildNodeTreeMemo.test.ts
//
// Task 13 (Group 3, item 3.11) — proves `buildNodeTreeMemo` fixes the canvas
// remount-on-every-keystroke defect WITHOUT going silently stale.
//
// A plain `createMemo(() => buildNodeTree(nodes))` would be WRONG here: Solid's store
// (`setProperty`/`updatePath`, `node_modules/solid-js/store/dist/store.js`) mutates nested
// containers (`props`/`style`/`layout`) IN PLACE — `nodes[idx].props` is the SAME object
// reference before and after a deep write. A reference-equality memo could never detect such
// an edit and would report "unchanged" forever. `buildNodeTreeMemo` instead deep-compares each
// node's own fields via `JSON.stringify` (excluding `children`) and reuses the previous wrapper
// identity only when both the own-fields JSON AND the resolved children reference-list are
// unchanged.
//
// LƯU Ý (cùng lý do detachFromStore.test.ts đã ghi): test này chỉ có ý nghĩa khi `solid-js/store`
// resolve sang build BROWSER (có Proxy thật) — xem `resolve.alias` trong vitest.config.ts.
import { describe, it, expect } from 'vitest';
import { createRoot } from 'solid-js';
import { createStore, produce, unwrap } from 'solid-js/store';
import { buildNodeTreeMemo } from '@modules/cms/node/buildNodeTree';
import type { NodeDTO, NodeTree } from '@modules/cms/node/node.types';

function n(id: string, parentId: string | undefined, order: number, props: Record<string, any> = {}): NodeDTO {
    return {
        id, pageId: 'p1', parentId, order, type: 'frame', layoutMode: 'flow',
        style: {}, layout: {}, props, dataBinding: { mode: 'static' }, responsiveOverrides: {},
        createdAt: '', updatedAt: '', deletedAt: undefined, animationRef: undefined,
        componentDefinitionId: undefined, componentSourceNodeId: undefined,
    };
}

describe('buildNodeTreeMemo', () => {
    it('edited node + ancestors get new identities with the new value; untouched sibling subtrees keep identical references', () => {
        createRoot((dispose) => {
            // Two root subtrees:
            //   a (root)          b (root)
            //   ├─ a1 (edited)    └─ b1 (untouched)
            //   └─ a2 (untouched sibling)
            const initial: NodeDTO[] = [
                n('a', undefined, 0),
                n('a1', 'a', 0, { text: 'orig' }),
                n('a2', 'a', 1, { text: 'a2-untouched' }),
                n('b', undefined, 1),
                n('b1', 'b', 0, { text: 'b1-untouched' }),
            ];
            const [nodes, setNodes] = createStore<NodeDTO[]>(initial);
            expect(
                unwrap(nodes) !== nodes,
                'solid-js/store đang resolve về build SERVER (không có proxy) — test vô nghĩa. Kiểm tra resolve.alias trong vitest.config.ts',
            ).toBe(true);

            const cache = new Map<string, NodeTree>();

            // --- First build ---
            const call1 = buildNodeTreeMemo(nodes, cache);
            expect(call1.map((r) => r.id)).toEqual(['a', 'b']);

            const aTree1 = call1[0];
            const a1Tree1 = aTree1.children[0];
            const a2Tree1 = aTree1.children[1];
            const bTree1 = call1[1];
            const b1Tree1 = bTree1.children[0];
            expect(a1Tree1.id).toBe('a1');
            expect(a2Tree1.id).toBe('a2');
            expect(b1Tree1.id).toBe('b1');

            // --- Real leaf mutation, same mechanism NodeBuilder.page.tsx's `patchSelected`
            // actually uses (`setNodes(produce((list) => patch(list[idx])))`) for every
            // Inspector keystroke: mutate a nested container field (`props.text`) in place. ---
            setNodes(produce((list) => {
                const target = list.find((x) => x.id === 'a1')!;
                target.props!.text = 'changed';
            }));

            // --- Second build, same cache instance (as NodeBuilder.page.tsx's component-scoped
            // `nodeTreeCache` would be reused across re-renders). ---
            const call2 = buildNodeTreeMemo(nodes, cache);
            const aTree2 = call2[0];
            const a1Tree2 = aTree2.children[0];
            const a2Tree2 = aTree2.children[1];
            const bTree2 = call2[1];
            const b1Tree2 = bTree2.children[0];

            // (1) The edited node AND its ancestor got NEW identities and reflect the new value.
            expect(a1Tree2).not.toBe(a1Tree1);
            expect(a1Tree2.props?.text).toBe('changed');
            expect(aTree2).not.toBe(aTree1); // ancestor: its `children` reference-list changed.

            // (2) Every untouched sibling subtree kept the EXACT SAME object reference.
            expect(a2Tree2).toBe(a2Tree1);
            expect(bTree2).toBe(bTree1);
            expect(b1Tree2).toBe(b1Tree1);

            dispose();
        });
    });

    it('prunes cache entries for ids no longer present in a later call', () => {
        createRoot((dispose) => {
            const initial: NodeDTO[] = [n('root', undefined, 0), n('child', 'root', 0)];
            const [nodes, setNodes] = createStore<NodeDTO[]>(initial);
            const cache = new Map<string, NodeTree>();

            buildNodeTreeMemo(nodes, cache);
            expect(cache.has('root')).toBe(true);
            expect(cache.has('child')).toBe(true);

            setNodes(produce((list) => {
                list.splice(list.findIndex((x) => x.id === 'child'), 1);
            }));
            buildNodeTreeMemo(nodes, cache);

            expect(cache.has('child')).toBe(false);
            expect(cache.has('root')).toBe(true);

            dispose();
        });
    });
});
