// test/shared/components/auth/ForgotPasswordForm.test.tsx
// @vitest-environment jsdom
//
// Coverage for the shared `ForgotPasswordForm` (Task 7, Group 2 shared-abstractions).
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { render, fireEvent, waitFor, screen, cleanup } from '@solidjs/testing-library';
import { ForgotPasswordForm } from '@/shared/components/auth/ForgotPasswordForm';

// AuthLayout renders <Img> (brand logo), which lazily creates an IntersectionObserver — not
// implemented in jsdom by default. Not under test here, so a minimal stub is enough.
beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })));
});
afterAll(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  cleanup();
});

const baseProps = {
  title: 'Title',
  heading: 'Forgot password',
  subtitle: 'Subtitle',
  successMessage: 'We sent you a link',
  successHint: 'Valid for 30 minutes',
  loginFieldLabel: 'Username',
  loginPlaceholder: 'Enter username',
  loginRequiredError: 'Username is required',
  submitLabel: 'Send link',
  backToLoginLabel: 'Back to login',
};

describe('ForgotPasswordForm', () => {
  it('renders header/labels from props, no code field by default', () => {
    render(() => <ForgotPasswordForm {...baseProps} onBackToLogin={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByText('Forgot password')).toBeTruthy();
    expect(screen.getByText('Subtitle')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Enter code')).toBeNull();
  });

  it('renders the org-code field when hasOrgCode is set', () => {
    render(() => (
      <ForgotPasswordForm
        {...baseProps}
        hasOrgCode
        codeFieldLabel="Org code"
        codePlaceholder="Enter code"
        codeRequiredError="Code is required"
        onBackToLogin={vi.fn()}
        onSubmit={vi.fn()}
      />
    ));

    expect(screen.getByPlaceholderText('Enter code')).toBeTruthy();
  });

  it('calls onSubmit with {login} (no code) and shows the success branch', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(() => <ForgotPasswordForm {...baseProps} onBackToLogin={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.input(screen.getByPlaceholderText('Enter username'), { target: { value: 'alice' } });
    fireEvent.click(screen.getByText('Send link'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ code: undefined, login: 'alice' }));
    await waitFor(() => expect(screen.getByText('We sent you a link')).toBeTruthy());
    expect(screen.getByText('Valid for 30 minutes')).toBeTruthy();
  });

  it('calls onSubmit with {code, login} when hasOrgCode is set', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(() => (
      <ForgotPasswordForm
        {...baseProps}
        hasOrgCode
        codeFieldLabel="Org code"
        codePlaceholder="Enter code"
        codeRequiredError="Code is required"
        onBackToLogin={vi.fn()}
        onSubmit={onSubmit}
      />
    ));

    fireEvent.input(screen.getByPlaceholderText('Enter code'), { target: { value: 'ORG1' } });
    fireEvent.input(screen.getByPlaceholderText('Enter username'), { target: { value: 'alice' } });
    fireEvent.click(screen.getByText('Send link'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ code: 'ORG1', login: 'alice' }));
  });

  // NOTE: `Form.Field ... required` (see LoginForm/ForgotPasswordForm JSX) is validated by
  // generateForm's OWN built-in required-field check (validateForm.ts, generic
  // `baseConfig().formRequiredText` = 'Bắt buộc') BEFORE `handleSubmit` — and therefore before
  // this component's own `loginRequiredError`/`codeRequiredError` guard — ever runs. This mirrors
  // the pre-extraction pages exactly (they had the identical redundant guard-inside-handleSubmit
  // pattern), so it's preserved as-is; not a Task 7 regression, not something Task 7 should "fix".
  it('blocks submit via the generic required-field validation when login is missing (loginRequiredError guard is unreachable here, matching pre-extraction pages)', async () => {
    const onSubmit = vi.fn();
    render(() => <ForgotPasswordForm {...baseProps} onBackToLogin={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('Send link'));

    await waitFor(() => expect(screen.getByText('Bắt buộc')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit via the generic required-field validation when hasOrgCode and code is missing', async () => {
    const onSubmit = vi.fn();
    render(() => (
      <ForgotPasswordForm
        {...baseProps}
        hasOrgCode
        codeFieldLabel="Org code"
        codePlaceholder="Enter code"
        codeRequiredError="Code is required"
        onBackToLogin={vi.fn()}
        onSubmit={onSubmit}
      />
    ));

    fireEvent.input(screen.getByPlaceholderText('Enter username'), { target: { value: 'alice' } });
    fireEvent.click(screen.getByText('Send link'));

    await waitFor(() => expect(screen.getAllByText('Bắt buộc').length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onBackToLogin from the persistent bottom link', () => {
    const onBackToLogin = vi.fn();
    render(() => <ForgotPasswordForm {...baseProps} onBackToLogin={onBackToLogin} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByText('Back to login'));
    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });

  it('calls onBackToLogin from the success-state button', async () => {
    const onBackToLogin = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(() => <ForgotPasswordForm {...baseProps} onBackToLogin={onBackToLogin} onSubmit={onSubmit} />);

    fireEvent.input(screen.getByPlaceholderText('Enter username'), { target: { value: 'alice' } });
    fireEvent.click(screen.getByText('Send link'));
    await waitFor(() => expect(screen.getByText('We sent you a link')).toBeTruthy());

    const buttons = screen.getAllByText('Back to login');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onBackToLogin).toHaveBeenCalled();
  });
});
