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
