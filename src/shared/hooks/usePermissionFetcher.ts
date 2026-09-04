import { usePermission } from '@/shared/contexts/permission/PermissionContext';
import { AccountPermissionService } from '@/shared/services/accountPermission/accountPermission.service';


// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissionFetcher() {
    const { setPermissions } = usePermission();

    const fetchPermissions = async () => {
        try {
            // Dùng GraphQL client hiện tại của project (thay GraphQL.query bằng client thực)
            const result = await AccountPermissionService.getMyPermissions()

            const perms = result?.permissions;
            if (perms) {
                setPermissions(perms as any);
            }
        } catch (e) {
            // Fail silently — user sẽ thấy empty state thay vì crash
            console.warn('[Permission] Failed to fetch permissions:', e);
        }
    };

    return { fetchPermissions };
}
