// src/layouts/admin/AdminLayout.tsx
//
// THAY ĐỔI:
//   + Wrap bằng PermissionProvider
//   + Admin luôn có full quyền — không gọi fetchPermissions()
//   + Cách hoạt động: PermissionProvider có trong tree nhưng permissions = []
//     Khi Admin dùng component có usePermission():
//       → can() kiểm tra permMap() → permMap rỗng → trả về false
//       → NHƯNG: TenantAccountSection dùng fallback guard sau:
//          canManagePermission = () => !isTenantView || can(EPermission.X)
//          Với isTenantView=false (Admin luôn false) → canManagePermission = true
//          Không cần can() trả về true
//
//   Tóm lại: Admin không cần permissions load → không cần fetchPermissions()
//
// Now a thin wrapper around the shared `RoleLayout` (Task 8, Group 2 shared-abstractions).
// Per-role differences preserved explicitly:
//   - extraProviders: PermissionProvider only (never fetched — see note above)
//   - onAuthReady: carries forward `switchMode(EAccountType.ADMIN, {accountId})`, which today
//     has zero consumers (nothing reads useApp().appMode/tenantId/tenantCode) but is kept
//     explicit rather than silently dropped, per task-8-brief.md.

import { RoleLayout } from '@/layouts/RoleLayout';
import { ADMIN_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
import { EAccountType } from '@/shared/types/auth.type';
import { useApp } from '@/shared/contexts/app/AppContext';
import { PermissionProvider } from '@/shared/contexts/permission/PermissionContext';
import { t } from '@/shared/i18n/t';

export function AdminLayout(props: BaseProps) {
    const { switchMode } = useApp();

    return (
        <RoleLayout
            accountType={EAccountType.ADMIN}
            sidebarMenus={ADMIN_SIDEBAR_MENUS}
            typeName={t('layout.typeName.admin')}
            displayNameFallback="Admin"
            bgColor="bg-[#F6F8FA]"
            loginRoute="adminAuth.login"
            extraProviders={(p) => <PermissionProvider>{p.children}</PermissionProvider>}
            onAuthReady={() => switchMode(EAccountType.ADMIN)}
        >
            {props.children}
        </RoleLayout>
    );
}
