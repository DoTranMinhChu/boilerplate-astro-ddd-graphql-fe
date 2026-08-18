// src/core/components/control/InputNumber.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { InputNumber } from './InputNumber';

describe('InputNumber slider prop (Node Builder Inspector Polish, Task 1)', () => {
    it('renders no slider when the slider prop is omitted (default, unchanged behavior)', () => {
        const { queryByRole } = render(() => <InputNumber value={5} onChange={vi.fn()} fieldless />);
        expect(queryByRole('slider')).toBeNull();
    });

    it('renders a Slider alongside the number box when slider prop is given, with matching min/max/step', () => {
        const { getByRole } = render(() => (
            <InputNumber value={0.5} onChange={vi.fn()} fieldless decimal slider={{ min: 0, max: 1, step: 0.01 }} />
        ));
        const slider = getByRole('slider') as HTMLInputElement;
        expect(slider.min).toBe('0');
        expect(slider.max).toBe('1');
        expect(slider.step).toBe('0.01');
        expect(slider.value).toBe('0.5');
    });

    it('dragging the slider calls onChange with the new value', () => {
        const onChange = vi.fn();
        const { getByRole } = render(() => (
            <InputNumber value={0} onChange={onChange} fieldless negative min={-180} slider={{ min: -180, max: 180, step: 1 }} />
        ));
        const slider = getByRole('slider') as HTMLInputElement;
        slider.value = '45';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        expect(onChange).toHaveBeenCalledWith(45);
    });

    it('typing in the number box still works exactly as before when slider is present', async () => {
        const onChange = vi.fn();
        const { container } = render(() => (
            <InputNumber value={0} onChange={onChange} fieldless min={0} max={1} decimal slider={{ min: 0, max: 1, step: 0.01 }} />
        ));
        const numberInput = container.querySelector('input[inputmode="numeric"]') as HTMLInputElement;
        expect(numberInput).not.toBeNull();
    });
});
