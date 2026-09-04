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
    return roots.filter((n) => n.parentId == null).map((n) => attach(n, 0));
}

// Companion to `cache` (buildNodeTreeMemo's param, below): the own-fields JSON snapshot captured
// at the exact moment each NodeTree wrapper was cached. NOT re-derivable from the cached NodeTree
// itself at comparison time — `{ ...node, children }`'s spread copies REFERENCES to `props`/
// `style`/`layout`, the very same live objects the store mutates in place, so re-`JSON.stringify`-
// ing the cached wrapper later would read its CURRENT (already-mutated) value instead of the
// value it had when cached, making every comparison spuriously "unchanged" — the identical
// aliasing trap this whole function exists to avoid, one level removed. A `WeakMap` keyed by the
// wrapper object needs no separate pruning: an entry becomes collectible the moment its NodeTree
// is evicted from `cache` and unreferenced elsewhere.
const ownFieldsSnapshot = new WeakMap<NodeTree, string>();

/** Task 13 (Group 3, item 3.11) — ADDITIVE. `buildNodeTree` above stays untouched (17 other
 * consumers, including the public-site `NodeRenderer.tsx` pipeline, which has no remount problem
 * since public pages never live-edit). This is a memoized alternative for exactly ONE caller:
 * `NodeBuilder.page.tsx`'s admin canvas, whose `nodes` is a Solid store mutated on every
 * Inspector keystroke.
 *
 * Why a naive `createMemo(() => buildNodeTree(nodes))` is WRONG (verified against
 * `node_modules/solid-js/store/dist/store.js`'s actual `setProperty`/`updatePath`): a deep write
 * like `setNodes(idx, 'props', 'text', 'new')` walks `updatePath` down to the leaf container
 * (`nodes[idx].props`) via plain property reads (`current[part]`, never cloning), and the actual
 * write is `setProperty(state, property, value)` → `state[property] = value` — a MUTATION of the
 * existing `props` object. `nodes[idx]` and `nodes[idx].props` are the exact same references
 * before and after the write. `buildNodeTree`'s `attach()` does `{ ...node, children }` — reading
 * every own-enumerable field on every call — so a reference-based memo (comparing `node.props`,
 * `node.style`, etc. by `===`) would see IDENTICAL references and report "unchanged", silently
 * never picking up the new value. Deep-value comparison (below) is required instead.
 *
 * `cache` must be created ONCE per `NodeBuilder.page.tsx` component instance (a `new Map()` in
 * the component body, NOT module-level) — a module-level cache would leak stale entries between
 * component instances (e.g. across tests, or if the Node Builder is ever mounted twice). Entries
 * for ids no longer present in `flat` are pruned every call so the cache can't grow unbounded
 * across a long editing session (nodes deleted, pages switched). */
export function buildNodeTreeMemo(flat: NodeDTO[], cache: Map<string, NodeTree>): NodeTree[] {
    const childrenOf = new Map<string, NodeDTO[]>();
    for (const node of flat) {
        const key = node.parentId ?? '__root__';
        if (!childrenOf.has(key)) childrenOf.set(key, []);
        childrenOf.get(key)!.push(node);
    }
    for (const list of childrenOf.values()) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const seen = new Set<string>();

    function attach(node: NodeDTO, depth: number): NodeTree {
        const id = node.id ?? '';
        seen.add(id);
        const kids = depth >= MAX_TREE_DEPTH ? [] : (childrenOf.get(id) ?? []);
        const children = kids.map((k) => attach(k, depth + 1));

        const prev = cache.get(id);
        // Reference-list comparison for the resolved children (each child identity was already
        // decided by this same recursive call, one level down) — cheap, and correct: a reorder
        // (same child ids, different positions) still produces a different array here even
        // though every individual child reference is unchanged, which is exactly what should
        // invalidate THIS node's own wrapper.
        const sameChildren =
            prev !== undefined &&
            children.length === prev.children.length &&
            children.every((c, i) => c === prev.children[i]);

        // Deep-value comparison of the node's OWN fields (`children` isn't part of NodeDTO in the
        // first place, so `JSON.stringify(node)` naturally excludes it) against the SNAPSHOT
        // string captured when `prev` was cached — see `ownFieldsSnapshot`'s doc comment above for
        // why this must be a frozen string, not something re-derived from `prev` itself. Required
        // because store writes mutate `props`/`style`/`layout` IN PLACE (see function doc comment
        // above), so `===` on those container fields can never detect a real edit. `JSON.stringify`
        // walks through the store's Proxy the same way `{ ...node }` already does elsewhere in this
        // file — own-enumerable reads, recursing into nested plain objects/arrays.
        const ownJson = JSON.stringify(node);
        const prevOwnJson = prev !== undefined ? ownFieldsSnapshot.get(prev) : undefined;
        const sameOwn = prevOwnJson !== undefined && ownJson === prevOwnJson;

        if (prev !== undefined && sameChildren && sameOwn) return prev;

        const next: NodeTree = { ...node, children };
        cache.set(id, next);
        ownFieldsSnapshot.set(next, ownJson);
        return next;
    }

    const roots = childrenOf.get('__root__') ?? [];
    const result = roots.filter((n) => n.parentId == null).map((n) => attach(n, 0));

    for (const id of cache.keys()) {
        if (!seen.has(id)) cache.delete(id);
    }

    return result;
}
