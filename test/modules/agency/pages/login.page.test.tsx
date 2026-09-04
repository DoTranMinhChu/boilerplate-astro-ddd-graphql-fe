// test/modules/agency/pages/login.page.test.tsx
// @vitest-environment jsdom
//
// Landmine #1: LoginAgencyPage's own `onSubmit`/`verify` call `auth.setAuthData(AGENCY, ...)` —
// NEVER `auth.setMerchantAuthData`.
//
// Landmine #2 (real integration, not a fake `verify`): the `?token=` auto-login flow really goes
// through `AgencyAccountService.agencyAccountGetMe`. Both the success path (valid token → account
// fetched → auth committed → navigated to dashboard → success toast) AND the invalid/expired-token
// failure path (service throws/returns null → failure toast, no auth commit, no navigation, form
// shown again) are covered.
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { createSignal } from 'solid-js';
import { render, fireEvent, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { AuthContext, AuthContextType } from '@/shared/contexts/auth/AuthContext';
import { RoutesContext, IRoutesContext } from '@shared/contexts/routes/RoutesContext';
import { EAccountType } from '@/shared/types/auth.type';
import { AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';

vi.mock('@/shared/services/agencyAccount/agencyAccount.service', () => ({
  AgencyAccountService: {
    loginAgencyAccount: vi.fn(),
    agencyAccountGetMe: vi.fn(),
    agencyAccountForgotPassword: vi.fn(),
  },
}));

const { successSpy, dangerSpy } = vi.hoisted(() => ({ successSpy: vi.fn(), dangerSpy: vi.fn() }));
vi.mock('@core/components/toast/ToastProvider', () => ({
  toast: () => ({ success: successSpy, danger: dangerSpy }),
}));

let LoginAgencyPage: typeof import('@/modules/agency/pages/login.page')['LoginAgencyPage'];

beforeAll(async () => {
  vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })));
  Element.prototype.scrollIntoView = vi.fn();
  ({ LoginAgencyPage } = await import('@/modules/agency/pages/login.page'));
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
        <LoginAgencyPage />
      </AuthContext.Provider>
    </RoutesContext.Provider>
  ));
  return { ...result, auth: fullAuth, routes: fullRoutes };
}

describe('LoginAgencyPage', () => {
  it('on successful manual login: calls loginAgencyAccount then auth.setAuthData(AGENCY, ...) — NEVER setMerchantAuthData', async () => {
    vi.mocked(AgencyAccountService.loginAgencyAccount).mockResolvedValue({
      token: 'tok-ag1',
      agencyAccount: { id: 'ag1' },
    } as any);
    const { auth } = renderPage({});

    fireEvent.input(screen.getByPlaceholderText('Nhập mã đối tác...'), { target: { value: ' ORG1 ' } });
    fireEvent.input(screen.getByPlaceholderText('Nhập username...'), { target: { value: ' agency1 ' } });
    fireEvent.input(screen.getByPlaceholderText('••••••••'), { target: { value: ' secret ' } });
    fireEvent.click(screen.getByText('Đăng nhập'));

    await waitFor(() => expect(AgencyAccountService.loginAgencyAccount).toHaveBeenCalledWith({
      data: { username: 'agency1', password: 'secret', code: 'ORG1' },
    }));
    await waitFor(() => expect(auth.setAuthData).toHaveBeenCalledWith(EAccountType.AGENCY, { id: 'ag1' }, 'tok-ag1'));
    expect(auth.setMerchantAuthData).not.toHaveBeenCalled();
  });

  describe('autoLoginFromUrlToken (landmine #2, real service integration)', () => {
    it('success path: verifies via agencyAccountGetMe, commits auth, navigates to dashboard, toasts success', async () => {
      vi.mocked(AgencyAccountService.agencyAccountGetMe).mockResolvedValue({
        fullname: 'Agency One', phone: '0900000000',
      } as any);
      const { auth, routes } = renderPage({}, { searchParams: { token: 'good-token' } });

      expect(screen.getByText('Đang xác thực phiên đăng nhập...')).toBeTruthy();

      await waitFor(() => expect(AgencyAccountService.agencyAccountGetMe).toHaveBeenCalledWith('good-token'));
      await waitFor(() => expect(auth.setAuthData).toHaveBeenCalledWith(
        EAccountType.AGENCY,
        { fullname: 'Agency One', phone: '0900000000' },
        'good-token',
      ));
      await waitFor(() => expect(routes.navigateToPage).toHaveBeenCalledWith('agencyDashboard.default'));
      await waitFor(() => expect(successSpy).toHaveBeenCalledWith('Xin chào, Agency One'));
      expect(dangerSpy).not.toHaveBeenCalled();
      expect(auth.setMerchantAuthData).not.toHaveBeenCalled();
    });

    it('failure path (invalid/expired token — agencyAccountGetMe resolves null): toasts failure, never commits auth, never navigates, form shown again', async () => {
      vi.mocked(AgencyAccountService.agencyAccountGetMe).mockResolvedValue(null as any);
      const { auth, routes } = renderPage({}, { searchParams: { token: 'bad-token' } });

      expect(screen.getByText('Đang xác thực phiên đăng nhập...')).toBeTruthy();

      await waitFor(() => expect(AgencyAccountService.agencyAccountGetMe).toHaveBeenCalledWith('bad-token'));
      await waitFor(() => expect(dangerSpy).toHaveBeenCalledWith('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'));
      expect(successSpy).not.toHaveBeenCalled();
      expect(auth.setAuthData).not.toHaveBeenCalled();
      expect(routes.navigateToPage).not.toHaveBeenCalledWith('agencyDashboard.default');
      // Form is revealed again — user can still log in manually.
      await waitFor(() => expect(screen.getByPlaceholderText('Nhập username...')).toBeTruthy());
    });

    it('failure path (service rejects — e.g. network/expired token error): toasts failure, never commits auth', async () => {
      vi.mocked(AgencyAccountService.agencyAccountGetMe).mockRejectedValue(new Error('expired'));
      const { auth, routes } = renderPage({}, { searchParams: { token: 'expired-token' } });

      await waitFor(() => expect(dangerSpy).toHaveBeenCalledWith('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'));
      expect(auth.setAuthData).not.toHaveBeenCalled();
      expect(routes.navigateToPage).not.toHaveBeenCalledWith('agencyDashboard.default');
    });

    it('does NOT redirect based on a stale/pre-existing session while a fresh URL token is still pending verification', async () => {
      let resolveGetMe!: (value: any) => void;
      vi.mocked(AgencyAccountService.agencyAccountGetMe).mockReturnValue(new Promise((resolve) => { resolveGetMe = resolve; }));
      // Simulate an already-authenticated (possibly stale) session existing alongside a fresh URL token.
      const { routes } = renderPage(
        { getAccountByType: vi.fn().mockReturnValue({ id: 'stale-account' }) },
        { searchParams: { token: 'fresh-token' } },
      );

      // While verification is pending, the page must NOT have redirected using the stale session.
      expect(routes.navigateToPage).not.toHaveBeenCalled();

      resolveGetMe({ fullname: 'Fresh Agency' });
      await waitFor(() => expect(routes.navigateToPage).toHaveBeenCalledWith('agencyDashboard.default'));
    });
  });

  it('navigates to the forgot-password route when the link is clicked', () => {
    const { routes } = renderPage({});
    fireEvent.click(screen.getByText('Quên mật khẩu?'));
    expect(routes.navigateToPage).toHaveBeenCalledWith('agencyAuth.forgotPassword');
  });

  // Regression coverage for the Critical fix: the redirect-if-authenticated `createEffect`
  // must gate on `LoginForm`'s reported in-flight verification state (via `onVerifyingChange`,
  // mirrored into a local `isVerifyingToken` signal), NOT on `searchParams.token`'s mere
  // presence. Nothing ever strips `?token=` from the URL after the auto-login attempt settles,
  // so a presence-based guard makes the effect permanently inert for the rest of the page's
  // life once a token param has ever existed — stranding a user who fails auto-login and then
  // logs in manually. `getAccountByType`/`setAuthData` below are wired to a real Solid signal
  // (not bare `vi.fn()`s) so the effect's reactive subscription is genuinely exercised, exactly
  // as it is against the real `AuthContext` in production.
  describe('redirect-if-authenticated createEffect gating (Critical fix — in-flight, not presence-based)', () => {
    function reactiveAuth(initial: any = null) {
      const [account, setAccount] = createSignal<any>(initial);
      return {
        getAccountByType: vi.fn(() => account()),
        setAuthData: vi.fn((_type: any, data: any) => setAccount(data)),
      };
    }

    it('CONTROL — no token param: a manual login still reactively redirects (never-broken baseline)', async () => {
      vi.mocked(AgencyAccountService.loginAgencyAccount).mockResolvedValue({
        token: 'tok-ctrl', agencyAccount: { id: 'ag-ctrl' },
      } as any);
      const { routes } = renderPage(reactiveAuth(null));

      fireEvent.input(screen.getByPlaceholderText('Nhập mã đối tác...'), { target: { value: 'ORG1' } });
      fireEvent.input(screen.getByPlaceholderText('Nhập username...'), { target: { value: 'agency1' } });
      fireEvent.input(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret' } });
      fireEvent.click(screen.getByText('Đăng nhập'));

      await waitFor(() => expect(routes.navigateToPage).toHaveBeenCalledWith('agencyDashboard.default'));
    });

    it('BROKEN SCENARIO 1 (fixed) — expired token: failed auto-login verify, then a successful manual login still redirects', async () => {
      vi.mocked(AgencyAccountService.agencyAccountGetMe).mockResolvedValue(null as any);
      vi.mocked(AgencyAccountService.loginAgencyAccount).mockResolvedValue({
        token: 'tok-manual', agencyAccount: { id: 'ag-manual' },
      } as any);
      const { routes } = renderPage(reactiveAuth(null), { searchParams: { token: 'expired-token' } });

      // Auto-login fails; form is shown again; no premature redirect.
      await waitFor(() => expect(dangerSpy).toHaveBeenCalledWith('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'));
      await waitFor(() => expect(screen.getByPlaceholderText('Nhập username...')).toBeTruthy());
      expect(routes.navigateToPage).not.toHaveBeenCalled();

      // User logs in manually after the failed auto-login.
      fireEvent.input(screen.getByPlaceholderText('Nhập mã đối tác...'), { target: { value: 'ORG1' } });
      fireEvent.input(screen.getByPlaceholderText('Nhập username...'), { target: { value: 'agency1' } });
      fireEvent.input(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret' } });
      fireEvent.click(screen.getByText('Đăng nhập'));

      await waitFor(() => expect(AgencyAccountService.loginAgencyAccount).toHaveBeenCalled());
      // THE CRITICAL ASSERTION — under the old presence-based guard this effect was
      // permanently dead once `?token=` had ever existed, so this redirect never fired.
      await waitFor(() => expect(routes.navigateToPage).toHaveBeenCalledWith('agencyDashboard.default'));
    });

    it('BROKEN SCENARIO 2 (fixed) — valid existing session + a garbage token param: redirects after the auto-login failure toast', async () => {
      vi.mocked(AgencyAccountService.agencyAccountGetMe).mockRejectedValue(new Error('garbage'));
      const { routes } = renderPage(reactiveAuth({ id: 'existing-session' }), { searchParams: { token: 'garbage-token' } });

      // Must NOT redirect off the stale session while the fresh token is still verifying.
      expect(routes.navigateToPage).not.toHaveBeenCalled();

      await waitFor(() => expect(dangerSpy).toHaveBeenCalledWith('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'));
      // THE CRITICAL ASSERTION — once verification settles (fails), the already-authenticated
      // session must now redirect; under the old guard the effect never re-ran.
      await waitFor(() => expect(routes.navigateToPage).toHaveBeenCalledWith('agencyDashboard.default'));
    });
  });
});
