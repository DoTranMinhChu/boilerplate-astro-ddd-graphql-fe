import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Button } from '@core/components/button/Button';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { Icon } from '@shared/components/icons/Icon';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { useSearchParams } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';
import { t } from '@/shared/i18n/t';

export function ResetPasswordMerchantPage() {
    const { navigateToPage } = useRoutes();
    const [searchParams] = useSearchParams();
    const token = () => searchParams.token as string;
    const [success, setSuccess] = createSignal(false);

    const { Form, submitting } = generateForm({
        handleSubmit: async (values: any) => {
            if (!token()) throw new Error(t('merchant.resetPassword.errors.invalidToken'));
            if (!values.newPassword || values.newPassword.length < 6) {
                throw new Error(t('merchant.resetPassword.errors.passwordTooShort'));
            }
            if (values.newPassword !== values.confirmPassword) {
                throw new Error(t('merchant.resetPassword.errors.passwordMismatch'));
            }

            await MerchantService.merchantResetPassword({
                input: {
                    token: token(),
                    newPassword: values.newPassword,
                }
            });
            setSuccess(true);
            return { success: true };
        },
    });

    return (
        <AuthLayout title={t('merchant.resetPassword.pageTitle')}>
            <div class="mb-6 text-center animate-fade-in">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 mb-4">
                    <Icon name="heroicons-outline:lock-closed" class="w-8 h-8 text-blue-600" />
                </div>
                <h1 class="text-2xl font-bold text-gray-900">{t('merchant.resetPassword.heading')}</h1>
                <p class="text-sm text-gray-500 mt-1">{t('merchant.resetPassword.subtitle')}</p>
            </div>

            <Show when={!success()} fallback={
                <div class="w-full text-center space-y-4">
                    <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                        <Icon name="heroicons-outline:check-circle" class="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p class="text-sm text-green-700 font-medium">
                            {t('merchant.resetPassword.successMessage')}
                        </p>
                        <p class="text-xs text-green-600 mt-1">{t('merchant.resetPassword.successHint')}</p>
                    </div>
                    <Button
                        wide main
                        class="h-12 w-full text-base font-bold rounded-lg"
                        label={t('merchant.resetPassword.loginButton')}
                        onClick={() => navigateToPage('merchantAuth.login')}
                    />
                </div>
            }>
                <Show when={token()} fallback={
                    <div class="w-full text-center space-y-4">
                        <div class="bg-red-50 border border-red-200 rounded-xl p-4">
                            <Icon name="heroicons-outline:exclamation-circle" class="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <p class="text-sm text-red-700 font-medium">
                                {t('merchant.resetPassword.invalidTokenMessage')}
                            </p>
                        </div>
                        <Button
                            wide
                            class="h-11 w-full rounded-lg"
                            label={t('merchant.resetPassword.backToForgotPassword')}
                            onClick={() => navigateToPage('merchantAuth.forgotPassword')}
                        />
                    </div>
                }>
                    <Form class="w-full flex flex-col gap-y-5">
                        <Form.Fieldset class="flex flex-col gap-y-4">
                            <Form.Field name="newPassword" label={t('merchant.resetPassword.newPasswordLabel')} required>
                                <InputPassword placeholder={t('merchant.resetPassword.newPasswordPlaceholder')} class="h-11 w-full rounded-lg" />
                            </Form.Field>
                            <Form.Field name="confirmPassword" label={t('merchant.resetPassword.confirmPasswordLabel')} required>
                                <InputPassword placeholder={t('merchant.resetPassword.confirmPasswordPlaceholder')} class="h-11 w-full rounded-lg" />
                            </Form.Field>
                            <Form.Error class="text-sm text-red-600 font-medium" />
                            <Button
                                wide main submit
                                class="h-12 w-full text-base font-bold rounded-lg mt-2"
                                label={t('merchant.resetPassword.submitLabel')}
                                loading={submitting()}
                            />
                        </Form.Fieldset>
                    </Form>
                </Show>
            </Show>

            <div class="mt-8 text-center">
                <button
                    onClick={() => navigateToPage('merchantAuth.login')}
                    class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {t('merchant.resetPassword.backToLogin')}
                </button>
            </div>
        </AuthLayout>
    );
}
