// test/layouts/TenantLayout.authReady.integration.test.tsx
// @vitest-environment jsdom
//
// The one test in this task that matters most: does `TenantLayout`'s `onAuthReady` actually
// deliver fetched permissions/features/roles into the REAL PermissionProvider/FeatureProvider/
// TenantRolesProvider — or does it silently land on their context-less FALLBACK objects
// instead (whose `setPermissions`/`setFeatures`/`setRoles` are no-ops)?
//
// This is a real landmine specific to this extraction: `TenantLayout`'s own function body runs
// BEFORE `RoleLayout` invokes `extraProviders` (which is what actually mounts the providers) —
// so calling `usePermissionFetcher()`/`useFeatureFetcher()`/`useTenantRolesFetcher()` at
// `TenantLayout`'s top level (the "obvious" refactor, mirroring the pre-extraction
// `TenantLayoutInner`) would resolve `usePermission()`/`useFeature()`/`useTenantRoles()` to
// their FALLBACK (context-less) objects, and every fetched permission/feature/role would be
// silently discarded. The fix (see the comment in src/layouts/tenant/TenantLayout.tsx) is to
// call those 3 hooks FRESH, inside `onAuthReady`'s callback body — which only ever executes
// later, from inside `RoleLayoutInner`'s `createEffect`, genuinely nested under the providers.
//
// Unlike the sibling TenantLayout.test.tsx, NOTHING under test here is mocked except: the
// network-facing services (no real GraphQL client in tests), `useAccountByType` (no real
// AuthProvider), routing, and the 3 out-of-scope dashboard shell components (already confirmed
// role-agnostic in task-8-brief.md Step 1). `RoleLayout`, `TenantLayout`, `PermissionProvider`,
// `FeatureProvider`, `TenantRolesProvider`, and all 3 fetcher hooks are the REAL implementations.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { usePermission } from '@/shared/contexts/permission/PermissionContext';
import { useFeature } from '@/shared/contexts/feature/FeatureContext';
import { useTenantRoles } from '@/shared/contexts/tenantRoles/TenantRolesContext';
import { RoutesContext, IRoutesContext } from '@shared/contexts/routes/RoutesContext';
import { EAccountType } from '@/shared/types/auth.type';

vi.mock('@/layouts/dashboard/components/DashboardRootSidebar', () => ({
  DashboardRootSidebar: () => <div data-testid="root-sidebar" />,
}));
vi.mock('@/layouts/dashboard/components/DashboardMainSidebar', () => ({
  DashboardMainSidebar: () => <div data-testid="main-sidebar" />,
}));
vi.mock('@/layouts/dashboard/components/DashboardHeader', () => ({
  DashboardHeader: () => <div data-testid="header" />,
}));

const mockUseAccountByType = vi.fn();
vi.mock('@/shared/hooks/useAccountByType', () => ({
  useAccountByType: (type: EAccountType) => mockUseAccountByType(type),
}));

const getMyPermissions = vi.fn();
vi.mock('@/shared/services/accountPermission/accountPermission.service', () => ({
  AccountPermissionService: { getMyPermissions: (...a: any[]) => getMyPermissions(...a) },
}));

const getMyTenant = vi.fn();
vi.mock('@/shared/services/tenant/tenant.service', () => ({
  TenantService: { getMyTenant: (...a: any[]) => getMyTenant(...a) },
}));

import { TenantLayout } from '@/layouts/tenant/TenantLayout';

// Reads back the REAL context values — proves data reached the actual provider instance
// mounted by TenantLayout's `extraProviders`, not a fallback.
function ContextProbe() {
  const { permissions, isLoaded: permsLoaded } = usePermission();
  const { features, isLoaded: featuresLoaded } = useFeature();
  const { roles, isLoaded: rolesLoaded } = useTenantRoles();
  return (
    <div data-testid="probe">
      <span data-testid="probe-perms-loaded">{String(permsLoaded())}</span>
      <span data-testid="probe-perms-count">{permissions().length}</span>
      <span data-testid="probe-features-loaded">{String(featuresLoaded())}</span>
      <span data-testid="probe-features-count">{features().length}</span>
      <span data-testid="probe-roles-loaded">{String(rolesLoaded())}</span>
      <span data-testid="probe-roles-count">{roles().length}</span>
    </div>
  );
}

function withRoutes(children: () => any) {
  const routes: IRoutesContext = {
    pathname: '/', params: {}, searchParams: {},
    setSearchParams: vi.fn(), navigate: vi.fn() as any, navigateToPage: vi.fn(),
  };
  return () => <RoutesContext.Provider value={routes}>{children()}</RoutesContext.Provider>;
}

afterEach(() => {
  cleanup();
  mockUseAccountByType.mockReset();
  getMyPermissions.mockReset();
  getMyTenant.mockReset();
});

describe('TenantLayout — onAuthReady reaches the REAL providers (not the fallback)', () => {
  it('starts unloaded (real PermissionProvider default state — the fallback would read isLoaded=true from the start)', () => {
    mockUseAccountByType.mockReturnValue({ account: () => null, isLoading: () => true });
    render(withRoutes(() => (
      <TenantLayout>
        <ContextProbe />
      </TenantLayout>
    )));
    // Still on the loading gate — probe (and its providers) aren't mounted yet either way,
    // this just documents the starting point before the account resolves.
    expect(screen.queryByTestId('probe')).toBeNull();
  });

  it('delivers fetched permissions/features/roles into the real contexts once the account is ready', async () => {
    getMyPermissions.mockResolvedValue({
      permissions: [{ permission: 'FAKE_PERM_1', scopeRule: { type: 'ALLOW_ALL' } }],
    });
    getMyTenant.mockResolvedValue({ subscribedFeatures: ['FAKE_FEATURE_1', 'FAKE_FEATURE_2'] });

    mockUseAccountByType.mockReturnValue({
      account: () => ({ account: { id: 't1', username: 'tenant1', name: 'Tenant One', type: EAccountType.TENANT }, roles: [] }),
      isLoading: () => false,
    });

    render(withRoutes(() => (
      <TenantLayout>
        <ContextProbe />
      </TenantLayout>
    )));

    // Real services were actually invoked (via the real usePermissionFetcher/useFeatureFetcher).
    await waitFor(() => expect(getMyPermissions).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getMyTenant).toHaveBeenCalledTimes(1));

    // The decisive assertion: the probe — genuinely nested inside the real providers — sees
    // the fetched data. If onAuthReady's hook calls had resolved to the FALLBACK instead, these
    // counts would stay 0 forever (fallback's setPermissions/setFeatures are no-ops) even
    // though the services above were called.
    await waitFor(() => expect(screen.getByTestId('probe-perms-count').textContent).toBe('1'));
    expect(screen.getByTestId('probe-features-count').textContent).toBe('2');
    // fetchTenantRoles() is a synchronous no-op-data (setRoles([])) by design (see
    // useTenantRolesFetcher.ts) — isLoaded transitioning to true (from the real provider's
    // false-by-default) is the meaningful signal here, not a nonzero count.
    await waitFor(() => expect(screen.getByTestId('probe-roles-loaded').textContent).toBe('true'));
    expect(screen.getByTestId('probe-roles-count').textContent).toBe('0');
  });
});
