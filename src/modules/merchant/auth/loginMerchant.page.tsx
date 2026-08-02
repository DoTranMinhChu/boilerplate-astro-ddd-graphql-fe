// src/modules/merchant/auth/loginMerchant.page.tsx

import { createEffect, onMount, Show } from 'solid-js';
import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { TokenManager } from '@/shared/helpers/token.helper';
import { toast } from '@core/components/toast/ToastProvider';
import { Icon } from '@shared/components/icons/Icon';
import { EAccountType } from '@/shared/types/auth.type';
import { useSystemConfig } from '@/shared/contexts/systemConfig/SystemConfigContext';
import { t } from '@/shared/i18n/t';

export function LoginMerchantPage() {
    const { navigateToPage } = useRoutes();
    const auth = useAuth();
    const { config } = useSystemConfig();

    // Chỉ hiện lối "Đăng ký ngay" khi quản trị đang bật tự-đăng-ký (mặc định bật
    // khi config chưa tải) — tránh dẫn tới trang báo "đăng ký đang đóng".
    const selfRegisterEnabled = () => config()?.allowMerchantSelfRegister !== false;

    onMount(() => {
        // Đã có merchantToken sẵn → vào thẳng dashboard
        const existingToken = TokenManager.getToken(EAccountType.MERCHANT);
        if (existingToken && auth.getAccountByType(EAccountType.MERCHANT)) {
            navigateToPage('merchantDashboard.default');
        }
    });

    createEffect(() => {
        if (auth.getAccountByType(EAccountType.MERCHANT)) {
            navigateToPage('merchantDashboard.default');
        }
    });

    const { Form, submitting } = generateForm({
        handleSubmit: async (values) => {
            const res = await MerchantService.merchantLogin({
                input: {
                    username: values.username,
                    password: values.password,
                },
            });

            if (!res?.token || !res?.merchant) throw new Error(t('merchant.login.errors.loginFailed'));

            await auth.setMerchantAuthData(res.merchant, res.token);
            toast().success(t('merchant.login.welcomeToast', { name: res.merchant.fullname || res.merchant.username || '' }));

            return { success: true };
        },
    });

    return (
        <AuthLayout title={t('merchant.login.pageTitle')}>
            <div class="mb-8 text-center animate-fade-in">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 mb-4">
                    <Icon name="heroicons-outline:user-circle" class="w-8 h-8 text-violet-600" />
                </div>
                <h1 class="text-2xl font-bold text-gray-900">{t('merchant.login.pageTitle')}</h1>
                <p class="text-sm text-gray-500 mt-1">{t('merchant.login.subtitle')}</p>
            </div>

            <Form class="w-full flex flex-col gap-y-5">
                <Form.Fieldset class="flex flex-col gap-y-4">
                    <Form.Field name="username" label={t('merchant.login.usernameLabel')} required>
                        <Input autoFocus placeholder={t('merchant.login.usernamePlaceholder')} class="h-11 w-full rounded-lg" />
                    </Form.Field>
                    <Form.Field name="password" label={t('merchant.login.passwordLabel')} required>
                        <InputPassword placeholder="••••••••" class="h-11 w-full rounded-lg" />
                    </Form.Field>
                    <Form.Error class="text-sm text-red-600 font-medium" />
                    <Button
                        wide main submit
                        class="h-12 w-full text-base font-bold rounded-lg mt-2"
                        label={t('merchant.login.submitLabel')}
                        loading={submitting()}
                    />
                </Form.Fieldset>
            </Form>

            <div class="mt-6 text-center">
                <button
                    onClick={() => navigateToPage('merchantAuth.forgotPassword')}
                    class="text-sm text-violet-500 hover:text-violet-700 transition-colors"
                >
                    {t('merchant.login.forgotPassword')}
                </button>
            </div>

            <div class="mt-5 text-center space-y-2">
                <Show when={selfRegisterEnabled()}>
                    <p class="text-sm text-gray-500">
                        {t('merchant.login.noAccount')}{' '}
                        <button
                            onClick={() => navigateToPage('merchantAuth.register')}
                            class="text-violet-600 font-semibold hover:underline"
                        >
                            {t('merchant.login.registerNow')}
                        </button>
                    </p>
                </Show>
                <p class="text-xs text-gray-400">
                    {t('merchant.login.haveInviteCode')}{' '}
                    <button
                        onClick={() => navigateToPage('merchantAuth.registerByInvite')}
                        class="text-indigo-500 font-semibold hover:underline"
                    >
                        {t('merchant.login.registerWithInvite')}
                    </button>
                </p>
            </div>

            <div class="mt-6 border-t border-gray-100 pt-6 text-center">
                <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
                    {t('merchant.login.footerBrand')}
                </p>
            </div>
        </AuthLayout>
    );
}