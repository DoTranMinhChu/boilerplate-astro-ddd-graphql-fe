// src/modules/cms/admin/nodeBuilder/PropertyPanel.test.tsx
// @vitest-environment jsdom
// Replaces InspectorPanel.test.tsx (that component is superseded by this one) — the first four
// cases below are its assertions carried over, plus the tab-shell-specific ones.
import { describe, it, expect, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render, fireEvent } from '@solidjs/testing-library';
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
                contentTab={<div>content body</div>}
                styleTab={<></>}
                effectsTab={<></>}
                advancedTab={<></>}
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
                contentTab={<div>content body</div>}
                styleTab={<div>style body</div>}
                effectsTab={<div>effects body</div>}
                advancedTab={<div>advanced body</div>}
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
                contentTab={<div>content body</div>}
                styleTab={<div>style body</div>}
                effectsTab={<></>}
                advancedTab={<></>}
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
                contentTab={<div>content body</div>}
                styleTab={<div>style body</div>}
                effectsTab={<></>}
                advancedTab={<></>}
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
                contentTab={<div>content body</div>}
                styleTab={<></>}
                effectsTab={<></>}
                advancedTab={<></>}
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
                contentTab={<></>}
                styleTab={<></>}
                effectsTab={<></>}
                advancedTab={<></>}
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
                contentTab={<></>}
                styleTab={<></>}
                effectsTab={<></>}
                advancedTab={<></>}
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
