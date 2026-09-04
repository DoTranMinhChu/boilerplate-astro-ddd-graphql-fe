// test/layouts/TenantLayout.test.tsx
// @vitest-environment jsdom
//
// Coverage for the thin `TenantLayout` wrapper (Task 8, Group 2 shared-abstractions) — verifies
// it wires the exact per-role props onto the shared `RoleLayout`: the 3 NESTED providers
// (Permission > Feature > TenantRoles, in this exact order — this is the exact failure mode
// task-8-brief.md flags: "running Tenant's 3 fetches for Agency" or getting the nesting order
// wrong), and the 3 fetch calls fired together via onAuthReady.
//
// `RoleLayout` and the 3 fetcher hooks are mocked here so this file stays a pure wiring test.
// The separate, more important question — whether `onAuthReady`'s fetcher-hook calls (made
// FRESH inside the callback, not hoisted to this component's top level — see the comment in
// TenantLayout.tsx) actually reach the REAL providers at runtime, not the context-less
// fallback — is answered empirically by
// test/layouts/TenantLayout.authReady.integration.test.tsx.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@solidjs/testing-library';
import { EAccountType } from '@/shared/types/auth.type';
import { TENANT_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
import { t } from '@/shared/i18n/t';

const capturedProps: any[] = [];
vi.mock('@/layouts/RoleLayout', () => ({
  RoleLayout: (props: any) => {
    capturedProps.push(props);
    return <div data-testid="role-layout-stub">{props.children}</div>;
  },
}));

vi.mock('@/shared/contexts/permission/PermissionContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    PermissionProvider: (p: { children: any }) => <div data-testid="permission-provider">{p.children}</div>,
  };
});
vi.mock('@/shared/contexts/feature/FeatureContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    FeatureProvider: (p: { children: any }) => <div data-testid="feature-provider">{p.children}</div>,
  };
});
vi.mock('@/shared/contexts/tenantRoles/TenantRolesContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    TenantRolesProvider: (p: { children: any }) => <div data-testid="tenant-roles-provider">{p.children}</div>,
  };
});

const fetchPermissions = vi.fn();
const fetchFeatures = vi.fn();
const fetchTenantRoles = vi.fn();
vi.mock('@/shared/hooks/usePermissionFetcher', () => ({
  usePermissionFetcher: () => ({ fetchPermissions }),
}));
vi.mock('@/shared/hooks/useFeatureFetcher', () => ({
  useFeatureFetcher: () => ({ fetchFeatures }),
}));
vi.mock('@/shared/hooks/useTenantRolesFetcher', () => ({
  useTenantRolesFetcher: () => ({ fetchTenantRoles }),
}));

import { TenantLayout } from '@/layouts/tenant/TenantLayout';

function renderTenantLayout() {
  render(() => (
    <TenantLayout>
      <div data-testid="page-content">page</div>
    </TenantLayout>
  ));
  return { props: capturedProps.at(-1) };
}

afterEach(() => {
  cleanup();
  capturedProps.length = 0;
  fetchPermissions.mockReset();
  fetchFeatures.mockReset();
  fetchTenantRoles.mockReset();
});

describe('TenantLayout', () => {
  it('passes the exact Tenant identity props to RoleLayout', () => {
    const { props } = renderTenantLayout();

    expect(props.accountType).toBe(EAccountType.TENANT);
    expect(props.sidebarMenus).toBe(TENANT_SIDEBAR_MENUS);
    expect(props.typeName).toBe(t('layout.typeName.tenant'));
    expect(props.displayNameFallback).toBe('Tenant');
    expect(props.bgColor).toBe('bg-[#F0F7FF]');
    expect(props.loginRoute).toBe('tenantAuth.login');
  });

  it('supplies extraProviders nested EXACTLY Permission > Feature > TenantRoles (not Admin/Agency\'s single Permission-only)', () => {
    const { props } = renderTenantLayout();

    expect(props.extraProviders).toBeTypeOf('function');
    const { getByTestId } = render(() =>
      props.extraProviders({ children: <div data-testid="inner-probe" /> }),
    );
    const permission = getByTestId('permission-provider');
    const feature = getByTestId('feature-provider');
    const tenantRoles = getByTestId('tenant-roles-provider');
    const probe = getByTestId('inner-probe');

    expect(permission.contains(feature)).toBe(true);
    expect(feature.contains(tenantRoles)).toBe(true);
    expect(tenantRoles.contains(probe)).toBe(true);
  });

  it('does NOT supply extraContent (no AgencyActingTenantBar-style UI for Tenant)', () => {
    const { props } = renderTenantLayout();
    expect(props.extraContent).toBeUndefined();
  });

  it('onAuthReady fires all 3 fetch calls together', () => {
    const { props } = renderTenantLayout();

    expect(props.onAuthReady).toBeTypeOf('function');
    expect(fetchPermissions).not.toHaveBeenCalled();
    expect(fetchFeatures).not.toHaveBeenCalled();
    expect(fetchTenantRoles).not.toHaveBeenCalled();

    props.onAuthReady();

    expect(fetchPermissions).toHaveBeenCalledTimes(1);
    expect(fetchFeatures).toHaveBeenCalledTimes(1);
    expect(fetchTenantRoles).toHaveBeenCalledTimes(1);
  });

  it('renders children through the (stubbed) RoleLayout', () => {
    renderTenantLayout();
    expect(screen.getByTestId('page-content')).toBeTruthy();
  });
});
