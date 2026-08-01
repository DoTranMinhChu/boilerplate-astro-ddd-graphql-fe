// src/layouts/merchant/merchantLayout.tsx

import { Show, createEffect } from 'solid-js';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { EAccountType } from '@/shared/types/auth.type';
import { DashboardRootSidebar } from '../dashboard/components/DashboardRootSidebar';
import { DashboardMainSidebar } from '../dashboard/components/DashboardMainSidebar';
import { DashboardHeader } from '../dashboard/components/DashboardHeader';
import { DashboardContext } from '../dashboard/DashboardContext';
import { MERCHANT_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
import { Icon } from '@shared/components/icons/Icon';
import { useAccountByType } from '@/core/hooks/useAccountByType';

export function MerchantLayout(props: BaseProps) {
    const { navigateToPage } = useRoutes();
    const { } = useAuth();

    const { account, isLoading } = useAccountByType(EAccountType.MERCHANT);

    createEffect(() => {
        if (isLoading()) return;
        if (!account()) {
            navigateToPage('merchantAuth.login');
        }
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
                    accountType: () => EAccountType.MERCHANT,
                    sidebarMenus: () => MERCHANT_SIDEBAR_MENUS,
                    typeName: () => 'tài khoản',
                    displayName: () => account()?.account.name || 'Merchant',
                    currentAuthAccount: account,
                }}
            >
                <div class="flex h-screen w-full bg-[#F5F0FF] overflow-hidden animate-fade-in">
                    <DashboardRootSidebar />
                    <DashboardMainSidebar />
                    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

                        <DashboardHeader />
                        <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-20 custom-scrollbar">
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