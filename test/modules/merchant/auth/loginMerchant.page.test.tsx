// test/modules/merchant/auth/loginMerchant.page.test.tsx
// @vitest-environment jsdom
//
// Landmine #1 coverage (the critical one — Merchant is the ONE role with a DIFFERENT, async
// auth-commit method): LoginMerchantPage's own `onSubmit` must call `MerchantService.merchantLogin`
// and then `await auth.setMerchantAuthData(res.merchant, res.token)` — and NEVER
// `auth.setAuthData` (that's the Admin/Agency/Tenant synchronous variant).
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, fireEvent, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { AuthContext, AuthContextType } from '@/shared/contexts/auth/AuthContext';
import { RoutesContext, IRoutesContext } from '@shared/contexts/routes/RoutesContext';
import { MerchantService } from '@/shared/services/merchant/merchant.service';

vi.mock('@/shared/services/merchant/merchant.service', () => ({
  MerchantService: {
    merchantLogin: vi.fn(),
    merchantForgotPassword: vi.fn(),
  },
}));

const { successSpy } = vi.hoisted(() => ({ successSpy: vi.fn() }));
vi.mock('@core/components/toast/ToastProvider', () => ({
  toast: () => ({ success: successSpy, danger: vi.fn() }),
}));

let LoginMerchantPage: typeof import('@/modules/merchant/auth/loginMerchant.page')['LoginMerchantPage'];

beforeAll(async () => {
  vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })));
  Element.prototype.scrollIntoView = vi.fn();
  ({ LoginMerchantPage } = await import('@/modules/merchant/auth/loginMerchant.page'));
}, 30000);
afterAll(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
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
    setMerchantAuthData: vi.fn().mockResolvedValue(undefined),
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
        <LoginMerchantPage />
      </AuthContext.Provider>
    </RoutesContext.Provider>
  ));
  return { ...result, auth: fullAuth, routes: fullRoutes };
}

describe('LoginMerchantPage', () => {
  it('on successful login: calls MerchantService.merchantLogin then AWAITS auth.setMerchantAuthData(merchant, token) — NEVER setAuthData', async () => {
    vi.mocked(MerchantService.merchantLogin).mockResolvedValue({
      token: 'tok-m1',
      merchant: { id: 'm1', fullname: 'Nguyễn Văn A', username: 'merchant1' },
    } as any);
    const { auth } = renderPage({});

    fireEvent.input(screen.getByPlaceholderText('Nhập username...'), { target: { value: 'merchant1' } });
    fireEvent.input(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByText('Đăng nhập'));

    await waitFor(() => expect(MerchantService.merchantLogin).toHaveBeenCalledWith({
      input: { username: 'merchant1', password: 'secret' },
    }));
    await waitFor(() => expect(auth.setMerchantAuthData).toHaveBeenCalledWith(
      { id: 'm1', fullname: 'Nguyễn Văn A', username: 'merchant1' },
      'tok-m1',
    ));
    expect(auth.setAuthData).not.toHaveBeenCalled();
    await waitFor(() => expect(successSpy).toHaveBeenCalledWith('Xin chào, Nguyễn Văn A'));
  });

  it('on failed login (no token/merchant in response): shows the login-failed error, never commits auth', async () => {
    vi.mocked(MerchantService.merchantLogin).mockResolvedValue({} as any);
    const { auth } = renderPage({});

    fireEvent.input(screen.getByPlaceholderText('Nhập username...'), { target: { value: 'merchant1' } });
    fireEvent.input(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Đăng nhập'));

    await waitFor(() => expect(screen.getByText('Đăng nhập thất bại')).toBeTruthy());
    expect(auth.setAuthData).not.toHaveBeenCalled();
    expect(auth.setMerchantAuthData).not.toHaveBeenCalled();
  });

  it('renders the headerIcon and extraFooterContent (register / invite-code links) unique to Merchant', () => {
    renderPage({});
    expect(screen.getByText('Chưa có tài khoản?')).toBeTruthy();
    expect(screen.getByText('Đăng ký ngay')).toBeTruthy();
    expect(screen.getByText('Có mã mời?')).toBeTruthy();
  });

  it('redirects to the dashboard when already authenticated as MERCHANT', async () => {
    const { routes } = renderPage({ getAccountByType: vi.fn().mockReturnValue({ id: 'm1' }) });
    await waitFor(() => expect(routes.navigateToPage).toHaveBeenCalledWith('merchantDashboard.default'));
  });
});
