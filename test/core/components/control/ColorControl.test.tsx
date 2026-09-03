// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { ColorControl } from '@core/components/control/ColorControl';

describe('ColorControl', () => {
    it('shows the current hex value in the text input', () => {
        const { getByDisplayValue } = render(() => (
            <ColorControl label="Text color" value="#ff0000" defaultValue="#171717" onChange={vi.fn()} />
        ));
        expect(getByDisplayValue('#ff0000')).toBeTruthy();
    });

    it('falls back to defaultValue when no value is set', () => {
        const { getByDisplayValue } = render(() => (
            <ColorControl label="Text color" defaultValue="#171717" onChange={vi.fn()} />
        ));
        expect(getByDisplayValue('#171717')).toBeTruthy();
    });

    it('calls onChange when the hex text input changes', async () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <ColorControl label="Text color" value="#ff0000" defaultValue="#171717" onChange={onChange} />
        ));
        const input = getByDisplayValue('#ff0000') as HTMLInputElement;
        await fireEvent.input(input, { target: { value: '#00ff00' } });
        expect(onChange).toHaveBeenCalledWith('#00ff00');
    });
});
