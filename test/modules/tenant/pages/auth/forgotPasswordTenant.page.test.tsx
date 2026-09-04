// test/modules/tenant/pages/auth/forgotPasswordTenant.page.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, fireEvent, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { RoutesContext, IRoutesContext } from '@shared/contexts/routes/RoutesContext';
import { TenantAccountService } from '@/shared/services/tenantAccount/tenantAccount.service';

vi.mock('@/shared/services/tenantAccount/tenantAccount.service', () => ({
  TenantAccountService: { tenantAccountForgotPassword: vi.fn() },
}));

let ForgotPasswordTenantPage: typeof import('@/modules/tenant/pages/auth/forgotPasswordTenant.page')['ForgotPasswordTenantPage'];

beforeAll(async () => {
  vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })));
  Element.prototype.scrollIntoView = vi.fn();
  ({ ForgotPasswordTenantPage } = await import('@/modules/tenant/pages/auth/forgotPasswordTenant.page'));
}, 30000);
afterAll(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage(routes?: Partial<IRoutesContext>) {
  const fullRoutes: IRoutesContext = {
    pathname: '/', params: {}, searchParams: {}, setSearchParams: vi.fn(),
    navigate: vi.fn() as any, navigateToPage: vi.fn(), ...routes,
  };
  const result = render(() => (
    <RoutesContext.Provider value={fullRoutes}>
      <ForgotPasswordTenantPage />
    </RoutesContext.Provider>
  ));
  return { ...result, routes: fullRoutes };
}

describe('ForgotPasswordTenantPage', () => {
  it('calls TenantAccountService.tenantAccountForgotPassword with {code, login, domain} and shows the success branch', async () => {
    vi.mocked(TenantAccountService.tenantAccountForgotPassword).mockResolvedValue(undefined as any);
    renderPage();

    fireEvent.input(screen.getByPlaceholderText('Nhập mã tổ chức...'), { target: { value: 'ORG1' } });
    fireEvent.input(screen.getByPlaceholderText('Nhập tên đăng nhập...'), { target: { value: 'tenant1' } });
    fireEvent.click(screen.getByText('Gửi link đặt lại mật khẩu'));

    await waitFor(() => expect(TenantAccountService.tenantAccountForgotPassword).toHaveBeenCalledWith({
      input: { code: 'ORG1', login: 'tenant1', domain: expect.any(String) },
    }));
    await waitFor(() => expect(screen.getByText(
      'Nếu tài khoản tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.',
    )).toBeTruthy());
  });

  it('navigates back to tenant login', () => {
    const { routes } = renderPage();
    fireEvent.click(screen.getByText('Quay lại đăng nhập'));
    expect(routes.navigateToPage).toHaveBeenCalledWith('tenantAuth.login');
  });
});
