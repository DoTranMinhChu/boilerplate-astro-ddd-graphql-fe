import { LoginForm } from '@/shared/components/auth/LoginForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { createEffect, onMount } from 'solid-js';
import { EAccountType } from '@/shared/types/auth.type';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { TenantAccountService } from '@/shared/services/tenantAccount/tenantAccount.service';
import { TokenManager } from '@/shared/helpers/token.helper';
import { t } from '@/shared/i18n/t';


export function LoginTenantPage() {
    const { navigateToPage, searchParams } = useRoutes();
    const auth = useAuth();

    // Ưu tiên 1: token từ URL (auto-login) — nhường quyền redirect cho
    // `LoginForm.autoLoginFromUrlToken.verify` bên dưới, tránh redirect theo một session
    // CŨ trong lúc token MỚI trên URL còn chưa kịp verify xong (landmine #2).
    onMount(() => {
        if (searchParams.token) return;
        // Ưu tiên 2: đã có token sẵn trong localStorage
        const existingToken = TokenManager.getToken(EAccountType.TENANT);
        if (existingToken && auth.getAccountByType(EAccountType.TENANT)) {
            navigateToPage('tenantDashboard.default');
        }
    });

    createEffect(() => {
        if (searchParams.token) return;
        if (auth.getAccountByType(EAccountType.TENANT)) {
            navigateToPage('tenantDashboard.default');
        }
    });

    return (
        <LoginForm
            title={t('tenant.login.title')}
            heading={t('tenant.login.portalTitle')}
            subtitle={t('tenant.login.subtitle')}
            hasOrgCode
            codeLabel={t('tenant.login.orgCodeLabel')}
            codePlaceholder={t('tenant.login.orgCodePlaceholder')}
            usernameLabel={t('tenant.login.usernameLabel')}
            usernamePlaceholder={t('tenant.login.usernamePlaceholder')}
            passwordLabel={t('tenant.login.passwordLabel')}
            submitLabel={t('tenant.login.submit')}
            forgotPasswordLabel={t('tenant.login.forgotPassword')}
            footerBrand={t('tenant.login.footer')}
            loginFailedError={t('tenant.login.loginFailed')}
            onForgotPassword={() => navigateToPage('tenantAuth.forgotPassword')}
            onSubmit={async (values) => {
                const res = await TenantAccountService.loginTenantAccount({
                    data: {
                        username: values.username?.trim(),
                        password: values.password?.trim(),
                        code: values.code?.trim(),
                    },
                });

                if (res?.token && res?.tenantAccount) {
                    auth.setAuthData(EAccountType.TENANT, res.tenantAccount, res.token);
                    return { success: true };
                }

                throw new Error(t('tenant.login.loginFailed'));
            }}
            autoLoginFromUrlToken={{
                verify: async (token) => {
                    const user = await TenantAccountService.tenantAccountGetMe(token);
                    if (!user) throw new Error('Token không hợp lệ');
                    auth.setAuthData(EAccountType.TENANT, user, token);
                    navigateToPage('tenantDashboard.default');
                    return { name: user.fullname ?? user.phone ?? '' };
                },
                verifyingLabel: t('tenant.login.verifying'),
                successToast: (name) => t('tenant.login.welcomeToast', { name }),
                failureToast: t('tenant.login.sessionInvalid'),
            }}
            extraFooterContent={() => (
                <div class="mt-6 text-center">
                    <p class="text-sm text-gray-500">
                        {t('tenant.login.newStaffPrompt')}{' '}
                        <button
                            type="button"
                            onClick={() => navigateToPage('tenantAuth.register', { code: searchParams.code ?? '' })}
                            class="text-blue-600 font-semibold hover:underline"
                        >
                            {t('tenant.login.registerLink')}
                        </button>
                    </p>
                </div>
            )}
        />
    );
}
