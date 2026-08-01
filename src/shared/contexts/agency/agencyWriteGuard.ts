import { agencyActingTenantId, setAgencyActingTenantId } from './agencyActingTenant';
import { toast } from '@core/components/toast/ToastProvider';

/**
 * Parase 2 — tiện ích cho các trang có flow TẠO/SỬA tùy biến (không qua nút core
 * Datatable.ButtonCreate / CellButton*). Đảm bảo agency luôn thao tác trong ngữ
 * cảnh 1 tổ chức.
 */

/**
 * Bind "tổ chức đang thao tác" theo bản ghi cụ thể (khi sửa/xóa/nhân bản 1 item).
 * Để mutation scope đúng tổ chức của bản ghi đó.
 */
export function bindActingTenantFrom(item: { tenantId?: string | null } | null | undefined): void {
    const tid = item?.tenantId;
    if (tid && tid !== agencyActingTenantId()) setAgencyActingTenantId(tid);
}

/**
 * Trả về true nếu được phép TẠO mới. Nếu là agency mà chưa chọn tổ chức → false + toast.
 * Dùng chặn entry-point tạo mới ở các trang tùy biến.
 */
export function ensureAgencyActingTenant(isAgencyView: boolean): boolean {
    if (isAgencyView && !agencyActingTenantId()) {
        toast().warning(
            'Vui lòng chọn một tổ chức ở thanh "Thao tác với tổ chức" trước khi tạo dữ liệu.',
        );
        return false;
    }
    return true;
}
