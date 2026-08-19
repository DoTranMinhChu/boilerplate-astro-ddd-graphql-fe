// src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeStyleTab } from './NodeStyleTab';
import { FONT_FAMILIES } from '@core/components/control/editor/commands/font';

describe('NodeStyleTab font-family Select (Node Builder Inspector Polish, Task 5)', () => {
    it('sanity: the shared FONT_FAMILIES list is non-empty and includes a Serif entry', () => {
        // Basic check on the standalone list itself — kept as a cheap guard, but NOT the
        // regression protection for NodeStyleTab's wiring (see the test below for that).
        expect(FONT_FAMILIES.length).toBeGreaterThan(0);
        expect(FONT_FAMILIES.map((f) => f.title)).toContain('Serif');
    });

    it('renders the resolved font-family LABEL (not the raw value) when style.typography.fontFamily is set, proving the Select is genuinely wired with the correct value/label mapping', () => {
        // 'serif' is a real FONT_FAMILIES value that maps to the label 'Serif' (font.ts).
        const { container } = render(() => (
            <NodeStyleTab
                style={{ typography: { fontFamily: 'serif' } }}
                onChange={vi.fn()}
            />
        ));

        // DropdownSelect (the non-native Select mode used here) doesn't render native
        // <option> elements — it's a custom div-based popover. But once a value is
        // selected, it renders a visible "overlay" div showing the SELECTED item's
        // *label* text (DropdownSelect.tsx: `Show when={!props.multi && hasSelection()}`
        // renders `RenderedOption` for `selectedItems()[0]`, whose `item.label` is shown).
        //
        // Asserting the resolved label 'Serif' appears (not the raw value 'serif') proves:
        //  (a) the field is genuinely wired to the real `typography.fontFamily` value,
        //  (b) the `{value: f.value, label: f.title}` mapping is correct, not swapped
        //      (a swapped mapping would make no option's `value` equal 'serif', so no
        //      selection — and therefore no overlay/label — would render at all), and
        //  (c) it's a `Select`, not the old free-text `Input` (an `Input` bound to the
        //      same value would show the raw string 'serif' typed into a text box, never
        //      a resolved label from a lookup list).
        expect(container.textContent).toContain('Serif');
    });
});

describe('NodeStyleTab — max lines (line-clamp) and overflow controls (2026-08-19)', () => {
    it('renders the "Số dòng tối đa" label and the current typography.maxLines value', () => {
        const { getByText, getByDisplayValue } = render(() => (
            <NodeStyleTab style={{ typography: { maxLines: 3 } }} onChange={vi.fn()} />
        ));
        expect(getByText('Số dòng tối đa')).toBeTruthy();
        expect(getByDisplayValue('3')).toBeTruthy();
    });

    it('typing a max-lines value writes it into typography.maxLines, leaving other typography fields untouched', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleTab style={{ typography: { color: '#111' } }} onChange={onChange} />
        ));
        const input = getByText('Số dòng tối đa').parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: '2' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ typography: { color: '#111', maxLines: 2 } }));
    });

    it('clearing max-lines removes it from typography (undefined, not 0 or empty string)', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <NodeStyleTab style={{ typography: { maxLines: 3 } }} onChange={onChange} />
        ));
        fireEvent.input(getByDisplayValue('3'), { target: { value: '' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ typography: { maxLines: undefined } }));
    });

    it('shows the resolved overflow LABEL (not the raw value) when style.overflow is set', () => {
        const { container } = render(() => (
            <NodeStyleTab style={{ overflow: 'hidden' }} onChange={vi.fn()} />
        ));
        expect(container.textContent).toContain('Ẩn phần tràn');
    });

    it('defaults the overflow Select to "Hiện đầy đủ" (visible) when style.overflow is unset', () => {
        const { container } = render(() => <NodeStyleTab style={{}} onChange={vi.fn()} />);
        expect(container.textContent).toContain('Hiện đầy đủ');
    });
});

describe('NodeStyleTab font-family Select — final-review fix (clearable, avoids spurious mount onChange)', () => {
    it('mounting a node with no explicit typography.fontFamily does NOT fire a spurious onChange (no interaction at all)', () => {
        // Select's shared auto-select-first-option effect fires onChange on mount whenever
        // a Select's value is falsy and `clearable` isn't passed. FONT_FAMILIES[0] is
        // {title: 'Default', value: ''}, and an unset fontFamily also derives to '' — both
        // falsy — so this reproduces the exact bug class Task 6 fixed on the easing Select
        // (see NodeAnimationTab.test.tsx's matching test).
        const onChange = vi.fn();
        render(() => <NodeStyleTab style={{}} onChange={onChange} />);
        expect(onChange).not.toHaveBeenCalled();
    });
});
