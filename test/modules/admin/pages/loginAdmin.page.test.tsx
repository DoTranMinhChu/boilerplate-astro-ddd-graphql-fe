// test/modules/admin/pages/loginAdmin.page.test.tsx
// @vitest-environment jsdom
//
// Landmine #1 coverage: LoginAdminPage's own `onSubmit` must call `AdminService.loginAdmin` and
// then `auth.setAuthData(EAccountType.ADMIN, ...)` — synchronously, exactly like before extraction
// — and NEVER `auth.setMerchantAuthData` (that's Merchant's own, different, async commit method).
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, fireEvent, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { AuthContext, AuthContextType } from '@/shared/contexts/auth/AuthContext';
import { RoutesContext, IRoutesContext } from '@shared/contexts/routes/RoutesContext';
import { EAccountType } from '@/shared/types/auth.type';
import { AdminService } from '@/shared/services/admin/admin.service';

vi.mock('@/shared/services/admin/admin.service', () => ({
  AdminService: {
    loginAdmin: vi.fn(),
    adminForgotPassword: vi.fn(),
  },
}));

let LoginAdminPage: typeof import('@/modules/admin/pages/loginAdmin.page')['LoginAdminPage'];

beforeAll(async () => {
  vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })));
  // jsdom doesn't implement scrollIntoView; FormMessage (behind Form.Error) calls it whenever an
  // error is shown. Not under test here — a no-op stub avoids an unhandled-rejection false alarm.
  Element.prototype.scrollIntoView = vi.fn();
  ({ LoginAdminPage } = await import('@/modules/admin/pages/loginAdmin.page'));
});
afterAll(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage(auth: Partial<AuthContextType>, routes?: Partial<IRoutesContext>) {
  const fullAuth: AuthContextType = {
    authAccount: () => null,
    getAccountByType: vi.fn().mockReturnValue(null),
    restoreAccount: vi.fn(),
    setAuthData: vi.fn(),
    refetchAuthAccount: vi.fn(),
    logout: vi.fn(),
    applyTokenForType: vi.fn(),
    accountType: () => null,
    isAdmin: () => false,
    isAgency: () => false,
    isTenant: () => false,
    isCustomer: () => false,
    isAnonymous: () => true,
    isMerchant: () => false,
    isMerchantInContext: () => false,
    merchantAssignments: () => null,
    setMerchantAuthData: vi.fn(),
    switchContext: vi.fn(),
    merchantBackToSelect: vi.fn(),
    switchActiveRole: vi.fn(),
    impersonateOpenTab: vi.fn(),
    ...auth,
  };
  const fullRoutes: IRoutesContext = {
    pathname: '/',
    params: {},
    searchParams: {},
    setSearchParams: vi.fn(),
    navigate: vi.fn() as any,
    navigateToPage: vi.fn(),
    ...routes,
  };

  const result = render(() => (
    <RoutesContext.Provider value={fullRoutes}>
      <AuthContext.Provider value={fullAuth}>
        <LoginAdminPage />
      </AuthContext.Provider>
    </RoutesContext.Provider>
  ));
  return { ...result, auth: fullAuth, routes: fullRoutes };
}

describe('LoginAdminPage', () => {
  it('on successful login: calls AdminService.loginAdmin then auth.setAuthData(ADMIN, ...) — NEVER setMerchantAuthData', async () => {
    vi.mocked(AdminService.loginAdmin).mockResolvedValue({ token: 'tok-1', admin: { id: 'a1' } } as any);
    const { auth } = renderPage({});

    fireEvent.input(screen.getByPlaceholderText('Nhập username...'), { target: { value: 'admin1' } });
    fireEvent.input(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByText('Đăng nhập'));

    await waitFor(() => expect(AdminService.loginAdmin).toHaveBeenCalledWith({
      data: { username: 'admin1', password: 'secret' },
    }));
    await waitFor(() => expect(auth.setAuthData).toHaveBeenCalledWith(EAccountType.ADMIN, { id: 'a1' }, 'tok-1'));
    expect(auth.setMerchantAuthData).not.toHaveBeenCalled();
  });

  it('on failed login (no token/admin in response): shows the login-failed error, never commits auth', async () => {
    vi.mocked(AdminService.loginAdmin).mockResolvedValue({} as any);
    const { auth } = renderPage({});

    fireEvent.input(screen.getByPlaceholderText('Nhập username...'), { target: { value: 'admin1' } });
    fireEvent.input(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Đăng nhập'));

    await waitFor(() => expect(screen.getByText('Đăng nhập thất bại')).toBeTruthy());
    expect(auth.setAuthData).not.toHaveBeenCalled();
    expect(auth.setMerchantAuthData).not.toHaveBeenCalled();
  });

  it('navigates to the forgot-password route when the link is clicked', () => {
    const { routes } = renderPage({});
    fireEvent.click(screen.getByText('Quên mật khẩu?'));
    expect(routes.navigateToPage).toHaveBeenCalledWith('adminAuth.forgotPassword');
  });

  it('redirects to the dashboard when already authenticated as ADMIN', async () => {
    const { routes } = renderPage({ getAccountByType: vi.fn().mockReturnValue({ id: 'a1' }) });
    await waitFor(() => expect(routes.navigateToPage).toHaveBeenCalledWith('adminDashboard.default'));
  });
});
