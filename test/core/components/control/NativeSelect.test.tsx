// src/core/components/control/NativeSelect.test.tsx
// @vitest-environment jsdom
//
// Phase 8 (targetUI rebuild) dogfooding find: `<Select native clearable>` (KitStarterFields.tsx's
// "Bắt đầu từ bộ kit" picker — the only real caller of `native` today) never renders a blank
// placeholder <option>, because `Select.tsx` never forwards `clearable` down into `NativeSelect`.
// A browser then default-selects the FIRST real <option> in the DOM while the underlying Solid
// `value` signal stays '' — the picker LOOKS like a kit is chosen when none is, so
// `kitSelection()` stays null and `createPageWithOptionalKit` silently takes the plain
// `createPage()` branch. Reproduced live: creating a page with "Gaming Neon" visibly highlighted
// produced a page with zero Sections.
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Select } from '@core/components/control/Select';

describe('Select native + clearable renders a real blank option', () => {
    it('shows the empty placeholder as an actual <option value=""> so an empty value has somewhere to point', () => {
        const { container } = render(() => (
            <Select
                native
                fieldless
                clearable
                placeholder="Chưa chọn"
                value=""
                onChange={vi.fn()}
                options={[
                    { value: 'gaming-neon', label: 'Gaming Neon' },
                    { value: 'academy-warm', label: 'Academy Warm' },
                ]}
            />
        ));
        const select = container.querySelector('select') as HTMLSelectElement;
        expect(select).toBeTruthy();
        const optionValues = Array.from(select.options).map((o) => o.value);
        expect(optionValues[0]).toBe('');
        expect(select.options[0].textContent).toBe('Chưa chọn');
        // The empty option must be the one actually selected when value=""  — not the first real one.
        expect(select.value).toBe('');
    });
});
