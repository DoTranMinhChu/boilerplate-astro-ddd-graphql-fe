// src/modules/tenant/pages/organization/manageTenantBusinessRoles.page.tsx
//
// ĐÃ GỘP: việc chọn vai trò tổ chức nay nằm DUY NHẤT tại trang "Thiết lập"
// (/tenant/onboarding) — nguồn sự thật là Tenant.businessRoles. Trang này chỉ
// redirect để giữ tương thích link/route cũ.

import { Navigate } from '@solidjs/router';

export function ManageTenantBusinessRolesPage() {
    return <Navigate href="/tenant/onboarding" />;
}

export default ManageTenantBusinessRolesPage;
