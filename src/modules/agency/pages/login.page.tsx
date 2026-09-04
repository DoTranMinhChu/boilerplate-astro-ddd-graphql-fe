import { LoginForm } from '@/shared/components/auth/LoginForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { createEffect, onMount } from 'solid-js';
import { EAccountType } from '@/shared/types/auth.type';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';
import { TokenManager } from '@/shared/helpers/token.helper';
import { t } from '@/shared/i18n/t';


export function LoginAgencyPage() {
    const { navigateToPage, searchParams } = useRoutes();
    const auth = useAuth();

    // Đang xử lý ?token= ở URL (auto-login) — nhường quyền redirect cho
    // `LoginForm.autoLoginFromUrlToken.verify` bên dưới, tránh redirect theo một
    // session CŨ trong lúc token MỚI trên URL còn chưa kịp verify xong (landmine #2:
    // token trên URL phải được ưu tiên xử lý trước, không được bị session cũ che mất).
    onMount(() => {
        if (searchParams.token) return;
        const existingToken = TokenManager.getToken(EAccountType.AGENCY);
        if (existingToken && auth.getAccountByType(EAccountType.AGENCY)) {
            navigateToPage('agencyDashboard.default');
        }
    });

    createEffect(() => {
        if (searchParams.token) return;
        if (auth.getAccountByType(EAccountType.AGENCY)) {
            navigateToPage('agencyDashboard.default');
        }
    });

    return (
        <LoginForm
            title={t('agency.login.portalTitle')}
            heading={t('agency.login.portalTitle')}
            subtitle={t('agency.login.subtitle')}
            hasOrgCode
            codeLabel={t('agency.login.codeLabel')}
            codePlaceholder={t('agency.login.codePlaceholder')}
            usernameLabel={t('agency.login.usernameLabel')}
            usernamePlaceholder={t('agency.login.usernamePlaceholder')}
            passwordLabel={t('agency.login.passwordLabel')}
            submitLabel={t('agency.login.submitLabel')}
            forgotPasswordLabel={t('agency.login.forgotPassword')}
            footerBrand="App Platform - Agency"
            loginFailedError={t('agency.login.loginFailedError')}
            onForgotPassword={() => navigateToPage('agencyAuth.forgotPassword')}
            onSubmit={async (values) => {
                const res = await AgencyAccountService.loginAgencyAccount({
                    data: {
                        username: values.username?.trim(),
                        password: values.password?.trim(),
                        code: values.code?.trim(),
                    },
                });

                if (res?.token && res?.agencyAccount) {
                    auth.setAuthData(EAccountType.AGENCY, res.agencyAccount, res.token);
                    return { success: true };
                }

                throw new Error(t('agency.login.loginFailedError'));
            }}
            autoLoginFromUrlToken={{
                verify: async (token) => {
                    const user = await AgencyAccountService.agencyAccountGetMe(token);
                    if (!user) throw new Error('Token không hợp lệ');
                    auth.setAuthData(EAccountType.AGENCY, user, token);
                    navigateToPage('agencyDashboard.default');
                    return { name: user.fullname ?? user.phone ?? '' };
                },
                verifyingLabel: t('agency.login.verifyingSession'),
                successToast: (name) => t('agency.login.welcomeToast', { name }),
                failureToast: t('agency.login.sessionInvalidToast'),
            }}
        />
    );
}
