import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Button } from '@core/components/button/Button';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { Icon } from '@shared/components/icons/Icon';
import { AdminService } from '@/shared/services/admin/admin.service';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { useSearchParams } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';
import { t } from '@/shared/i18n/t';

type AccountType = 'admin' | 'merchant';

export function ResetPasswordPage() {
    const { navigateToPage } = useRoutes();
    const [searchParams] = useSearchParams();

    const token = () => searchParams.token as string;
    const type = () => (searchParams.type as AccountType) ?? 'merchant';

    const [success, setSuccess] = createSignal(false);

    const { Form, submitting } = generateForm({
        handleSubmit: async (values: any) => {
            if (!token()) throw new Error(t('auth.resetPassword.tokenInvalidError'));
            if (!values.newPassword || values.newPassword.length < 6) {
                throw new Error(t('auth.resetPassword.passwordTooShortError'));
            }
            if (values.newPassword !== values.confirmPassword) {
                throw new Error(t('auth.resetPassword.passwordMismatchError'));
            }

            if (type() === 'admin') {
                await AdminService.adminResetPasswordByToken({
                    input: { token: token(), newPassword: values.newPassword },
                });
            } else {
                await MerchantService.merchantResetPassword({
                    input: { token: token(), newPassword: values.newPassword },
                });
            }

            setSuccess(true);
            return { success: true };
        },
    });

    const goToLogin = () => {
        if (type() === 'admin') {
            navigateToPage('adminAuth.login');
        } else {
            navigateToPage('merchantAuth.login');
        }
    };

    const goToForgotPassword = () => {
        if (type() === 'admin') {
            navigateToPage('adminAuth.forgotPassword');
        } else {
            navigateToPage('merchantAuth.forgotPassword');
        }
    };

    const typeLabel = () => type() === 'admin' ? 'Admin' : 'Merchant';

    return (
        <AuthLayout title={t('auth.resetPassword.pageTitle')}>
            <div class="mb-6 text-center animate-fade-in">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 mb-4">
                    <Icon name="heroicons-outline:lock-closed" class="w-8 h-8 text-blue-600" />
                </div>
                <h1 class="text-2xl font-bold text-gray-900">{t('auth.resetPassword.heading')}</h1>
                <p class="text-sm text-gray-500 mt-1">
                    {t('auth.resetPassword.subtitlePrefix')} <span class="font-medium text-gray-700">{typeLabel()}</span>
                </p>
            </div>

            {/* Thành công */}
            <Show when={success()}>
                <div class="w-full text-center space-y-4">
                    <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                        <Icon name="heroicons-outline:check-circle" class="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p class="text-sm text-green-700 font-medium">{t('auth.resetPassword.successMessage')}</p>
                        <p class="text-xs text-green-600 mt-1">{t('auth.resetPassword.successHint')}</p>
                    </div>
                    <Button
                        wide main
                        class="h-12 w-full text-base font-bold rounded-lg"
                        label={t('auth.resetPassword.loginNowButton')}
                        onClick={goToLogin}
                    />
                </div>
            </Show>

            {/* Token thiếu / invalid từ URL */}
            <Show when={!success() && !token()}>
                <div class="w-full text-center space-y-4">
                    <div class="bg-red-50 border border-red-200 rounded-xl p-4">
                        <Icon name="heroicons-outline:exclamation-circle" class="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p class="text-sm text-red-700 font-medium">
                            {t('auth.resetPassword.linkInvalidMessage')}
                        </p>
                        <p class="text-xs text-red-500 mt-1">{t('auth.resetPassword.tokenExpiryHint')}</p>
                    </div>
                    <Button
                        wide main
                        class="h-12 w-full text-base font-bold rounded-lg"
                        label={t('auth.resetPassword.resendEmailButton')}
                        onClick={goToForgotPassword}
                    />
                </div>
            </Show>

            {/* Form nhập mật khẩu mới */}
            <Show when={!success() && !!token()}>
                <Form class="w-full flex flex-col gap-y-5">
                    <Form.Fieldset class="flex flex-col gap-y-4">
                        <Form.Field name="newPassword" label={t('auth.resetPassword.newPasswordLabel')} required>
                            <InputPassword
                                autoFocus
                                placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                                class="h-11 w-full rounded-lg border-gray-200"
                            />
                        </Form.Field>
                        <Form.Field name="confirmPassword" label={t('auth.resetPassword.confirmPasswordLabel')} required>
                            <InputPassword
                                placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                                class="h-11 w-full rounded-lg border-gray-200"
                            />
                        </Form.Field>
                        <Form.Error class="text-sm text-red-600 font-medium" />
                        <Button
                            wide main submit
                            class="h-12 w-full text-base font-bold rounded-lg mt-2"
                            label={t('auth.resetPassword.submitButton')}
                            loading={submitting()}
                        />
                    </Form.Fieldset>
                </Form>
            </Show>

            <div class="mt-8 text-center">
                <button
                    type="button"
                    onClick={goToLogin}
                    class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {t('auth.resetPassword.backToLoginButton')}
                </button>
            </div>
        </AuthLayout>
    );
}
