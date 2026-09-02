import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { generateForm } from '@core/components/form/generateForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { Icon } from '@shared/components/icons/Icon';
import { AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';
import { createSignal } from 'solid-js';
import { t } from '@/shared/i18n/t';

export function ForgotPasswordAgencyPage() {
    const { navigateToPage } = useRoutes();
    const [submitted, setSubmitted] = createSignal(false);

    const { Form, submitting } = generateForm({
        handleSubmit: async (values: any) => {
            if (!values.code) throw new Error(t('agency.forgotPassword.errors.codeRequired'));
            if (!values.login) throw new Error(t('agency.forgotPassword.errors.loginRequired'));
            await AgencyAccountService.agencyAccountForgotPassword({
                input: {
                    code: values.code,
                    login: values.login,
                    domain: window.location.origin,
                },
            });
            setSubmitted(true);
            return { success: true };
        },
    });

    return (
        <AuthLayout title={t('agency.forgotPassword.pageTitle')}>
            <div class="mb-6 text-center animate-fade-in">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 mb-4">
                    <Icon name="heroicons-outline:envelope" class="w-8 h-8 text-amber-600" />
                </div>
                <h1 class="text-2xl font-bold text-gray-900">{t('agency.forgotPassword.heading')}</h1>
                <p class="text-sm text-gray-500 mt-1">{t('agency.forgotPassword.subtitle')}</p>
            </div>

            {submitted() ? (
                <div class="w-full text-center space-y-4">
                    <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                        <Icon name="heroicons-outline:check-circle" class="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p class="text-sm text-green-700 font-medium">
                            {t('agency.forgotPassword.successMessage')}
                        </p>
                        <p class="text-xs text-green-600 mt-1">{t('agency.forgotPassword.successHint')}</p>
                    </div>
                    <Button
                        wide
                        class="h-11 w-full rounded-lg"
                        label={t('agency.forgotPassword.backToLoginButton')}
                        onClick={() => navigateToPage('agencyAuth.login')}
                    />
                </div>
            ) : (
                <Form class="w-full flex flex-col gap-y-5">
                    <Form.Fieldset class="flex flex-col gap-y-4">
                        <Form.Field name="code" label={t('agency.forgotPassword.codeFieldLabel')} required>
                            <Input autoFocus placeholder={t('agency.forgotPassword.codePlaceholder')} class="h-11 w-full rounded-lg" />
                        </Form.Field>
                        <Form.Field name="login" label={t('agency.forgotPassword.loginFieldLabel')} required>
                            <Input placeholder={t('agency.forgotPassword.loginPlaceholder')} class="h-11 w-full rounded-lg" />
                        </Form.Field>
                        <Form.Error class="text-sm text-red-600 font-medium" />
                        <Button
                            wide main submit
                            class="h-12 w-full text-base font-bold rounded-lg mt-2"
                            label={t('agency.forgotPassword.submitLabel')}
                            loading={submitting()}
                        />
                    </Form.Fieldset>
                </Form>
            )}

            <div class="mt-8 text-center">
                <button
                    onClick={() => navigateToPage('agencyAuth.login')}
                    class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {t('agency.forgotPassword.backToLoginLink')}
                </button>
            </div>
        </AuthLayout>
    );
}
