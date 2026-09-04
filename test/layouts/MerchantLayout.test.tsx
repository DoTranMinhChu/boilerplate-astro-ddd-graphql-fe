// test/layouts/MerchantLayout.test.tsx
// @vitest-environment jsdom
//
// Coverage for the thin `MerchantLayout` wrapper (Task 8, Group 2 shared-abstractions) —
// verifies it wires the exact per-role props onto the shared `RoleLayout`. Merchant is the
// "all 3 optional props correctly absent" case — this is the exact failure mode task-8-brief.md
// flags as easy to introduce by copy/paste: accidentally giving Merchant a PermissionProvider
// it never had. `RoleLayout` is mocked out here (its own mechanics are covered by
// RoleLayout.test.tsx) — this file is purely about the wiring.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@solidjs/testing-library';
import { EAccountType } from '@/shared/types/auth.type';
import { MERCHANT_SIDEBAR_MENUS } from '@shared/common/app/SidebarMenus';
import { t } from '@/shared/i18n/t';

const capturedProps: any[] = [];
vi.mock('@/layouts/RoleLayout', () => ({
  RoleLayout: (props: any) => {
    capturedProps.push(props);
    return <div data-testid="role-layout-stub">{props.children}</div>;
  },
}));

import { MerchantLayout } from '@/layouts/merchant/merchantLayout';

function renderMerchantLayout() {
  render(() => (
    <MerchantLayout>
      <div data-testid="page-content">page</div>
    </MerchantLayout>
  ));
  return { props: capturedProps.at(-1) };
}

afterEach(() => {
  cleanup();
  capturedProps.length = 0;
});

describe('MerchantLayout', () => {
  it('passes the exact Merchant identity props to RoleLayout', () => {
    const { props } = renderMerchantLayout();

    expect(props.accountType).toBe(EAccountType.MERCHANT);
    expect(props.sidebarMenus).toBe(MERCHANT_SIDEBAR_MENUS);
    expect(props.typeName).toBe(t('layout.typeName.merchant'));
    expect(props.displayNameFallback).toBe('Merchant');
    expect(props.bgColor).toBe('bg-[#F5F0FF]');
    expect(props.loginRoute).toBe('merchantAuth.login');
  });

  it('omits extraProviders, onAuthReady, and extraContent entirely — Merchant wraps ZERO providers (deliberate, not a bug)', () => {
    const { props } = renderMerchantLayout();

    expect(props.extraProviders).toBeUndefined();
    expect(props.onAuthReady).toBeUndefined();
    expect(props.extraContent).toBeUndefined();
  });

  it('renders children through the (stubbed) RoleLayout', () => {
    renderMerchantLayout();
    expect(screen.getByTestId('page-content')).toBeTruthy();
  });
});
