// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { Checkbox } from './Checkbox';

describe('Checkbox accessibility', () => {
    it('has role="checkbox" and reflects aria-checked', () => {
        const { getByRole } = render(() => <Checkbox value={false} onChange={vi.fn()} fieldless />);
        const el = getByRole('checkbox');
        expect(el.getAttribute('aria-checked')).toBe('false');
    });

    it('aria-checked is "true" when value is true', () => {
        const { getByRole } = render(() => <Checkbox value={true} onChange={vi.fn()} fieldless />);
        expect(getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
    });

    it('Space key toggles the value, same as Enter', () => {
        const onChange = vi.fn();
        const { getByRole } = render(() => <Checkbox value={false} onChange={onChange} fieldless />);
        fireEvent.keyDown(getByRole('checkbox'), { key: ' ' });
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('Enter key still toggles the value (unchanged behavior)', () => {
        const onChange = vi.fn();
        const { getByRole } = render(() => <Checkbox value={false} onChange={onChange} fieldless />);
        fireEvent.keyDown(getByRole('checkbox'), { key: 'Enter' });
        expect(onChange).toHaveBeenCalledWith(true);
    });
});
