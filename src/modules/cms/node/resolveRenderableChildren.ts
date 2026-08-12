// src/modules/cms/node/resolveRenderableChildren.ts
import type { NodeTree, NodeRenderContext } from './node.types';
import { evaluateVisibilityRules } from './evaluateVisibilityRules';

export interface RenderableChild {
    node: NodeTree;
    context: NodeRenderContext;
    /** Stable React/Solid key — plain node.id for non-repeated children, `${node.id}:${index}`
     * for repeat-expanded copies so `<For>` doesn't collide keys. `node.id` is `string |
     * undefined` at the type level (every NodeDTO field is, per codegen — see
     * applyNodeLayout.test.ts's comment) — `?? ''` here matches buildNodeTree.ts's existing
     * convention for the same field. */
    key: string;
}

/** Áp visibilityRules (ẩn hẳn) rồi expand `repeat` (0..N bản sao, mỗi bản 1 context
 * riêng) — kết quả là danh sách phẳng thực sự cần render, đúng thứ tự. `repeatEntriesByNodeId`
 * map từ nodeId → entries đã fetch sẵn (fetchRepeatEntries chạy async ở NodeRenderer,
 * kết quả nạp vào map này trước khi gọi hàm thuần này). */
export function resolveRenderableChildren(
    children: NodeTree[],
    parentContext: NodeRenderContext,
    repeatEntriesByNodeId: Map<string, Record<string, any>[]> = new Map(),
): RenderableChild[] {
    const result: RenderableChild[] = [];
    for (const node of children) {
        if (!evaluateVisibilityRules(node.visibilityRules, parentContext)) continue;
        if (node.repeat) {
            // `entries` here are raw `ContentEntryDTO[]` (from fetchRepeatEntries →
            // getPublicContentEntries/getRelatedContentEntries/etc., see nodeDataBinding.ts) —
            // `{id, data, contentTypeId, status, locale, ...}`, field VALUES nested under
            // `.data`. Final-review fix Critical #1: standardize `contextEntry` on the FLAT
            // shape (matching CmsPageShell.astro + resolveBoundValue/evaluateVisibilityRules)
            // instead of passing the whole DTO — `entry.data` gives the flat field map, and
            // `entry.id` goes into the separate `contextEntryId` field for the 'related'/
            // 'backlink' fetchRepeatEntries branches that need the entry's OWN id.
            const entries = repeatEntriesByNodeId.get(node.id ?? '') ?? [];
            entries.forEach((entry, i) => {
                result.push({ node, context: { ...parentContext, contextEntry: entry.data, contextEntryId: entry.id }, key: `${node.id ?? ''}:${i}` });
            });
            continue;
        }
        result.push({ node, context: parentContext, key: node.id ?? '' });
    }
    return result;
}
