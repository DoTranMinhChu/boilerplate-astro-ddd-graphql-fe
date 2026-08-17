// src/modules/cms/node/primitives/FeaturedEntryNode.test.tsx
// @vitest-environment jsdom
//
// Canvas Editor v2, Task 14: FeaturedEntryNode migrated off the legacy
// node.props.dataSource/fieldMapping (SectionDataSource shape) onto node.repeat
// (cardinality:'one') + node.props.slots (FeaturedEntrySlotsCfg) — same mechanism
// TableNode/CardListNode already use via fetchRepeatEntries.
//
// Same jsdom `matchMedia` gap already hit + fixed by nodeRegistry.test.ts/CustomCodeNode.test.ts/
// ContentDetailNode.test.tsx/applyAnimationTimeline.test.ts: FeaturedEntryNode.tsx statically
// imports `@/modules/cms/animation/useAnimate`, which statically imports `./presetRegistry`,
// which calls `gsap.registerPlugin(ScrollTrigger)` at MODULE-EVALUATION time — that registration
// reads `matchMedia`, which jsdom's `window` doesn't implement. Fixed the same way: stub
// `window.matchMedia` first, then reach `./FeaturedEntryNode` via a dynamic `import()` inside
// `beforeAll` — static imports are hoisted above any top-level stub placed after them, so a plain
// top-level assignment wouldn't run early enough.
//
// Asserting on the mocked `fetchRepeatEntries` call (args + timing via `waitFor`), NOT on
// rendered DOM text via `findByText` — same choice ContentDetailNode.test.tsx made (Task 12).
// Investigated at length: this repo's Vitest+Vite 7+vite-plugin-solid combo externalizes
// `solid-js`/`solid-js/web` for test files (vite-plugin-solid's own `test.server.deps.external`
// default), which resolves `solid-js/web`'s OWN nested `solid-js` import via a SEPARATE
// resolution path than this test file's — landing on the "development" condition
// (`solid-js/dist/dev.js` + `solid-js/web/dist/dev.js`) instead of the `dist/solid.js` this
// project's `vitest.config.ts` explicitly aliases `solid-js` to, giving the runtime effectively
// TWO live `solid-js` instances at once. Confirmed via reproduction: even a bare `createSignal`
// + `<div>{a()}</div>` rendered via `@solidjs/testing-library`/`solid-js/web`'s own `render()`
// never reflects a post-mount signal update in `container.innerHTML` in this test env, though
// the reactive computation itself DOES re-run (verified via a `createEffect` counter) — i.e. the
// signal graph re-executes correctly, but the DOM-patching half of `solid-js/web`'s `insert()`
// silently no-ops. This is a pre-existing, whole-repo test-infra gap (not introduced by this
// task, not specific to FeaturedEntryNode), out of this task's scope to fix (global
// vitest.config.ts change with a large regression surface across 40+ existing `.test.tsx`
// files) — flagged in the Task 14 report rather than silently worked around.
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
vi.mock('@/shared/services/page/page.service', () => ({ PageService: { getPublicDetailPathByContentType: vi.fn().mockResolvedValue(undefined) } }));

let FeaturedEntryNode: typeof import('./FeaturedEntryNode')['FeaturedEntryNode'];

beforeAll(async () => {
    ({ FeaturedEntryNode } = await import('./FeaturedEntryNode'));
}, 30000);

describe('FeaturedEntryNode (Canvas Editor v2, Task 14 — migrated to repeat)', () => {
    it('calls fetchRepeatEntries with the node.repeat config, not the legacy dataSource', async () => {
        const nodeDataBinding = await import('../nodeDataBinding');
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockClear();
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockResolvedValue([{ id: 'e1', contentTypeId: 'ct-1', data: { heading: 'Hi', image: 'a.png' } }]);
        const node = {
            id: 'n1',
            repeat: { source: 'own', mode: 'dynamic', cardinality: 'one', contentTypeKey: 'ct-1' },
            props: { slots: { headingField: 'heading', imageField: 'image' }, content: { eyebrow: 'News' } },
        } as any;
        const context = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;
        render(() => <FeaturedEntryNode node={node} context={context} />);

        await waitFor(() => expect(nodeDataBinding.fetchRepeatEntries).toHaveBeenCalledWith(node.repeat, { locale: 'vi', pathParams: {}, queryParams: {} }));
    });

    it('does NOT read the legacy node.props.dataSource/fieldMapping shape', async () => {
        const nodeDataBinding = await import('../nodeDataBinding');
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockClear();
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockResolvedValue([{ id: 'e1', contentTypeId: 'ct-1', data: { heading: 'Legacy-should-not-be-read' } }]);
        // A node carrying ONLY the legacy shape (no `repeat`) must resolve to an empty list —
        // `fetchRepeatEntries` is called with `undefined` guarded to `Promise.resolve([])` by the
        // component itself, never falling back to reading `props.dataSource`/`props.fieldMapping`.
        const node = {
            id: 'n2',
            repeat: undefined,
            props: { dataSource: { query: { contentTypeId: 'ct-legacy' } }, fieldMapping: { heading: 'heading' } },
        } as any;
        const context = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;
        const { container } = render(() => <FeaturedEntryNode node={node} context={context} />);

        await waitFor(() => expect(container.querySelector('section')).toBeFalsy());
        expect(nodeDataBinding.fetchRepeatEntries).not.toHaveBeenCalled();
    });
});
