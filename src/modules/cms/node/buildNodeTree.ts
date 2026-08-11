// src/modules/cms/node/buildNodeTree.ts
import type { NodeDTO, NodeTree } from './node.types';
import { MAX_TREE_DEPTH } from './node.constants';

/** Flat NodeDTO[] (as returned by getNodesByPage) → nested NodeTree[] ordered by
 * `order` at every level. Pure — no I/O, no depth-limited recursion beyond a safety
 * cap so corrupt/self-referencing data (should never happen given the BE's
 * assertNoCycle/assertDepthAllowed guards) can't hang the renderer.
 *
 * `id`/`parentId`/`order` are typed `T | undefined` (not `null`) by the generated
 * GraphQL fragment output — same as MenuItemDTO in menuTree.ts — so this mirrors that
 * file's `??`/`||` convention rather than the `null`-based one sketched in the task brief. */
export function buildNodeTree(flat: NodeDTO[]): NodeTree[] {
    const byId = new Map<string, NodeDTO>(flat.map((node) => [node.id ?? '', node]));
    const childrenOf = new Map<string, NodeDTO[]>();
    for (const node of flat) {
        const key = node.parentId ?? '__root__';
        if (!childrenOf.has(key)) childrenOf.set(key, []);
        childrenOf.get(key)!.push(node);
    }
    for (const list of childrenOf.values()) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    function attach(node: NodeDTO, depth: number): NodeTree {
        const kids = depth >= MAX_TREE_DEPTH ? [] : (childrenOf.get(node.id ?? '') ?? []);
        return { ...node, children: kids.map((k) => attach(k, depth + 1)) };
    }

    const roots = childrenOf.get('__root__') ?? [];
    // Loại bỏ node có parentId trỏ tới 1 id không tồn tại trong `flat` (dữ liệu hỏng) —
    // chỉ giữ node có parentId thật sự null/undefined (root hợp lệ).
    const validRoots = roots.filter((n) => n.parentId == null || !byId.has(n.parentId));
    return validRoots.filter((n) => n.parentId == null).map((n) => attach(n, 0));
}
