export interface FlattenableRow {
    id: string;
    parentId: string | null;
    order: number;
}

export interface FlatRow {
    id: string;
    depth: number;
    parentId: string | null;
    hasChildren: boolean;
}

/**
 * Làm phẳng cây Node (mảng phẳng có parentId/order) thành 1 danh sách depth-first
 * theo ĐÚNG thứ tự hiển thị hiện tại — dùng để render Layers panel, tính dải
 * Shift+click, và tính vị trí thả khi kéo. Node nào nằm trong `collapsedIds` thì
 * bỏ qua TOÀN BỘ hậu duệ (nhưng chính node đó vẫn hiện).
 */
export function flattenVisibleTree(nodes: FlattenableRow[], collapsedIds: Set<string>): FlatRow[] {
    const childrenByParent = new Map<string | null, FlattenableRow[]>();
    for (const node of nodes) {
        const key = node.parentId ?? null;
        if (!childrenByParent.has(key)) childrenByParent.set(key, []);
        childrenByParent.get(key)!.push(node);
    }
    for (const list of childrenByParent.values()) list.sort((a, b) => a.order - b.order);

    const result: FlatRow[] = [];
    const visit = (parentId: string | null, depth: number) => {
        const children = childrenByParent.get(parentId) ?? [];
        for (const child of children) {
            const hasChildren = (childrenByParent.get(child.id)?.length ?? 0) > 0;
            result.push({ id: child.id, depth, parentId: child.parentId ?? null, hasChildren });
            if (!collapsedIds.has(child.id)) visit(child.id, depth + 1);
        }
    };
    visit(null, 0);
    return result;
}
