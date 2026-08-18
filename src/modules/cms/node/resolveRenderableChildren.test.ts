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
});
