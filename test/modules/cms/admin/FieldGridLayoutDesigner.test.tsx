// @vitest-environment jsdom
//
// Fix round mục B (Task 6) — `FieldGridLayoutDesigner` rewritten from a pixel-based free-drag
// interaction into an Excel-style range-select interaction (visible 12-col gridlines, an
// explicit "unplaced fields" tray, drag-from-tray-to-place, snapped move/resize).
//
// Reality check done BEFORE writing this file (per this task's brief, Step 1): the brief assumed
// `test/modules/cms/admin/FieldGridLayoutDesigner.test.tsx` already existed with a real setup
// helper to match. It does not — `Glob` over `test/modules/cms/admin/*.test.tsx` confirms this is
// the FIRST test file for this component. The brief also sketches an `onChangeSpy` this
// component's real (unchanged) binding contract does not expose — `FieldGridLayoutDesigner` has
// no explicit value/onChange props, only ambient `createControl<FieldGridLayoutItem[]>
// ('object_array', {})`, same convention as `ModeMultiSelectField` (see
// `ModeMultiSelectField.test.tsx`'s own header comment: at the time it was written, it was the
// FIRST precedent in this repo for testing an ambient-createControl-bound component, and its
// harness choice was a REAL `generateForm()` + `Form`/`Form.Field` — the same factory
// `Datatable.Field` (production call site, `manageContentTypes.page.tsx`:
// `<Datatable.Field name="formConfig.gridLayout">`) is built on, so it exercises the identical
// registerField -> onValueSet -> onChange wiring instead of a hand-rolled fake context. This file
// reuses that exact precedent rather than inventing a second harness style. Committed placements
// are read back via the form's own `values().gridLayout`, standing in for the brief's guessed
// `onChangeSpy`.
//
// Also not available in this repo: `@testing-library/jest-dom` (not a package.json dependency;
// no other test file in this repo uses `toHaveStyle`) — so the "saved position" assertion reads
// the raw DOM `style` property directly instead of the brief's sketched `toHaveStyle(...)`.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { generateForm } from '@core/components/form/generateForm';
import { FieldGridLayoutDesigner } from '@modules/cms/admin/FieldGridLayoutDesigner';
import type { FieldGridLayoutItem } from '@/modules/cms/cms.types';

const FIELDS = [
    { key: 'title', label: 'Title' },
    { key: 'excerpt', label: 'Excerpt' },
] as any;

type FormValues = { gridLayout: FieldGridLayoutItem[] };

function renderField(initialLayout: FieldGridLayoutItem[]) {
    const { Form, values } = generateForm<FormValues, any>({});
    const utils = render(() => (
        <Form initialValues={{ gridLayout: initialLayout }}>
            <Form.Field name="gridLayout">
                <FieldGridLayoutDesigner fields={FIELDS} />
            </Form.Field>
        </Form>
    ));
    return { ...utils, values };
}

describe('FieldGridLayoutDesigner', () => {
    it('shows an unplaced field in the tray when value() is empty', () => {
        const { container } = renderField([]);
        expect(container.textContent).toContain('Title');
        expect(container.textContent).toContain('Excerpt');
    });

    it('does NOT auto-stack an unplaced field into the grid (tray only, until explicitly placed)', () => {
        const { container } = renderField([]);
        // The grid canvas itself (not the tray) should have 0 placed blocks — only the
        // decorative gridline cells and (once dragged) real placements ever live there. This is
        // the behavior-change assertion: the OLD implementation called
        // `assignDefaultGridPositions` for its own preview, which would have auto-stacked both
        // fields into the grid immediately (making this assertion fail against the old code).
        const canvas = container.querySelector('.grid.grid-cols-12');
        expect(canvas?.querySelectorAll('.border-main-200').length).toBe(0);
    });

    it('renders a placed field inside the grid, not the tray, at its saved position', () => {
        const { container } = renderField([{ fieldKey: 'title', colStart: 1, colSpan: 6, row: 0 }]);
        const placedBlock = container.querySelector('.border-main-200') as HTMLElement;
        expect(placedBlock?.textContent).toContain('Title');
        expect(placedBlock.style.left).toBe('0%');
        expect(placedBlock.style.width).toBe('50%');
    });

    it('commits a new placement from a tray drag: pointerdown on tray chip -> pointermove 3 cells right -> pointerup', () => {
        const { container, values } = renderField([]);
        const canvas = container.querySelector('.grid.grid-cols-12') as HTMLElement;
        vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
            left: 0,
            top: 0,
            width: 1200,
            right: 1200,
            bottom: 1000,
            height: 1000,
        } as DOMRect);
        const trayChip = Array.from(container.querySelectorAll('.cursor-grab')).find((el) => el.textContent === 'Title')!;

        fireEvent.pointerDown(trayChip, { clientX: 0, clientY: 0 }); // cell col 0, row 0
        fireEvent.pointerMove(window, { clientX: 250, clientY: 0 }); // 100px/col -> col 2
        fireEvent.pointerUp(window, { clientX: 250, clientY: 0 });

        expect(values().gridLayout).toEqual([{ fieldKey: 'title', colStart: 1, colSpan: 3, row: 0 }]);
    });

    it('snaps an existing placement to whole cells when dragged (move)', () => {
        const { container, values } = renderField([{ fieldKey: 'title', colStart: 1, colSpan: 3, row: 0 }]);
        const canvas = container.querySelector('.grid.grid-cols-12') as HTMLElement;
        vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
            left: 0,
            top: 0,
            width: 1200,
            right: 1200,
            bottom: 1000,
            height: 1000,
        } as DOMRect);
        const placedBlock = container.querySelector('.border-main-200') as HTMLElement;

        fireEvent.pointerDown(placedBlock, { clientX: 0, clientY: 0 });
        fireEvent.pointerMove(window, { clientX: 200, clientY: 64 }); // +2 cols, +1 row (ROW_HEIGHT=64)
        fireEvent.pointerUp(window, { clientX: 200, clientY: 64 });

        expect(values().gridLayout).toEqual([{ fieldKey: 'title', colStart: 3, colSpan: 3, row: 1 }]);
    });
});
