// test/layouts/AdminLayout.test.tsx
// @vitest-environment jsdom
//
// Coverage for the thin `AdminLayout` wrapper (Task 8, Group 2 shared-abstractions) — verifies
// it wires the exact per-role props onto the shared `RoleLayout`, and does NOT drift towards
// another role's shape (e.g. accidentally acquiring Tenant's fetch calls or Agency's
// AgencyActingTenantBar). `RoleLayout` itself is mocked out here (its own mechanics are
// covered by RoleLayout.test.tsx) — this file is purely about the wiring.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@solidjs/testing-library';
import { AppContext } from '@/shared/contexts/app/AppContext';
import { EAccountType } from '@/shared/types/auth.type';
import { ADMIN_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
import { t } from '@/shared/i18n/t';

const capturedProps: any[] = [];
vi.mock('@/layouts/RoleLayout', () => ({
  RoleLayout: (props: any) => {
    capturedProps.push(props);
    return <div data-testid="role-layout-stub">{props.children}</div>;
  },
}));

// Mocked so `extraProviders({children})` can be rendered in isolation and its nesting
// checked structurally, without needing the real Provider's internal fetch/GraphQL machinery.
vi.mock('@/shared/contexts/permission/PermissionContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    PermissionProvider: (p: { children: any }) => <div data-testid="permission-provider">{p.children}</div>,
  };
});

import { AdminLayout } from '@/layouts/admin/AdminLayout';

function renderAdminLayout() {
  const switchMode = vi.fn();
  render(() => (
    <AppContext.Provider value={{ appMode: () => 'PUBLIC', tenantId: () => '', tenantCode: () => '', switchMode }}>
      <AdminLayout>
        <div data-testid="page-content">page</div>
      </AdminLayout>
    </AppContext.Provider>
  ));
  return { switchMode, props: capturedProps.at(-1) };
}

afterEach(() => {
  cleanup();
  capturedProps.length = 0;
});

describe('AdminLayout', () => {
  it('passes the exact Admin identity props to RoleLayout', () => {
    const { props } = renderAdminLayout();

    expect(props.accountType).toBe(EAccountType.ADMIN);
    expect(props.sidebarMenus).toBe(ADMIN_SIDEBAR_MENUS);
    expect(props.typeName).toBe(t('layout.typeName.admin'));
    expect(props.displayNameFallback).toBe('Admin');
    expect(props.bgColor).toBe('bg-[#F6F8FA]');
    expect(props.loginRoute).toBe('adminAuth.login');
  });

  it('supplies extraProviders wrapping PermissionProvider only (not Feature/TenantRoles)', () => {
    const { props } = renderAdminLayout();

    expect(props.extraProviders).toBeTypeOf('function');
    const { getByTestId, queryByTestId } = render(() =>
      props.extraProviders({ children: <div data-testid="inner-probe" /> }),
    );
    expect(getByTestId('permission-provider').contains(getByTestId('inner-probe'))).toBe(true);
    expect(queryByTestId('feature-provider')).toBeNull();
    expect(queryByTestId('tenant-roles-provider')).toBeNull();
  });

  it('does NOT supply extraContent (no AgencyActingTenantBar-style UI for Admin)', () => {
    const { props } = renderAdminLayout();
    expect(props.extraContent).toBeUndefined();
  });

  it('onAuthReady carries forward switchMode(ADMIN) — kept explicit though it has zero consumers today', () => {
    const { props, switchMode } = renderAdminLayout();

    expect(props.onAuthReady).toBeTypeOf('function');
    expect(switchMode).not.toHaveBeenCalled();
    props.onAuthReady();
    expect(switchMode).toHaveBeenCalledTimes(1);
    expect(switchMode).toHaveBeenCalledWith(EAccountType.ADMIN);
  });

  it('renders children through the (stubbed) RoleLayout', () => {
    renderAdminLayout();
    expect(screen.getByTestId('page-content')).toBeTruthy();
  });
});
