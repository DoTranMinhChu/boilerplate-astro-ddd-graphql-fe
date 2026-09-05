// @vitest-environment jsdom
//
// Regression tests for Bug B (Task 14 follow-up, commit 24350cf — "fix(cms): fix
// enabledModes double-toggle + array corruption"). `ModeMultiSelectField` binds its whole
// array via AMBIENT `createControl<string[]>('array', {})` (no explicit value/onChange
// props exposed) — the same convention as `Datatable.Field` production usage in
// `manageContentTypes.page.tsx` (`Datatable.Field` IS `Field` from generateForm.tsx, just
// specialized to that page's FormValues generic).
//
// Precedent check (per review request): no existing test in this codebase unit-tests an
// ambient-createControl-bound component through a real Field/Form. `FieldGridLayoutDesigner`
// and `ContentFilterListInput` (the two components named in the review as sharing this
// convention) have NO test file at all. Every existing `test/core/components/control/*.test.tsx`
// (Checkbox, SegmentedControl, ...) either takes explicit value/onChange props or passes
// `fieldless` to bypass the ambient Field wiring entirely — an escape hatch
// `ModeMultiSelectField` does not have (it hardcodes `createControl<string[]>('array', {})`
// with no `fieldless`, so without a real `Field` ancestor `useField()` still returns a context,
// but `hasField()` is false only when `field.name()` is falsy). So this file is the first
// precedent for that pattern in this repo.
//
// Harness choice: rather than hand-roll a fake FormContext.Provider (which would risk not
// exercising the real registerField -> onValueSet -> onChange wiring the production bug lived
// in), this uses the REAL `generateForm()` + its `Form`/`Form.Field` output — the exact same
// factory `generateDatatable`/`Datatable.Field` is built on. This is the simplest harness that
// is still provably real: it goes through the identical code path as
// manageContentTypes.page.tsx's `<Datatable.Field name="...enabledModes"><ModeMultiSelectField
// .../></Datatable.Field>`.
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { generateForm } from '@core/components/form/generateForm';
import { ModeMultiSelectField } from '@modules/cms/admin/ModeMultiSelectField';

const OPTIONS = [
    { value: 'table', label: 'Table' },
    { value: 'kanban', label: 'Kanban' },
    { value: 'gallery', label: 'Gallery' },
];

type FormValues = { modes: string[] };

function renderField(initialValues?: Partial<FormValues>) {
    const { Form, values } = generateForm<FormValues, any>({});
    const utils = render(() => (
        <Form initialValues={initialValues as FormValues}>
            <Form.Field name="modes">
                <ModeMultiSelectField options={OPTIONS} />
            </Form.Field>
        </Form>
    ));
    return { ...utils, values };
}

describe('ModeMultiSelectField — array add/remove/undefined-init (Bug B lock-in)', () => {
    it('renders correctly with an undefined ambient value: no options pre-checked, no crash', () => {
        const { getAllByRole } = renderField(undefined);
        const rows = getAllByRole('checkbox');
        expect(rows).toHaveLength(3);
        rows.forEach((row) => expect(row.getAttribute('aria-checked')).toBe('false'));
    });

    it('clicking an unchecked option adds it to the emitted array (starting from empty/undefined ambient value)', () => {
        const { getByText, values } = renderField(undefined);
        fireEvent.click(getByText('Table'));
        expect(values().modes).toEqual(['table']);
    });

    it('clicking a second unchecked option appends (does not clobber the first)', () => {
        const { getByText, values } = renderField(undefined);
        fireEvent.click(getByText('Table'));
        fireEvent.click(getByText('Kanban'));
        expect(values().modes).toEqual(['table', 'kanban']);
    });

    it('clicking an already-checked option removes it (not just appends again) — core "remove path is real" behavior', () => {
        const { getByText, getAllByRole, values } = renderField({ modes: ['table', 'kanban'] });
        // Pre-checked from ambient value: sanity-check the harness actually seeded state before
        // asserting the removal itself.
        const rows = getAllByRole('checkbox');
        expect(rows.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'true', 'false']);

        fireEvent.click(getByText('Table'));
        expect(values().modes).toEqual(['kanban']);

        // The array shape must be a genuine array (Bug B's failure mode was a plain object like
        // `{dialog: false, ...}`), not just "truthy".
        expect(Array.isArray(values().modes)).toBe(true);
    });
});
