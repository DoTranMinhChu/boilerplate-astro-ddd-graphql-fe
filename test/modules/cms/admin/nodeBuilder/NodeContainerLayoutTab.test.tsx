// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeContainerLayoutTab } from '@modules/cms/admin/nodeBuilder/NodeContainerLayoutTab';
import { t } from '@/shared/i18n/t';

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

    // Root-caused live crash (systematic-debugging, 2026-09-01): the "Độ rộng khung nội dung"
    // (containerWidth) Select was missing `clearable`, and its own explicit `value: ''` first
    // option ("Không (mặc định)") is EXACTLY the shape Select.tsx's auto-select-first-option
    // effect targets for a non-clearable Select — an unset containerWidth (the common case,
    // e.g. every fresh Frame) got force-"corrected" to that same empty option on mount,
    // `onChange` normalized it right back to `undefined` (still empty), so the effect refired
    // on every remount — combined with buildNodeTree.ts's own documented "brand-new object
    // references on every store write" behavior remounting the whole canvas per write, this was
    // a genuine unbounded loop, live-reproduced as "Maximum call stack size exceeded" when
    // clicking any Frame with no containerWidth set in the Node Builder's Cây phần tử panel.
    it('mounting with an unset containerWidth does NOT auto-fire onChange (the exact infinite-loop trigger)', () => {
        const onChange = vi.fn();
        render(() => <NodeContainerLayoutTab layout={{}} onChange={onChange} />);
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('NodeContainerLayoutTab — gap field (real editor gap found live: LayoutProps.gap — the actual CSS gap applyContainerLayout puts on a Frame\'s own flex/grid children — had NO Inspector control anywhere before this; a live FAQ Frame carried layout.gap:8 with no way to change it)', () => {
    it('shows the gap field regardless of display mode (flex)', () => {
        const { getByText } = render(() => <NodeContainerLayoutTab layout={{ display: 'flex' }} onChange={vi.fn()} />);
        expect(getByText('Khoảng cách giữa các con (px)')).toBeTruthy();
    });

    it('shows the gap field regardless of display mode (grid)', () => {
        const { getByText } = render(() => <NodeContainerLayoutTab layout={{ display: 'grid' }} onChange={vi.fn()} />);
        expect(getByText('Khoảng cách giữa các con (px)')).toBeTruthy();
    });

    it('reads the real stored gap value', () => {
        const { getByDisplayValue } = render(() => <NodeContainerLayoutTab layout={{ display: 'flex', gap: 8 }} onChange={vi.fn()} />);
        expect(getByDisplayValue('8')).toBeTruthy();
    });

    it('writing a gap value patches layout.gap while preserving the rest of layout', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <NodeContainerLayoutTab layout={{ display: 'flex', direction: 'column', gap: 8 }} onChange={onChange} />
        ));
        fireEvent.input(getByDisplayValue('8'), { target: { value: '20' } });
        expect(onChange).toHaveBeenCalledWith({ display: 'flex', direction: 'column', gap: 20 });
    });

    it('clearing the gap field writes undefined (not an empty string or 0)', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => <NodeContainerLayoutTab layout={{ display: 'flex', gap: 8 }} onChange={onChange} />);
        fireEvent.input(getByDisplayValue('8'), { target: { value: '' } });
        expect(onChange).toHaveBeenCalledWith({ display: 'flex', gap: undefined });
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

describe('NodeContainerLayoutTab — carousel behavior (Task 3, 2026-08-23)', () => {
    it('hides autoplayMs and pagination fields when behavior is not carousel', () => {
        const { queryByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={undefined} onBehaviorChange={vi.fn()} />
        ));
        expect(queryByText('Thời gian tự chuyển (ms)')).toBeNull();
        expect(queryByText('Kiểu phân trang')).toBeNull();
    });

    it('shows autoplayMs and pagination fields when behavior is carousel', () => {
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={{ type: 'carousel', autoplayMs: 2300, pagination: 'dots' }} onBehaviorChange={vi.fn()} />
        ));
        expect(getByText('Thời gian tự chuyển (ms)')).toBeTruthy();
        expect(getByText('Kiểu phân trang')).toBeTruthy();
        expect(getByText('Chấm tròn')).toBeTruthy();
    });

    it('selecting carousel calls onBehaviorChange with default config', () => {
        const onBehaviorChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={undefined} onBehaviorChange={onBehaviorChange} />
        ));
        const sectionTitle = getByText('Hành vi');
        const section = sectionTitle.closest('.border-b')!;
        const trigger = section.querySelector('input')!;
        fireEvent.focus(trigger);
        fireEvent.mouseDown(getByText('Carousel'));
        expect(onBehaviorChange).toHaveBeenCalledWith({ type: 'carousel', autoplayMs: 2300, pagination: 'dots' });
    });

    it('changing autoplayMs calls onBehaviorChange with updated number', () => {
        const onBehaviorChange = vi.fn();
        // InputNumber without `native` renders a masked (non-type="number") <input> -- same
        // component/pattern as the pre-existing "writing a column count..." test above, which
        // uses getByDisplayValue + fireEvent.input successfully against the identical component.
        // Its displayed text runs through formatNumber() with the vi-VN locale (default
        // decimalSeparator: 'comma'), which renders 2300 with a "." thousands separator.
        const { getByDisplayValue } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={{ type: 'carousel', autoplayMs: 2300, pagination: 'dots' }} onBehaviorChange={onBehaviorChange} />
        ));
        fireEvent.input(getByDisplayValue('2.300'), { target: { value: '3000' } });
        expect(onBehaviorChange).toHaveBeenCalledWith({ type: 'carousel', autoplayMs: 3000, pagination: 'dots' });
    });

    it('changing pagination calls onBehaviorChange with updated string', () => {
        const onBehaviorChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={{ type: 'carousel', autoplayMs: 2300, pagination: 'dots' }} onBehaviorChange={onBehaviorChange} />
        ));
        const paginationLabel = getByText('Kiểu phân trang');
        const section = paginationLabel.closest('.flex.flex-col.gap-3')!;
        const inputs = section.querySelectorAll('input');
        // The pagination select's input should be the last one in the section. Final
        // whole-branch review fix (Minor #5): this used to be silently skipped inside an
        // `if (inputs.length > 0)` guard — harmless today, but the exact hazard shape that made a
        // sibling test in this same file silently vacuous earlier in this branch's history. An
        // unconditional assertion means a future regression that makes the selector stop
        // matching fails loudly instead of silently passing.
        expect(inputs.length).toBeGreaterThan(0);
        fireEvent.focus(inputs[inputs.length - 1]);
        fireEvent.mouseDown(getByText('Mũi tên + số đếm'));
        expect(onBehaviorChange).toHaveBeenCalledWith({ type: 'carousel', autoplayMs: 2300, pagination: 'arrows-counter' });
    });

    it('hides defaultOpen checkbox when behavior is carousel', () => {
        const { queryByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={{ type: 'carousel', autoplayMs: 2300, pagination: 'dots' }} onBehaviorChange={vi.fn()} />
        ));
        expect(queryByText('Mở sẵn khi tải trang')).toBeNull();
    });
});

// Property Inspector redesign, Task 5 (Phase 3) — extends Phase 1 Task 9's per-section modified
// indicator + reset (NodeStyleTab.test.tsx precedent) to this tab's 2 sections: Layout and
// Behavior. `layout`/`behavior` are two SEPARATE prop pairs on this component (behavior lives at
// node.props.behavior, not node.layout — see the component's own doc comment), so resetting one
// must never touch the other; the Layout reset must also preserve sibling `LayoutProps` fields
// this tab never reads (x/y/width/height/rotation/zIndex from NodeTransformTab.tsx,
// colSpan/colStart from NodeGridItemTab.tsx) since all three tabs share the ONE flat
// `LayoutProps` object.
describe('NodeContainerLayoutTab — per-section modified indicator + reset (Property Inspector redesign, Task 5, Phase 3)', () => {
    const RESET_LABEL = t('cms.node.transform.resetButton');

    it('shows no modified dot on Layout or Behavior when both are unset', () => {
        const { container } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} onBehaviorChange={vi.fn()} />
        ));
        expect(container.querySelectorAll('[aria-label="modified"]').length).toBe(0);
    });

    it('Layout section shows a modified dot + reset button when direction is set, and reset clears layout fields while preserving sibling LayoutProps keys owned by other tabs (colSpan/x)', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{ direction: 'row', colSpan: 4, x: 10 }} onChange={onChange} />
        ));
        const section = getByText(t('cms.node.containerLayout.title')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeTruthy();
        fireEvent.click(section.querySelector(`[title="${RESET_LABEL}"]`)!);
        expect(onChange).toHaveBeenCalledWith({
            direction: undefined,
            colSpan: 4,
            x: 10,
            display: undefined,
            gridTemplate: undefined,
            containerWidth: undefined,
            gap: undefined,
            wrap: undefined,
        });
    });

    it('Layout section shows a modified dot when only gap is set', () => {
        const { getByText } = render(() => <NodeContainerLayoutTab layout={{ gap: 8 }} onChange={vi.fn()} />);
        const section = getByText(t('cms.node.containerLayout.title')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeTruthy();
    });

    it('Behavior section shows no modified dot when behavior is unset', () => {
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={undefined} onBehaviorChange={vi.fn()} />
        ));
        const section = getByText(t('cms.node.containerLayout.behaviorLabel')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeNull();
    });

    it('Behavior section shows a modified dot + reset button when behavior is set, and reset clears ONLY behavior (not layout)', () => {
        const onChange = vi.fn();
        const onBehaviorChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContainerLayoutTab
                layout={{ direction: 'row' }}
                onChange={onChange}
                behavior={{ type: 'accordion-item' }}
                onBehaviorChange={onBehaviorChange}
            />
        ));
        const section = getByText(t('cms.node.containerLayout.behaviorLabel')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeTruthy();
        fireEvent.click(section.querySelector(`[title="${RESET_LABEL}"]`)!);
        expect(onBehaviorChange).toHaveBeenCalledWith(undefined);
        expect(onChange).not.toHaveBeenCalled();
    });
});

/** Property Inspector Phase 4, Task 5 — `searchQuery` is threaded into BOTH `InspectorSection`s
 * this file renders (Bố cục lưới / Hành vi). */
describe('NodeContainerLayoutTab — searchQuery threading (Phase 4, Task 5)', () => {
    it('hides both sections when the query matches neither title', () => {
        const { container } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} searchQuery="zzz-khong-ton-tai" />
        ));
        expect(container.textContent).toBe('');
    });

    it('keeps only the Behavior section when the query is its title', () => {
        const { container } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} searchQuery={t('cms.node.containerLayout.behaviorLabel')} />
        ));
        expect(container.textContent).toContain(t('cms.node.containerLayout.behaviorLabel'));
        expect(container.textContent).not.toContain(t('cms.node.containerLayout.title'));
    });

    it('renders both sections again when the query is empty', () => {
        const { container } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} searchQuery="" />
        ));
        expect(container.textContent).toContain(t('cms.node.containerLayout.title'));
        expect(container.textContent).toContain(t('cms.node.containerLayout.behaviorLabel'));
    });
});
