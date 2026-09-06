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

    it('commits a new placement anchored on where the pointer ENTERS the canvas, not on the tray pointerdown position', () => {
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

        // Pointerdown fires ABOVE the canvas (negative clientY, and an clientX that would be col 0
        // if it were wrongly used as the anchor) — simulating the tray chip's real screen position.
        fireEvent.pointerDown(trayChip, { clientX: 20, clientY: -100 });
        // First move that actually lands inside the canvas: col 7, row 2 (100px/col, 64px/row).
        fireEvent.pointerMove(window, { clientX: 750, clientY: 130 });
        // Drag further right within the canvas: col 9.
        fireEvent.pointerMove(window, { clientX: 950, clientY: 130 });
        fireEvent.pointerUp(window, { clientX: 950, clientY: 130 });

        expect(values().gridLayout).toEqual([{ fieldKey: 'title', colStart: 8, colSpan: 3, row: 2 }]);
    });

    it('updates the target row as the pointer keeps moving after entering the canvas (row is NOT frozen at the entry row)', () => {
        // Regression test for a second bug found via live browser verification of the fix above:
        // freezing BOTH startCol AND startRow at the first in-canvas move (matching the pattern
        // used for the column range-select) meant a real drag from the tray — which always enters
        // the canvas through its topmost currently-rendered row, since the tray sits above the
        // canvas — could never land anywhere but that entry row, no matter how much further down
        // the pointer moved afterward. Unlike columns (which have a genuine anchor-to-current
        // range for width), a field has no rowSpan, so row must keep tracking the CURRENT cell on
        // every move and commit wherever the pointer is at release, not wherever it first entered.
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

        fireEvent.pointerDown(trayChip, { clientX: 20, clientY: -100 });
        // First lands inside the canvas at row 0 (col 2) ...
        fireEvent.pointerMove(window, { clientX: 250, clientY: 10 });
        // ... then keeps moving down into row 2 (same column) before releasing.
        fireEvent.pointerMove(window, { clientX: 250, clientY: 150 });
        fireEvent.pointerUp(window, { clientX: 250, clientY: 150 });

        expect(values().gridLayout).toEqual([{ fieldKey: 'title', colStart: 3, colSpan: 1, row: 2 }]);
    });

    it('does not commit a placement if the pointer never enters the canvas before pointerup', () => {
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

        fireEvent.pointerDown(trayChip, { clientX: 20, clientY: -100 });
        fireEvent.pointerUp(window, { clientX: 20, clientY: -100 });

        expect(values().gridLayout).toEqual([]);
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
