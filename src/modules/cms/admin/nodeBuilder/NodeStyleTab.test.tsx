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
            <NodeStyleTab style={{ typography: { color: { type: 'solid', value: '#111' } } }} onChange={onChange} />
        ));
        const input = getByText('Số dòng tối đa').parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: '2' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ typography: { color: { type: 'solid', value: '#111' }, maxLines: 2 } }));
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

describe('NodeStyleTab — Size (width/height/objectFit) controls (No-code primitives upgrade, 2026-08-20)', () => {
    it('renders "Rộng (px)"/"Cao (px)" reading numeric px values back out of size.width/size.height', () => {
        const { getByText, getByDisplayValue } = render(() => (
            <NodeStyleTab style={{ size: { width: '240px', height: '160px' } }} onChange={vi.fn()} />
        ));
        expect(getByText('Rộng (px)')).toBeTruthy();
        expect(getByText('Cao (px)')).toBeTruthy();
        expect(getByDisplayValue('240')).toBeTruthy();
        expect(getByDisplayValue('160')).toBeTruthy();
    });

    it('typing a height writes a "Npx" string into size.height, leaving size.width untouched', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <NodeStyleTab style={{ size: { width: '100%' } }} onChange={onChange} />);
        const input = getByText('Cao (px)').parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: '160' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ size: { width: '100%', height: '160px' } }));
    });

    it('a non-"Npx" width (e.g. "100%") shows the px input empty rather than guessing a number', () => {
        const { getByText } = render(() => <NodeStyleTab style={{ size: { width: '100%' } }} onChange={vi.fn()} />);
        const input = getByText('Rộng (px)').parentElement!.querySelector('input')! as HTMLInputElement;
        expect(input.value).toBe('');
    });

    it('shows the resolved objectFit LABEL when style.size.objectFit is set', () => {
        const { container } = render(() => <NodeStyleTab style={{ size: { objectFit: 'cover' } }} onChange={vi.fn()} />);
        expect(container.textContent).toContain('Lấp đầy (cover)');
    });

    it('mounting with no explicit size.objectFit does NOT fire a spurious onChange', () => {
        const onChange = vi.fn();
        render(() => <NodeStyleTab style={{}} onChange={onChange} />);
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('NodeStyleTab — Transform (rotate/scale/translate) controls (No-code primitives upgrade, 2026-08-20)', () => {
    // Note: "Dịch ngang (px)"/"Dịch dọc (px)" labels also appear in the Hover section below
    // (a deliberately separate translateX/Y pair scoped to `style.hover.transform`) — every
    // query here uses `getAllByText(...)[0]`, the DEFAULT-state Transform section's copy,
    // since it's first in document order (Hover is the tab's final InspectorSection).
    it('renders and round-trips translateX/translateY', () => {
        const { getAllByText, getByDisplayValue } = render(() => (
            <NodeStyleTab style={{ transform: { translateX: 10, translateY: -6 } }} onChange={vi.fn()} />
        ));
        expect(getAllByText('Dịch ngang (px)')[0]).toBeTruthy();
        expect(getAllByText('Dịch dọc (px)')[0]).toBeTruthy();
        expect(getByDisplayValue('10')).toBeTruthy();
        expect(getByDisplayValue('-6')).toBeTruthy();
    });

    it('typing translateY writes it into transform.translateY, leaving transform.rotate untouched', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => <NodeStyleTab style={{ transform: { rotate: 5 } }} onChange={onChange} />);
        const input = getAllByText('Dịch dọc (px)')[0].parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: '-6' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ transform: { rotate: 5, translateY: -6 } }));
    });
});

describe('NodeStyleTab — Hover section (No-code primitives upgrade, 2026-08-20)', () => {
    it('defaults the hover scope Select to "Khi hover chính khối này" (self) when style.hover is unset', () => {
        const { container } = render(() => <NodeStyleTab style={{}} onChange={vi.fn()} />);
        expect(container.textContent).toContain('Khi hover chính khối này');
    });

    it('mounting with no explicit hover scope does NOT fire a spurious onChange (scope defaults to a truthy "self")', () => {
        const onChange = vi.fn();
        render(() => <NodeStyleTab style={{}} onChange={onChange} />);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('shows the resolved "parent" scope label when style.hover.scope is "parent"', () => {
        const { container } = render(() => <NodeStyleTab style={{ hover: { scope: 'parent' } }} onChange={vi.fn()} />);
        expect(container.textContent).toContain('Khi hover khối cha');
    });

    it('adjusting the hover grayscale slider writes into hover.effects.grayscale without touching hover.scope', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => <NodeStyleTab style={{ hover: { scope: 'parent' } }} onChange={onChange} />);
        // Two "Đen trắng (%)" sliders exist (default-state Effects section + Hover section) —
        // the Hover one is the LAST in document order (Hover is the final InspectorSection).
        const labels = getAllByText('Đen trắng (%)');
        const hoverSlider = labels[labels.length - 1].parentElement!.querySelector('input[type="range"]') as HTMLInputElement;
        fireEvent.input(hoverSlider, { target: { value: '0' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hover: { scope: 'parent', effects: { grayscale: 0 } } }));
    });

    it('typing a hover translateY writes into hover.transform.translateY', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => <NodeStyleTab style={{}} onChange={onChange} />);
        // Two "Dịch dọc (px)" fields exist (default-state Transform section + Hover section) —
        // the Hover one is last in document order.
        const labels = getAllByText('Dịch dọc (px)');
        const hoverInput = labels[labels.length - 1].parentElement!.querySelector('input')!;
        fireEvent.input(hoverInput, { target: { value: '-6' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hover: { transform: { translateY: -6 } } }));
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

describe('NodeStyleTab — Background/Border on/off toggle (color system upgrade, 2026-08-20)', () => {
    // Note: 'Bật nền'/'Bật viền' each appear TWICE (main Background/Border section's own
    // toggle + the Hover section's background/border toggle, which the brief's Step 4
    // deliberately reuses the identical `backgroundEnabled`/`borderEnabled` i18n keys for) —
    // same duplicate-label situation as the existing "Dịch dọc (px)" queries above (Transform
    // + Hover sections), resolved the same way: `getAllByText(...)[0]`, the MAIN section's
    // toggle, since the main Background/Border InspectorSections are first in document order
    // (Hover is the tab's final section).
    it('shows the Background toggle OFF and hides its controls when style.background is unset', () => {
        const { getAllByText, queryByText } = render(() => <NodeStyleTab style={{}} onChange={vi.fn()} />);
        expect(getAllByText('Bật nền')[0]).toBeTruthy();
        expect(queryByText('Giá trị / URL')).toBeNull();
    });

    it('shows the Background toggle ON and its controls when style.background is set', () => {
        const { getByText } = render(() => (
            <NodeStyleTab style={{ background: { type: 'color', value: '#ffffffff' } }} onChange={vi.fn()} />
        ));
        expect(getByText('Giá trị / URL')).toBeTruthy();
    });

    it('turning the Background toggle ON writes a starter background object', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => <NodeStyleTab style={{}} onChange={onChange} />);
        fireEvent.click(getAllByText('Bật nền')[0]);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ background: { type: 'color', value: '#ffffffff' } }));
    });

    it('turning the Background toggle OFF deletes the whole background key (not just its sub-fields)', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => (
            <NodeStyleTab style={{ background: { type: 'color', value: '#123456ff' } }} onChange={onChange} />
        ));
        fireEvent.click(getAllByText('Bật nền')[0]);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ background: undefined }));
    });

    it('shows the Border toggle OFF and hides its controls when style.border is unset', () => {
        const { getAllByText, queryByText } = render(() => <NodeStyleTab style={{}} onChange={vi.fn()} />);
        expect(getAllByText('Bật viền')[0]).toBeTruthy();
        expect(queryByText('Bo góc (px)')).toBeNull();
    });

    it('turning the Border toggle ON writes a starter border object', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => <NodeStyleTab style={{}} onChange={onChange} />);
        fireEvent.click(getAllByText('Bật viền')[0]);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ border: { width: 1, style: 'solid', color: '#e5e5e5ff' } }));
    });

    it('turning the Border toggle OFF deletes the whole border key', () => {
        const onChange = vi.fn();
        const { getAllByText } = render(() => (
            <NodeStyleTab style={{ border: { width: 2, style: 'solid', color: '#000000ff' } }} onChange={onChange} />
        ));
        fireEvent.click(getAllByText('Bật viền')[0]);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ border: undefined }));
    });
});

describe('NodeStyleTab — background animate (close-out batch, 2026-08-21)', () => {
    it('shows the background-animate Select only when background.type is "image"', () => {
        const { queryByText } = render(() => (
            <NodeStyleTab style={{ background: { type: 'color', value: '#ffffffff' } }} onChange={vi.fn()} isFrame />
        ));
        expect(queryByText('Hiệu ứng nền')).toBeNull();
    });

    it('shows the background-animate Select when background.type is "image" and isFrame is true', () => {
        const { getByText } = render(() => (
            <NodeStyleTab style={{ background: { type: 'image', value: 'a.jpg' } }} onChange={vi.fn()} isFrame />
        ));
        expect(getByText('Hiệu ứng nền')).toBeTruthy();
    });

    it('selecting "Thở" writes animate:\'breathe\' into background, leaving other background fields untouched', () => {
        const onChange = vi.fn();
        const { getByText, container, getAllByText } = render(() => (
            <NodeStyleTab style={{ background: { type: 'image', value: 'a.jpg' } }} onChange={onChange} isFrame />
        ));
        // The Background section contains multiple Selects: backgroundType and backgroundAnimate.
        // We need to find the backgroundAnimate Select specifically by its input within the section.
        const animateLabel = getByText('Hiệu ứng nền');
        const animateDiv = animateLabel.parentElement!;
        const animateInputs = animateDiv.querySelectorAll('input');
        const animateTrigger = animateInputs[animateInputs.length - 1]; // The last input in this div
        fireEvent.focus(animateTrigger);
        // After focus, the dropdown should open and we can find the option by partial text match
        const breatheOption = getByText((content, element) => content.includes('Thở') && content.includes('phóng to'));
        fireEvent.mouseDown(breatheOption);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            background: { type: 'image', value: 'a.jpg', animate: 'breathe' },
        }));
    });
});

// final-review fix round 3 (#2): the "Hiệu ứng nền" (breathe) control was previously shown for
// ALL 25 node types with `style:true` capability, but only FrameNode.tsx actually renders the
// background layer that control's persisted value targets. An admin turning it on for a
// non-Frame node (Text, Image, etc.) had it silently persist with zero visible effect. Gated
// behind a new `isFrame` prop, mirroring the existing Frame-only precedent at
// NodeBuilder.page.tsx's `behavior={selected()?.type === ENodeType.FRAME ? ... : undefined}`.
describe('NodeStyleTab — background animate Select is Frame-only (final-review fix round 3, #2)', () => {
    it('does NOT render the "Hiệu ứng nền" Select when isFrame is omitted, even with background.type "image"', () => {
        const { queryByText } = render(() => (
            <NodeStyleTab style={{ background: { type: 'image', value: 'a.jpg' } }} onChange={vi.fn()} />
        ));
        expect(queryByText('Hiệu ứng nền')).toBeNull();
    });

    it('does NOT render the "Hiệu ứng nền" Select when isFrame is explicitly false, even with background.type "image"', () => {
        const { queryByText } = render(() => (
            <NodeStyleTab style={{ background: { type: 'image', value: 'a.jpg' } }} onChange={vi.fn()} isFrame={false} />
        ));
        expect(queryByText('Hiệu ứng nền')).toBeNull();
    });

    it('DOES render the "Hiệu ứng nền" Select when isFrame is true and background.type is "image"', () => {
        const { getByText } = render(() => (
            <NodeStyleTab style={{ background: { type: 'image', value: 'a.jpg' } }} onChange={vi.fn()} isFrame={true} />
        ));
        expect(getByText('Hiệu ứng nền')).toBeTruthy();
    });
});
