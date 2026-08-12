// src/modules/cms/node/resolveRenderableChildren.test.ts
import { describe, it, expect } from 'vitest';
import { resolveRenderableChildren } from './resolveRenderableChildren';
import type { NodeTree, NodeRenderContext } from './node.types';

// `parentId`/other non-JSON NodeDTO fields are `T | undefined` at the codegen level (never
// `| null`), and the key itself is REQUIRED (not `?:`) even though its value may be
// `undefined` — see applyNodeLayout.test.ts's `node()` helper for the same convention;
// `undefined` here (not the brief's literal `null`) and explicit `deletedAt`/`animationRef`
// keys so this satisfies NodeTree's real type.
function leaf(id: string, overrides: Partial<NodeTree> = {}): NodeTree {
    return { id, pageId: 'p1', parentId: undefined, order: 0, type: 'text', layoutMode: 'flow', style: {}, layout: {}, props: {}, dataBinding: { mode: 'static' }, responsiveOverrides: {}, createdAt: '', updatedAt: '', deletedAt: undefined, animationRef: undefined, children: [], ...overrides };
}

const ctx: NodeRenderContext = { isCustomerLoggedIn: false, device: 'desktop', queryParams: {}, pathParams: {}, now: new Date() };

describe('resolveRenderableChildren', () => {
    it('passes through children with no visibilityRules and no repeat unchanged', () => {
        const kids = [leaf('a'), leaf('b')];
        const result = resolveRenderableChildren(kids, ctx);
        expect(result.map((r) => r.node.id)).toEqual(['a', 'b']);
    });

    it('filters out children whose visibilityRules evaluate to false', () => {
        const kids = [leaf('a'), leaf('b', { visibilityRules: { logic: 'AND', conditions: [{ type: 'authState', value: 'loggedIn' }] } })];
        const result = resolveRenderableChildren(kids, ctx); // ctx.isCustomerLoggedIn = false
        expect(result.map((r) => r.node.id)).toEqual(['a']);
    });

    it('a node with `repeat` produces one entry per repeatEntries item, each with its own FLAT contextEntry + contextEntryId (Final-review fix Critical #1)', () => {
        // `entries` here mirror real `ContentEntryDTO` shape (fetchRepeatEntries' actual return
        // type) — `{id, data: {...fields}}`, NOT the flat `{id, title}` this test used before the
        // fix. `resolveRenderableChildren` must unwrap `.data` into `contextEntry` (flat, matching
        // CmsPageShell.astro/resolveBoundValue/evaluateVisibilityRules) and put `.id` into the
        // separate `contextEntryId` field (matching fetchRepeatEntries' 'related'/'backlink' needs).
        const repeatNode = leaf('card', { repeat: { contentTypeKey: 'product' } });
        const entries = [{ id: 'p1', data: { title: 'A' } }, { id: 'p2', data: { title: 'B' } }];
        const result = resolveRenderableChildren([repeatNode], ctx, new Map([['card', entries]]));
        expect(result).toHaveLength(2);
        expect(result[0].node.id).toBe('card');
        expect(result[0].context.contextEntry).toEqual(entries[0].data);
        expect(result[0].context.contextEntryId).toBe('p1');
        expect(result[1].context.contextEntry).toEqual(entries[1].data);
        expect(result[1].context.contextEntryId).toBe('p2');
    });

    it('a repeat node with no fetched entries yet (map has no entry for it) renders zero copies', () => {
        const repeatNode = leaf('card', { repeat: { contentTypeKey: 'product' } });
        const result = resolveRenderableChildren([repeatNode], ctx, new Map());
        expect(result).toHaveLength(0);
    });
});
