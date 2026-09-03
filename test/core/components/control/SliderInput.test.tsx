// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { SliderInput } from '@core/components/control/SliderInput';

describe('SliderInput', () => {
    it('renders the label text', () => {
        const { getByText } = render(() => (
            <SliderInput label="Rotation" value={45} min={-180} max={180} step={1} nullValue={0} onChange={vi.fn()} />
        ));
        expect(getByText('Rotation')).toBeTruthy();
    });

    it('renders a range input reflecting the current value', () => {
        const { container } = render(() => (
            <SliderInput label="Opacity" value={0.5} min={0} max={1} step={0.01} nullValue={1} decimal inputMin={0} inputMax={1} onChange={vi.fn()} />
        ));
        const range = container.querySelector('input[type="range"]') as HTMLInputElement;
        expect(range).toBeTruthy();
        expect(range.value).toBe('0.5');
    });

    it('falls back to nullValue on the slider when value is null', () => {
        const { container } = render(() => (
            <SliderInput label="Font weight" value={null} min={100} max={900} step={100} nullValue={400} onChange={vi.fn()} />
        ));
        const range = container.querySelector('input[type="range"]') as HTMLInputElement;
        expect(range.value).toBe('400');
    });
});
