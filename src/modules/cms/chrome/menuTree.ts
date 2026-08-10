import type { MenuItemDTO } from '@/shared/services/menu/menu.service';

export interface MenuTreeNode extends MenuItemDTO {
    children: MenuItemDTO[];
}

/** Dựng cây 2 cấp từ danh sách phẳng `getMenuItemsByMenu` trả về (nhóm theo `parentId`, sort
 * theo `order` trong cùng cấp) — SiteHeader/SiteFooter (Task 5, Phase 3) CHỈ render 2 cấp đầu
 * (cấp 1 = top nav/tiêu đề cột, cấp 2 = dropdown/dòng link); cấp 3+ vẫn lưu đúng ở BE, chỉ
 * chưa có UI công khai hiển thị — đã chốt ở design (Global Constraints), không phải bug. */
export function buildMenuTree(items: MenuItemDTO[] | undefined): MenuTreeNode[] {
    if (!items?.length) return [];
    const byParent = new Map<string, MenuItemDTO[]>();
    for (const item of items) {
        const key = item.parentId || '';
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(item);
    }
    for (const list of byParent.values()) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const roots = byParent.get('') || [];
    return roots.map((root) => ({ ...root, children: byParent.get(root.id || '') || [] }));
}

/** Resolve href công khai cho 1 MenuItem theo `targetType`:
 * - PAGE: dùng `pagePath` — computed BE-side (xem `MenuItemEntity.pagePath` +
 *   `MenuItemService.findByMenu`, batch-resolve từ `pageId` trong 1 query). Quyết định KHÔNG
 *   gọi thêm `getOnePage` từ FE vì query đó yêu cầu quyền staff (`@GQLAuthorized(STAFF_ROLES)`),
 *   không dùng được từ SSR/CSR trang công khai (không có session) — xem report Task 5 cho lý do
 *   đầy đủ.
 * - URL: dùng thẳng `url`.
 * - ANCHOR: build `#anchor`.
 * - NONE (hoặc thiếu giá trị tương ứng targetType): trả `undefined` -> nơi gọi render text
 *   không link (vd tiêu đề cột footer, dòng địa chỉ). */
export function resolveMenuItemHref(item: MenuItemDTO): string | undefined {
    switch (item.targetType) {
        case 'PAGE':
            return item.pagePath || undefined;
        case 'URL':
            return item.url || undefined;
        case 'ANCHOR':
            return item.anchor ? `#${item.anchor}` : undefined;
        default:
            return undefined;
    }
}
