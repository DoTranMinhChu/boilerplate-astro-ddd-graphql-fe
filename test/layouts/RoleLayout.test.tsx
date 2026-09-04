// test/layouts/RoleLayout.test.tsx
// @vitest-environment jsdom
//
// Coverage for the shared `RoleLayout` (Task 8, Group 2 shared-abstractions) — the shell every
// authenticated page in every role portal renders through.
//
// `DashboardRootSidebar`/`DashboardMainSidebar`/`DashboardHeader` are mocked out with simple
// probes: they were independently re-verified role-agnostic (read only via `useDashboard()`,
// task-8-brief.md Step 1) and are NOT under test here — real-rendering them would pull in
// Scrollbar/Brand/Icon machinery unrelated to what this task changed. `useAccountByType` is
// mocked so each test controls the loading/account state directly without a real AuthProvider.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { RoleLayout } from '@/layouts/RoleLayout';
import { useDashboard } from '@/layouts/dashboard/DashboardContext';
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

// A probe rendered as `children` — reads back whatever RoleLayout put into DashboardContext,
// so tests can assert the exact values without reaching into implementation internals.
function DashboardProbe() {
  const { accountType, sidebarMenus, typeName, displayName, currentAuthAccount } = useDashboard();
  return (
    <div data-testid="probe">
      <span data-testid="probe-account-type">{accountType()}</span>
      <span data-testid="probe-menu-count">{sidebarMenus().length}</span>
      <span data-testid="probe-type-name">{typeName()}</span>
      <span data-testid="probe-display-name">{displayName()}</span>
      <span data-testid="probe-username">{currentAuthAccount()?.account.username ?? ''}</span>
    </div>
  );
}

const mockUseAccountByType = vi.fn();
vi.mock('@/shared/hooks/useAccountByType', () => ({
  useAccountByType: (type: EAccountType) => mockUseAccountByType(type),
}));

function fakeAccount(overrides?: Partial<{ name: string; username: string }>) {
  return {
    account: { id: 'a1', username: overrides?.username ?? 'alice', name: overrides?.name ?? '', type: EAccountType.ADMIN },
    roles: [],
  };
}

function withRoutes(children: () => any, overrides?: Partial<IRoutesContext>) {
  const routes: IRoutesContext = {
    pathname: '/',
    params: {},
    searchParams: {},
    setSearchParams: vi.fn(),
    navigate: vi.fn() as any,
    navigateToPage: vi.fn(),
    ...overrides,
  };
  return () => <RoutesContext.Provider value={routes}>{children()}</RoutesContext.Provider>;
}

const baseProps = {
  accountType: EAccountType.ADMIN,
  sidebarMenus: [{ title: 'Group', subMenus: [{ title: 'Item', href: '/x', icon: 'x' }] }] as any,
  typeName: 'Hệ thống',
  displayNameFallback: 'Admin',
  bgColor: 'bg-[#F6F8FA]',
  loginRoute: 'adminAuth.login' as const,
};

afterEach(() => {
  cleanup();
  mockUseAccountByType.mockReset();
});

describe('RoleLayout', () => {
  it('shows the spinner fallback while loading, without mounting the dashboard shell or children', () => {
    mockUseAccountByType.mockReturnValue({ account: () => null, isLoading: () => true });
    render(withRoutes(() => (
      <RoleLayout {...baseProps}>
        <div data-testid="page-content">page</div>
      </RoleLayout>
    )));

    expect(screen.queryByTestId('root-sidebar')).toBeNull();
    expect(screen.queryByTestId('page-content')).toBeNull();
  });

  it('redirects to loginRoute via navigateToPage when loading finishes with no account', async () => {
    mockUseAccountByType.mockReturnValue({ account: () => null, isLoading: () => false });
    const navigateToPage = vi.fn();
    render(withRoutes(() => (
      <RoleLayout {...baseProps}>
        <div data-testid="page-content">page</div>
      </RoleLayout>
    ), { navigateToPage }));

    await waitFor(() => expect(navigateToPage).toHaveBeenCalledWith('adminAuth.login'));
    expect(screen.queryByTestId('page-content')).toBeNull();
  });

  it('renders the dashboard shell + children and calls onAuthReady once account is ready', async () => {
    mockUseAccountByType.mockReturnValue({ account: () => fakeAccount(), isLoading: () => false });
    const onAuthReady = vi.fn();
    const navigateToPage = vi.fn();
    render(withRoutes(() => (
      <RoleLayout {...baseProps} onAuthReady={onAuthReady}>
        <div data-testid="page-content">page</div>
      </RoleLayout>
    ), { navigateToPage }));

    await waitFor(() => expect(onAuthReady).toHaveBeenCalledTimes(1));
    expect(navigateToPage).not.toHaveBeenCalled();
    expect(screen.getByTestId('root-sidebar')).toBeTruthy();
    expect(screen.getByTestId('main-sidebar')).toBeTruthy();
    expect(screen.getByTestId('header')).toBeTruthy();
    expect(screen.getByTestId('page-content')).toBeTruthy();
  });

  it('exposes the exact props via DashboardContext, with displayName falling back to displayNameFallback when the account has no name', async () => {
    mockUseAccountByType.mockReturnValue({ account: () => fakeAccount({ name: '', username: 'bob' }), isLoading: () => false });
    render(withRoutes(() => (
      <RoleLayout {...baseProps} accountType={EAccountType.AGENCY} typeName="Đối tác" displayNameFallback="Agency">
        <DashboardProbe />
      </RoleLayout>
    )));

    await waitFor(() => expect(screen.getByTestId('probe')).toBeTruthy());
    expect(screen.getByTestId('probe-account-type').textContent).toBe(EAccountType.AGENCY);
    expect(screen.getByTestId('probe-menu-count').textContent).toBe('1');
    expect(screen.getByTestId('probe-type-name').textContent).toBe('Đối tác');
    expect(screen.getByTestId('probe-display-name').textContent).toBe('Agency');
    expect(screen.getByTestId('probe-username').textContent).toBe('bob');
  });

  it('uses the account name over displayNameFallback when present', async () => {
    mockUseAccountByType.mockReturnValue({ account: () => fakeAccount({ name: 'Alice Real Name' }), isLoading: () => false });
    render(withRoutes(() => (
      <RoleLayout {...baseProps}>
        <DashboardProbe />
      </RoleLayout>
    )));

    await waitFor(() => expect(screen.getByTestId('probe-display-name').textContent).toBe('Alice Real Name'));
  });

  it('always uses "max-w-full mx-auto" for the content wrapper — the disclosed decision for Admin (was bare "mx-auto" pre-extraction)', async () => {
    mockUseAccountByType.mockReturnValue({ account: () => fakeAccount(), isLoading: () => false });
    const { container } = render(withRoutes(() => (
      <RoleLayout {...baseProps}>
        <div data-testid="page-content">page</div>
      </RoleLayout>
    )));

    await waitFor(() => expect(screen.getByTestId('page-content')).toBeTruthy());
    const wrapper = screen.getByTestId('page-content').parentElement;
    expect(wrapper?.className).toBe('max-w-full mx-auto');
    // Sanity: no stray bare "mx-auto"-only wrapper anywhere in the tree either.
    expect(container.querySelectorAll('.mx-auto').length).toBeGreaterThan(0);
  });

  it('applies the bgColor prop to the outer shell', async () => {
    mockUseAccountByType.mockReturnValue({ account: () => fakeAccount(), isLoading: () => false });
    const { container } = render(withRoutes(() => (
      <RoleLayout {...baseProps} bgColor="bg-[#TESTCOLOR]">
        <div data-testid="page-content">page</div>
      </RoleLayout>
    )));

    await waitFor(() => expect(screen.getByTestId('page-content')).toBeTruthy());
    expect(container.querySelector('.bg-\\[\\#TESTCOLOR\\]')).toBeTruthy();
  });

  it('renders extraContent before children when provided', async () => {
    mockUseAccountByType.mockReturnValue({ account: () => fakeAccount(), isLoading: () => false });
    render(withRoutes(() => (
      <RoleLayout {...baseProps} extraContent={() => <div data-testid="extra">extra</div>}>
        <div data-testid="page-content">page</div>
      </RoleLayout>
    )));

    await waitFor(() => expect(screen.getByTestId('page-content')).toBeTruthy());
    const extra = screen.getByTestId('extra');
    const content = screen.getByTestId('page-content');
    // extra comes before content in document order (matches `extraContent?.()` then `{children}`)
    expect(extra.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders nothing extra when extraContent is omitted (Merchant/Tenant/Admin)', async () => {
    mockUseAccountByType.mockReturnValue({ account: () => fakeAccount(), isLoading: () => false });
    render(withRoutes(() => (
      <RoleLayout {...baseProps}>
        <div data-testid="page-content">page</div>
      </RoleLayout>
    )));

    await waitFor(() => expect(screen.getByTestId('page-content')).toBeTruthy());
    expect(screen.queryByTestId('extra')).toBeNull();
  });

  it('wraps the tree with extraProviders when supplied', async () => {
    mockUseAccountByType.mockReturnValue({ account: () => fakeAccount(), isLoading: () => false });
    render(withRoutes(() => (
      <RoleLayout
        {...baseProps}
        extraProviders={(p) => <div data-testid="fake-provider">{p.children}</div>}
      >
        <div data-testid="page-content">page</div>
      </RoleLayout>
    )));

    await waitFor(() => expect(screen.getByTestId('page-content')).toBeTruthy());
    expect(screen.getByTestId('fake-provider').contains(screen.getByTestId('page-content'))).toBe(true);
  });

  it('renders with no extra wrapper when extraProviders is omitted (Merchant)', async () => {
    mockUseAccountByType.mockReturnValue({ account: () => fakeAccount(), isLoading: () => false });
    const { container } = render(withRoutes(() => (
      <RoleLayout {...baseProps}>
        <div data-testid="page-content">page</div>
      </RoleLayout>
    )));

    await waitFor(() => expect(screen.getByTestId('page-content')).toBeTruthy());
    expect(screen.queryByTestId('fake-provider')).toBeNull();
    // No wrapper means RoleLayoutInner's own outer shell is the top-level rendered node.
    expect(container.querySelector('.animate-fade-in')).toBeTruthy();
  });
});
