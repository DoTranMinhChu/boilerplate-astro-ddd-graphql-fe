// src/modules/cms/node/NodeRenderer.test.tsx
// @vitest-environment jsdom
//
// New test file (none existed for NodeRenderer.tsx before this task). Same jsdom `matchMedia`
// gap already hit + fixed by nodeRegistry.test.ts/FrameNode.test.tsx/ProjectShowcaseNode.test.tsx
// et al.: NodeRenderer.tsx statically imports `./nodeRegistry`, which statically imports EVERY
// primitive component including FrameNode.tsx, which transitively imports `../useNodeAnimation`
// -> `./applyAnimationTimeline`, which calls `gsap.registerPlugin(ScrollTrigger)` at
// MODULE-EVALUATION time — that registration reads `matchMedia`, which jsdom's `window` doesn't
// implement. Fixed the same way: stub `window.matchMedia` first, then reach `NodeChildrenList`
// via a dynamic `import()` inside `beforeAll` — static imports are hoisted above any top-level
// stub placed after them, so a plain top-level assignment wouldn't run early enough.
//
// Task 1 (carousel Frame foundation, 2026-08-23): `repeatNodes` (the internal computed driving
// NodeChildrenList's `createResource` pre-fetch) is not directly exported/testable in isolation
// without a larger refactor, so — per the task brief's own fallback — this asserts the OBSERVABLE
// behavior instead: mock `fetchRepeatEntries` (nodeDataBinding.ts) and render `NodeChildrenList`
// (the exported component that owns this pre-fetch) with two Frame children, one carousel-behavior
// and one plain, both carrying a `repeat`. Same mocking convention as ProjectShowcaseNode.test.tsx.
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

vi.mock('./nodeDataBinding', () => ({ fetchRepeatEntries: vi.fn() }));

let NodeChildrenList: typeof import('./NodeRenderer')['NodeChildrenList'];

beforeAll(async () => {
    ({ NodeChildrenList } = await import('./NodeRenderer'));
}, 60000);

const baseContext = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;

describe('NodeChildrenList — repeat pre-fetch excludes carousel-behavior Frames (Task 1 foundation)', () => {
    it('does not pre-fetch repeat entries for a carousel-behavior Frame (it self-resolves via its own createResource), but still pre-fetches for a plain Frame in the same tree', async () => {
        const nodeDataBinding = await import('./nodeDataBinding');
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockClear();
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockResolvedValue([{ id: 'e1', contentTypeId: 'ct-1', data: { title: 'A' } }]);

        const carouselNode = {
            id: 'carousel-1',
            type: 'frame',
            props: { behavior: { type: 'carousel' } },
            repeat: { source: 'own', contentTypeKey: 'ct-1' },
            children: [],
        } as any;
        const plainNode = {
            id: 'plain-1',
            type: 'frame',
            repeat: { source: 'own', contentTypeKey: 'ct-2' },
            children: [],
        } as any;

        render(() => <NodeChildrenList children={[carouselNode, plainNode]} context={baseContext} parentLayoutMode="flow" />);

        await waitFor(() => expect(nodeDataBinding.fetchRepeatEntries).toHaveBeenCalledWith(plainNode.repeat, expect.objectContaining({ locale: 'vi' })));
        // Called exactly once total — confirms it was never ALSO called for the carousel node's
        // own repeat (not just that the plain node's call eventually happened).
        expect(nodeDataBinding.fetchRepeatEntries).toHaveBeenCalledTimes(1);
    });
});
