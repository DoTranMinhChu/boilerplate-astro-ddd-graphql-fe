// src/modules/cms/admin/nodeBuilder/PropertyPanel.test.tsx
// @vitest-environment jsdom
// Replaces InspectorPanel.test.tsx (that component is superseded by this one) — the first four
// cases below are its assertions carried over, plus the tab-shell-specific ones.
import { describe, it, expect, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render, fireEvent } from '@solidjs/testing-library';
import { InspectorSection } from '@core/components/control/InspectorSection';
import { PropertyPanel } from './PropertyPanel';

const noopHandlers = () => ({
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onSaveAsComponent: vi.fn(),
    onClose: vi.fn(),
});

describe('PropertyPanel', () => {
    it('renders the title and type badge in the header', () => {
        const { getByText } = render(() => (
            <PropertyPanel
                open
                title="Hero Frame"
                typeBadge="FRAME"
                showNodeActions
                selectedNodeId="n1"
                {...noopHandlers()}
                contentTab={() => <div>content body</div>}
                styleTab={() => <></>}
                effectsTab={() => <></>}
                advancedTab={() => <></>}
            />
        ));
        expect(getByText('Hero Frame')).toBeTruthy();
        expect(getByText('FRAME')).toBeTruthy();
    });

    it('renders the four tab labels and only the active tab body', () => {
        const { getByText, queryByText } = render(() => (
            <PropertyPanel
                open
                title="Hero Frame"
                showNodeActions
                selectedNodeId="n1"
                {...noopHandlers()}
                contentTab={() => <div>content body</div>}
                styleTab={() => <div>style body</div>}
                effectsTab={() => <div>effects body</div>}
                advancedTab={() => <div>advanced body</div>}
            />
        ));
        expect(getByText('Nội dung')).toBeTruthy();
        expect(getByText('Kiểu dáng')).toBeTruthy();
        expect(getByText('Hiệu ứng')).toBeTruthy();
        expect(getByText('Nâng cao')).toBeTruthy();

        expect(getByText('content body')).toBeTruthy();
        expect(queryByText('style body')).toBeNull();
        expect(queryByText('effects body')).toBeNull();
        expect(queryByText('advanced body')).toBeNull();
    });

    it('switches the visible body when another tab label is clicked', () => {
        const { getByText, queryByText } = render(() => (
            <PropertyPanel
                open
                title="Hero Frame"
                showNodeActions
                selectedNodeId="n1"
                {...noopHandlers()}
                contentTab={() => <div>content body</div>}
                styleTab={() => <div>style body</div>}
                effectsTab={() => <></>}
                advancedTab={() => <></>}
            />
        ));
        fireEvent.click(getByText('Kiểu dáng'));
        expect(getByText('style body')).toBeTruthy();
        expect(queryByText('content body')).toBeNull();
    });

    it('resets back to the first tab when the selected node changes', () => {
        const [nodeId, setNodeId] = createSignal<string | undefined>('n1');
        const { getByText, queryByText } = render(() => (
            <PropertyPanel
                open
                title="Hero Frame"
                showNodeActions
                selectedNodeId={nodeId()}
                {...noopHandlers()}
                contentTab={() => <div>content body</div>}
                styleTab={() => <div>style body</div>}
                effectsTab={() => <></>}
                advancedTab={() => <></>}
            />
        ));
        fireEvent.click(getByText('Kiểu dáng'));
        expect(getByText('style body')).toBeTruthy();

        setNodeId('n2');
        expect(getByText('content body')).toBeTruthy();
        expect(queryByText('style body')).toBeNull();
    });

    it('renders no tabs at all when nothing is selected', () => {
        const { queryByText } = render(() => (
            <PropertyPanel
                open={false}
                title=""
                showNodeActions={false}
                selectedNodeId={undefined}
                {...noopHandlers()}
                contentTab={() => <div>content body</div>}
                styleTab={() => <></>}
                effectsTab={() => <></>}
                advancedTab={() => <></>}
            />
        ));
        expect(queryByText('Nội dung')).toBeNull();
        expect(queryByText('content body')).toBeNull();
    });

    it('applies the slide-out (closed) class when open=false', () => {
        const { container } = render(() => (
            <PropertyPanel
                open={false}
                title="Hero Frame"
                showNodeActions={false}
                selectedNodeId={undefined}
                {...noopHandlers()}
                contentTab={() => <></>}
                styleTab={() => <></>}
                effectsTab={() => <></>}
                advancedTab={() => <></>}
            />
        ));
        expect(container.firstElementChild?.className).toContain('translate-x-full');
    });

    it('forwards the header actions', () => {
        const handlers = noopHandlers();
        const { getByTitle } = render(() => (
            <PropertyPanel
                open
                title="Hero Frame"
                showNodeActions
                selectedNodeId="n1"
                {...handlers}
                contentTab={() => <></>}
                styleTab={() => <></>}
                effectsTab={() => <></>}
                advancedTab={() => <></>}
            />
        ));
        fireEvent.click(getByTitle('Nhân bản'));
        fireEvent.click(getByTitle('Xoá'));
        fireEvent.click(getByTitle('Đóng'));
        expect(handlers.onDuplicate).toHaveBeenCalledTimes(1);
        expect(handlers.onDelete).toHaveBeenCalledTimes(1);
        expect(handlers.onClose).toHaveBeenCalledTimes(1);
    });
});

/** Property Inspector Phase 4, Task 4 — the panel-level property search. */
describe('PropertyPanel — property search', () => {
    it('renders a search input above the tab strip', () => {
        const { getByPlaceholderText } = render(() => (
            <PropertyPanel
                open
                title="Hero Frame"
                showNodeActions
                selectedNodeId="n1"
                {...noopHandlers()}
                contentTab={() => <div>content body</div>}
                styleTab={() => <></>}
                effectsTab={() => <></>}
                advancedTab={() => <></>}
            />
        ));
        expect(getByPlaceholderText('Tìm kiếm thuộc tính...')).toBeTruthy();
    });

    it('debounces the query: it does not reach the tabs on the raw keystroke, only after the delay', () => {
        vi.useFakeTimers();
        try {
            const { getByPlaceholderText, getByText, queryByText } = render(() => (
                <PropertyPanel
                    open
                    title="Hero Frame"
                    showNodeActions
                    selectedNodeId="n1"
                    {...noopHandlers()}
                    contentTab={(q) => <div>{`q=[${q()}]`}</div>}
                    styleTab={() => <></>}
                    effectsTab={() => <></>}
                    advancedTab={() => <></>}
                />
            ));
            const input = getByPlaceholderText('Tìm kiếm thuộc tính...') as HTMLInputElement;
            expect(getByText('q=[]')).toBeTruthy();

            fireEvent.input(input, { target: { value: 'mà' } });
            // The <input> itself updates immediately (no lag while typing)...
            expect(input.value).toBe('mà');
            // ...but the query the tabs see is still the previous one.
            expect(queryByText('q=[mà]')).toBeNull();
            expect(getByText('q=[]')).toBeTruthy();

            vi.advanceTimersByTime(300);
            expect(getByText('q=[mà]')).toBeTruthy();
        } finally {
            vi.useRealTimers();
        }
    });

    it('filters an InspectorSection rendered inside a tab once the debounced query lands', () => {
        vi.useFakeTimers();
        try {
            const { getByPlaceholderText, getByText, queryByText } = render(() => (
                <PropertyPanel
                    open
                    title="Hero Frame"
                    showNodeActions
                    selectedNodeId="n1"
                    {...noopHandlers()}
                    contentTab={(q) => (
                        <InspectorSection title="Zzz" searchQuery={q()}>
                            <div>zzz body</div>
                        </InspectorSection>
                    )}
                    styleTab={() => <></>}
                    effectsTab={() => <></>}
                    advancedTab={() => <></>}
                />
            ));
            expect(getByText('zzz body')).toBeTruthy();

            fireEvent.input(getByPlaceholderText('Tìm kiếm thuộc tính...'), { target: { value: 'qqq' } });
            vi.advanceTimersByTime(300);

            expect(queryByText('Zzz')).toBeNull();
            expect(queryByText('zzz body')).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    /** Guards the render-prop SHAPE, not just its reactivity: the tab builder receives an
     * ACCESSOR, so a query change must NOT re-run the builder and rebuild the whole tab body
     * (which would blow away every bit of local state inside it — collapsed sections, open
     * pickers, in-progress rich-text edits). */
    it('does not remount the tab body when the query changes', () => {
        vi.useFakeTimers();
        try {
            let buildCount = 0;
            const Counter = () => {
                const [n, setN] = createSignal(0);
                return <button onClick={() => setN(n() + 1)}>{`count-${n()}`}</button>;
            };
            const { getByPlaceholderText, getByText } = render(() => (
                <PropertyPanel
                    open
                    title="Hero Frame"
                    showNodeActions
                    selectedNodeId="n1"
                    {...noopHandlers()}
                    contentTab={(q) => {
                        buildCount++;
                        return (
                            <>
                                <Counter />
                                <div>{`q=[${q()}]`}</div>
                            </>
                        );
                    }}
                    styleTab={() => <></>}
                    effectsTab={() => <></>}
                    advancedTab={() => <></>}
                />
            ));
            expect(buildCount).toBe(1);
            fireEvent.click(getByText('count-0'));
            expect(getByText('count-1')).toBeTruthy();

            fireEvent.input(getByPlaceholderText('Tìm kiếm thuộc tính...'), { target: { value: 'x' } });
            vi.advanceTimersByTime(300);

            expect(getByText('q=[x]')).toBeTruthy();      // the query DID reach inside the tab
            expect(getByText('count-1')).toBeTruthy();    // ...without resetting local state
            expect(buildCount).toBe(1);                   // ...and without re-running the builder
        } finally {
            vi.useRealTimers();
        }
    });
});
