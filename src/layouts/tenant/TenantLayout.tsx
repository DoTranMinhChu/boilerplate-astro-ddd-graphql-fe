// src/layouts/tenant/TenantLayout.tsx
//
// THAY ĐỔI SO VỚI BẢN GỐC:
//   + Wrap bằng PermissionProvider
//   + Gọi fetchPermissions() sau khi account ready
//   Mọi thứ khác giữ nguyên 100%

import { Show, createEffect } from 'solid-js';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { EAccountType } from '@/shared/types/auth.type';
import { DashboardRootSidebar } from '../dashboard/components/DashboardRootSidebar';
import { DashboardMainSidebar } from '../dashboard/components/DashboardMainSidebar';
import { DashboardHeader } from '../dashboard/components/DashboardHeader';
import { DashboardContext } from '../dashboard/DashboardContext';
import { TENANT_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
import { Icon } from '@shared/components/icons/Icon';
import { useAccountByType } from '@/core/hooks/useAccountByType';
import { PermissionProvider } from '@/shared/contexts/permission/PermissionContext';
import { usePermissionFetcher } from '@/core/hooks/usePermissionFetcher';
import { FeatureProvider } from '@/shared/contexts/feature/FeatureContext';
import { useFeatureFetcher } from '@/core/hooks/useFeatureFetcher';
import { TenantRolesProvider } from '@/shared/contexts/tenantRoles/TenantRolesContext';
import { useTenantRolesFetcher } from '@/core/hooks/useTenantRolesFetcher';
import { t } from '@/shared/i18n/t';


// Inner component phải nằm bên trong PermissionProvider để dùng được usePermission()
function TenantLayoutInner(props: BaseProps) {
    const { navigateToPage } = useRoutes();
    const { account, isLoading } = useAccountByType(EAccountType.TENANT);


    const { fetchPermissions } = usePermissionFetcher();
    const { fetchFeatures } = useFeatureFetcher();
    const { fetchTenantRoles } = useTenantRolesFetcher();
    createEffect(() => {
        if (isLoading()) return;
        if (!account()) {
            navigateToPage('tenantAuth.login');
            return;
        }
        fetchPermissions();
        fetchFeatures();
        fetchTenantRoles();
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
                    accountType: () => EAccountType.TENANT,
                    sidebarMenus: () => TENANT_SIDEBAR_MENUS,
                    typeName: () => t('layout.typeName.tenant'),
                    displayName: () => account()?.account.name || 'Tenant',
                    currentAuthAccount: account,
                }}
            >
                <div class="flex h-screen w-full bg-[#F0F7FF] overflow-hidden animate-fade-in">
                    <DashboardRootSidebar />
                    <DashboardMainSidebar />
                    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <DashboardHeader />
                        <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-20 scrollbar-custom">
                            <div class="max-w-full mx-auto">
                                {props.children}
                            </div>
                        </main>
                    </div>
                </div>
            </DashboardContext.Provider>
        </Show>
    );
}

export function TenantLayout(props: BaseProps) {
    return (
        <PermissionProvider>
            <FeatureProvider>
                <TenantRolesProvider>
                    <TenantLayoutInner>{props.children}</TenantLayoutInner>
                </TenantRolesProvider>
            </FeatureProvider>
        </PermissionProvider>
    );
}