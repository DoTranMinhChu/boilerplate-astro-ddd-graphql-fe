// src/core/components/control/SpacingControl.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { SpacingControl } from './SpacingControl';

describe('SpacingControl', () => {
    it('renders 4 number inputs seeded from t/r/b/l', () => {
        // NOTE: values deliberately distinct (brief's literal { t: 8, r: 12, b: 8, l: 12 }
        // has t===b and r===l, which makes getByDisplayValue ambiguous — 2 real inputs
        // legitimately share each value, so the query throws "found multiple elements"
        // regardless of implementation correctness. Using 4 distinct values preserves
        // the test's intent (verify all 4 sides render their seeded value) without the
        // false ambiguity.
        const { getByDisplayValue } = render(() => (
            <SpacingControl label="Padding" value={{ t: 8, r: 12, b: 4, l: 16 }} onChange={vi.fn()} />
        ));
        expect(getByDisplayValue('8')).toBeTruthy();
        expect(getByDisplayValue('12')).toBeTruthy();
        expect(getByDisplayValue('4')).toBeTruthy();
        expect(getByDisplayValue('16')).toBeTruthy();
    });

    it('unlinked (default): editing one side only changes that side', () => {
        const onChange = vi.fn();
        const { container } = render(() => <SpacingControl label="Padding" value={{ t: 8 }} onChange={onChange} />);
        // NOTE: MaskedInput (imask) hardcodes type="string" on its real <input> (see
        // MaskedInput.tsx), not "text" or no-type as the brief's selector assumed —
        // broadened to match the actual DOM.
        const inputs = container.querySelectorAll('input[type="text"], input[type="string"], input:not([type])');
        // Top input is the first InputNumber rendered (see component layout).
        fireEvent.input(inputs[0], { target: { value: '16' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ t: 16 }));
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
        expect(lastCall.r).toBeUndefined();
    });

    it('linked: clicking the link toggle then editing one side writes the same value to all 4 sides', async () => {
        const onChange = vi.fn();
        const { getByRole, container } = render(() => <SpacingControl label="Padding" value={{}} onChange={onChange} />);
        await fireEvent.click(getByRole('button'));
        const inputs = container.querySelectorAll('input[type="text"], input[type="string"], input:not([type])');
        fireEvent.input(inputs[0], { target: { value: '20' } });
        expect(onChange).toHaveBeenCalledWith({ t: 20, r: 20, b: 20, l: 20 });
    });
});
