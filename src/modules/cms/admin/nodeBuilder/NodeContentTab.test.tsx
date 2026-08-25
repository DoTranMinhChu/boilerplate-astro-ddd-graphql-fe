// @vitest-environment jsdom
//
// NodeContentTab.tsx imports nodeTypeRegistry from nodeRegistry.ts, which transitively
// evaluates every primitive .tsx component down to NodeRenderer.tsx — same jsdom
// `matchMedia` gap + dynamic-import-inside-beforeAll fix already used by
// NodePalette.test.tsx/ChartNode.test.tsx et al. (GSAP's ScrollTrigger plugin registers
// itself at module-evaluation time, reading `matchMedia`, which jsdom's `window` doesn't
// implement).
//
// Component System, Task 13 — "Expose as prop" toggle. The toggle's visible text comes
// from `tOrLiteral('cms.component.exposeAsPropToggle')` (NOT `t()` — that namespace's keys
// don't exist yet, a later task adds them). Per `src/shared/i18n/t.ts`'s `resolve()`,
// a missing key falls back to the literal key string itself, so the toggle currently
// renders the raw key text — assert against that literal, not a guessed "Prop" label.
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';

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

let NodeContentTab: typeof import('./NodeContentTab')['NodeContentTab'];
let ENodeType: typeof import('@/modules/cms/node/node.constants')['ENodeType'];

beforeAll(async () => {
    ({ NodeContentTab } = await import('./NodeContentTab'));
    ({ ENodeType } = await import('@/modules/cms/node/node.constants'));
}, 30000);

const TOGGLE_TEXT = 'cms.component.exposeAsPropToggle';

function makeShapeNode(overrides: Record<string, any> = {}) {
    return { id: 'node-1', type: ENodeType.SHAPE, props: { shape: 'rectangle' }, children: [], ...overrides } as any;
}

describe('NodeContentTab — Expose as prop toggle (Component System)', () => {
    it('does not render the toggle when componentContext is absent (existing behavior unchanged)', () => {
        const { queryByText } = render(() => <NodeContentTab node={makeShapeNode()} onChange={vi.fn()} />);
        expect(queryByText(TOGGLE_TEXT)).toBeNull();
    });

    it('renders the toggle inactive when the field is not yet in propSchema', () => {
        const { getByText } = render(() => (
            <NodeContentTab
                node={makeShapeNode()}
                onChange={vi.fn()}
                componentContext={{ componentId: 'c1', propSchema: [], onTogglePropForField: vi.fn() }}
            />
        ));
        expect(getByText(TOGGLE_TEXT).className).not.toContain('border-primary-400');
    });

    it('renders the toggle active when the field is already exposed for this node', () => {
        const { getByText } = render(() => (
            <NodeContentTab
                node={makeShapeNode()}
                onChange={vi.fn()}
                componentContext={{
                    componentId: 'c1',
                    propSchema: [{ propKey: 'shapeKind', label: 'Shape', control: 'select', targetNodeId: 'node-1', targetField: 'props.shape' }],
                    onTogglePropForField: vi.fn(),
                }}
            />
        ));
        expect(getByText(TOGGLE_TEXT).className).toContain('border-primary-400');
    });

    it('clicking an inactive toggle calls onTogglePropForField with the field key and expose:true', () => {
        const onTogglePropForField = vi.fn();
        const { getByText } = render(() => (
            <NodeContentTab
                node={makeShapeNode()}
                onChange={vi.fn()}
                componentContext={{ componentId: 'c1', propSchema: [], onTogglePropForField }}
            />
        ));
        fireEvent.click(getByText(TOGGLE_TEXT));
        expect(onTogglePropForField).toHaveBeenCalledWith('shape', true);
    });

    it('clicking an active toggle calls onTogglePropForField with expose:false', () => {
        const onTogglePropForField = vi.fn();
        const { getByText } = render(() => (
            <NodeContentTab
                node={makeShapeNode()}
                onChange={vi.fn()}
                componentContext={{
                    componentId: 'c1',
                    propSchema: [{ propKey: 'shapeKind', label: 'Shape', control: 'select', targetNodeId: 'node-1', targetField: 'props.shape' }],
                    onTogglePropForField,
                }}
            />
        ));
        fireEvent.click(getByText(TOGGLE_TEXT));
        expect(onTogglePropForField).toHaveBeenCalledWith('shape', false);
    });
});
