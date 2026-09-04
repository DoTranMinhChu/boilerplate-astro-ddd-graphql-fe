// test/modules/merchant/auth/forgotPasswordMerchant.page.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, fireEvent, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { RoutesContext, IRoutesContext } from '@shared/contexts/routes/RoutesContext';
import { MerchantService } from '@/shared/services/merchant/merchant.service';

vi.mock('@/shared/services/merchant/merchant.service', () => ({
  MerchantService: { merchantForgotPassword: vi.fn() },
}));

let ForgotPasswordMerchantPage: typeof import('@/modules/merchant/auth/forgotPasswordMerchant.page')['ForgotPasswordMerchantPage'];

beforeAll(async () => {
  vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })));
  Element.prototype.scrollIntoView = vi.fn();
  ({ ForgotPasswordMerchantPage } = await import('@/modules/merchant/auth/forgotPasswordMerchant.page'));
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
      <ForgotPasswordMerchantPage />
    </RoutesContext.Provider>
  ));
  return { ...result, routes: fullRoutes };
}

describe('ForgotPasswordMerchantPage', () => {
  it('calls MerchantService.merchantForgotPassword with {login, domain} and shows the success branch', async () => {
    vi.mocked(MerchantService.merchantForgotPassword).mockResolvedValue(undefined as any);
    renderPage();

    fireEvent.input(screen.getByPlaceholderText('Nhập username hoặc email...'), { target: { value: 'merchant1' } });
    fireEvent.click(screen.getByText('Gửi link đặt lại mật khẩu'));

    await waitFor(() => expect(MerchantService.merchantForgotPassword).toHaveBeenCalledWith({
      input: { login: 'merchant1', domain: expect.any(String) },
    }));
    await waitFor(() => expect(screen.getByText('Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.')).toBeTruthy());
  });

  it('navigates back to merchant login', () => {
    const { routes } = renderPage();
    fireEvent.click(screen.getByText('Quay lại đăng nhập'));
    expect(routes.navigateToPage).toHaveBeenCalledWith('merchantAuth.login');
  });
});
