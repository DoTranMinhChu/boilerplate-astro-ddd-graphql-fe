// src/core/components/control/Slider.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Slider } from '@core/components/control/Slider';

describe('Slider (Node Builder Inspector Polish, Task 1)', () => {
    it('renders a native range input with the given min/max/step/value', () => {
        const { getByRole } = render(() => <Slider value={0.5} min={0} max={1} step={0.01} onChange={vi.fn()} />);
        const el = getByRole('slider') as HTMLInputElement;
        expect(el.type).toBe('range');
        expect(el.min).toBe('0');
        expect(el.max).toBe('1');
        expect(el.step).toBe('0.01');
        expect(el.value).toBe('0.5');
    });

    it('calls onChange with a parsed number when dragged', () => {
        const onChange = vi.fn();
        const { getByRole } = render(() => <Slider value={0} min={0} max={360} step={1} onChange={onChange} />);
        const el = getByRole('slider') as HTMLInputElement;
        el.value = '90';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        expect(onChange).toHaveBeenCalledWith(90);
    });
});
