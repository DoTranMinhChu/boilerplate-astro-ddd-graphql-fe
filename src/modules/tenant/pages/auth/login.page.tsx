import { LoginForm } from '@/shared/components/auth/LoginForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { createEffect, createSignal, onMount } from 'solid-js';
import { EAccountType } from '@/shared/types/auth.type';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { TenantAccountService } from '@/shared/services/tenantAccount/tenantAccount.service';
import { TokenManager } from '@/shared/helpers/token.helper';
import { t } from '@/shared/i18n/t';


export function LoginTenantPage() {
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

    // Gate on the in-flight verification signal, NOT on `searchParams.token`'s mere presence —
    // nothing ever strips `?token=` from the URL after the attempt settles, so a presence-based
    // guard here would make this effect permanently inert for the rest of the page's life
    // (it only re-runs when a signal it reads changes) once a token param has ever existed.
    createEffect(() => {
        if (isVerifyingToken()) return;
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
            onVerifyingChange={setIsVerifyingToken}
            spinnerColorClass="text-blue-600"
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
