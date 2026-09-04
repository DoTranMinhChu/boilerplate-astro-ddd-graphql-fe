// test/layouts/AgencyLayout.test.tsx
// @vitest-environment jsdom
//
// Coverage for the thin `AgencyLayout` wrapper (Task 8, Group 2 shared-abstractions) — verifies
// it wires the exact per-role props onto the shared `RoleLayout`. `RoleLayout` itself is mocked
// out here (its own mechanics are covered by RoleLayout.test.tsx) — this file is purely about
// the wiring, in particular the 2 things ONLY Agency has: PermissionProvider (like Admin, but
// NOT Feature/TenantRoles like Tenant) and the AgencyActingTenantBar extraContent.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@solidjs/testing-library';
import { EAccountType } from '@/shared/types/auth.type';
import { AGENCY_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
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

vi.mock('@/shared/components/agency/AgencyActingTenantBar', () => ({
  AgencyActingTenantBar: () => <div data-testid="acting-tenant-bar" />,
}));

import { AgencyLayout } from '@/layouts/agency/AgencyLayout';

function renderAgencyLayout() {
  render(() => (
    <AgencyLayout>
      <div data-testid="page-content">page</div>
    </AgencyLayout>
  ));
  return { props: capturedProps.at(-1) };
}

afterEach(() => {
  cleanup();
  capturedProps.length = 0;
});

describe('AgencyLayout', () => {
  it('passes the exact Agency identity props to RoleLayout', () => {
    const { props } = renderAgencyLayout();

    expect(props.accountType).toBe(EAccountType.AGENCY);
    expect(props.sidebarMenus).toBe(AGENCY_SIDEBAR_MENUS);
    expect(props.typeName).toBe(t('layout.typeName.agency'));
    expect(props.displayNameFallback).toBe('Agency');
    expect(props.bgColor).toBe('bg-[#FDF8FF]');
    expect(props.loginRoute).toBe('agencyAuth.login');
  });

  it('supplies extraProviders wrapping PermissionProvider only (same as Admin, not Tenant\'s 3)', () => {
    const { props } = renderAgencyLayout();

    expect(props.extraProviders).toBeTypeOf('function');
    const { getByTestId, queryByTestId } = render(() =>
      props.extraProviders({ children: <div data-testid="inner-probe" /> }),
    );
    expect(getByTestId('permission-provider').contains(getByTestId('inner-probe'))).toBe(true);
    expect(queryByTestId('feature-provider')).toBeNull();
    expect(queryByTestId('tenant-roles-provider')).toBeNull();
  });

  it('supplies extraContent rendering AgencyActingTenantBar — the one role with this UI element', () => {
    const { props } = renderAgencyLayout();

    expect(props.extraContent).toBeTypeOf('function');
    const { getByTestId } = render(() => props.extraContent());
    expect(getByTestId('acting-tenant-bar')).toBeTruthy();
  });

  it('does NOT supply onAuthReady (Agency has no post-auth side effect, unlike Admin/Tenant)', () => {
    const { props } = renderAgencyLayout();
    expect(props.onAuthReady).toBeUndefined();
  });

  it('renders children through the (stubbed) RoleLayout', () => {
    renderAgencyLayout();
    expect(screen.getByTestId('page-content')).toBeTruthy();
  });
});
