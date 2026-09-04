// test/modules/admin/pages/forgotPasswordAdmin.page.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, fireEvent, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { RoutesContext, IRoutesContext } from '@shared/contexts/routes/RoutesContext';
import { AdminService } from '@/shared/services/admin/admin.service';

vi.mock('@/shared/services/admin/admin.service', () => ({
  AdminService: { adminForgotPassword: vi.fn() },
}));

let ForgotPasswordAdminPage: typeof import('@/modules/admin/pages/forgotPasswordAdmin.page')['ForgotPasswordAdminPage'];

beforeAll(async () => {
  vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })));
  Element.prototype.scrollIntoView = vi.fn();
  ({ ForgotPasswordAdminPage } = await import('@/modules/admin/pages/forgotPasswordAdmin.page'));
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
      <ForgotPasswordAdminPage />
    </RoutesContext.Provider>
  ));
  return { ...result, routes: fullRoutes };
}

describe('ForgotPasswordAdminPage', () => {
  it('calls AdminService.adminForgotPassword with {login, domain} and shows the success branch', async () => {
    vi.mocked(AdminService.adminForgotPassword).mockResolvedValue(undefined as any);
    renderPage();

    fireEvent.input(screen.getByPlaceholderText('Nhập username hoặc email...'), { target: { value: 'admin1' } });
    fireEvent.click(screen.getByText('Gửi link đặt lại mật khẩu'));

    await waitFor(() => expect(AdminService.adminForgotPassword).toHaveBeenCalledWith({
      input: { login: 'admin1', domain: expect.any(String) },
    }));
    await waitFor(() => expect(screen.getByText('Nếu tài khoản tồn tại, email đặt lại mật khẩu đã được gửi.')).toBeTruthy());
  });

  it('navigates back to admin login', () => {
    const { routes } = renderPage();
    fireEvent.click(screen.getByText('Quay lại đăng nhập'));
    expect(routes.navigateToPage).toHaveBeenCalledWith('adminAuth.login');
  });
});
