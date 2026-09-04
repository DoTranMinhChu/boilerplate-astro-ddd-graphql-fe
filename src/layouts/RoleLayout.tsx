// src/layouts/RoleLayout.tsx
//
// Shared shell for all 4 role portals (Admin/Agency/Merchant/Tenant), extracted from
// the 4 near-identical AdminLayout/AgencyLayout/merchantLayout/TenantLayout files.
//
// The 4 real per-role differences are each carried forward EXPLICITLY via a prop —
// none of them are silently dropped or normalized:
//   1. Provider stack (Merchant: none / Admin+Agency: PermissionProvider / Tenant: 3 nested
//      providers)                                          → `extraProviders`
//   2. Agency's <AgencyActingTenantBar/> rendered before children inside <main>
//                                                            → `extraContent`
//   3. Admin's `switchMode(...)` call / Tenant's 3 fetch calls, both fired once the
//      account is ready (same createEffect timing as the pre-extraction code)
//                                                            → `onAuthReady`
//
// Two discrepancies found while extracting this — both explicit, disclosed decisions
// (see task-8-report.md for the full writeup), NOT silent normalizations:
//   - Content wrapper class is hardcoded here as "max-w-full mx-auto" (the 3-of-4 majority
//     Agency/Merchant/Tenant already used). This is a deliberate, disclosed behavior change
//     for Admin specifically, which previously used bare "mx-auto".
//   - `displayName` fallback strings ('Admin'/'Agency'/'Merchant'/'Tenant') stay explicit
//     literal props (`displayNameFallback`), not promoted to i18n keys — out of scope here.

import { Show, createEffect, JSX } from 'solid-js';
import { DashboardRootSidebar } from './dashboard/components/DashboardRootSidebar';
import { DashboardMainSidebar } from './dashboard/components/DashboardMainSidebar';
import { DashboardHeader } from './dashboard/components/DashboardHeader';
import { DashboardContext } from './dashboard/DashboardContext';
import { Icon } from '@shared/components/icons/Icon';
import { EAccountType } from '@/shared/types/auth.type';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { useAccountByType } from '@/shared/hooks/useAccountByType';
import { SidebarMenu } from '@/shared/common/app/SidebarMenus';
import { RoutePathsOf, DotNotationKeys } from '@/core/components/routes/Routes';
import { APP_ROUTES } from '@/shared/common/app/AppRoutes';

export interface RoleLayoutProps extends BaseProps {
    accountType: EAccountType;
    sidebarMenus: SidebarMenu<RoutePathsOf<typeof APP_ROUTES>>[];
    typeName: string;              // pre-resolved, e.g. t('layout.typeName.admin')
    displayNameFallback: string;   // e.g. 'Admin' — literal, not run through t()
    bgColor: string;
    loginRoute: DotNotationKeys<typeof APP_ROUTES>;  // e.g. 'adminAuth.login'
    extraProviders?: (props: { children: JSX.Element }) => JSX.Element;
    onAuthReady?: () => void;
    extraContent?: () => JSX.Element;
}

function RoleLayoutInner(props: RoleLayoutProps) {
    const { navigateToPage } = useRoutes();
    const { account, isLoading } = useAccountByType(props.accountType);

    createEffect(() => {
        if (isLoading()) return;
        if (!account()) {
            navigateToPage(props.loginRoute);
            return;
        }
        props.onAuthReady?.();
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
                    accountType: () => props.accountType,
                    sidebarMenus: () => props.sidebarMenus,
                    typeName: () => props.typeName,
                    displayName: () => account()?.account.name || props.displayNameFallback,
                    currentAuthAccount: account,
                }}
            >
                <div class={`flex h-screen w-full ${props.bgColor} overflow-hidden animate-fade-in`}>
                    <DashboardRootSidebar />
                    <DashboardMainSidebar />
                    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <DashboardHeader />
                        <main class="flex-1 overflow-y-auto p-4 md:p-6 pb-20 scrollbar-custom">
                            <div class="max-w-full mx-auto">
                                {props.extraContent?.()}
                                {props.children}
                            </div>
                        </main>
                    </div>
                </div>
            </DashboardContext.Provider>
        </Show>
    );
}

// No-op passthrough used when the caller supplies no `extraProviders` (Merchant). Keeping
// `RoleLayoutInner` written INLINE as JSX children of `<Providers>` below — rather than
// precomputed into a `const` variable first — matters: Solid only defers evaluating a
// component's children (and thus keeps them correctly nested in the reactive owner tree, for
// `useContext` resolution) when they're written directly as that component's JSX children.
// Precomputing `const inner = <RoleLayoutInner>...</RoleLayoutInner>` before handing it to
// `<Providers>` would evaluate `RoleLayoutInner` (and everything under it, including
// `props.children`) EAGERLY, before `Providers` ever runs — so anything inside that reads
// `usePermission()`/`useFeature()`/`useTenantRoles()` would silently resolve to their
// context-less fallbacks instead of the real provider, even though `PermissionProvider` etc.
// appear to "wrap" it in the JSX. Caught empirically by
// test/layouts/TenantLayout.authReady.integration.test.tsx.
const NoopProviders = (p: { children: JSX.Element }) => p.children;

export function RoleLayout(props: RoleLayoutProps) {
    const Providers = props.extraProviders ?? NoopProviders;

    return (
        <Providers>
            <RoleLayoutInner
                accountType={props.accountType}
                sidebarMenus={props.sidebarMenus}
                typeName={props.typeName}
                displayNameFallback={props.displayNameFallback}
                bgColor={props.bgColor}
                loginRoute={props.loginRoute}
                onAuthReady={props.onAuthReady}
                extraContent={props.extraContent}
            >
                {props.children}
            </RoleLayoutInner>
        </Providers>
    );
}
