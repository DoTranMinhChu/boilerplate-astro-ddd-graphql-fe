// src/layouts/agency/AgencyLayout.tsx
//
// THAY ĐỔI:
//   + Wrap bằng PermissionProvider (cùng pattern với TenantLayout)
//   + Agency hiện tại chưa có phân quyền → không gọi fetchPermissions()
//     → PermissionProvider ở trạng thái empty, isLoaded = false
//     → usePermission() trong các component con trả về full-access fallback
//        (vì Provider có trong tree nhưng chưa load → các can() dùng permMap())
//
//   Lưu ý: khi Agency có phân quyền riêng trong tương lai, chỉ cần truyền thêm một
//   `onAuthReady` gọi fetchPermissions() cho <RoleLayout/> bên dưới — không cần sửa gì khác.
//
// Now a thin wrapper around the shared `RoleLayout` (Task 8, Group 2 shared-abstractions).
// Per-role differences preserved explicitly:
//   - extraProviders: PermissionProvider only (never fetched, same as Admin)
//   - extraContent: <AgencyActingTenantBar/> rendered before children inside <main>
//   - no onAuthReady (Agency has no post-auth side effect, unlike Admin/Tenant)

import { RoleLayout } from '@/layouts/RoleLayout';
import { EAccountType } from '@/shared/types/auth.type';
import { AGENCY_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
import { PermissionProvider } from '@/shared/contexts/permission/PermissionContext';
import { AgencyActingTenantBar } from '@/shared/components/agency/AgencyActingTenantBar';
import { t } from '@/shared/i18n/t';

export function AgencyLayout(props: BaseProps) {
    return (
        <RoleLayout
            accountType={EAccountType.AGENCY}
            sidebarMenus={AGENCY_SIDEBAR_MENUS}
            typeName={t('layout.typeName.agency')}
            displayNameFallback="Agency"
            bgColor="bg-[#FDF8FF]"
            loginRoute="agencyAuth.login"
            extraProviders={(p) => <PermissionProvider>{p.children}</PermissionProvider>}
            extraContent={() => <AgencyActingTenantBar />}
        >
            {props.children}
        </RoleLayout>
    );
}
