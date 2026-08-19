// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
    const options = [
        { value: 'desktop', label: 'Desktop' },
        { value: 'tablet', label: 'Tablet' },
        { value: 'mobile', label: 'Mobile' },
    ] as const;

    it('renders one button per option', () => {
        const { getAllByRole } = render(() => <SegmentedControl value="desktop" options={[...options]} onChange={vi.fn()} />);
        expect(getAllByRole('button')).toHaveLength(3);
    });

    it('marks the current value as selected', () => {
        const { getByText } = render(() => <SegmentedControl value="tablet" options={[...options]} onChange={vi.fn()} />);
        expect(getByText('Tablet').className).toContain('bg-nb-accent');
        expect(getByText('Desktop').className).not.toContain('bg-nb-accent');
    });

    it('calls onChange with the clicked option value', async () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <SegmentedControl value="desktop" options={[...options]} onChange={onChange} />);
        await fireEvent.click(getByText('Mobile'));
        expect(onChange).toHaveBeenCalledWith('mobile');
    });
});
