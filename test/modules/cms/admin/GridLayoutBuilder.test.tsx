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

    it('resizes colSpan via the right-edge handle without moving colStart/rowStart', () => {
        const { container, values } = renderBuilder([{ fieldKey: 'title', colStart: 2, colSpan: 3, rowStart: 0, rowSpan: 1 }]);
        mockCanvasRect(container);
        const placedBlock = container.querySelector('.border-main-200') as HTMLElement;
        const rightHandle = placedBlock.querySelector('.cursor-ew-resize') as HTMLElement;

        fireEvent.pointerDown(rightHandle, { clientX: 0, clientY: 0 });
        fireEvent.pointerMove(window, { clientX: 200, clientY: 0 }); // +2 cols
        fireEvent.pointerUp(window, { clientX: 200, clientY: 0 });

        expect(values().gridLayout).toEqual([{ fieldKey: 'title', colStart: 2, colSpan: 5, rowStart: 0, rowSpan: 1 }]);
    });

    it('resizes rowSpan via the bottom-edge handle without moving colStart/rowStart', () => {
        const { container, values } = renderBuilder([{ fieldKey: 'title', colStart: 1, colSpan: 6, rowStart: 0, rowSpan: 1 }]);
        mockCanvasRect(container);
        const placedBlock = container.querySelector('.border-main-200') as HTMLElement;
        const bottomHandle = placedBlock.querySelector('.cursor-ns-resize') as HTMLElement;

        fireEvent.pointerDown(bottomHandle, { clientX: 0, clientY: 0 });
        fireEvent.pointerMove(window, { clientX: 0, clientY: 128 }); // +2 rows
        fireEvent.pointerUp(window, { clientX: 0, clientY: 128 });

        expect(values().gridLayout).toEqual([{ fieldKey: 'title', colStart: 1, colSpan: 6, rowStart: 0, rowSpan: 3 }]);
    });

    it('resizes BOTH colSpan and rowSpan via the corner handle', () => {
        const { container, values } = renderBuilder([{ fieldKey: 'title', colStart: 1, colSpan: 6, rowStart: 0, rowSpan: 1 }]);
        mockCanvasRect(container);
        const placedBlock = container.querySelector('.border-main-200') as HTMLElement;
        const cornerHandle = placedBlock.querySelector('.cursor-nwse-resize') as HTMLElement;

        fireEvent.pointerDown(cornerHandle, { clientX: 0, clientY: 0 });
        fireEvent.pointerMove(window, { clientX: 300, clientY: 128 }); // +3 cols, +2 rows
        fireEvent.pointerUp(window, { clientX: 300, clientY: 128 });

        expect(values().gridLayout).toEqual([{ fieldKey: 'title', colStart: 1, colSpan: 9, rowStart: 0, rowSpan: 3 }]);
    });

    it('a plain click (no drag) on a placed field calls onSelectField instead of moving it', () => {
        const onSelectField = vi.fn();
        const { Form, values } = generateForm<FormValues, any>({});
        const { container } = render(() => (
            <Form initialValues={{ gridLayout: [{ fieldKey: 'title', colStart: 1, colSpan: 6, rowStart: 0, rowSpan: 1 }] }}>
                <Form.Field name="gridLayout">
                    <GridLayoutBuilder fields={FIELDS} onSelectField={onSelectField} />
                </Form.Field>
            </Form>
        ));
        mockCanvasRect(container);
        const placedBlock = container.querySelector('.border-main-200') as HTMLElement;

        fireEvent.pointerDown(placedBlock, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(window, { clientX: 101, clientY: 101 }); // 1.4px travel, under the 4px threshold

        expect(onSelectField).toHaveBeenCalledWith({ fieldKey: 'title', colStart: 1, colSpan: 6, rowStart: 0, rowSpan: 1 });
        expect(values().gridLayout).toEqual([{ fieldKey: 'title', colStart: 1, colSpan: 6, rowStart: 0, rowSpan: 1 }]); // unchanged, not moved
    });

    it('a real drag (over the click threshold) does NOT call onSelectField', () => {
        const onSelectField = vi.fn();
        const { Form } = generateForm<FormValues, any>({});
        const { container } = render(() => (
            <Form initialValues={{ gridLayout: [{ fieldKey: 'title', colStart: 1, colSpan: 6, rowStart: 0, rowSpan: 1 }] }}>
                <Form.Field name="gridLayout">
                    <GridLayoutBuilder fields={FIELDS} onSelectField={onSelectField} />
                </Form.Field>
            </Form>
        ));
        mockCanvasRect(container);
        const placedBlock = container.querySelector('.border-main-200') as HTMLElement;

        fireEvent.pointerDown(placedBlock, { clientX: 0, clientY: 0 });
        fireEvent.pointerMove(window, { clientX: 100, clientY: 0 });
        fireEvent.pointerUp(window, { clientX: 100, clientY: 0 });

        expect(onSelectField).not.toHaveBeenCalled();
    });

    it('applying a preset appends a new row of empty zones without touching existing placed fields', () => {
        const { container } = renderBuilder([{ fieldKey: 'title', colStart: 1, colSpan: 12, rowStart: 0, rowSpan: 1 }]);
        const presetButton = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Lưới mẫu')!;
        fireEvent.click(presetButton);
        const halfHalfOption = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '1/2 + 1/2')!;
        fireEvent.click(halfHalfOption);

        // `.border-2` disambiguates a zone placeholder from the unplaced-fields tray wrapper,
        // which also carries `border-dashed border-neutral-300` (as a plain `border`, not
        // `border-2`) — a real selector-collision bug found while running this test, not part of
        // the brief's literal text; the expected counts (2, then 1) are unchanged.
        const zoneEls = container.querySelectorAll('.border-2.border-dashed.border-neutral-300');
        expect(zoneEls.length).toBe(2); // 2 zone placeholders from the halfHalf preset
    });

    it('dropping a tray field onto a preset zone snaps it to that zone\'s exact shape and consumes the zone', () => {
        const { container, values } = renderBuilder([]);
        mockCanvasRect(container);
        const presetButton = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Lưới mẫu')!;
        fireEvent.click(presetButton);
        const halfHalfOption = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '1/2 + 1/2')!;
        fireEvent.click(halfHalfOption); // zones: (1,6,0,1) and (7,6,0,1)

        const trayChip = Array.from(container.querySelectorAll('.cursor-grab')).find((el) => el.textContent === 'Title')!;
        fireEvent.pointerDown(trayChip, { clientX: 20, clientY: -100 });
        fireEvent.pointerMove(window, { clientX: 750, clientY: 30 }); // col 7 (0-indexed), row 0 — inside the 2nd zone
        fireEvent.pointerUp(window, { clientX: 750, clientY: 30 });

        expect(values().gridLayout).toEqual([{ fieldKey: 'title', colStart: 7, colSpan: 6, rowStart: 0, rowSpan: 1, align: 'stretch' }]);
        const zoneEls = container.querySelectorAll('.border-2.border-dashed.border-neutral-300');
        expect(zoneEls.length).toBe(1); // the matched zone was consumed, the other remains
    });
});
