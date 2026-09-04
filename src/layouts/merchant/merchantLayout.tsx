// src/layouts/merchant/merchantLayout.tsx
//
// Thin wrapper around the shared `RoleLayout` (Task 8, Group 2 shared-abstractions).
// Per-role differences preserved explicitly:
//   - extraProviders/onAuthReady/extraContent: all correctly OMITTED for Merchant.
//     Merchant wraps ZERO providers — confirmed deliberate (usePermission() has a safe
//     FALLBACK_FULL_ACCESS for out-of-tree calls, this is not a bug; see task-8-brief.md).

import { RoleLayout } from '@/layouts/RoleLayout';
import { EAccountType } from '@/shared/types/auth.type';
import { MERCHANT_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
import { t } from '@/shared/i18n/t';

export function MerchantLayout(props: BaseProps) {
    return (
        <RoleLayout
            accountType={EAccountType.MERCHANT}
            sidebarMenus={MERCHANT_SIDEBAR_MENUS}
            typeName={t('layout.typeName.merchant')}
            displayNameFallback="Merchant"
            bgColor="bg-[#F5F0FF]"
            loginRoute="merchantAuth.login"
        >
            {props.children}
        </RoleLayout>
    );
}
