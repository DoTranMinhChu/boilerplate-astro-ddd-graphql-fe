import { useContext } from 'solid-js';
import { DashboardContext } from '@/layouts/dashboard/DashboardContext';
import { EAccountType } from '@/shared/types/auth.type';

/**
 * Parase 2 — true (reactive) khi đang ở giao diện Agency.
 *
 * Dùng để bật các phần "đặc thù agency" (cột Tổ chức, lọc theo Tổ chức, chọn
 * tổ chức khi tạo). Trả về false khi không nằm trong layout có DashboardContext
 * (vd public page) → an toàn cho mọi nơi tái sử dụng component.
 */
export function useIsAgencyView(): () => boolean {
    const ctx = useContext(DashboardContext);
    return () => ctx?.accountType() === EAccountType.AGENCY;
}
