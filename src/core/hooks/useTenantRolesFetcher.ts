// src/core/hooks/useTenantRolesFetcher.ts
//
// Backend "kept modules" hiện tại KHÔNG có Tenant.businessRoles (đã kiểm tra
// schema.graphql) — multi-role tagging chỉ còn là ví dụ minh hoạ phía FE, chưa
// có dữ liệu thật để fetch. Luôn set rỗng cho tới khi backend có field này.

import { useTenantRoles } from '@/shared/contexts/tenantRoles/TenantRolesContext';

export function useTenantRolesFetcher() {
    const { setRoles } = useTenantRoles();

    const fetchTenantRoles = async () => {
        setRoles([]);
    };

    return { fetchTenantRoles };
}
