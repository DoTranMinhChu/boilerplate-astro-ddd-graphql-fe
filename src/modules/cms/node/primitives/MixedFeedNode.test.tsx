// src/modules/cms/node/primitives/MixedFeedNode.test.tsx
// @vitest-environment jsdom
//
// Canvas Editor v2, Task 17: MixedFeedNode migrated off the legacy
// node.props.dataSource (MixedFeedNodeDataSource shape) onto node.repeat (source:'mixed') —
// same mechanism TableNode/CardListNode/FeaturedEntryNode (Task 14)/ProjectShowcaseNode
// (Task 15)/LogoGridNode (Task 16) already use via fetchRepeatEntries. This is the LAST of the
// 4-task migration arc — completes the whole 14-type legacy-node-port effort
// (MIGRATION_ONLY_NODE_TYPES becomes empty after this task).
//
// Same jsdom `matchMedia` gap already hit + fixed by nodeRegistry.test.ts/CustomCodeNode.test.ts/
// ContentDetailNode.test.tsx/FeaturedEntryNode.test.tsx/ProjectShowcaseNode.test.tsx/
// LogoGridNode.test.tsx: MixedFeedNode.tsx statically imports `@/modules/cms/animation/useAnimate`,
// which statically imports `./presetRegistry`, which calls `gsap.registerPlugin(ScrollTrigger)` at
// MODULE-EVALUATION time — that registration reads `matchMedia`, which jsdom's `window` doesn't
// implement. Fixed the same way: stub `window.matchMedia` first, then reach `./MixedFeedNode` via
// a dynamic `import()` inside `beforeAll` — static imports are hoisted above any top-level stub
// placed after them, so a plain top-level assignment wouldn't run early enough.
//
// Asserting on the mocked `fetchRepeatEntries` call (args + timing via `waitFor`), NOT on
// rendered DOM text via `findByText` — same choice ContentDetailNode.test.tsx/
// FeaturedEntryNode.test.tsx/ProjectShowcaseNode.test.tsx/LogoGridNode.test.tsx made (Tasks
// 12/14/15/16): this repo's Vitest+Vite 7+vite-plugin-solid combo gives the test runtime two live
// `solid-js` instances, so post-mount signal updates never reflect in `container.innerHTML` in
// this test env even though the reactive computation itself re-runs correctly. Pre-existing,
// whole-repo test-infra gap, out of this task's scope to fix.
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, waitFor } from '@solidjs/testing-library';

if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

vi.mock('../nodeDataBinding', () => ({ fetchRepeatEntries: vi.fn() }));

let MixedFeedNode: typeof import('./MixedFeedNode')['MixedFeedNode'];

beforeAll(async () => {
    ({ MixedFeedNode } = await import('./MixedFeedNode'));
}, 30000);

describe('MixedFeedNode (Canvas Editor v2, Task 17 — migrated to repeat.sources)', () => {
    it('builds the fetchRepeatEntries({source:"mixed",...}) call from node.repeat, not node.props.dataSource', async () => {
        const nodeDataBinding = await import('../nodeDataBinding');
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockClear();
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockResolvedValue([
            { id: 'e1', contentTypeId: 'ct-1', data: { h: 'Post A' }, __detailHref: '/a' } as any,
        ]);
        const node = {
            id: 'n1',
            repeat: { source: 'mixed', sources: [{ contentTypeId: 'ct-1', limit: 5, fieldMapping: { heading: 'h' } }], limit: 6 },
            props: { content: { heading: 'Tin mới' }, layoutPreset: 'grid-3' },
        } as any;
        const context = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;
        render(() => <MixedFeedNode node={node} context={context} />);

        await waitFor(() => expect(nodeDataBinding.fetchRepeatEntries).toHaveBeenCalledWith(
            { source: 'mixed', sources: node.repeat.sources, limit: 6, linkToDetail: true },
            { locale: 'vi', pathParams: {}, queryParams: {} },
        ));
    });

    it('does NOT read the legacy node.props.dataSource shape', async () => {
        const nodeDataBinding = await import('../nodeDataBinding');
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockClear();
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockResolvedValue([
            { id: 'e1', contentTypeId: 'ct-legacy', data: { h: 'Legacy-should-not-be-read' } } as any,
        ]);
        // A node carrying ONLY the legacy shape (no `repeat`) must resolve to an empty list —
        // `fetchRepeatEntries` is called with `undefined` guarded to `Promise.resolve([])` by the
        // component itself, never falling back to reading `props.dataSource`.
        const node = {
            id: 'n2',
            repeat: undefined,
            props: { dataSource: { sources: [{ contentTypeId: 'ct-legacy', fieldMapping: { heading: 'h' } }], limit: 6 } },
        } as any;
        const context = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;
        const { container } = render(() => <MixedFeedNode node={node} context={context} />);

        await waitFor(() => expect(container.querySelector('a')).toBeFalsy());
        expect(nodeDataBinding.fetchRepeatEntries).not.toHaveBeenCalled();
    });
});
