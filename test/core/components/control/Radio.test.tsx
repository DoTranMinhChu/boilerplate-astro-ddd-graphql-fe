// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Radio } from '@core/components/control/Radio';

describe('Radio accessibility', () => {
    const options = [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
    ];

    it('renders each option with role="radio", not role="checkbox"', () => {
        const { getAllByRole, queryAllByRole } = render(() => (
            <Radio value="a" options={options} onChange={vi.fn()} />
        ));
        expect(getAllByRole('radio')).toHaveLength(2);
        expect(queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('marks only the selected option aria-checked=true', () => {
        const { getAllByRole } = render(() => (
            <Radio value="a" options={options} onChange={vi.fn()} />
        ));
        const [optionA, optionB] = getAllByRole('radio');
        expect(optionA.getAttribute('aria-checked')).toBe('true');
        expect(optionB.getAttribute('aria-checked')).toBe('false');
    });

    it('wraps the options in a role="radiogroup" container', () => {
        const { getByRole } = render(() => (
            <Radio value="a" options={options} onChange={vi.fn()} />
        ));
        expect(getByRole('radiogroup')).toBeTruthy();
    });
});
