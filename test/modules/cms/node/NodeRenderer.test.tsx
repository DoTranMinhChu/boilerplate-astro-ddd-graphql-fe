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

vi.mock('@modules/cms/node/nodeDataBinding', () => ({ fetchRepeatEntries: vi.fn() }));

// Final whole-branch review fix (Critical #1): Task 2 gave FrameNode.tsx's own carousel branch
// an independent `createResource` that ALSO calls `fetchRepeatEntries` (by design — the
// carousel's own legitimate self-fetch, not a bug) with the SAME repeat object/context shape
// as the pre-fetch-avoidance call this test is actually trying to prove. Since NodeChildrenList
// renders the REAL FrameNode for type:'frame' nodes, the mock now sees 2 calls (1 from
// NodeChildrenList's own filter for the plain sibling, 1 from the carousel's own self-fetch),
// not 1 — breaking this test's "exactly 1 call total" premise even though the exclusion logic
// under test is entirely correct. Stub the 'frame' registry entry so the rendered subtree no
// longer self-resolves, making "exactly 1 pre-fetch call" a meaningful assertion about
// NodeChildrenList's own filter again. `importOriginal` keeps `nodeTypeRegistry`/
// `nodeCapabilities`/`NODE_TYPE_META` intact in case anything else in the render path needs them.
vi.mock('@modules/cms/node/nodeRegistry', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@modules/cms/node/nodeRegistry')>();
    return { ...actual, nodeRegistry: { ...actual.nodeRegistry, frame: () => <div data-testid="stub-frame" /> } };
});

let NodeChildrenList: typeof import('@modules/cms/node/NodeRenderer')['NodeChildrenList'];
let NodeRenderer: typeof import('@modules/cms/node/NodeRenderer')['NodeRenderer'];

beforeAll(async () => {
    ({ NodeChildrenList, NodeRenderer } = await import('@modules/cms/node/NodeRenderer'));
}, 60000);

const baseContext = { locale: 'vi', pathParams: {}, queryParams: {}, isCustomerLoggedIn: false, now: new Date(), device: () => 'desktop' as const } as any;

describe('NodeChildrenList — repeat pre-fetch excludes carousel-behavior Frames (Task 1 foundation)', () => {
    it('does not pre-fetch repeat entries for a carousel-behavior Frame (it self-resolves via its own createResource), but still pre-fetches for a plain Frame in the same tree', async () => {
        const nodeDataBinding = await import('@modules/cms/node/nodeDataBinding');
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

// Property Inspector Phase 3 (Task 3): `NodeDTO.advanced` (added as a pure type in Task 2) becomes
// real DOM here. Reuses this file's already-established harness rather than inventing a second one
// — the `matchMedia` stub + dynamic `import()` above, and the `nodeRegistry` mock's stub `frame`
// entry (a bare `<div data-testid="stub-frame" />`), which keeps these assertions about
// NodeRenderer's OWN wrapper `<div data-node-id>` and nothing a real primitive renders inside it.
describe('NodeRenderer — advanced fields (Property Inspector Phase 3)', () => {
    const renderNode = (node: any) => render(() => <NodeRenderer node={node} context={baseContext} />);
    const wrapper = (container: HTMLElement, id: string) => container.querySelector(`[data-node-id="${id}"]`)!;

    it('applies htmlId/cssClass/ariaLabel/ariaHidden/role to the rendered root element', () => {
        const { container } = renderNode({
            id: 'n1',
            type: 'frame',
            children: [],
            advanced: { htmlId: 'hero', cssClass: 'my-global-class', ariaLabel: 'Hero section', ariaHidden: true, role: 'region' },
        });
        const el = wrapper(container, 'n1');
        expect(el.getAttribute('id')).toBe('hero');
        expect(el.classList.contains('my-global-class')).toBe(true);
        expect(el.getAttribute('aria-label')).toBe('Hero section');
        expect(el.getAttribute('aria-hidden')).toBe('true');
        expect(el.getAttribute('role')).toBe('region');
    });

    it('adds NO id/class/aria-*/role attributes at all for a node with no `advanced` (the overwhelming majority — additive-inert)', () => {
        const { container } = renderNode({ id: 'n2', type: 'frame', children: [] });
        const el = wrapper(container, 'n2');
        expect(el.hasAttribute('id')).toBe(false);
        expect(el.hasAttribute('aria-label')).toBe(false);
        expect(el.hasAttribute('aria-hidden')).toBe(false);
        expect(el.hasAttribute('role')).toBe(false);
        // No stray `class=""`/empty class token from the `['' ]: false` computed classList key.
        expect(el.className).toBe('');
        // The node still renders its registered component exactly as before.
        expect(el.querySelector('[data-testid="stub-frame"]')).not.toBeNull();
    });

    it('an empty-string cssClass contributes no class token (the computed-key guard)', () => {
        const { container } = renderNode({ id: 'n3', type: 'frame', children: [], advanced: { cssClass: '' } });
        expect(wrapper(container, 'n3').className).toBe('');
    });

    it('a space-separated cssClass becomes multiple real class tokens', () => {
        const { container } = renderNode({ id: 'n4', type: 'frame', children: [], advanced: { cssClass: 'foo bar' } });
        const el = wrapper(container, 'n4');
        expect(el.classList.contains('foo')).toBe(true);
        expect(el.classList.contains('bar')).toBe(true);
    });

    it('ariaHidden:false renders NO aria-hidden attribute (not aria-hidden="false", which is a different a11y statement)', () => {
        const { container } = renderNode({ id: 'n5', type: 'frame', children: [], advanced: { ariaHidden: false } });
        expect(wrapper(container, 'n5').hasAttribute('aria-hidden')).toBe(false);
    });

    it('cssClass MERGES with the builder selection ring rather than replacing it', () => {
        const builderContext = {
            ...baseContext,
            builderSelection: { isSelected: () => true, onSelectClick: () => {}, selectedIds: () => new Set(['n6']) },
        } as any;
        const node = { id: 'n6', type: 'frame', children: [], advanced: { cssClass: 'my-global-class' } } as any;
        const { container } = render(() => <NodeRenderer node={node} context={builderContext} />);
        const el = wrapper(container, 'n6');
        expect(el.classList.contains('my-global-class')).toBe(true);
        expect(el.classList.contains('ring-2')).toBe(true);
        expect(el.classList.contains('ring-primary-500')).toBe(true);
    });

    it('renders advanced.customCss as a sibling <style> scoped to this node, and none at all when unset', () => {
        const { container } = renderNode({ id: 'n7', type: 'frame', children: [], advanced: { customCss: 'color: red;' } });
        expect(container.querySelector('style')?.textContent).toBe('[data-node-id="n7"] { color: red; }');

        const plain = renderNode({ id: 'n8', type: 'frame', children: [] });
        expect(plain.container.querySelector('style')).toBeNull();
    });
});
