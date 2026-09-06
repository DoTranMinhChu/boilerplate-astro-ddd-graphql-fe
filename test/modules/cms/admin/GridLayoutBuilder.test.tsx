// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { generateForm } from '@core/components/form/generateForm';
import { GridLayoutBuilder } from '@modules/cms/admin/GridLayoutBuilder';
import type { FieldGridLayoutItem } from '@/modules/cms/cms.types';

const FIELDS = [
    { key: 'title', label: 'Title' },
    { key: 'excerpt', label: 'Excerpt' },
] as any;

type FormValues = { gridLayout: FieldGridLayoutItem[] };

function renderBuilder(initialLayout: FieldGridLayoutItem[]) {
    const { Form, values } = generateForm<FormValues, any>({});
    const utils = render(() => (
        <Form initialValues={{ gridLayout: initialLayout }}>
            <Form.Field name="gridLayout">
                <GridLayoutBuilder fields={FIELDS} />
            </Form.Field>
        </Form>
    ));
    return { ...utils, values };
}

function mockCanvasRect(container: HTMLElement) {
    const canvas = container.querySelector('.grid.grid-cols-12') as HTMLElement;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 1200, right: 1200, bottom: 1000, height: 1000,
    } as DOMRect);
    return canvas;
}

describe('GridLayoutBuilder', () => {
    it('shows an unplaced field in the tray when value() is empty', () => {
        const { container } = renderBuilder([]);
        expect(container.textContent).toContain('Title');
        expect(container.textContent).toContain('Excerpt');
    });

    it('does NOT auto-stack an unplaced field into the grid (tray only, until explicitly placed)', () => {
        const { container } = renderBuilder([]);
        const canvas = container.querySelector('.grid.grid-cols-12');
        expect(canvas?.querySelectorAll('.border-main-200').length).toBe(0);
    });

    it('renders a placed field inside the grid at its saved 2D position (colSpan x rowSpan)', () => {
        const { container } = renderBuilder([{ fieldKey: 'title', colStart: 1, colSpan: 6, rowStart: 1, rowSpan: 2 }]);
        const placedBlock = container.querySelector('.border-main-200') as HTMLElement;
        expect(placedBlock?.textContent).toContain('Title');
        expect(placedBlock.style.left).toBe('0%');
        expect(placedBlock.style.width).toBe('50%');
        expect(placedBlock.style.top).toBe('68px'); // rowStart 1 * 64 + 4
        expect(placedBlock.style.height).toBe('120px'); // rowSpan 2 * 64 - 8
    });

    it('commits a 2D placement from a tray drag spanning multiple columns AND rows', () => {
        const { container, values } = renderBuilder([]);
        mockCanvasRect(container);
        const trayChip = Array.from(container.querySelectorAll('.cursor-grab')).find((el) => el.textContent === 'Title')!;

        // Pointerdown ABOVE the canvas (simulating the tray chip's real screen position).
        fireEvent.pointerDown(trayChip, { clientX: 20, clientY: -100 });
        // First in-canvas move establishes the anchor: col 2, row 1 (100px/col, 64px/row).
        fireEvent.pointerMove(window, { clientX: 250, clientY: 90 });
        // Drag further right AND down: col 5, row 3 — this is the multi-row-and-column case the
        // superseded component's own bug history requires every drag test to exercise.
        fireEvent.pointerMove(window, { clientX: 550, clientY: 220 });
        fireEvent.pointerUp(window, { clientX: 550, clientY: 220 });

        expect(values().gridLayout).toEqual([{ fieldKey: 'title', colStart: 3, colSpan: 4, rowStart: 1, rowSpan: 3, align: 'stretch' }]);
    });

    it('does not commit a placement if the pointer never enters the canvas before pointerup', () => {
        const { container, values } = renderBuilder([]);
        mockCanvasRect(container);
        const trayChip = Array.from(container.querySelectorAll('.cursor-grab')).find((el) => el.textContent === 'Title')!;

        fireEvent.pointerDown(trayChip, { clientX: 20, clientY: -100 });
        fireEvent.pointerUp(window, { clientX: 20, clientY: -100 });

        expect(values().gridLayout).toEqual([]);
    });

    it('moves a placed field to a new column AND row on drag (rowSpan/colSpan unchanged)', () => {
        const { container, values } = renderBuilder([{ fieldKey: 'title', colStart: 1, colSpan: 3, rowStart: 0, rowSpan: 2 }]);
        mockCanvasRect(container);
        const placedBlock = container.querySelector('.border-main-200') as HTMLElement;

        fireEvent.pointerDown(placedBlock, { clientX: 0, clientY: 0 });
        fireEvent.pointerMove(window, { clientX: 200, clientY: 192 }); // +2 cols, +3 rows (ROW_HEIGHT=64)
        fireEvent.pointerUp(window, { clientX: 200, clientY: 192 });

        expect(values().gridLayout).toEqual([{ fieldKey: 'title', colStart: 3, colSpan: 3, rowStart: 3, rowSpan: 2 }]);
    });

    it('the canvas grows past its current bottom edge WHILE a tray-placement drag is in progress', () => {
        const { container } = renderBuilder([]);
        const canvas = mockCanvasRect(container);
        const trayChip = Array.from(container.querySelectorAll('.cursor-grab')).find((el) => el.textContent === 'Title')!;

        expect(canvas.style.height).toBe('64px'); // rowCount 1 initially (nothing placed)
        fireEvent.pointerDown(trayChip, { clientX: 20, clientY: -100 });
        fireEvent.pointerMove(window, { clientX: 250, clientY: 90 }); // row 1
        fireEvent.pointerMove(window, { clientX: 250, clientY: 700 }); // row 10 — well past the initial 1-row canvas
        expect(canvas.style.height).toBe('704px'); // rowCount now 11 (rows 1..10 inclusive after the min/max span)
        fireEvent.pointerUp(window, { clientX: 250, clientY: 700 });
    });
});
