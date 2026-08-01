import { createSignal } from 'solid-js';

/**
 * Parase 2 — "Đang thao tác với tổ chức".
 *
 * Tenant đích mà tài khoản AGENCY chọn khi TẠO dữ liệu mới. Giá trị này được
 * gửi kèm mọi request GraphQL/REST dưới dạng header `x-acting-tenant-id`
 * (xem graphql.ts / restBase.service.ts).
 *
 * Backend CHỈ dùng để stamp tenantId khi create; mọi read/update/delete của
 * agency vẫn scope theo agencyId → không cần và không bị ảnh hưởng bởi giá trị này.
 */
export const [agencyActingTenantId, setAgencyActingTenantId] = createSignal<string | null>(null);
