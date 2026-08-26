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
// from `tOrLiteral('cms.component.exposeAsPropToggle')`. Task 19 added the real dictionary
// entry for that key, so assert against the live translated value (via `tOrLiteral`) rather
// than the now-stale raw key string this test used to fall back to.
//
// Live bug fix (post-Task 13) — real reproduction: two nodes of the same type (e.g. two Text
// nodes) both auto-derived `propKey: 'text'`; the SECOND `setComponentPropSchema` call was
// correctly rejected by the backend's real propKey-uniqueness validation, but nothing surfaced
// that failure and the toggle looked "active" as if it had saved. The tests below cover the
// fix: (1) toggling on now prompts for/confirms a propKey, auto-suggesting a disambiguated
// default when the field's raw key already collides with an existing propSchema entry, and
// blocking an explicitly-re-entered colliding key client-side before ever calling the mutation;
// (2) a rejected `onTogglePropForField` call surfaces a `toast().danger(...)` and reverts the
// toggle back to inactive instead of leaving it looking saved. `window.prompt` and the toast
// module are mocked so these interactions are deterministic under jsdom (which has no real
// `window.prompt` implementation).
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@solidjs/testing-library';
import { tOrLiteral } from '@/shared/i18n/t';

const dangerMock = vi.fn();
vi.mock('@core/components/toast/ToastProvider', () => ({
    toast: () => ({ danger: dangerMock, success: vi.fn(), info: vi.fn(), warning: vi.fn() }),
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

let NodeContentTab: typeof import('./NodeContentTab')['NodeContentTab'];
let ENodeType: typeof import('@/modules/cms/node/node.constants')['ENodeType'];

beforeAll(async () => {
    ({ NodeContentTab } = await import('./NodeContentTab'));
    ({ ENodeType } = await import('@/modules/cms/node/node.constants'));
}, 30000);

const TOGGLE_TEXT = tOrLiteral('cms.component.exposeAsPropToggle');

function makeShapeNode(overrides: Record<string, any> = {}) {
    return { id: 'node-1', type: ENodeType.SHAPE, props: { shape: 'rectangle' }, children: [], ...overrides } as any;
}

describe('NodeContentTab — Expose as prop toggle (Component System)', () => {
    beforeEach(() => {
        dangerMock.mockClear();
        vi.spyOn(window, 'prompt').mockReturnValue(null);
    });

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

    it('clicking an inactive toggle prompts for a propKey (suggesting the field key) and calls onTogglePropForField with expose:true + the confirmed propKey', () => {
        vi.spyOn(window, 'prompt').mockReturnValue('shape'); // admin accepts the suggested default
        const onTogglePropForField = vi.fn();
        const { getByText } = render(() => (
            <NodeContentTab
                node={makeShapeNode()}
                onChange={vi.fn()}
                componentContext={{ componentId: 'c1', propSchema: [], onTogglePropForField }}
            />
        ));
        fireEvent.click(getByText(TOGGLE_TEXT));
        expect(window.prompt).toHaveBeenCalledWith(expect.any(String), 'shape'); // suggested default = field key
        expect(onTogglePropForField).toHaveBeenCalledWith('shape', true, 'shape');
    });

    it('clicking an inactive toggle when the admin cancels the propKey prompt does NOT call onTogglePropForField', () => {
        vi.spyOn(window, 'prompt').mockReturnValue(null); // cancelled
        const onTogglePropForField = vi.fn();
        const { getByText } = render(() => (
            <NodeContentTab
                node={makeShapeNode()}
                onChange={vi.fn()}
                componentContext={{ componentId: 'c1', propSchema: [], onTogglePropForField }}
            />
        ));
        fireEvent.click(getByText(TOGGLE_TEXT));
        expect(onTogglePropForField).not.toHaveBeenCalled();
    });

    it('clicking an active toggle calls onTogglePropForField with expose:false and no propKey prompt', () => {
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
        expect(window.prompt).not.toHaveBeenCalled();
        expect(onTogglePropForField).toHaveBeenCalledWith('shape', false);
    });

    // (a) Real reproduction: this component's propSchema already has an entry whose propKey
    // equals this field's raw key (from ANOTHER node — e.g. a first Text node already exposed
    // its "text" field). A second node with the same field key must not silently suggest the
    // same colliding propKey.
    it('suggests a disambiguated default propKey when the field key already collides with an existing propSchema entry', () => {
        const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null); // just inspect the suggested default, then cancel
        const onTogglePropForField = vi.fn();
        const { getByText } = render(() => (
            <NodeContentTab
                node={makeShapeNode({ id: 'node-2' })}
                onChange={vi.fn()}
                componentContext={{
                    componentId: 'c1',
                    // Node "node-1" already exposed its "shape" field as propKey "shape".
                    propSchema: [{ propKey: 'shape', label: 'shape', control: 'select', targetNodeId: 'node-1', targetField: 'props.shape' }],
                    onTogglePropForField,
                }}
            />
        ));
        fireEvent.click(getByText(TOGGLE_TEXT));
        expect(promptSpy).toHaveBeenCalledWith(expect.any(String), 'shape2'); // disambiguated, not the colliding "shape"
    });

    it('blocks an explicitly re-entered colliding propKey client-side (never calls onTogglePropForField, shows a toast)', () => {
        vi.spyOn(window, 'prompt').mockReturnValue('shape'); // admin types the SAME key the suggestion tried to avoid
        const onTogglePropForField = vi.fn();
        const { getByText } = render(() => (
            <NodeContentTab
                node={makeShapeNode({ id: 'node-2' })}
                onChange={vi.fn()}
                componentContext={{
                    componentId: 'c1',
                    propSchema: [{ propKey: 'shape', label: 'shape', control: 'select', targetNodeId: 'node-1', targetField: 'props.shape' }],
                    onTogglePropForField,
                }}
            />
        ));
        fireEvent.click(getByText(TOGGLE_TEXT));
        expect(onTogglePropForField).not.toHaveBeenCalled(); // never even attempted the mutation
        expect(dangerMock).toHaveBeenCalledTimes(1);
    });

    // (b) Real reproduction: the backend correctly rejects a colliding propKey (BadRequestException
    // -> mutationApi throws), but the toggle used to show no error and stayed looking "active".
    it('a rejected onTogglePropForField call shows a toast error and reverts the toggle back to inactive', async () => {
        vi.spyOn(window, 'prompt').mockReturnValue('name2');
        const onTogglePropForField = vi.fn().mockRejectedValue(new Error('propKey "name2" already used'));
        const { getByText } = render(() => (
            <NodeContentTab
                node={makeShapeNode()}
                onChange={vi.fn()}
                componentContext={{ componentId: 'c1', propSchema: [], onTogglePropForField }}
            />
        ));
        const toggle = getByText(TOGGLE_TEXT);
        fireEvent.click(toggle);
        // Reverts back to inactive once the rejection is caught, plus a visible error toast —
        // never left looking "active" as if the (actually-rejected) save had succeeded.
        await waitFor(() => expect(toggle.className).not.toContain('border-primary-400'));
        expect(dangerMock).toHaveBeenCalledTimes(1);
    });
});
