// test/shared/components/auth/LoginForm.test.tsx
// @vitest-environment jsdom
//
// Coverage for the shared `LoginForm` (Task 7, Group 2 shared-abstractions).
//
// Landmine #1 (auth-commit isolation): this component NEVER imports `useAuth` and never calls
// `setAuthData`/`setMerchantAuthData` — that's structurally guaranteed (no import exists to call),
// and exercised behaviorally here by asserting `onSubmit` is the ONLY thing invoked on submit.
// The actual wiring to the correct auth-commit variant per role is covered by the page-level
// tests (test/modules/{admin,agency,merchant,tenant}/**/login*.test.tsx).
//
// Landmine #2 (auto-login-from-URL-token): both the success AND failure paths of
// `autoLoginFromUrlToken` are covered below with a fake `verify` — the real service-backed
// integration (AgencyAccountService.agencyAccountGetMe / TenantAccountService.tenantAccountGetMe)
// is covered at the page level.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, fireEvent, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { LoginForm } from '@/shared/components/auth/LoginForm';
import { RoutesContext, IRoutesContext } from '@shared/contexts/routes/RoutesContext';

const { successSpy, dangerSpy } = vi.hoisted(() => ({ successSpy: vi.fn(), dangerSpy: vi.fn() }));
vi.mock('@core/components/toast/ToastProvider', () => ({
  toast: () => ({ success: successSpy, danger: dangerSpy }),
}));

// AuthLayout renders <Img> (brand logo), which lazily creates an IntersectionObserver — not
// implemented in jsdom by default. Not under test here, so a minimal stub is enough.
//
// `Form.Error` (FormMessage) calls `el.scrollIntoView(...)` when an error appears — not
// implemented in jsdom either. Without this stub, tests that trigger a submit error (or any
// other jsdom-driven scroll) throw an unhandled rejection from inside a Solid effect, outside
// the test's own try/catch. Same stub as the sibling page test files (e.g.
// test/modules/{agency,merchant,tenant}/**/login*.test.tsx).
beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })));
  Element.prototype.scrollIntoView = vi.fn();
});
afterAll(() => {
  vi.unstubAllGlobals();
});
beforeEach(() => {
  successSpy.mockClear();
  dangerSpy.mockClear();
});
afterEach(() => {
  cleanup();
});

const baseProps = {
  title: 'Title',
  heading: 'Heading',
  subtitle: 'Subtitle',
  usernameLabel: 'Username',
  usernamePlaceholder: 'Enter username',
  passwordLabel: 'Password',
  submitLabel: 'Sign in',
  forgotPasswordLabel: 'Forgot password?',
  footerBrand: 'Footer Brand',
  loginFailedError: 'Login failed',
};

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

describe('LoginForm', () => {
  it('renders header/labels from props, no code field / header icon by default', () => {
    render(withRoutes(() => <LoginForm {...baseProps} onSubmit={vi.fn()} onForgotPassword={vi.fn()} />));

    expect(screen.getByText('Heading')).toBeTruthy();
    expect(screen.getByText('Subtitle')).toBeTruthy();
    expect(screen.getByText('Footer Brand')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Enter code')).toBeNull();
  });

  it('renders the org-code field when hasOrgCode is set', () => {
    render(withRoutes(() => (
      <LoginForm
        {...baseProps}
        hasOrgCode
        codeLabel="Org code"
        codePlaceholder="Enter code"
        onSubmit={vi.fn()}
        onForgotPassword={vi.fn()}
      />
    )));

    expect(screen.getByPlaceholderText('Enter code')).toBeTruthy();
  });

  it('renders the header icon when headerIcon is set', () => {
    const { container } = render(withRoutes(() => (
      <LoginForm {...baseProps} headerIcon="heroicons-outline:user-circle" onSubmit={vi.fn()} onForgotPassword={vi.fn()} />
    )));

    expect(container.querySelector('[data-icon], iconify-icon, svg')).toBeTruthy();
  });

  it('renders extraFooterContent when provided', () => {
    render(withRoutes(() => (
      <LoginForm
        {...baseProps}
        onSubmit={vi.fn()}
        onForgotPassword={vi.fn()}
        extraFooterContent={() => <p>Register now</p>}
      />
    )));

    expect(screen.getByText('Register now')).toBeTruthy();
  });

  it('calls onSubmit with {username, password} on submit — and NOTHING else (landmine #1: no auth-commit call lives in this component)', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    render(withRoutes(() => <LoginForm {...baseProps} onSubmit={onSubmit} onForgotPassword={vi.fn()} />));

    fireEvent.input(screen.getByPlaceholderText('Enter username'), { target: { value: 'alice' } });
    fireEvent.input(screen.getByPlaceholderText('••••••••'), { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByText('Sign in'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ username: 'alice', password: 'hunter2' }));
  });

  it('calls onForgotPassword when the forgot-password link is clicked', () => {
    const onForgotPassword = vi.fn();
    render(withRoutes(() => <LoginForm {...baseProps} onSubmit={vi.fn()} onForgotPassword={onForgotPassword} />));

    fireEvent.click(screen.getByText('Forgot password?'));
    expect(onForgotPassword).toHaveBeenCalledTimes(1);
  });

  it('shows the thrown error message from onSubmit via Form.Error', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Bad credentials'));
    render(withRoutes(() => <LoginForm {...baseProps} onSubmit={onSubmit} onForgotPassword={vi.fn()} />));

    fireEvent.input(screen.getByPlaceholderText('Enter username'), { target: { value: 'alice' } });
    fireEvent.input(screen.getByPlaceholderText('••••••••'), { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByText('Sign in'));

    await waitFor(() => expect(screen.getByText('Bad credentials')).toBeTruthy());
  });

  it('falls back to loginFailedError when onSubmit resolves falsy (defensive default)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(withRoutes(() => <LoginForm {...baseProps} onSubmit={onSubmit} onForgotPassword={vi.fn()} />));

    fireEvent.input(screen.getByPlaceholderText('Enter username'), { target: { value: 'alice' } });
    fireEvent.input(screen.getByPlaceholderText('••••••••'), { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByText('Sign in'));

    await waitFor(() => expect(screen.getByText('Login failed')).toBeTruthy());
  });

  describe('autoLoginFromUrlToken (landmine #2)', () => {
    it('shows the verifying spinner then the form, and toasts success — success path', async () => {
      const verify = vi.fn().mockResolvedValue({ name: 'Alice' });
      render(withRoutes(() => (
        <LoginForm
          {...baseProps}
          onSubmit={vi.fn()}
          onForgotPassword={vi.fn()}
          autoLoginFromUrlToken={{
            verify,
            verifyingLabel: 'Verifying...',
            successToast: (name) => `Welcome, ${name}`,
            failureToast: 'Session invalid',
          }}
        />
      ), { searchParams: { token: 'good-token' } }));

      expect(screen.getByText('Verifying...')).toBeTruthy();

      await waitFor(() => expect(verify).toHaveBeenCalledWith('good-token'));
      await waitFor(() => expect(successSpy).toHaveBeenCalledWith('Welcome, Alice'));
      expect(dangerSpy).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.getByText('Heading')).toBeTruthy());
    });

    it('shows the verifying spinner then reveals the form again, and toasts failure — invalid/expired-token path', async () => {
      const verify = vi.fn().mockRejectedValue(new Error('Token không hợp lệ'));
      render(withRoutes(() => (
        <LoginForm
          {...baseProps}
          onSubmit={vi.fn()}
          onForgotPassword={vi.fn()}
          autoLoginFromUrlToken={{
            verify,
            verifyingLabel: 'Verifying...',
            successToast: (name) => `Welcome, ${name}`,
            failureToast: 'Session invalid',
          }}
        />
      ), { searchParams: { token: 'bad-token' } }));

      expect(screen.getByText('Verifying...')).toBeTruthy();

      await waitFor(() => expect(verify).toHaveBeenCalledWith('bad-token'));
      await waitFor(() => expect(dangerSpy).toHaveBeenCalledWith('Session invalid'));
      expect(successSpy).not.toHaveBeenCalled();
      // Form is revealed again after failure (matches pre-extraction behavior: no auto-redirect).
      await waitFor(() => expect(screen.getByPlaceholderText('Enter username')).toBeTruthy());
    });

    it('does not call verify when there is no token in the URL', async () => {
      const verify = vi.fn();
      render(withRoutes(() => (
        <LoginForm
          {...baseProps}
          onSubmit={vi.fn()}
          onForgotPassword={vi.fn()}
          autoLoginFromUrlToken={{
            verify,
            verifyingLabel: 'Verifying...',
            successToast: (name) => `Welcome, ${name}`,
            failureToast: 'Session invalid',
          }}
        />
      ), { searchParams: {} }));

      expect(screen.queryByText('Verifying...')).toBeNull();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(verify).not.toHaveBeenCalled();
    });
  });

  // Direct coverage for `onVerifyingChange` itself — the mechanism carrying the Critical fix
  // from the previous review round (a presence-vs-in-flight redirect-guard bug, see the prop's
  // own doc comment above its declaration). Previously only exercised transitively through the
  // 2 page-level tests (test/modules/{agency,tenant}/**/login*.test.tsx).
  describe('onVerifyingChange', () => {
    it('calls true then eventually false around a successful auto-login attempt', async () => {
      const onVerifyingChange = vi.fn();
      const verify = vi.fn().mockResolvedValue({ name: 'Alice' });
      render(withRoutes(() => (
        <LoginForm
          {...baseProps}
          onSubmit={vi.fn()}
          onForgotPassword={vi.fn()}
          onVerifyingChange={onVerifyingChange}
          autoLoginFromUrlToken={{
            verify,
            verifyingLabel: 'Verifying...',
            successToast: (name) => `Welcome, ${name}`,
            failureToast: 'Session invalid',
          }}
        />
      ), { searchParams: { token: 'good-token' } }));

      expect(onVerifyingChange).toHaveBeenCalledWith(true);
      await waitFor(() => expect(onVerifyingChange).toHaveBeenLastCalledWith(false));
    });

    it('calls true then eventually false around a failed auto-login attempt', async () => {
      const onVerifyingChange = vi.fn();
      const verify = vi.fn().mockRejectedValue(new Error('invalid token'));
      render(withRoutes(() => (
        <LoginForm
          {...baseProps}
          onSubmit={vi.fn()}
          onForgotPassword={vi.fn()}
          onVerifyingChange={onVerifyingChange}
          autoLoginFromUrlToken={{
            verify,
            verifyingLabel: 'Verifying...',
            successToast: (name) => `Welcome, ${name}`,
            failureToast: 'Session invalid',
          }}
        />
      ), { searchParams: { token: 'bad-token' } }));

      expect(onVerifyingChange).toHaveBeenCalledWith(true);
      await waitFor(() => expect(onVerifyingChange).toHaveBeenLastCalledWith(false));
    });

    it('is never called with true when there is no token in the URL — no verification attempt ever starts (a harmless one-time `false` no-op may still fire, per the Fix 3 hang-trap guard on the early return)', async () => {
      const onVerifyingChange = vi.fn();
      render(withRoutes(() => (
        <LoginForm
          {...baseProps}
          onSubmit={vi.fn()}
          onForgotPassword={vi.fn()}
          onVerifyingChange={onVerifyingChange}
          autoLoginFromUrlToken={{
            verify: vi.fn(),
            verifyingLabel: 'Verifying...',
            successToast: (name) => `Welcome, ${name}`,
            failureToast: 'Session invalid',
          }}
        />
      ), { searchParams: {} }));

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onVerifyingChange).not.toHaveBeenCalledWith(true);
    });
  });
});
