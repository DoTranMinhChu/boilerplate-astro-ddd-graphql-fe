// src/shared/components/auth/LoginForm.tsx
//
// Shared skeleton for the 4 near-identical Login pages (Admin/Agency/Merchant/Tenant). Same
// minimal-prop-injection style as `ChangePasswordForm`/`ForgotPasswordForm`: every copy string
// is a plain, already pre-resolved string prop (the calling page owns its own `t()` calls).
//
// CRITICAL (landmine #1): this component NEVER calls `auth.setAuthData`/`auth.setMerchantAuthData`
// itself, and does not import `useAuth` at all. Admin/Agency/Tenant commit auth synchronously via
// `setAuthData(type, data, token)`; Merchant commits via a DIFFERENT, async
// `setMerchantAuthData(merchant, token): Promise<void>`. Both `onSubmit` (manual login) and
// `autoLoginFromUrlToken.verify` (URL-token auto-login) are page-owned closures — the calling
// page's own Service call + its own correct auth-commit variant live entirely on the page side.
// If you're tempted to add an auth-commit call in here, stop: that's exactly the bug this
// component's contract exists to prevent.
//
// CRITICAL (landmine #2): `autoLoginFromUrlToken` (Agency/Tenant only) reads a `?token=` URL
// param, awaits the page-owned `verify(token)`, shows a `verifyingLabel` spinner meanwhile, and
// toasts success/failure. `verify` itself is responsible for committing auth data (setAuthData)
// AND navigating to the dashboard on success (see agency/tenant login.page.tsx) — this component
// only owns presentation (spinner/toast), not the redirect. On failure, `verify` must reject; the
// form is revealed again with `failureToast` shown, mirroring the pre-extraction behavior exactly
// (no auto-redirect, no token cleared from storage — same as the original commented-out
// `TokenManager.removeToken` no-op).
import { createSignal, onMount, Show } from 'solid-js';
import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { toast } from '@core/components/toast/ToastProvider';
import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Icon } from '@shared/components/icons/Icon';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';

export interface LoginFormProps {
  title: string;
  heading: string;
  subtitle: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  passwordLabel: string;
  submitLabel: string;
  forgotPasswordLabel: string;
  footerBrand: string;
  loginFailedError: string;
  hasOrgCode?: boolean;
  codeLabel?: string;
  codePlaceholder?: string;
  headerIcon?: string;
  onSubmit: (values: { code?: string; username: string; password: string }) => Promise<any>;
  onForgotPassword: () => void;
  autoLoginFromUrlToken?: {
    verify: (token: string) => Promise<{ name?: string }>;
    verifyingLabel: string;
    successToast: (name: string) => string;
    failureToast: string;
  };
  extraFooterContent?: () => JSX.Element;
}

export function LoginForm(props: LoginFormProps) {
  const { searchParams } = useRoutes();
  const [isVerifyingToken, setIsVerifyingToken] = createSignal(false);

  onMount(async () => {
    const autoLogin = props.autoLoginFromUrlToken;
    const tokenFromUrl = searchParams.token;
    if (!autoLogin || !tokenFromUrl) return;

    setIsVerifyingToken(true);
    try {
      const result = await autoLogin.verify(tokenFromUrl);
      toast().success(autoLogin.successToast(result?.name ?? ''));
    } catch (error) {
      console.error('Auto login from URL failed:', error);
      toast().danger(autoLogin.failureToast);
    } finally {
      setIsVerifyingToken(false);
    }
  });

  const { Form, submitting, submitted } = generateForm({
    handleSubmit: async (values: any) => {
      const result = await props.onSubmit({
        code: values.code,
        username: values.username,
        password: values.password,
      });
      if (!result) {
        throw new Error(props.loginFailedError);
      }
      return result;
    },
  });

  return (
    <AuthLayout title={props.title}>
      <Show
        when={!isVerifyingToken()}
        fallback={
          <div class="flex flex-col items-center justify-center py-20 space-y-4 animate-fade-in">
            <Icon name="svg-spinners:blocks-scale" class="text-4xl text-violet-600" />
            <p class="text-sm font-medium text-gray-500">{props.autoLoginFromUrlToken?.verifyingLabel}</p>
          </div>
        }
      >
        <div class="mb-8 text-center animate-fade-in">
          <Show when={props.headerIcon}>
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 mb-4">
              <Icon name={props.headerIcon} class="w-8 h-8 text-violet-600" />
            </div>
          </Show>
          <h1 class="text-2xl font-bold text-gray-900">{props.heading}</h1>
          <p class="text-sm text-gray-500 mt-1">{props.subtitle}</p>
        </div>

        <Form class="w-full flex flex-col gap-y-5">
          <Form.Fieldset class="flex flex-col gap-y-4">
            <Show when={props.hasOrgCode}>
              <Form.Field name="code" label={props.codeLabel!} required>
                <Input autoFocus placeholder={props.codePlaceholder} class="h-11 w-full rounded-lg border-gray-200" />
              </Form.Field>
            </Show>

            <Form.Field name="username" label={props.usernameLabel} required>
              <Input
                autoFocus={!props.hasOrgCode}
                placeholder={props.usernamePlaceholder}
                class="h-11 w-full rounded-lg border-gray-200"
              />
            </Form.Field>

            <Form.Field name="password" label={props.passwordLabel} required>
              <InputPassword placeholder="••••••••" class="h-11 w-full rounded-lg border-gray-200" />
            </Form.Field>

            <div class="flex justify-end -mt-1">
              <button
                type="button"
                onClick={props.onForgotPassword}
                class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {props.forgotPasswordLabel}
              </button>
            </div>

            <Form.Error class="text-sm text-red-600 font-medium" />

            <div class="w-full pt-2">
              <Button
                wide
                main
                class="h-12 w-full text-base font-bold shadow-md transition-all active:scale-[0.98] rounded-lg"
                label={props.submitLabel}
                submit
                loading={submitting()}
                disabled={submitted()}
              />
            </div>
          </Form.Fieldset>
        </Form>

        <Show when={props.extraFooterContent}>{props.extraFooterContent!()}</Show>

        <div class="mt-10 border-t border-gray-100 pt-6 text-center">
          <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">{props.footerBrand}</p>
        </div>
      </Show>
    </AuthLayout>
  );
}
