// src/modules/cms/admin/nodeBuilder/NodeStyleTab.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeStyleTab } from './NodeStyleTab';
import { FONT_FAMILIES } from '@core/components/control/editor/commands/font';
import { t, tOrLiteral } from '@/shared/i18n/t';
import type { ThemeDTO } from '@/shared/services/theme/theme.service';

// Task 16 (theme layer / style pipeline) — minimal ThemeDTO fixture with all 15
// ThemeColorSet semantic keys (Task 8's shape), used by the typography-role/color-token
// tests below. `typography`/`layout`/`motion` are omitted — ColorTokenOrCustom.tsx only
// ever reads `activeTheme.colors.light`.
const mockTheme: ThemeDTO = {
    id: 'theme-1',
    name: 'Mock Theme',
    isDefault: true,
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    colors: {
        light: {
            background: '#ffffff', surface: '#f5f5f5', surfaceMuted: '#e5e5e5',
            foreground: '#171717', foregroundMuted: '#737373', border: '#d4d4d4',
            primary: '#1d4ed8', onPrimary: '#ffffff',
            secondary: '#7c3aed', onSecondary: '#ffffff',
            accent: '#f59e0b', onAccent: '#171717',
            success: '#16a34a', warning: '#ca8a04', danger: '#dc2626',
        },
    },
};

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

// Property Inspector redesign, Task 5: the "Size (width/height/objectFit) controls" describe
// block that used to sit here moved to NodeContentSpacingSize.test.tsx along with the fields
// themselves — those controls now live in the "Nội dung" tab, not this component. The two
// negative assertions below keep that separation honest.
describe('NodeStyleTab — Spacing/Size/focalPoint no longer live here (Property Inspector redesign, Task 5)', () => {
    it('does NOT render the Size (width/height) controls any more', () => {
        const { queryByText } = render(() => (
            <NodeStyleTab style={{ size: { width: '240px', height: '160px' } }} onChange={vi.fn()} />
        ));
        expect(queryByText(t('cms.node.style.sizeWidth'))).toBeNull();
        expect(queryByText(t('cms.node.style.sizeHeight'))).toBeNull();
        expect(queryByText(t('cms.node.style.objectFit'))).toBeNull();
    });

    it('does NOT render the Spacing (padding/gap) controls any more', () => {
        const { queryByText } = render(() => (
            <NodeStyleTab style={{ spacing: { padding: { t: 8 }, gap: 4 } }} onChange={vi.fn()} />
        ));
        expect(queryByText(t('cms.node.style.padding'))).toBeNull();
        expect(queryByText(t('cms.node.style.gap'))).toBeNull();
    });

    it('does NOT render the focal-point fields any more, but keeps the rest of the Image section', () => {
        const { queryByText, getByText } = render(() => (
            <NodeStyleTab style={{ image: { focalPoint: { x: 30, y: 70 } } }} onChange={vi.fn()} isImage />
        ));
        expect(queryByText(t('cms.node.image.focalPointX'))).toBeNull();
        expect(queryByText(t('cms.node.image.focalPointY'))).toBeNull();
        expect(getByText(t('cms.node.image.aspectRatio'))).toBeTruthy();
        expect(getByText(t('cms.node.image.treatment'))).toBeTruthy();
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

// Task 10 (Component System + Visual Fidelity Engine): blur/backdropBlur/blendMode had no
// Inspector UI at all despite `StyleObject['effects']` already being fully typed for them
// and `applyNodeStyle.ts` already reading/applying them — this is a pure UI-only addition.
// None of these i18n keys (blur/backdropBlur/blendMode*) exist in the vi dictionary yet (a
// LATER task in this plan adds real Vietnamese copy for them) — `t()` is type-checked
// against the real dictionary and would fail to compile for a not-yet-existing key, so the
// component uses `tOrLiteral()` for them (same escape hatch already used elsewhere in this
// module, e.g. FieldRenderer.tsx), which currently falls back to returning the raw dotted
// key string. These tests deliberately assert against `tOrLiteral(...)`'s ACTUAL current
// return value (whatever it is) rather than hardcoding a guessed/unverified Vietnamese
// translation — they keep passing unchanged once the later task adds real translations.
describe('NodeStyleTab — blur/backdropBlur/blendMode controls (Component System + Visual Fidelity Engine)', () => {
    it('renders and round-trips blur/backdropBlur', () => {
        const { getByText, getByDisplayValue } = render(() => (
            <NodeStyleTab style={{ effects: { blur: 4, backdropBlur: 8 } }} onChange={vi.fn()} />
        ));
        expect(getByText(tOrLiteral('cms.node.style.blur'))).toBeTruthy();
        expect(getByText(tOrLiteral('cms.node.style.backdropBlur'))).toBeTruthy();
        expect(getByDisplayValue('4')).toBeTruthy();
        expect(getByDisplayValue('8')).toBeTruthy();
    });

    it('typing a blur value writes it into effects.blur, leaving effects.grayscale untouched', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <NodeStyleTab style={{ effects: { grayscale: 50 } }} onChange={onChange} />);
        const input = getByText(tOrLiteral('cms.node.style.blur')).parentElement!.querySelector('input')!;
        fireEvent.input(input, { target: { value: '6' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ effects: { grayscale: 50, blur: 6 } }));
    });

    it('shows the resolved blendMode LABEL (not the raw CSS value) when effects.blendMode is set', () => {
        const { container } = render(() => <NodeStyleTab style={{ effects: { blendMode: 'multiply' } }} onChange={vi.fn()} />);
        expect(container.textContent).toContain(tOrLiteral('cms.node.style.blendModeMultiply'));
    });

    it('defaults blendMode to its "normal" label when effects.blendMode is unset', () => {
        const { container } = render(() => <NodeStyleTab style={{}} onChange={vi.fn()} />);
        expect(container.textContent).toContain(tOrLiteral('cms.node.style.blendModeNormal'));
    });

    it('selecting "Multiply" from the blendMode Select writes effects.blendMode: \'multiply\'', () => {
        // Same focus+mouseDown DropdownSelect interaction pattern as the existing
        // "selecting 'Thở' writes animate:'breathe'" test above, scoped to the blendMode
        // Select specifically by finding its own label's sibling input.
        const onChange = vi.fn();
        const { getByText } = render(() => <NodeStyleTab style={{}} onChange={onChange} />);
        const blendModeLabel = getByText(tOrLiteral('cms.node.style.blendMode'));
        const blendModeInput = blendModeLabel.parentElement!.querySelector('input')!;
        fireEvent.focus(blendModeInput);
        const multiplyOption = getByText(tOrLiteral('cms.node.style.blendModeMultiply'));
        fireEvent.mouseDown(multiplyOption);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ effects: { blendMode: 'multiply' } }));
    });
});

describe('NodeStyleTab — custom colored Shadow editor (Component System + Visual Fidelity Engine)', () => {
    it('shows no custom-editor fields when style.shadow is unset', () => {
        const { queryByText } = render(() => <NodeStyleTab style={{}} onChange={vi.fn()} />);
        expect(queryByText(tOrLiteral('cms.node.style.shadowColor'))).toBeNull();
    });

    it('clicking the last shadow preset button (lg, per the none/sm/md/lg order) writes a non-empty shadow array', () => {
        // Deliberately does NOT assert the preset button's translated label text (unverified
        // against the real vi dictionary at plan-writing time) — asserts the OBSERVABLE
        // behavior (a shadow array gets written) instead, keyed off document order matching
        // the (['none','sm','md','lg'] as const) iteration order in the implementation.
        //
        // Scoped to the shadow preset row specifically (the shadow label's own sibling
        // container) rather than every <button> in the whole render tree — each
        // InspectorSection renders its own collapse-toggle <button> (one per section, titled
        // with the section's own name), so a global `container.querySelectorAll('button')`
        // would pick up the LAST InspectorSection's header button (Hover), not the "lg"
        // shadow preset button. When style.shadow is unset, this container's only buttons
        // are the 4 presets (the custom editor below it — which itself renders a
        // ColorPickerField swatch <button> — stays unrendered via its `Show` guard).
        //
        // Also: unlike the plan sketch's assumption, the REAL `SHADOW_PRESETS.lg` in this
        // file (mirroring Tailwind's own shadow-lg, which is genuinely a 2-layer box-shadow)
        // is a 2-element array, not 1 — asserting `length` non-specifically (">0") here so
        // this test reflects the actual preset shape rather than an unverified guess.
        const onChange = vi.fn();
        const { getByText } = render(() => <NodeStyleTab style={{}} onChange={onChange} />);
        const shadowRow = getByText(t('cms.node.style.shadowLabel')).parentElement!;
        const presetButtons = Array.from(shadowRow.querySelectorAll('button'));
        expect(presetButtons.length).toBe(4);
        fireEvent.click(presetButtons[presetButtons.length - 1]);
        expect(onChange).toHaveBeenCalled();
        const written = onChange.mock.calls[onChange.mock.calls.length - 1][0].shadow;
        expect(Array.isArray(written)).toBe(true);
        expect(written.length).toBeGreaterThan(0);
    });

    it('reveals and round-trips the custom color/x/y/blur/spread editor once a shadow is set', () => {
        const { getByText, getByDisplayValue } = render(() => (
            <NodeStyleTab style={{ shadow: [{ x: 2, y: 4, blur: 10, spread: 0, color: '#22d3ee80' }] }} onChange={vi.fn()} />
        ));
        expect(getByText(tOrLiteral('cms.node.style.shadowColor'))).toBeTruthy();
        expect(getByDisplayValue('2')).toBeTruthy();
        expect(getByDisplayValue('4')).toBeTruthy();
        expect(getByDisplayValue('10')).toBeTruthy();
    });

    it('changing the shadow color preserves x/y/blur/spread', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleTab style={{ shadow: [{ x: 2, y: 4, blur: 10, spread: 0, color: '#00000040' }] }} onChange={onChange} />
        ));
        const colorInput = getByText(tOrLiteral('cms.node.style.shadowColor')).parentElement!.querySelector('input')!;
        fireEvent.input(colorInput, { target: { value: '#ff000080' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            shadow: [{ x: 2, y: 4, blur: 10, spread: 0, color: '#ff000080' }],
        }));
    });
});

// Task 16 (theme layer / style pipeline) — real typography-role <Select> writing
// `style.typography.role`. Uses this file's own established DropdownSelect interaction
// pattern (focus the underlying <input>, then mousedown the option's rendered text) rather
// than the plan brief's original `getByLabelText` + `fireEvent.change` sketch — this
// codebase's `Select` is a custom div-based popover (DropdownSelect), never a native
// <select>, and none of NodeStyleTab.tsx's existing Selects use `native` either (confirmed
// by re-reading the whole file before writing this test, per the brief's own Step 1).
describe('NodeStyleTab — typography role selector (Task 16, theme layer / style pipeline)', () => {
    it('renders the resolved role LABEL (not the raw value) when typography.role is already set', () => {
        const { container } = render(() => (
            <NodeStyleTab style={{ typography: { role: 'body' } }} onChange={vi.fn()} />
        ));
        expect(container.textContent).toContain(t('cms.node.style.typographyRoleBody'));
    });

    it('selecting a role from the dropdown writes it into typography.role, leaving other typography fields untouched', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleTab style={{ typography: { fontFamily: 'serif' } }} onChange={onChange} />
        ));
        const roleLabel = getByText(t('cms.node.style.typographyRole'));
        const roleInput = roleLabel.parentElement!.querySelector('input')!;
        fireEvent.focus(roleInput);
        fireEvent.mouseDown(getByText(t('cms.node.style.typographyRoleH1')));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            typography: { fontFamily: 'serif', role: 'h1' },
        }));
    });

    it('mounting with no explicit typography.role does NOT fire a spurious onChange', () => {
        const onChange = vi.fn();
        render(() => <NodeStyleTab style={{}} onChange={onChange} />);
        expect(onChange).not.toHaveBeenCalled();
    });
});

// Task 16 — the real color-token-vs-custom picker (ColorTokenOrCustom.tsx) that replaces
// the narrow `as string` casts Task 10 deliberately left on typography/background/border
// color fields ("no token-picker UI yet"). Verifies the SAME `{ tokenRef }` shape
// resolveColorValue()/applyNodeStyle.ts already expect gets written, for both the
// typography color (routed via TypographyColorControl.tsx's solid branch) and a plain
// NodeStyleTab.tsx field (background).
describe('NodeStyleTab — color token picker (Task 16, theme layer / style pipeline)', () => {
    it('writes a tokenRef when a theme color token is chosen for the typography text color', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleTab
                style={{ typography: { color: { type: 'solid', value: '#111111ff' } } }}
                onChange={onChange}
                activeTheme={mockTheme}
            />
        ));
        const tokenLabel = getByText(t('cms.node.style.colorToken'));
        const tokenInput = tokenLabel.parentElement!.querySelector('input')!;
        fireEvent.focus(tokenInput);
        fireEvent.mouseDown(getByText('primary'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            typography: expect.objectContaining({ color: { type: 'solid', value: { tokenRef: 'primary' } } }),
        }));
    });

    it('hides the raw hex ColorControl once a token is active for the typography text color', () => {
        const { queryByText, getByText } = render(() => (
            <NodeStyleTab
                style={{ typography: { color: { type: 'solid', value: { tokenRef: 'primary' } } } }}
                onChange={vi.fn()}
                activeTheme={mockTheme}
            />
        ));
        // ColorTokenOrCustom's `<Show when={!isToken()}>` guard should hide the raw
        // ColorControl's own label ("Màu chữ") while a token is active.
        expect(queryByText(t('cms.node.style.textColor'))).toBeNull();
        expect(getByText('primary')).toBeTruthy();
    });

    it('shows the raw hex ColorControl for a plain custom hex typography color (not a token)', () => {
        const { getByText } = render(() => (
            <NodeStyleTab
                style={{ typography: { color: { type: 'solid', value: '#111111ff' } } }}
                onChange={vi.fn()}
                activeTheme={mockTheme}
            />
        ));
        expect(getByText(t('cms.node.style.textColor'))).toBeTruthy();
    });

    it('writes a tokenRef when a theme color token is chosen for the background color', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeStyleTab
                style={{ background: { type: 'color', value: '#ffffffff' } }}
                onChange={onChange}
                activeTheme={mockTheme}
            />
        ));
        const tokenLabel = getByText(t('cms.node.style.colorToken'));
        const tokenInput = tokenLabel.parentElement!.querySelector('input')!;
        fireEvent.focus(tokenInput);
        fireEvent.mouseDown(getByText('accent'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            background: expect.objectContaining({ value: { tokenRef: 'accent' } }),
        }));
    });

    it('renders an empty token dropdown (no crash) when activeTheme is not supplied', () => {
        const { getByText, queryByText } = render(() => (
            <NodeStyleTab style={{ typography: { color: { type: 'solid', value: '#111111ff' } } }} onChange={vi.fn()} />
        ));
        const tokenLabel = getByText(t('cms.node.style.colorToken'));
        const tokenInput = tokenLabel.parentElement!.querySelector('input')!;
        fireEvent.focus(tokenInput);
        expect(queryByText('primary')).toBeNull();
    });
});
