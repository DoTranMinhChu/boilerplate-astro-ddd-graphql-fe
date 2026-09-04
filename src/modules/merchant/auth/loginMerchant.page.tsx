// src/modules/merchant/auth/loginMerchant.page.tsx

import { createEffect, onMount, Show } from 'solid-js';
import { LoginForm } from '@/shared/components/auth/LoginForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { TokenManager } from '@/shared/helpers/token.helper';
import { toast } from '@core/components/toast/ToastProvider';
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

    return (
        <LoginForm
            title={t('merchant.login.pageTitle')}
            heading={t('merchant.login.pageTitle')}
            subtitle={t('merchant.login.subtitle')}
            headerIcon="heroicons-outline:user-circle"
            usernameLabel={t('merchant.login.usernameLabel')}
            usernamePlaceholder={t('merchant.login.usernamePlaceholder')}
            passwordLabel={t('merchant.login.passwordLabel')}
            submitLabel={t('merchant.login.submitLabel')}
            forgotPasswordLabel={t('merchant.login.forgotPassword')}
            footerBrand={t('merchant.login.footerBrand')}
            loginFailedError={t('merchant.login.errors.loginFailed')}
            onForgotPassword={() => navigateToPage('merchantAuth.forgotPassword')}
            onSubmit={async (values) => {
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
            }}
            extraFooterContent={() => (
                <div class="mt-5 text-center space-y-2">
                    <Show when={selfRegisterEnabled()}>
                        <p class="text-sm text-gray-500">
                            {t('merchant.login.noAccount')}{' '}
                            <button
                                type="button"
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
                            type="button"
                            onClick={() => navigateToPage('merchantAuth.registerByInvite')}
                            class="text-indigo-500 font-semibold hover:underline"
                        >
                            {t('merchant.login.registerWithInvite')}
                        </button>
                    </p>
                </div>
            )}
        />
    );
}
