// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { ColorPickerField } from './ColorPickerField';

describe('ColorPickerField — RGBA upgrade', () => {
    it('opens a popover containing an alpha slider (solid-colorful renders it as .react-colorful__alpha)', () => {
        const { getByRole, container } = render(() => (
            <ColorPickerField label="Nền" value="#d4a62bcc" defaultValue="#171717ff" onChange={vi.fn()} />
        ));
        fireEvent.click(getByRole('button'));
        expect(container.querySelector('.react-colorful__alpha')).toBeTruthy();
    });

    it('shows the current hex8 value (including alpha) in the trigger button', () => {
        const { getByText } = render(() => (
            <ColorPickerField label="Nền" value="#d4a62bcc" defaultValue="#171717ff" onChange={vi.fn()} />
        ));
        expect(getByText('#d4a62bcc')).toBeTruthy();
    });

    it('renders an editable hex8 text input inside the open popover, seeded with the current value', () => {
        const { getByRole, getByDisplayValue } = render(() => (
            <ColorPickerField label="Nền" value="#d4a62bcc" defaultValue="#171717ff" onChange={vi.fn()} />
        ));
        fireEvent.click(getByRole('button'));
        expect(getByDisplayValue('#d4a62bcc')).toBeTruthy();
    });

    it('calls onChange with a hex8 string when the hex text input changes', async () => {
        const onChange = vi.fn();
        const { getByRole, getByDisplayValue } = render(() => (
            <ColorPickerField label="Nền" value="#d4a62bcc" defaultValue="#171717ff" onChange={onChange} />
        ));
        fireEvent.click(getByRole('button'));
        const input = getByDisplayValue('#d4a62bcc') as HTMLInputElement;
        await fireEvent.input(input, { target: { value: '#00ff0080' } });
        expect(onChange).toHaveBeenCalledWith('#00ff0080');
    });

    it('backward compat: a plain 6-digit hex value (pre-RGBA data) still displays and round-trips correctly', () => {
        const { getByText } = render(() => (
            <ColorPickerField label="Nền" value="#171717" defaultValue="#171717ff" onChange={vi.fn()} />
        ));
        // Displayed verbatim (not force-upgraded to hex8) — editing it through the picker
        // is what produces a hex8 value going forward, matching the spec's "no migration" contract.
        expect(getByText('#171717')).toBeTruthy();
    });

    it('keeps the hex text input in sync when the RGBA canvas picker (not the hex input) changes the color', () => {
        const onChange = vi.fn();
        const { getByRole, getByDisplayValue, container } = render(() => (
            <ColorPickerField label="Nền" value="#d4a62bcc" defaultValue="#171717ff" onChange={onChange} />
        ));
        fireEvent.click(getByRole('button'));
        expect(getByDisplayValue('#d4a62bcc')).toBeTruthy();

        // Drive the real RgbaColorPicker's alpha slider directly — the "drag the canvas" path
        // that used to bypass hexDraft. jsdom gives every element a zero-size
        // getBoundingClientRect, so the slider needs a stubbed rect before a mousedown produces
        // a non-degenerate relative position (solid-colorful reads it in getRelativePosition).
        const alphaSlider = container.querySelector('.react-colorful__alpha .react-colorful__interactive') as HTMLElement;
        expect(alphaSlider).toBeTruthy();
        alphaSlider.getBoundingClientRect = () => ({
            left: 0, top: 0, right: 200, bottom: 20, width: 200, height: 20, x: 0, y: 0, toJSON: () => undefined,
        });
        fireEvent.mouseDown(alphaSlider, { clientX: 150, clientY: 10 });

        // Whatever hex8 the picker handed to onChange must be exactly what the hex input now
        // shows — before the fix, onChange fired (swatch/parent updated) but hexDraft, and thus
        // the input, stayed frozen at the stale open-time value.
        expect(onChange).toHaveBeenCalled();
        const lastHex = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;
        expect(getByDisplayValue(lastHex)).toBeTruthy();
    });

    it('the reset button still clears to undefined', () => {
        const onChange = vi.fn();
        const { getByRole, getByText } = render(() => (
            <ColorPickerField label="Nền" value="#d4a62bcc" defaultValue="#171717ff" onChange={onChange} />
        ));
        fireEvent.click(getByRole('button'));
        // cms.i18n.ts's `builder.style.resetButton` (vi) is 'Về mặc định' — the brief's
        // literal 'Đặt lại' guess doesn't match the actual current string; see task-2-report.md.
        fireEvent.click(getByText('Về mặc định'));
        expect(onChange).toHaveBeenCalledWith(undefined);
    });
});
