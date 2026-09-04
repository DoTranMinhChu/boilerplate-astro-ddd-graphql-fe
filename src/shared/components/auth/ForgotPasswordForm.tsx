// src/shared/components/auth/ForgotPasswordForm.tsx
//
// Shared skeleton for the 4 near-identical ForgotPassword pages (Admin/Agency/Merchant/Tenant) —
// icon header, `submitted` signal, ternary success/form branch, footer back-link. Same
// minimal-prop-injection style as `ChangePasswordForm`: every copy string is a plain, already
// pre-resolved string prop (the calling page owns its own `t()` calls — see `t()`'s closed
// literal-key union, which this component cannot compute a dynamic key against).
import { createSignal, Show } from 'solid-js';
import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { generateForm } from '@core/components/form/generateForm';
import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Icon } from '@shared/components/icons/Icon';

export interface ForgotPasswordFormProps {
  title: string;
  heading: string;
  subtitle: string;
  successMessage: string;
  successHint: string;
  loginFieldLabel: string;
  loginPlaceholder: string;
  loginRequiredError: string;
  submitLabel: string;
  backToLoginLabel: string;
  onBackToLogin: () => void;
  hasOrgCode?: boolean;
  codeFieldLabel?: string;
  codePlaceholder?: string;
  codeRequiredError?: string;
  onSubmit: (values: { code?: string; login: string }) => Promise<any>;
}

export function ForgotPasswordForm(props: ForgotPasswordFormProps) {
  const [submitted, setSubmitted] = createSignal(false);

  const { Form, submitting } = generateForm({
    handleSubmit: async (values: any) => {
      if (props.hasOrgCode && !values.code) {
        throw new Error(props.codeRequiredError);
      }
      if (!values.login) {
        throw new Error(props.loginRequiredError);
      }
      await props.onSubmit({ code: props.hasOrgCode ? values.code : undefined, login: values.login });
      setSubmitted(true);
      return { success: true };
    },
  });

  return (
    <AuthLayout title={props.title}>
      <div class="mb-6 text-center animate-fade-in">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 mb-4">
          <Icon name="heroicons-outline:envelope" class="w-8 h-8 text-amber-600" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">{props.heading}</h1>
        <p class="text-sm text-gray-500 mt-1">{props.subtitle}</p>
      </div>

      <Show
        when={!submitted()}
        fallback={
          <div class="w-full text-center space-y-4">
            <div class="bg-green-50 border border-green-200 rounded-xl p-4">
              <Icon name="heroicons-outline:check-circle" class="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p class="text-sm text-green-700 font-medium">{props.successMessage}</p>
              <p class="text-xs text-green-600 mt-1">{props.successHint}</p>
            </div>
            <Button
              wide
              class="h-11 w-full rounded-lg"
              label={props.backToLoginLabel}
              onClick={props.onBackToLogin}
            />
          </div>
        }
      >
        <Form class="w-full flex flex-col gap-y-5">
          <Form.Fieldset class="flex flex-col gap-y-4">
            <Show when={props.hasOrgCode}>
              <Form.Field name="code" label={props.codeFieldLabel!} required>
                <Input autoFocus placeholder={props.codePlaceholder} class="h-11 w-full rounded-lg" />
              </Form.Field>
            </Show>
            <Form.Field name="login" label={props.loginFieldLabel} required>
              <Input autoFocus={!props.hasOrgCode} placeholder={props.loginPlaceholder} class="h-11 w-full rounded-lg" />
            </Form.Field>
            <Form.Error class="text-sm text-red-600 font-medium" />
            <Button
              wide main submit
              class="h-12 w-full text-base font-bold rounded-lg mt-2"
              label={props.submitLabel}
              loading={submitting()}
            />
          </Form.Fieldset>
        </Form>
      </Show>

      <div class="mt-8 text-center">
        <button
          type="button"
          onClick={props.onBackToLogin}
          class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          {props.backToLoginLabel}
        </button>
      </div>
    </AuthLayout>
  );
}
