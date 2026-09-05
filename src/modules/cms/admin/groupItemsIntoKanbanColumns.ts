export interface KanbanColumn<T> {
    value: string;
    label: string;
    items: T[];
}

const UNASSIGNED_COLUMN_VALUE = '__unassigned__';

/** Kanban (mục C design) — 1 cột / option của field kanbanGroupFieldKey, cộng 1 cột "Chưa phân
 * loại" (chỉ xuất hiện khi thật sự có item không khớp option nào — dữ liệu cũ/nhập tay ngoài ý
 * muốn, hoặc option đã bị xoá khỏi cấu hình field sau khi entry đã lưu giá trị đó). */
export function groupItemsIntoKanbanColumns<T>(
    items: T[],
    fieldOptions: { value: string; label: string }[],
    getFieldValue: (item: T) => string | undefined,
    unassignedLabel: string,
): KanbanColumn<T>[] {
    const columns: KanbanColumn<T>[] = fieldOptions.map((opt) => ({ value: opt.value, label: opt.label, items: [] }));
    const unassigned: KanbanColumn<T> = { value: UNASSIGNED_COLUMN_VALUE, label: unassignedLabel, items: [] };
    const byValue = new Map(columns.map((c) => [c.value, c]));

    for (const item of items) {
        const value = getFieldValue(item);
        const column = value ? byValue.get(value) : undefined;
        (column ?? unassigned).items.push(item);
    }

    return unassigned.items.length ? [...columns, unassigned] : columns;
}
