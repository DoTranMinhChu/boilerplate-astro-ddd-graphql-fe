import { For, Show, createMemo, createSignal } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import type { FieldDefinitionDTO, FieldGridLayoutItem } from '@/modules/cms/cms.types';
import { t } from '@/shared/i18n/t';

const COLS = 12;
const ROW_HEIGHT = 64; // px — matches the fixed placeholder block height below

export interface FieldGridLayoutDesignerProps {
    fields: FieldDefinitionDTO[];
}

/** Excel-style range-select Grid Designer (fix round mục B — replaces the earlier pixel-free-drag
 * version). Shows a REAL 12-column grid with visible gridlines and an explicit "unplaced fields"
 * tray above it.
 *
 * IMPORTANT behavior change from before this fix: `assignDefaultGridPositions`'s auto-stack
 * fallback is intentionally NOT applied inside this component's own preview anymore — only
 * fields with a genuine, saved entry in `value()` ever render inside the grid; everything else
 * sits in the tray until the admin explicitly drags it in. The auto-stack fallback still applies
 * at the real render call sites (gridItemStyle.ts's consumers) so a field the admin never
 * touches still renders as a sane full-width row there — it's just not previewed as "placed"
 * inside this Designer before that.
 *
 * Reads/writes via `createControl` (same convention every other Datatable.Field-bound control in
 * this file's siblings uses, e.g. ContentFilterListInput) — calling `onChange` on every
 * pointermove is fine, `generateForm.tsx`'s `setValues` already de-dupes via `Util.isEqual`
 * before committing. */
export function FieldGridLayoutDesigner(props: FieldGridLayoutDesignerProps) {
    const { value, onChange } = createControl<FieldGridLayoutItem[]>('object_array', {});
    const placed = createMemo(() => value() ?? []);
    const placedKeys = createMemo(() => new Set(placed().map((i) => i.fieldKey)));
    const unplaced = createMemo(() => props.fields.filter((f) => f?.key && !placedKeys().has(f.key)));
    const rowCount = createMemo(() => Math.max(1, ...placed().map((i) => i.row + 1)));

    let canvasRef: HTMLDivElement | undefined;
    const colWidth = () => (canvasRef ? canvasRef.getBoundingClientRect().width / COLS : 0);
    const cellOf = (clientX: number, clientY: number) => {
        const rect = canvasRef!.getBoundingClientRect();
        const col = Math.min(COLS - 1, Math.max(0, Math.floor((clientX - rect.left) / colWidth())));
        const row = Math.max(0, Math.floor((clientY - rect.top) / ROW_HEIGHT));
        return { col, row };
    };

    const upsert = (item: FieldGridLayoutItem) => onChange([...placed().filter((i) => i.fieldKey !== item.fieldKey), item]);
    const patch = (fieldKey: string, delta: Partial<FieldGridLayoutItem>) =>
        onChange(placed().map((i) => (i.fieldKey === fieldKey ? { ...i, ...delta } : i)));
    const removeField = (fieldKey: string) => onChange(placed().filter((i) => i.fieldKey !== fieldKey));

    const [placingRange, setPlacingRange] = createSignal<{ startCol: number; row: number; col: number } | undefined>();

    const startPlaceFromTray = (fieldKey: string, e: PointerEvent) => {
        e.preventDefault();
        // Critical fix (final whole-branch review, finding 1) — the anchor MUST be resolved from
        // where the pointer enters the canvas, never from the pointerdown event itself:
        // pointerdown fires on the tray chip, which sits ABOVE the canvas in the DOM, so its
        // clientY is always less than canvasRect.top (cellOf's `Math.max(0, …)` clamp then
        // silently forced startRow to 0 every time) and its clientX reflected the chip's own tray
        // position, not any point in the grid. Track "not yet entered" via an `undefined`
        // placingRange and only start the range on the first move event that actually lands
        // inside the canvas rect.
        //
        // Follow-up fix (found via live browser verification of the above): `row` MUST keep
        // tracking the pointer's CURRENT cell on every move, never freeze at the entry point like
        // `startCol` does. Unlike columns (which have a genuine "drag to widen" range-select
        // gesture — colStart/colSpan span between the anchor and the current column), a placed
        // field has no rowSpan — there is only ever a SINGLE target row, so anchoring it at
        // wherever the pointer first crossed into the canvas silently pinned every placement to
        // the entry row no matter how much further the pointer moved afterward. Concretely: drag
        // downward from the tray (which sits above the canvas) toward row 2 — the pointer enters
        // the canvas through row 0 first, so the OLD code (freezing `startRow` at entry) always
        // committed row 0 regardless of where the pointer ended up, even though it visibly showed
        // the ghost overlay stuck at row 0 the whole time. Live-verified after this fix: the ghost
        // now visibly follows the pointer down to whatever row it currently occupies, and the
        // final commit (using the pointerup position, falling back to the last tracked cell if
        // the pointer left the canvas before release) lands there.
        const isInsideCanvas = (clientX: number, clientY: number) => {
            const rect = canvasRef!.getBoundingClientRect();
            return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
        };
        const onMove = (ev: PointerEvent) => {
            if (!isInsideCanvas(ev.clientX, ev.clientY)) return;
            const cur = cellOf(ev.clientX, ev.clientY);
            setPlacingRange((r) => (r ? { ...r, col: cur.col, row: cur.row } : { startCol: cur.col, col: cur.col, row: cur.row }));
        };
        const onUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            const range = placingRange();
            if (range) {
                const cur = isInsideCanvas(ev.clientX, ev.clientY) ? cellOf(ev.clientX, ev.clientY) : { col: range.col, row: range.row };
                const colStart = Math.min(range.startCol, cur.col) + 1;
                const colSpan = Math.abs(cur.col - range.startCol) + 1;
                upsert({ fieldKey, colStart, colSpan, row: cur.row });
            }
            // If the pointer never entered the canvas (range still undefined), this is a no-op —
            // the field correctly stays in the tray rather than committing a bogus placement.
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
            const row = Math.max(0, item.row + (cur.row - startCell.row));
            patch(item.fieldKey, { colStart, row });
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const startResize = (item: FieldGridLayoutItem, e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startCell = cellOf(e.clientX, e.clientY);
        const onMove = (ev: PointerEvent) => {
            const cur = cellOf(ev.clientX, ev.clientY);
            const colSpan = Math.min(Math.max(1, item.colSpan + (cur.col - startCell.col)), COLS - item.colStart + 1);
            patch(item.fieldKey, { colSpan });
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
                class="relative grid grid-cols-12 rounded-xl border border-neutral-300 bg-white"
                style={{ height: `${rowCount() * ROW_HEIGHT}px` }}
            >
                <For each={Array(COLS * rowCount()).fill(null)}>
                    {() => <div class="border-b border-r border-neutral-100" style={{ height: `${ROW_HEIGHT}px` }} />}
                </For>

                <For each={placed()}>
                    {(item) => (
                        <div
                            class="absolute flex items-center justify-between rounded-lg border border-main-200 bg-white px-3 py-2 shadow-sm cursor-move select-none"
                            style={{
                                left: `${((item.colStart - 1) / COLS) * 100}%`,
                                width: `${(item.colSpan / COLS) * 100}%`,
                                top: `${item.row * ROW_HEIGHT + 4}px`,
                                height: `${ROW_HEIGHT - 8}px`,
                            }}
                            onPointerDown={(e) => startMove(item, e)}
                        >
                            <span class="truncate text-sm font-medium text-neutral-700">{fieldLabel(item.fieldKey)}</span>
                            <div class="flex items-center gap-1">
                                <button
                                    type="button"
                                    class="text-xs text-neutral-300 hover:text-red-500"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => removeField(item.fieldKey)}
                                >
                                    ✕
                                </button>
                                <span class="-mr-3 h-full w-2 cursor-ew-resize border-l border-neutral-200" onPointerDown={(e) => startResize(item, e)} />
                            </div>
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
                                top: `${range().row * ROW_HEIGHT + 4}px`,
                                height: `${ROW_HEIGHT - 8}px`,
                            }}
                        />
                    )}
                </Show>
            </div>
        </div>
    );
}
