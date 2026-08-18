// src/modules/cms/node/primitives/LogoGridNode.test.tsx
// @vitest-environment jsdom
//
// Canvas Editor v2, Task 16: LogoGridNode migrated off the legacy
// node.props.dataSource/fieldMapping (SectionDataSource shape) onto node.repeat
// (cardinality:'many') + node.props.slots (LogoGridSlotsCfg) — same mechanism
// TableNode/CardListNode/FeaturedEntryNode (Task 14)/ProjectShowcaseNode (Task 15) already use
// via fetchRepeatEntries.
//
// Same jsdom `matchMedia` gap already hit + fixed by nodeRegistry.test.ts/CustomCodeNode.test.ts/
// ContentDetailNode.test.tsx/FeaturedEntryNode.test.tsx/ProjectShowcaseNode.test.tsx:
// LogoGridNode.tsx statically imports `@/modules/cms/animation/useAnimate`, which statically
// imports `./presetRegistry`, which calls `gsap.registerPlugin(ScrollTrigger)` at
// MODULE-EVALUATION time — that registration reads `matchMedia`, which jsdom's `window` doesn't
// implement. Fixed the same way: stub `window.matchMedia` first, then reach `./LogoGridNode` via
// a dynamic `import()` inside `beforeAll` — static imports are hoisted above any top-level stub
// placed after them, so a plain top-level assignment wouldn't run early enough.
//
// Asserting on the mocked `fetchRepeatEntries` call (args + timing via `waitFor`), NOT on
// rendered DOM text via `findByText` — same choice ContentDetailNode.test.tsx/
// FeaturedEntryNode.test.tsx/ProjectShowcaseNode.test.tsx made (Tasks 12/14/15): this repo's
// Vitest+Vite 7+vite-plugin-solid combo gives the test runtime two live `solid-js` instances (see
// FeaturedEntryNode.test.tsx's comment for the full root-cause writeup), so post-mount signal
// updates never reflect in `container.innerHTML` in this test env even though the reactive
// computation itself re-runs correctly. Pre-existing, whole-repo test-infra gap, out of this
// task's scope to fix.
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

let LogoGridNode: typeof import('./LogoGridNode')['LogoGridNode'];

beforeAll(async () => {
    ({ LogoGridNode } = await import('./LogoGridNode'));
}, 30000);

describe('LogoGridNode (Canvas Editor v2, Task 16 — migrated to repeat)', () => {
    it('reads name/logo slots and fetches via node.repeat', async () => {
        const nodeDataBinding = await import('../nodeDataBinding');
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockClear();
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockResolvedValue([{ id: 'e1', contentTypeId: 'ct-1', data: { partnerName: 'Acme', partnerLogo: 'acme.png' } }]);
        const node = {
            id: 'n1',
            repeat: { source: 'own', mode: 'dynamic', cardinality: 'many', contentTypeKey: 'ct-1' },
            props: { slots: { nameField: 'partnerName', logoField: 'partnerLogo' } },
        } as any;
        const context = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;
        render(() => <LogoGridNode node={node} context={context} />);

        await waitFor(() => expect(nodeDataBinding.fetchRepeatEntries).toHaveBeenCalledWith(node.repeat, { locale: 'vi', pathParams: {}, queryParams: {} }));
    });

    it('does NOT read the legacy node.props.dataSource/fieldMapping shape', async () => {
        const nodeDataBinding = await import('../nodeDataBinding');
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockClear();
        vi.mocked(nodeDataBinding.fetchRepeatEntries).mockResolvedValue([{ id: 'e1', contentTypeId: 'ct-1', data: { name: 'Legacy-should-not-be-read' } }]);
        // A node carrying ONLY the legacy shape (no `repeat`) must resolve to an empty list —
        // `fetchRepeatEntries` is called with `undefined` guarded to `Promise.resolve([])` by the
        // component itself, never falling back to reading `props.dataSource`/`props.fieldMapping`.
        const node = {
            id: 'n2',
            repeat: undefined,
            props: { dataSource: { query: { contentTypeId: 'ct-legacy' } }, fieldMapping: { name: 'partnerName', logo: 'partnerLogo' } },
        } as any;
        const context = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;
        const { container } = render(() => <LogoGridNode node={node} context={context} />);

        await waitFor(() => expect(container.querySelector('img')).toBeFalsy());
        expect(nodeDataBinding.fetchRepeatEntries).not.toHaveBeenCalled();
    });
});
