// @vitest-environment jsdom
//
// NodePalette.tsx imports NODE_TYPE_META from nodeRegistry.ts, which transitively evaluates
// every primitive .tsx component down to NodeRenderer.tsx — same jsdom `matchMedia` gap +
// dynamic-import-inside-beforeAll fix already used by nodeRegistry.test.ts/FrameNode.test.tsx et
// al. (GSAP's ScrollTrigger plugin registers itself at module-evaluation time, reading
// `matchMedia`, which jsdom's `window` doesn't implement).
//
// Task 15 — Components tab. `ComponentService` is mocked via a top-level (hoisted) `vi.mock` +
// per-test `vi.mocked(...).mockResolvedValue(...)`, matching the established idiom for mocking a
// service call in this module (see FeaturedEntryNode.test.tsx's `vi.mock('@/shared/services/
// page/page.service', ...)` + `vi.mocked(nodeDataBinding.fetchRepeatEntries).mockResolvedValue(...)`
// pattern) rather than the brief's sketched `vi.doMock`: `NodePalette.tsx` now statically imports
// `ComponentService` at module top level, and this file's `beforeAll` only dynamically imports
// `NodePalette` itself (for the matchMedia-polyfill-before-evaluation reason above) — `vi.doMock`
// registered inside an `it()` body would still be too late for that already-hoisted static import
// chain, since `vi.mock` calls are hoisted above ALL imports (including ones reached via a later
// dynamic `import()`) while `vi.doMock` deliberately is NOT hoisted.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { ComponentService } from '@/shared/services/component/component.service';

vi.mock('@/shared/services/component/component.service', () => ({
    ComponentService: { getAllComponent: vi.fn() },
}));

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

let NodePalette: typeof import('./NodePalette')['NodePalette'];
let ENodeType: typeof import('@/modules/cms/node/node.constants')['ENodeType'];

beforeAll(async () => {
    ({ NodePalette } = await import('./NodePalette'));
    ({ ENodeType } = await import('@/modules/cms/node/node.constants'));
}, 30000);

beforeEach(() => {
    vi.mocked(ComponentService.getAllComponent).mockReset();
    // Default: empty result — the 'primitives' tab is the initial `createResource` source value,
    // so this resolves quietly in the background for tests that never switch tabs.
    vi.mocked(ComponentService.getAllComponent).mockResolvedValue({ edges: [] } as any);
});

describe('NodePalette — primitives grid (Motion System Unification, Task 2: retired node types fully deleted, 2026-08-27)', () => {
    // `RETIRED_NODE_TYPES` (and the 13 members it named) no longer exist at all — deleted
    // outright from `ENodeType`/`nodeTypeRegistry` (confirmed 0 real rows referenced any of
    // them). The palette's filter is now just `!MIGRATION_ONLY_NODE_TYPES.has(type)`, so it
    // renders exactly one button per remaining `ENodeType` value.
    it('renders exactly one button per ENodeType (MIGRATION_ONLY_NODE_TYPES is empty)', () => {
        const { container } = render(() => <NodePalette onAdd={vi.fn()} onAddComponent={vi.fn()} />);
        const buttons = container.querySelector('[data-testid="palette-primitives-grid"]')!.querySelectorAll('button');
        expect(buttons.length).toBe(Object.values(ENodeType).length);
    });

    it('still offers the true primitives (Frame/Text/Image/Button) and the 3 accepted-utility types (Table/CardList/ContentDetail)', () => {
        const onAdd = vi.fn();
        const { container } = render(() => <NodePalette onAdd={onAdd} onAddComponent={vi.fn()} />);
        const buttons = Array.from(container.querySelector('[data-testid="palette-primitives-grid"]')!.querySelectorAll('button'));
        expect(buttons.length).toBeGreaterThan(0);
        buttons.forEach((b) => fireEvent.click(b));
        const addedTypes = onAdd.mock.calls.map((call) => call[0]);
        expect(addedTypes.length).toBe(buttons.length);
        expect(addedTypes).toEqual(expect.arrayContaining([
            ENodeType.FRAME, ENodeType.TEXT, ENodeType.IMAGE, ENodeType.BUTTON,
            ENodeType.TABLE, ENodeType.CARD_LIST, ENodeType.CONTENT_DETAIL,
        ]));
    });

    it('never offers any of the 13 node types deleted by the "retire specialized node types" roadmap — regression guard against accidental reintroduction', () => {
        const deletedTypeValues = [
            'media-hero', 'intro-rail', 'spotlight-list', 'stat-metrics', 'timeline-list',
            'process-steps', 'contact-columns', 'accordion-list', 'inquiry-form',
            'project-showcase', 'logo-grid', 'featured-entry', 'mixed-feed',
        ];
        expect(Object.values(ENodeType).some((t) => deletedTypeValues.includes(t))).toBe(false);
    });
});

describe('NodePalette — Components tab (Component System, Task 15)', () => {
    it('defaults to the Primitives tab on mount (existing behavior unchanged)', () => {
        const { container } = render(() => <NodePalette onAdd={vi.fn()} onAddComponent={vi.fn()} />);
        expect(container.querySelector('[data-testid="palette-primitives-grid"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="palette-components-grid"]')).toBeNull();
    });

    it('switches to the Components tab and renders one button per component from getAllComponent', async () => {
        vi.mocked(ComponentService.getAllComponent).mockResolvedValue({
            edges: [{ node: { id: 'c1', label: 'Badge', icon: null } }],
        } as any);
        const { findByText, container, getByTestId } = render(() => <NodePalette onAdd={vi.fn()} onAddComponent={vi.fn()} />);
        fireEvent.click(getByTestId('palette-tab-components'));
        expect(await findByText('Badge')).toBeTruthy();
        expect(container.querySelector('[data-testid="palette-components-grid"]')).toBeTruthy();
    });

    it('calls onAddComponent with the clicked component id', async () => {
        vi.mocked(ComponentService.getAllComponent).mockResolvedValue({
            edges: [{ node: { id: 'c1', label: 'Badge', icon: null } }],
        } as any);
        const onAddComponent = vi.fn();
        const { findByText, getByTestId } = render(() => <NodePalette onAdd={vi.fn()} onAddComponent={onAddComponent} />);
        fireEvent.click(getByTestId('palette-tab-components'));
        fireEvent.click(await findByText('Badge'));
        expect(onAddComponent).toHaveBeenCalledWith('c1');
    });
});
