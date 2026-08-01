// src/core/hooks/useTenantRolesFetcher.ts

import { useTenantRoles } from '@/shared/contexts/tenantRoles/TenantRolesContext';
import { ETenantBusinessRole } from '@/shared/generated/typed-graphql';
import { TenantService } from '@/shared/services/tenant/tenant.service';

export function useTenantRolesFetcher() {
    const { setRoles } = useTenantRoles();

    const fetchTenantRoles = async () => {
        try {
            const tenant = await TenantService.getMyTenant();
            setRoles((tenant?.businessRoles ?? []) as ETenantBusinessRole[]);
        } catch (e) {
            console.warn('[TenantRoles] Failed to fetch business roles:', e);
        }
    };

    return { fetchTenantRoles };
}
