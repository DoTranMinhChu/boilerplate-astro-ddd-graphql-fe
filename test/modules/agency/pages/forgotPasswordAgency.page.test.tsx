// test/modules/agency/pages/forgotPasswordAgency.page.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, fireEvent, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { RoutesContext, IRoutesContext } from '@shared/contexts/routes/RoutesContext';
import { AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';

vi.mock('@/shared/services/agencyAccount/agencyAccount.service', () => ({
  AgencyAccountService: { agencyAccountForgotPassword: vi.fn() },
}));

let ForgotPasswordAgencyPage: typeof import('@/modules/agency/pages/forgotPasswordAgency.page')['ForgotPasswordAgencyPage'];

beforeAll(async () => {
  vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })));
  Element.prototype.scrollIntoView = vi.fn();
  ({ ForgotPasswordAgencyPage } = await import('@/modules/agency/pages/forgotPasswordAgency.page'));
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
      <ForgotPasswordAgencyPage />
    </RoutesContext.Provider>
  ));
  return { ...result, routes: fullRoutes };
}

describe('ForgotPasswordAgencyPage', () => {
  it('calls AgencyAccountService.agencyAccountForgotPassword with {code, login, domain} and shows the success branch', async () => {
    vi.mocked(AgencyAccountService.agencyAccountForgotPassword).mockResolvedValue(undefined as any);
    renderPage();

    fireEvent.input(screen.getByPlaceholderText('Nhập mã đối tác...'), { target: { value: 'ORG1' } });
    fireEvent.input(screen.getByPlaceholderText('Nhập tên đăng nhập...'), { target: { value: 'agency1' } });
    fireEvent.click(screen.getByText('Gửi link đặt lại mật khẩu'));

    await waitFor(() => expect(AgencyAccountService.agencyAccountForgotPassword).toHaveBeenCalledWith({
      input: { code: 'ORG1', login: 'agency1', domain: expect.any(String) },
    }));
    await waitFor(() => expect(screen.getByText(
      'Nếu tài khoản tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.',
    )).toBeTruthy());
  });

  it('navigates back to agency login', () => {
    const { routes } = renderPage();
    fireEvent.click(screen.getByText('Quay lại đăng nhập'));
    expect(routes.navigateToPage).toHaveBeenCalledWith('agencyAuth.login');
  });
});
