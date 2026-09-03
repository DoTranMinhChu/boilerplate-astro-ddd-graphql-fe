// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { IconRadioGroup } from '@core/components/control/IconRadioGroup';

describe('IconRadioGroup', () => {
    const options = [
        { value: 'a', label: 'Option A', icon: 'heroicons-outline:sparkles' },
        { value: 'b', label: 'Option B', icon: 'heroicons-outline:moon' },
    ] as const;

    it('renders every option label', () => {
        const { getByText } = render(() => <IconRadioGroup value="a" options={[...options]} onChange={vi.fn()} />);
        expect(getByText('Option A')).toBeTruthy();
        expect(getByText('Option B')).toBeTruthy();
    });

    it('marks the current value aria-pressed=true and the rest false', () => {
        const { getByText } = render(() => <IconRadioGroup value="a" options={[...options]} onChange={vi.fn()} />);
        expect(getByText('Option A').closest('button')?.getAttribute('aria-pressed')).toBe('true');
        expect(getByText('Option B').closest('button')?.getAttribute('aria-pressed')).toBe('false');
    });

    it('calls onChange with the clicked option value', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <IconRadioGroup value="a" options={[...options]} onChange={onChange} />);
        fireEvent.click(getByText('Option B').closest('button')!);
        expect(onChange).toHaveBeenCalledWith('b');
    });
});
