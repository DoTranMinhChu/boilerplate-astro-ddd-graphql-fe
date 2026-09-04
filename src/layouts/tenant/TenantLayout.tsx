// src/layouts/tenant/TenantLayout.tsx
//
// THAY ĐỔI SO VỚI BẢN GỐC:
//   + Wrap bằng PermissionProvider
//   + Gọi fetchPermissions() sau khi account ready
//   Mọi thứ khác giữ nguyên 100%
//
// Now a thin wrapper around the shared `RoleLayout` (Task 8, Group 2 shared-abstractions).
// Per-role differences preserved explicitly:
//   - extraProviders: 3 NESTED providers — PermissionProvider > FeatureProvider >
//     TenantRolesProvider, in this exact order (matches the pre-extraction nesting).
//   - onAuthReady: the 3 fetch calls (fetchPermissions/fetchFeatures/fetchTenantRoles),
//     fired together once the account is ready — same as before.
//
// IMPORTANT: the 3 `use*Fetcher()` hooks are called FRESH, INSIDE `onAuthReady`'s callback
// body — not hoisted to this component's top level. `TenantLayout`'s own function body runs
// BEFORE `RoleLayout` invokes `extraProviders` (which is what actually creates the
// Permission/Feature/TenantRoles providers), so a hook call made here at the top level would
// resolve `usePermission()`/`useFeature()`/`useTenantRoles()` to their context-less FALLBACK
// objects (safe no-ops) instead of the real providers — silently discarding every fetch.
// `onAuthReady` itself is only ever invoked later, from inside `RoleLayoutInner`'s
// `createEffect`, which — dynamically, via Solid's owner-tree-based `useContext` resolution —
// IS nested under the providers (mirrors the existing `usePermission()`-inside-`createMemo`
// pattern already used by `DashboardMainSidebar.tsx`), so calling the fetcher hooks there
// correctly reaches the real provider instances. Empirically verified (including a deliberate
// revert-and-rerun of this exact fix, to confirm the test suite actually catches its absence)
// by test/layouts/TenantLayout.authReady.integration.test.tsx.

import { RoleLayout } from '@/layouts/RoleLayout';
import { EAccountType } from '@/shared/types/auth.type';
import { TENANT_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
import { PermissionProvider } from '@/shared/contexts/permission/PermissionContext';
import { usePermissionFetcher } from '@/shared/hooks/usePermissionFetcher';
import { FeatureProvider } from '@/shared/contexts/feature/FeatureContext';
import { useFeatureFetcher } from '@/shared/hooks/useFeatureFetcher';
import { TenantRolesProvider } from '@/shared/contexts/tenantRoles/TenantRolesContext';
import { useTenantRolesFetcher } from '@/shared/hooks/useTenantRolesFetcher';
import { t } from '@/shared/i18n/t';

export function TenantLayout(props: BaseProps) {
    return (
        <RoleLayout
            accountType={EAccountType.TENANT}
            sidebarMenus={TENANT_SIDEBAR_MENUS}
            typeName={t('layout.typeName.tenant')}
            displayNameFallback="Tenant"
            bgColor="bg-[#F0F7FF]"
            loginRoute="tenantAuth.login"
            extraProviders={(p) => (
                <PermissionProvider>
                    <FeatureProvider>
                        <TenantRolesProvider>{p.children}</TenantRolesProvider>
                    </FeatureProvider>
                </PermissionProvider>
            )}
            onAuthReady={() => {
                // Called fresh here (see file-header note) so these resolve to the real
                // providers mounted by `extraProviders` above, not the context-less fallback.
                const { fetchPermissions } = usePermissionFetcher();
                const { fetchFeatures } = useFeatureFetcher();
                const { fetchTenantRoles } = useTenantRolesFetcher();
                fetchPermissions();
                fetchFeatures();
                fetchTenantRoles();
            }}
        >
            {props.children}
        </RoleLayout>
    );
}
