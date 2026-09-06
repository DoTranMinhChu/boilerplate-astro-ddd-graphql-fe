import { For, Show, createMemo, createSignal } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import type { FieldDefinitionDTO, FieldGridLayoutItem } from '@/modules/cms/cms.types';
import type { GridLayoutZone } from './gridLayoutPresets';
import { t } from '@/shared/i18n/t';

const COLS = 12;
const ROW_HEIGHT = 64; // px — matches the fixed placeholder block height below

export interface GridLayoutBuilderProps {
    fields: FieldDefinitionDTO[];
    /** Currently-selected field (drives the Inspector panel — Task 7), if any. */
    selectedFieldKey?: string;
    /** Fired when a field is selected (a plain click, not a drag) or deselected (`undefined`,
     * e.g. clicking empty canvas). Task 6 wires the actual click-vs-drag gesture; this task only
     * declares the prop so Task 6's diff doesn't also need to touch this interface. */
    onSelectField?: (item: FieldGridLayoutItem | undefined) => void;
}

/** Grid Layout Builder (redesign of the Excel-style range-select `FieldGridLayoutDesigner`) — a
 * genuine 2D dashboard/page-builder grid: fields span multiple COLUMNS *and* ROWS, not just
 * columns. Same `createControl<FieldGridLayoutItem[]>('object_array', {})` ambient binding as the
 * superseded component (calling `onChange` on every pointermove is fine — `generateForm.tsx`'s
 * `setValues` de-dupes via `Util.isEqual` before committing).
 *
 * Placement anchor semantics (both learned the hard way from the superseded component's own bug
 * history — see docs/superpowers/specs/2026-09-06-grid-layout-builder-design.md §5.2):
 * - Column AND row both use a genuine anchor-to-current RANGE (drag from the tray, past the
 *   canvas's top-left entry point, to select a rectangular colSpan x rowSpan area) — unlike the
 *   superseded component, THIS component's fields genuinely can span multiple rows, so row needs
 *   the same anchor-range treatment as column, not the "always track current, no span" fix that
 *   component ended up needing (that fix was for a component whose fields had NO rowSpan concept
 *   at all — irrelevant here since span is exactly what's wanted).
 * - The anchor is established on the FIRST pointermove that lands inside the canvas, never on the
 *   pointerdown event itself (pointerdown fires on the tray chip, which sits ABOVE the canvas).
 *
 * The canvas auto-grows past its current bottom edge while dragging (not just after releasing) —
 * `rowCount` factors in the live in-progress placement range, not only already-`placed()` items,
 * so `isInsideCanvas` deliberately has NO upper Y bound (only left/right/top matter for "has the
 * pointer entered the grid's column band"). */
export function GridLayoutBuilder(props: GridLayoutBuilderProps) {
    const { value, onChange } = createControl<FieldGridLayoutItem[]>('object_array', {});
    const placed = createMemo(() => value() ?? []);
    const placedKeys = createMemo(() => new Set(placed().map((i) => i.fieldKey)));
    const unplaced = createMemo(() => props.fields.filter((f) => f?.key && !placedKeys().has(f.key)));

    // Preset scratch zones (Task 6 populates this via the presets dropdown) — declared here so
    // rowCount/render can already account for them without Task 6 needing to touch this signal's
    // declaration.
    const [zones, setZones] = createSignal<GridLayoutZone[]>([]);

    const [placingRange, setPlacingRange] = createSignal<{ startCol: number; startRow: number; col: number; row: number } | undefined>();

    const rowCount = createMemo(() => {
        const placedMax = Math.max(0, ...placed().map((i) => i.rowStart + i.rowSpan));
        const zoneMax = Math.max(0, ...zones().map((z) => z.rowStart + z.rowSpan));
        const range = placingRange();
        const placingMax = range ? Math.min(range.startRow, range.row) + Math.abs(range.row - range.startRow) + 1 : 0;
        return Math.max(1, placedMax, zoneMax, placingMax);
    });

    let canvasRef: HTMLDivElement | undefined;
    const colWidth = () => (canvasRef ? canvasRef.getBoundingClientRect().width / COLS : 0);
    const cellOf = (clientX: number, clientY: number) => {
        const rect = canvasRef!.getBoundingClientRect();
        const col = Math.min(COLS - 1, Math.max(0, Math.floor((clientX - rect.left) / colWidth())));
        const row = Math.max(0, Math.floor((clientY - rect.top) / ROW_HEIGHT));
        return { col, row };
    };
    const isInsideCanvas = (clientX: number, clientY: number) => {
        const rect = canvasRef!.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top;
    };

    const upsert = (item: FieldGridLayoutItem) => onChange([...placed().filter((i) => i.fieldKey !== item.fieldKey), item]);
    const patch = (fieldKey: string, delta: Partial<FieldGridLayoutItem>) =>
        onChange(placed().map((i) => (i.fieldKey === fieldKey ? { ...i, ...delta } : i)));
    const removeField = (fieldKey: string) => onChange(placed().filter((i) => i.fieldKey !== fieldKey));

    const startPlaceFromTray = (fieldKey: string, e: PointerEvent) => {
        e.preventDefault();
        const onMove = (ev: PointerEvent) => {
            if (!isInsideCanvas(ev.clientX, ev.clientY)) return;
            const cur = cellOf(ev.clientX, ev.clientY);
            const prev = placingRange();
            const anchorCol = prev ? prev.startCol : cur.col;
            const anchorRow = prev ? prev.startRow : cur.row;
            setPlacingRange({ startCol: anchorCol, startRow: anchorRow, col: cur.col, row: cur.row });
        };
        const onUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            const range = placingRange();
            if (range) {
                const cur = isInsideCanvas(ev.clientX, ev.clientY) ? cellOf(ev.clientX, ev.clientY) : { col: range.col, row: range.row };
                // A zone the release point lands inside snaps the placement to that zone's exact
                // shape and consumes it (Task 6 populates `zones` via the presets UI — this task's
                // own tests never populate `zones`, so this branch is inert until then, but the
                // logic belongs here since it's part of `onUp`'s single commit path).
                const matchedZone = zones().find(
                    (z) => cur.col >= z.colStart - 1 && cur.col <= z.colStart - 1 + z.colSpan - 1 &&
                        cur.row >= z.rowStart && cur.row <= z.rowStart + z.rowSpan - 1,
                );
                if (matchedZone) {
                    upsert({ fieldKey, colStart: matchedZone.colStart, colSpan: matchedZone.colSpan, rowStart: matchedZone.rowStart, rowSpan: matchedZone.rowSpan, align: 'stretch' });
                    setZones(zones().filter((z) => z !== matchedZone));
                } else {
                    const colStart = Math.min(range.startCol, cur.col) + 1;
                    const colSpan = Math.abs(cur.col - range.startCol) + 1;
                    const rowStart = Math.min(range.startRow, cur.row);
                    const rowSpan = Math.abs(cur.row - range.startRow) + 1;
                    upsert({ fieldKey, colStart, colSpan, rowStart, rowSpan, align: 'stretch' });
                }
            }
            setPlacingRange(undefined);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const startMove = (item: FieldGridLayoutItem, e: PointerEvent) => {
        e.preventDefault();
        const startCell = cellOf(e.clientX, e.clientY);
        const onMove = (ev: PointerEvent) => {
            const cur = cellOf(ev.clientX, ev.clientY);
            const colStart = Math.min(Math.max(1, item.colStart + (cur.col - startCell.col)), COLS - item.colSpan + 1);
            const rowStart = Math.max(0, item.rowStart + (cur.row - startCell.row));
            patch(item.fieldKey, { colStart, rowStart });
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const fieldLabel = (fieldKey: string) => props.fields.find((f) => f?.key === fieldKey)?.label ?? fieldKey;

    return (
        <div class="space-y-2">
            <Show when={unplaced().length > 0}>
                <div class="flex flex-wrap gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/50 p-2">
                    <p class="w-full text-xs text-neutral-400">{t('cms.contentTypeConfig.gridUnplacedHint')}</p>
                    <For each={unplaced()}>
                        {(field) => (
                            <div
                                class="cursor-grab select-none rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-xs"
                                onPointerDown={(e) => startPlaceFromTray(field!.key!, e)}
                            >
                                {field!.label}
                            </div>
                        )}
                    </For>
                </div>
            </Show>

            <div
                ref={(el) => (canvasRef = el)}
                class="relative grid grid-cols-12 rounded-xl border border-neutral-300 bg-neutral-50"
                style={{ height: `${rowCount() * ROW_HEIGHT}px` }}
            >
                <For each={Array.from({ length: COLS * rowCount() })}>
                    {(_, i) => {
                        const col = () => i() % COLS;
                        const row = () => Math.floor(i() / COLS);
                        const isActive = () => {
                            const range = placingRange();
                            if (!range) return false;
                            const colStart = Math.min(range.startCol, range.col);
                            const colEnd = Math.max(range.startCol, range.col);
                            const rowStart = Math.min(range.startRow, range.row);
                            const rowEnd = Math.max(range.startRow, range.row);
                            return col() >= colStart && col() <= colEnd && row() >= rowStart && row() <= rowEnd;
                        };
                        return (
                            <div
                                class="border-b border-r"
                                classList={{ 'border-neutral-100': !isActive(), 'border-main-300 bg-main-50/40': isActive() }}
                                style={{ height: `${ROW_HEIGHT}px` }}
                            />
                        );
                    }}
                </For>

                <For each={zones()}>
                    {(zone) => (
                        <div
                            class="pointer-events-none absolute rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-100/60"
                            style={{
                                left: `${((zone.colStart - 1) / COLS) * 100}%`,
                                width: `${(zone.colSpan / COLS) * 100}%`,
                                top: `${zone.rowStart * ROW_HEIGHT + 4}px`,
                                height: `${zone.rowSpan * ROW_HEIGHT - 8}px`,
                            }}
                        />
                    )}
                </For>

                <For each={placed()}>
                    {(item) => (
                        <div
                            class="absolute flex items-center justify-between rounded-lg border border-main-200 bg-white px-3 py-2 shadow-sm cursor-move select-none"
                            classList={{ 'ring-2 ring-main-400': props.selectedFieldKey === item.fieldKey }}
                            style={{
                                left: `${((item.colStart - 1) / COLS) * 100}%`,
                                width: `${(item.colSpan / COLS) * 100}%`,
                                top: `${item.rowStart * ROW_HEIGHT + 4}px`,
                                height: `${item.rowSpan * ROW_HEIGHT - 8}px`,
                            }}
                            onPointerDown={(e) => startMove(item, e)}
                        >
                            <span class="truncate text-sm font-medium text-neutral-700">{fieldLabel(item.fieldKey)}</span>
                            <button
                                type="button"
                                class="text-xs text-neutral-300 hover:text-red-500"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => removeField(item.fieldKey)}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </For>

                <Show when={placingRange()}>
                    {(range) => (
                        <div
                            class="pointer-events-none absolute rounded-lg border-2 border-dashed border-main-400 bg-main-50/60"
                            style={{
                                left: `${(Math.min(range().startCol, range().col) / COLS) * 100}%`,
                                width: `${((Math.abs(range().col - range().startCol) + 1) / COLS) * 100}%`,
                                top: `${Math.min(range().startRow, range().row) * ROW_HEIGHT + 4}px`,
                                height: `${(Math.abs(range().row - range().startRow) + 1) * ROW_HEIGHT - 8}px`,
                            }}
                        />
                    )}
                </Show>
            </div>
        </div>
    );
}
