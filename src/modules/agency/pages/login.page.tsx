import { LoginForm } from '@/shared/components/auth/LoginForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { createEffect, createSignal, onMount } from 'solid-js';
import { EAccountType } from '@/shared/types/auth.type';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';
import { TokenManager } from '@/shared/helpers/token.helper';
import { t } from '@/shared/i18n/t';


export function LoginAgencyPage() {
    const { navigateToPage, searchParams } = useRoutes();
    const auth = useAuth();
    // Mirrors the pre-extraction `isVerifyingToken()` signal — reported back by `LoginForm` via
    // `onVerifyingChange` while its own `autoLoginFromUrlToken.verify` is in flight. Seeded from
    // `searchParams.token`'s presence (not just `false`): `LoginForm`'s `onMount` — which flips
    // this via `onVerifyingChange(true)` — now lives in a separate component instance, so it is
    // registered, and runs, AFTER this page's own `createEffect` below in the initial render's
    // effect-flush order. Without this seed, the effect's very first synchronous run could see
    // `isVerifyingToken() === false` and redirect off a stale session before verification has
    // even had a chance to start. Seeding with presence reproduces the original single-component
    // behavior exactly, where `setIsVerifyingToken(true)` ran synchronously (pre-`await`) inside
    // `onMount`, strictly before `createEffect`'s first run, whenever a token was present.
    const [isVerifyingToken, setIsVerifyingToken] = createSignal(!!searchParams.token);

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

    // Gate on the in-flight verification signal, NOT on `searchParams.token`'s mere presence —
    // nothing ever strips `?token=` from the URL after the attempt settles, so a presence-based
    // guard here would make this effect permanently inert for the rest of the page's life
    // (it only re-runs when a signal it reads changes) once a token param has ever existed.
    createEffect(() => {
        if (isVerifyingToken()) return;
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
            onVerifyingChange={setIsVerifyingToken}
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
