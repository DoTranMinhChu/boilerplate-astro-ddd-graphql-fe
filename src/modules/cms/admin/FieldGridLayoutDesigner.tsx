import { For, createMemo } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import type { FieldDefinitionDTO, FieldGridLayoutItem } from '@/modules/cms/cms.types';
import { assignDefaultGridPositions } from './assignDefaultGridPositions';

const COLS = 12;

export interface FieldGridLayoutDesignerProps {
    fields: FieldDefinitionDTO[];
}

/** Canvas cấu hình bố cục (mục D.4 design) — preview khung (tên field + placeholder), KHÔNG
 * phải control thật (control thật chỉ render ở Task 13's Full Page Editor khi thật sự nhập
 * liệu). Kéo cả khối = đổi colStart/row; kéo cạnh phải = đổi colSpan. Toạ độ tính bằng
 * getBoundingClientRect() của canvas container / COLS cột — cùng cách tiếp cận pixel-math mà
 * NodeCanvasOverlay.tsx dùng cho free-layout resize (tham khảo, không tái dùng thẳng code —
 * domain khác: grid cố định 12 cột, không phải free x/y). Đọc/ghi giá trị qua `createControl`
 * (đúng convention `Datatable.Field` đã dùng cho mọi control khác, kể cả `ContentFilterListInput`)
 * — gọi `onChange` nhiều lần/giây lúc kéo không phải vấn đề, `generateForm.tsx`'s `setValues` đã
 * tự so sánh `Util.isEqual` trước khi commit, không ghi lại nếu giá trị thật sự không đổi. */
export function FieldGridLayoutDesigner(props: FieldGridLayoutDesignerProps) {
    // 'object_array' — same ControlType already used by ContentFilterListInput/
    // GenericFilterListInput for their own array-of-objects config values.
    const { value, onChange } = createControl<FieldGridLayoutItem[]>('object_array', {});
    const layout = createMemo(() => assignDefaultGridPositions(props.fields, value() ?? []));
    let canvasRef: HTMLDivElement | undefined;

    const updateItem = (fieldKey: string, patch: Partial<FieldGridLayoutItem>) => {
        const next = layout().map((item) => (item.fieldKey === fieldKey ? { ...item, ...patch } : item));
        onChange(next);
    };

    const colWidth = () => (canvasRef ? canvasRef.getBoundingClientRect().width / COLS : 0);
    const rowHeight = 64; // px — matches the fixed placeholder block height below

    const startMove = (item: FieldGridLayoutItem, e: PointerEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startCol = item.colStart;
        const startRow = item.row;
        const onMove = (ev: PointerEvent) => {
            const deltaCol = Math.round((ev.clientX - startX) / colWidth());
            const deltaRow = Math.round((ev.clientY - startY) / rowHeight);
            const colStart = Math.min(Math.max(1, startCol + deltaCol), COLS - item.colSpan + 1);
            const row = Math.max(0, startRow + deltaRow);
            updateItem(item.fieldKey, { colStart, row });
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
        const startX = e.clientX;
        const startSpan = item.colSpan;
        const onMove = (ev: PointerEvent) => {
            const deltaCol = Math.round((ev.clientX - startX) / colWidth());
            const colSpan = Math.min(Math.max(1, startSpan + deltaCol), COLS - item.colStart + 1);
            updateItem(item.fieldKey, { colSpan });
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const fieldLabel = (fieldKey: string) => props.fields.find((f) => f?.key === fieldKey)?.label ?? fieldKey;
    const rowCount = createMemo(() => Math.max(1, ...layout().map((i) => i.row + 1)));

    return (
        <div
            ref={(el) => (canvasRef = el)}
            class="relative rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-2"
            style={{ height: `${rowCount() * rowHeight + 16}px` }}
        >
            <For each={layout()}>
                {(item) => (
                    <div
                        class="absolute rounded-lg border border-main-200 bg-white shadow-sm px-3 py-2 cursor-move select-none flex items-center justify-between"
                        style={{
                            left: `${((item.colStart - 1) / COLS) * 100}%`,
                            width: `${(item.colSpan / COLS) * 100}%`,
                            top: `${item.row * rowHeight + 8}px`,
                            height: `${rowHeight - 8}px`,
                        }}
                        onPointerDown={(e) => startMove(item, e)}
                    >
                        <span class="text-sm font-medium text-neutral-700 truncate">{fieldLabel(item.fieldKey)}</span>
                        <span
                            class="w-2 h-full cursor-ew-resize border-l border-neutral-200 -mr-3"
                            onPointerDown={(e) => startResize(item, e)}
                        />
                    </div>
                )}
            </For>
        </div>
    );
}
