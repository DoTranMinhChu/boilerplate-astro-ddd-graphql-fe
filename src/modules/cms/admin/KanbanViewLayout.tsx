// ddd-graphql-fe/src/modules/cms/admin/KanbanViewLayout.tsx
import { For, type JSX } from 'solid-js';
import { DragDropProvider, DragDropSensors, createDraggable, createDroppable, closestCenter, type DragEvent, type Id } from '@thisbeyond/solid-dnd';
import type { KanbanColumn } from './groupItemsIntoKanbanColumns';

export interface KanbanViewLayoutProps<T> {
    columns: KanbanColumn<T>[];
    renderCard: (item: T) => JSX.Element;
    getItemId: (item: T) => string;
    /** Gọi ngay khi thả 1 thẻ sang cột khác (kể cả cột "Chưa phân loại" — caller tự quyết có cho
     * phép thả vào đó không; layout này không áp rule nghiệp vụ). Không gọi khi thả lại đúng
     * cột cũ (draggable.id's origin column === target column). */
    onDropInColumn: (item: T, columnValue: string) => void;
}

/** Kéo-thả liên-cột — mỗi thẻ là 1 draggable, mỗi CỘT (không phải từng thẻ) là 1 droppable zone
 * duy nhất, cùng API đã xác nhận qua DragList.tsx/LayersPanel.tsx (`@thisbeyond/solid-dnd`).
 * Đơn giản hơn LayersPanel's tree reorder (không cần tính before/after/inside zone thủ công —
 * thả vào bất kỳ đâu trong 1 cột đều hợp lệ như nhau). */
export function KanbanViewLayout<T>(props: KanbanViewLayoutProps<T>) {
    const itemsById = () => {
        const map = new Map<string, { item: T; columnValue: string }>();
        for (const column of props.columns) {
            for (const item of column.items) map.set(props.getItemId(item), { item, columnValue: column.value });
        }
        return map;
    };

    // DragEvent's real shape (confirmed against @thisbeyond/solid-dnd's own .d.ts, same as
    // DragList.tsx's onDragEnd) — `draggable` is non-nullable and `droppable` is optional/nullable,
    // not both-nullable as a naive inline type might assume. `!draggable` stays as a defensive
    // guard (mirrors DragList.tsx) even though the type never actually reports it null.
    const onDragEnd = ({ draggable, droppable }: DragEvent) => {
        if (!draggable || !droppable) return;
        const entry = itemsById().get(String(draggable.id));
        const targetColumn = String(droppable.id);
        if (!entry || entry.columnValue === targetColumn) return;
        props.onDropInColumn(entry.item, targetColumn);
    };

    return (
        <DragDropProvider onDragEnd={onDragEnd} collisionDetector={closestCenter}>
            <DragDropSensors>
                <div class="flex gap-4 overflow-x-auto pb-4">
                    <For each={props.columns}>
                        {(column) => {
                            const droppable = createDroppable(column.value as Id);
                            return (
                                <div ref={(el) => droppable(el)} class="w-72 shrink-0 rounded-xl bg-neutral-50 border border-neutral-200 p-3">
                                    <div class="mb-3 flex items-center justify-between px-1">
                                        <p class="text-sm font-semibold text-neutral-700">{column.label}</p>
                                        <span class="text-xs text-neutral-400">{column.items.length}</span>
                                    </div>
                                    <div class="space-y-2">
                                        <For each={column.items}>
                                            {(item) => {
                                                const draggable = createDraggable(props.getItemId(item) as Id);
                                                return (
                                                    <div ref={(el) => draggable(el)} {...draggable.dragActivators} classList={{ 'opacity-40': draggable.isActiveDraggable }}>
                                                        {props.renderCard(item)}
                                                    </div>
                                                );
                                            }}
                                        </For>
                                    </div>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </DragDropSensors>
        </DragDropProvider>
    );
}
