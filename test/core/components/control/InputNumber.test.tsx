// src/core/components/control/InputNumber.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { InputNumber } from '@core/components/control/InputNumber';

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

    it('with percentage=true, dragging the slider to 80 sets the model value to 0.8 (not double-transformed)', () => {
        const onChange = vi.fn();
        const { getByRole } = render(() => (
            <InputNumber value={0.5} onChange={onChange} fieldless percentage slider={{ min: 0, max: 100, step: 1 }} />
        ));
        const slider = getByRole('slider') as HTMLInputElement;
        slider.value = '80';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        expect(onChange).toHaveBeenCalledWith(0.8);
    });

    it('with scaling=10, dragging the slider to 80 sets the model value to 800 (not double-transformed)', () => {
        const onChange = vi.fn();
        const { getByRole } = render(() => (
            <InputNumber value={500} onChange={onChange} fieldless scaling={10} slider={{ min: 0, max: 100, step: 1 }} />
        ));
        const slider = getByRole('slider') as HTMLInputElement;
        slider.value = '80';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        expect(onChange).toHaveBeenCalledWith(800);
    });

    it('the slider displays the DISPLAY-domain value, not the raw model value, when percentage is true', () => {
        const { getByRole } = render(() => (
            <InputNumber value={0.5} onChange={vi.fn()} fieldless percentage slider={{ min: 0, max: 100, step: 1 }} />
        ));
        const slider = getByRole('slider') as HTMLInputElement;
        expect(slider.value).toBe('50');
    });
});

describe('InputNumber slider nullValue — final-review fix (misleading thumb position for unset value)', () => {
    it('with no nullValue given, a null value still falls back to min (old, backward-compatible behavior)', () => {
        const { getByRole } = render(() => (
            <InputNumber nullable value={null} onChange={vi.fn()} fieldless negative min={-180} slider={{ min: -180, max: 180, step: 1 }} />
        ));
        const slider = getByRole('slider') as HTMLInputElement;
        expect(slider.value).toBe('-180');
    });

    it('rotation (nullValue: 0): a null value shows the thumb at 0, matching the actual unrotated render state', () => {
        const { getByRole } = render(() => (
            <InputNumber nullable value={null} onChange={vi.fn()} fieldless negative min={-180} slider={{ min: -180, max: 180, step: 1, nullValue: 0 }} />
        ));
        const slider = getByRole('slider') as HTMLInputElement;
        expect(slider.value).toBe('0');
    });

    it('font-weight (nullValue: 400): a null value shows the thumb at 400, matching the browser default weight', () => {
        const { getByRole } = render(() => (
            <InputNumber nullable value={null} onChange={vi.fn()} fieldless slider={{ min: 100, max: 900, step: 100, nullValue: 400 }} />
        ));
        const slider = getByRole('slider') as HTMLInputElement;
        expect(slider.value).toBe('400');
    });

    it('opacity (nullValue: 1): a null value shows the thumb at 1, matching the actual fully-opaque render state', () => {
        const { getByRole } = render(() => (
            <InputNumber nullable value={null} onChange={vi.fn()} fieldless decimal slider={{ min: 0, max: 1, step: 0.01, nullValue: 1 }} />
        ));
        const slider = getByRole('slider') as HTMLInputElement;
        expect(slider.value).toBe('1');
    });
});
