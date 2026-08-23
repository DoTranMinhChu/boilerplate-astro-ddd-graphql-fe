import { describe, it, expect } from 'vitest';
import { resolveRenderableChildren } from './resolveRenderableChildren';
import { ENodeType } from './node.constants';
import type { NodeTree, NodeRenderContext } from './node.types';

function makeContext(): NodeRenderContext {
    return { isCustomerLoggedIn: false, device: () => 'desktop', queryParams: {}, pathParams: {}, now: new Date() };
}

function makeNode(overrides: Partial<NodeTree>): NodeTree {
    return { id: 'n1', type: ENodeType.FRAME, order: 0, layoutMode: 'flow', children: [], ...overrides } as NodeTree;
}

describe('resolveRenderableChildren — repeat expansion (node-level data binding)', () => {
    it('a FRAME with .repeat is cloned once per entry (existing sibling-cloning behavior)', () => {
        const child = makeNode({ id: 'frame-1', type: ENodeType.FRAME, repeat: { source: 'own' } as any });
        const entriesByNodeId = new Map([['frame-1', [{ id: 'e1', data: { title: 'A' } }, { id: 'e2', data: { title: 'B' } }]]]);
        const result = resolveRenderableChildren([child], makeContext(), entriesByNodeId);
        expect(result).toHaveLength(2);
        expect(result[0].context.contextEntry).toEqual({ title: 'A' });
        expect(result[1].context.contextEntry).toEqual({ title: 'B' });
    });

    it('a TABLE with .repeat is NOT cloned — renders exactly once, unchanged context', () => {
        const child = makeNode({ id: 'table-1', type: ENodeType.TABLE, repeat: { source: 'own' } as any });
        const entriesByNodeId = new Map([['table-1', [{ id: 'e1', data: { title: 'A' } }, { id: 'e2', data: { title: 'B' } }]]]);
        const parentContext = makeContext();
        const result = resolveRenderableChildren([child], parentContext, entriesByNodeId);
        expect(result).toHaveLength(1);
        expect(result[0].node).toBe(child);
        expect(result[0].context).toBe(parentContext);
    });

    it('a CARD_LIST with .repeat is NOT cloned either (2 matching entries, still exactly 1 render)', () => {
        const child = makeNode({ id: 'cards-1', type: ENodeType.CARD_LIST, repeat: { source: 'own' } as any });
        const result = resolveRenderableChildren([child], makeContext(), new Map([['cards-1', [{ id: 'e1', data: {} }, { id: 'e2', data: {} }]]]));
        expect(result).toHaveLength(1);
        expect(result[0].node).toBe(child);
    });

    it('each repeat clone carries its OWN entry contentTypeId as contextEntryContentTypeId, not some other clone\'s (or the page-level) value', () => {
        const child = makeNode({ id: 'frame-1', type: ENodeType.FRAME, repeat: { source: 'own' } as any });
        const entriesByNodeId = new Map([['frame-1', [
            { id: 'e1', data: { title: 'A' }, contentTypeId: 'ct-blog' },
            { id: 'e2', data: { title: 'B' }, contentTypeId: 'ct-event' },
        ]]]);
        const result = resolveRenderableChildren([child], makeContext(), entriesByNodeId);
        expect(result).toHaveLength(2);
        expect(result[0].context.contextEntryContentTypeId).toBe('ct-blog');
        expect(result[1].context.contextEntryContentTypeId).toBe('ct-event');
    });

    it('sets contextEntryIndex to the 0-based position of each repeat clone', () => {
        const child = makeNode({ id: 'frame-1', type: ENodeType.FRAME, repeat: { source: 'local' } as any });
        const entriesByNodeId = new Map([['frame-1', [{ id: 'local-0', data: { a: 1 } }, { id: 'local-1', data: { a: 2 } }]]]);
        const result = resolveRenderableChildren([child], makeContext(), entriesByNodeId);
        expect(result[0].context.contextEntryIndex).toBe(0);
        expect(result[1].context.contextEntryIndex).toBe(1);
    });

    it('does not set contextEntryIndex for a non-repeated child', () => {
        const child = makeNode({ id: 'n2', type: ENodeType.TEXT });
        const result = resolveRenderableChildren([child], makeContext());
        expect(result[0].context.contextEntryIndex).toBeUndefined();
    });

    it('sets contextMixedSources only for source:"mixed" repeats, from the repeat\'s own sources array', () => {
        const node = { id: 'n1', type: 'frame', repeat: { source: 'mixed', sources: [{ contentTypeId: 'ct-a', fieldMapping: { heading: 'x' } }] } } as any;
        const entries = new Map([['n1', [{ id: 'e1', data: {}, contentTypeId: 'ct-a' }]]]);
        const result = resolveRenderableChildren([node], {} as any, entries);
        expect(result[0].context.contextMixedSources).toEqual([{ contentTypeId: 'ct-a', fieldMapping: { heading: 'x' } }]);
    });

    it('does not set contextMixedSources for a non-mixed repeat', () => {
        const node = { id: 'n2', type: 'frame', repeat: { source: 'local' } } as any;
        const entries = new Map([['n2', [{ id: 'e1', data: {} }]]]);
        const result = resolveRenderableChildren([node], {} as any, entries);
        expect(result[0].context.contextMixedSources).toBeUndefined();
    });

    // Task 1 (carousel Frame foundation, 2026-08-23): a Frame with `props.behavior.type ===
    // 'carousel'` is the upcoming self-resolving carousel primitive (renders exactly ONE entry
    // at a time via its own createResource, cycling on a timer) — it must NOT be expanded here
    // the sibling-cloning way a plain repeat-template FRAME is, same reasoning as
    // SELF_RESOLVING_REPEAT_NODE_TYPES above, just keyed off `props.behavior.type` instead of
    // `node.type` (a carousel is still type 'frame').
    it('does NOT sibling-clone a carousel-behavior Frame\'s repeat (self-resolving, like Table/CardList/MixedFeed)', () => {
        const node = { id: 'n1', type: 'frame', props: { behavior: { type: 'carousel' } }, repeat: { source: 'own', contentTypeKey: 'ct-1' } } as any;
        const entries = new Map([['n1', [{ id: 'e1', data: { title: 'x' } }, { id: 'e2', data: { title: 'y' } }]]]);
        const result = resolveRenderableChildren([node], {} as any, entries);
        expect(result).toHaveLength(1);
        expect(result[0].context.contextEntry).toBeUndefined();
    });

    it('still sibling-clones a PLAIN Frame\'s repeat (regression guard — carousel exclusion must not leak to other Frames)', () => {
        const node = { id: 'n2', type: 'frame', repeat: { source: 'local', localItems: [{ a: 1 }, { a: 2 }] } } as any;
        const entries = new Map([['n2', [{ id: 'local-0', data: { a: 1 } }, { id: 'local-1', data: { a: 2 } }]]]);
        const result = resolveRenderableChildren([node], {} as any, entries);
        expect(result).toHaveLength(2);
    });
});
