// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeContainerLayoutTab } from './NodeContainerLayoutTab';

describe('NodeContainerLayoutTab', () => {
    it('shows the Columns field (not Direction/Wrap) and the real stored column count when display is "grid"', () => {
        const { getByText, getByDisplayValue, queryByText } = render(() => (
            <NodeContainerLayoutTab layout={{ display: 'grid', gridTemplate: 'repeat(3, 1fr)' }} onChange={vi.fn()} />
        ));
        expect(getByText('Số cột')).toBeTruthy();
        expect(getByDisplayValue('3')).toBeTruthy();
        expect(queryByText('Hướng')).toBeNull();
    });

    it('shows Direction/Wrap (not Columns) when display is "flex" (the default)', () => {
        const { getByText, queryByText } = render(() => <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} />);
        expect(getByText('Hướng')).toBeTruthy();
        expect(getByText('Tự động xuống dòng')).toBeTruthy();
        expect(queryByText('Số cột')).toBeNull();
    });

    it('writing a column count produces the exact repeat(N, 1fr) gridTemplate applyNodeLayout.ts expects', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <NodeContainerLayoutTab layout={{ display: 'grid', gridTemplate: 'repeat(3, 1fr)' }} onChange={onChange} />
        ));
        fireEvent.input(getByDisplayValue('3'), { target: { value: '4' } });
        expect(onChange).toHaveBeenCalledWith({ display: 'grid', gridTemplate: 'repeat(4, 1fr)' });
    });

    it('clearing the column count clears gridTemplate entirely (not an empty/invalid string)', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <NodeContainerLayoutTab layout={{ display: 'grid', gridTemplate: 'repeat(3, 1fr)' }} onChange={onChange} />
        ));
        fireEvent.input(getByDisplayValue('3'), { target: { value: '' } });
        expect(onChange).toHaveBeenCalledWith({ display: 'grid', gridTemplate: undefined });
    });

    it('does not misparse a non-uniform/hand-authored gridTemplate as a column count', () => {
        const { queryByDisplayValue } = render(() => (
            <NodeContainerLayoutTab layout={{ display: 'grid', gridTemplate: '200px 1fr' }} onChange={vi.fn()} />
        ));
        expect(queryByDisplayValue('200')).toBeNull();
    });
});

describe('NodeContainerLayoutTab — accordion behavior section (Phase A2a, 2026-08-21)', () => {
    it('shows "Không" as the default behavior selection when behavior is unset', () => {
        const { container } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={undefined} onBehaviorChange={vi.fn()} />
        ));
        expect(container.textContent).toContain('Không');
    });

    it('hides the defaultOpen checkbox when behavior is unset', () => {
        const { queryByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={undefined} onBehaviorChange={vi.fn()} />
        ));
        expect(queryByText('Mở sẵn khi tải trang')).toBeNull();
    });

    it('shows the defaultOpen checkbox when behavior is accordion-item', () => {
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={{ type: 'accordion-item' }} onBehaviorChange={vi.fn()} />
        ));
        expect(getByText('Mở sẵn khi tải trang')).toBeTruthy();
    });

    it('selecting accordion-item calls onBehaviorChange with a starter config', () => {
        const onBehaviorChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={undefined} onBehaviorChange={onBehaviorChange} />
        ));
        // The Behavior Select's dropdown options render into the DOM only once opened
        // (DropdownSelect.tsx's Floating `isRendered()`/`<Show>` gate — same quirk documented in
        // NodeDataSourceTab.test.tsx's 'Mảng tự nhập' test) — the currently-selected option is
        // the only one always mounted, so reaching an unselected option requires focusing the
        // Select's underlying <input> first, same as a real admin clicking the field. The option
        // row itself (DropdownSelect.tsx's SelectOption) wires selection via `onMouseDown` (not
        // `onClick`, to avoid the input's blur racing the selection) so it must be triggered with
        // `fireEvent.mouseDown`, not `fireEvent.click`.
        const sectionTitle = getByText('Hành vi');
        const section = sectionTitle.closest('.border-b')!;
        const trigger = section.querySelector('input')!;
        fireEvent.focus(trigger);
        fireEvent.mouseDown(getByText('Mục accordion (mở/đóng)'));
        expect(onBehaviorChange).toHaveBeenCalledWith({ type: 'accordion-item' });
    });

    it('selecting "Không" clears behavior to undefined', () => {
        const onBehaviorChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={{ type: 'accordion-item' }} onBehaviorChange={onBehaviorChange} />
        ));
        const sectionTitle = getByText('Hành vi');
        const section = sectionTitle.closest('.border-b')!;
        const trigger = section.querySelector('input')!;
        fireEvent.focus(trigger);
        fireEvent.mouseDown(getByText('Không'));
        expect(onBehaviorChange).toHaveBeenCalledWith(undefined);
    });

    it('toggling defaultOpen writes it into the behavior object', () => {
        const onBehaviorChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={{ type: 'accordion-item' }} onBehaviorChange={onBehaviorChange} />
        ));
        fireEvent.click(getByText('Mở sẵn khi tải trang'));
        expect(onBehaviorChange).toHaveBeenCalledWith({ type: 'accordion-item', defaultOpen: true });
    });
});

describe('NodeContainerLayoutTab — spotlight-list behavior (SpotlightList close-out, 2026-08-22)', () => {
    it('hides the defaultOpen checkbox when behavior is spotlight-list', () => {
        const { queryByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={{ type: 'spotlight-list' }} onBehaviorChange={vi.fn()} />
        ));
        expect(queryByText('Mở sẵn khi tải trang')).toBeNull();
    });

    it('selecting spotlight-list calls onBehaviorChange with a starter config', () => {
        const onBehaviorChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={undefined} onBehaviorChange={onBehaviorChange} />
        ));
        const sectionTitle = getByText('Hành vi');
        const section = sectionTitle.closest('.border-b')!;
        const trigger = section.querySelector('input')!;
        fireEvent.focus(trigger);
        fireEvent.mouseDown(getByText('Danh sách con trỏ nổi bật'));
        expect(onBehaviorChange).toHaveBeenCalledWith({ type: 'spotlight-list' });
    });
});
