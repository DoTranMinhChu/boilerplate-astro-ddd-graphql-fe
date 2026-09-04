// src/layouts/agency/AgencyLayout.tsx
//
// THAY ĐỔI:
//   + Wrap bằng PermissionProvider (cùng pattern với TenantLayout)
//   + Agency hiện tại chưa có phân quyền → không gọi fetchPermissions()
//     → PermissionProvider ở trạng thái empty, isLoaded = false
//     → usePermission() trong các component con trả về full-access fallback
//        (vì Provider có trong tree nhưng chưa load → các can() dùng permMap())
//
//   Lưu ý: khi Agency có phân quyền riêng trong tương lai, chỉ cần thêm
//   fetchPermissions() trong AgencyLayoutInner — không cần sửa gì khác.

import { Show, createEffect } from 'solid-js';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { EAccountType } from '@/shared/types/auth.type';
import { DashboardRootSidebar } from '../dashboard/components/DashboardRootSidebar';
import { DashboardMainSidebar } from '../dashboard/components/DashboardMainSidebar';
import { DashboardHeader } from '../dashboard/components/DashboardHeader';
import { DashboardContext } from '../dashboard/DashboardContext';
import { AGENCY_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
import { Icon } from '@shared/components/icons/Icon';
import { useAccountByType } from '@/shared/hooks/useAccountByType';
import { PermissionProvider } from '@/shared/contexts/permission/PermissionContext';
import { AgencyActingTenantBar } from '@/shared/components/agency/AgencyActingTenantBar';
import { t } from '@/shared/i18n/t';

// Inner layout — nằm bên trong PermissionProvider
function AgencyLayoutInner(props: BaseProps) {
    const { navigateToPage } = useRoutes();
    const { account, isLoading } = useAccountByType(EAccountType.AGENCY);

    createEffect(() => {
        if (isLoading()) return;
        if (!account()) {
            navigateToPage('agencyAuth.login');
        }
        // TODO: fetchPermissions() khi Agency có RBAC riêng
    });

    return (
        <Show
            when={!isLoading() && account()}
            fallback={
                <div class="flex-center h-screen w-full">
                    <Icon spinner xxl />
                </div>
            }
        >
            <DashboardContext.Provider
                value={{
                    accountType: () => EAccountType.AGENCY,
                    sidebarMenus: () => AGENCY_SIDEBAR_MENUS,
                    typeName: () => t('layout.typeName.agency'),
                    displayName: () => account()?.account.name || 'Agency',
                    currentAuthAccount: account,
                }}
            >
                <div class="flex h-screen w-full bg-[#FDF8FF] overflow-hidden animate-fade-in">
                    <DashboardRootSidebar />
                    <DashboardMainSidebar />
                    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <DashboardHeader />
                        <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-20 scrollbar-custom">
                            <div class="max-w-full mx-auto">
                                <AgencyActingTenantBar />
                                {props.children}
                            </div>
                        </main>
                    </div>
                </div>
            </DashboardContext.Provider>
        </Show>
    );
}

export function AgencyLayout(props: BaseProps) {
    return (
        <PermissionProvider>
            <AgencyLayoutInner>{props.children}</AgencyLayoutInner>
        </PermissionProvider>
    );
}