export interface KanbanColumn<T> {
    value: string;
    label: string;
    items: T[];
}

// Exported (C1, final whole-branch review) — `manageContentEntries.page.tsx`'s `handleKanbanDrop`
// needs this exact sentinel to detect a drop ONTO the unassigned column, so it never persists
// the literal string below into a real entry field (xem resolveKanbanDropFieldValue bên dưới).
export const UNASSIGNED_COLUMN_VALUE = '__unassigned__';

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

/** C1 (final whole-branch review) — `KanbanViewLayout`'s own docstring says the CALLER decides
 * business rules for a drop onto any column, including "Chưa phân loại" (it applies none itself).
 * That column is a sentinel THIS module invents for items whose field value matches no real
 * configured `options` entry (old/hand-entered data, or an option removed from the field's config
 * after entries already used it) — it is never itself a valid option value. Before this fix,
 * `manageContentEntries.page.tsx`'s `handleKanbanDrop` had no such rule at all: dropping a card
 * onto that column persisted the literal string `UNASSIGNED_COLUMN_VALUE` into the entry's real
 * SELECT field, a value absent from every `options` list — silently corrupting the field (broken
 * Select control on next edit, broken Table/List/Card rendering, broken visibility rules/filters
 * keyed on it), all while showing a success toast.
 *
 * UX judgment call: dragging a card INTO "Chưa phân loại" most plausibly means "I want to unset
 * this field" (not "refuse the drop") — an admin doing that is deliberately taking the entry out
 * of every real bucket, same intent as clearing a Select. So this resolves the sentinel to
 * `undefined` (caller then deletes the field's key from the entry's data — see handleKanbanDrop)
 * rather than reverting the drop. Dropping onto any REAL column just passes `columnValue` through
 * unchanged. */
export function resolveKanbanDropFieldValue(columnValue: string): string | undefined {
    return columnValue === UNASSIGNED_COLUMN_VALUE ? undefined : columnValue;
}
