import type { FieldDefinitionDTO, FieldGridLayoutItem } from '@/modules/cms/cms.types';

/** Field Grid Layout Designer (mục D.4 design) — field chưa được đặt vị trí xếp full-width
 * (colStart:1, colSpan:12) theo hàng tăng dần SAU field đã đặt. Field đã bị xoá khỏi Content
 * Type nhưng còn sót placement cũ trong gridLayout -> loại bỏ (tránh render 1 ô rỗng vô nghĩa). */
export function assignDefaultGridPositions(
    fields: FieldDefinitionDTO[],
    existingLayout: FieldGridLayoutItem[],
): FieldGridLayoutItem[] {
    const fieldKeys = new Set(fields.map((f) => f!.key!));
    const placed = existingLayout.filter((l) => fieldKeys.has(l.fieldKey));
    const placedKeys = new Set(placed.map((l) => l.fieldKey));
    let nextRow = placed.length ? Math.max(...placed.map((l) => l.row)) + 1 : 0;

    const appended: FieldGridLayoutItem[] = [];
    for (const field of fields) {
        if (placedKeys.has(field!.key!)) continue;
        appended.push({ fieldKey: field!.key!, colStart: 1, colSpan: 12, row: nextRow });
        nextRow += 1;
    }

    return [...placed, ...appended];
}
