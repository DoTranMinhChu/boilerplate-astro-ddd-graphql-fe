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

import { Show, createEffect } from 'solid-js';
import { DashboardRootSidebar } from '../dashboard/components/DashboardRootSidebar';
import { DashboardMainSidebar } from '../dashboard/components/DashboardMainSidebar';
import { DashboardHeader } from '../dashboard/components/DashboardHeader';
import { DashboardContext } from '../dashboard/DashboardContext';
import { ADMIN_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
import { Icon } from '@shared/components/icons/Icon';
import { EAccountType } from '@/shared/types/auth.type';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { useApp } from '@/shared/contexts/app/AppContext';
import { useAccountByType } from '@/shared/hooks/useAccountByType';
import { PermissionProvider } from '@/shared/contexts/permission/PermissionContext';
import { t } from '@/shared/i18n/t';

function AdminLayoutInner(props: BaseProps) {
    const { switchMode } = useApp();
    const { navigateToPage } = useRoutes();
    const { account, isLoading } = useAccountByType(EAccountType.ADMIN);

    createEffect(() => {
        if (isLoading()) return;
        if (!account()) {
            navigateToPage('adminAuth.login');
            return;
        }
        switchMode(EAccountType.ADMIN, { accountId: account()?.account.id });
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
                    accountType: () => EAccountType.ADMIN,
                    sidebarMenus: () => ADMIN_SIDEBAR_MENUS,
                    typeName: () => t('layout.typeName.admin'),
                    displayName: () => account()?.account.name || 'Admin',
                    currentAuthAccount: account,
                }}
            >
                <div class="flex h-screen w-full bg-[#F6F8FA] overflow-hidden animate-fade-in">
                    <DashboardRootSidebar />
                    <DashboardMainSidebar />
                    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <DashboardHeader />
                        <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-20 scrollbar-custom">
                            <div class="mx-auto">
                                {props.children}
                            </div>
                        </main>
                    </div>
                </div>
            </DashboardContext.Provider>
        </Show>
    );
}

export function AdminLayout(props: BaseProps) {
    return (
        <PermissionProvider>
            <AdminLayoutInner>{props.children}</AdminLayoutInner>
        </PermissionProvider>
    );
}