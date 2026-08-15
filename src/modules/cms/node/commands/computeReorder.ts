/** Shape tối thiểu cần để tính lại order — không phụ thuộc NodeDTO đầy đủ để dễ test độc lập. */
export interface OrderableRow {
    id: string;
    parentId: string | null;
    order: number;
}

export interface MoveReorderResult {
    /** Node đang di chuyển, với parentId/order MỚI. */
    movedNode: { id: string; parentId: string | null; order: number };
    /** Mọi sibling KHÁC bị đổi order do thao tác này (ở CẢ parent cũ lẫn parent mới nếu đổi cha) —
     * PHẢI ghi đè qua NodeService.reorderNodes để giữ order liên tục 0..N-1, không trùng nhau,
     * vì BE không tự làm việc này (moveNode/reorderNodes chỉ ghi đè giá trị thô, không validate). */
    siblingUpdates: { id: string; order: number }[];
}

/**
 * Tính lại order cho 1 thao tác di chuyển 1 node tới `toParentId` tại vị trí chèn `toIndex`
 * (0-based, tính theo danh sách sibling MỚI tại đích, SAU khi node đã được coi là đã rời khỏi
 * parent cũ). Trả về giá trị order mới cho chính node đó + mọi sibling khác cần renumber.
 */
export function computeMoveReorder(
    allNodes: OrderableRow[],
    movedId: string,
    toParentId: string | null,
    toIndex: number,
): MoveReorderResult {
    const moved = allNodes.find((n) => n.id === movedId);
    if (!moved) throw new Error(`computeMoveReorder: node ${movedId} not found`);

    const fromParentId = moved.parentId;
    const sameParent = fromParentId === toParentId;

    // Danh sách sibling ở parent ĐÍCH, KHÔNG kể node đang di chuyển, sắp theo order hiện tại.
    const destSiblingsExcludingMoved = allNodes
        .filter((n) => n.parentId === toParentId && n.id !== movedId)
        .sort((a, b) => a.order - b.order);

    // Chèn node đang di chuyển vào đúng vị trí toIndex trong danh sách đích.
    const destFinalOrder = [...destSiblingsExcludingMoved];
    destFinalOrder.splice(toIndex, 0, { ...moved, parentId: toParentId, order: -1 /* placeholder */ });

    const siblingUpdates: { id: string; order: number }[] = [];
    let movedNodeFinal = { id: moved.id, parentId: toParentId, order: toIndex };

    destFinalOrder.forEach((row, idx) => {
        if (row.id === movedId) {
            movedNodeFinal = { id: movedId, parentId: toParentId, order: idx };
            return;
        }
        if (row.order !== idx) siblingUpdates.push({ id: row.id, order: idx });
    });

    // Nếu đổi cha, parent CŨ cũng mất 1 phần tử — renumber phần còn lại của nó liên tục 0..N-1.
    if (!sameParent) {
        const oldSiblingsRemaining = allNodes
            .filter((n) => n.parentId === fromParentId && n.id !== movedId)
            .sort((a, b) => a.order - b.order);
        oldSiblingsRemaining.forEach((row, idx) => {
            if (row.order !== idx) siblingUpdates.push({ id: row.id, order: idx });
        });
    }

    return { movedNode: movedNodeFinal, siblingUpdates };
}
