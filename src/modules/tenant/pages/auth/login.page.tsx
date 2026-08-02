import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { AuthLayout } from '@layouts/auth/AuthLayout';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { createEffect, createSignal, onMount, Show } from 'solid-js';
import { EAccountType } from '@/shared/types/auth.type';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { TenantAccountService } from '@/shared/services/tenantAccount/tenantAccount.service';
import { TokenManager } from '@/shared/helpers/token.helper';
import { toast } from '@core/components/toast/ToastProvider';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';


export function LoginTenantPage() {
    const { navigateToPage, searchParams } = useRoutes();
    const auth = useAuth();
    const [isVerifyingToken, setIsVerifyingToken] = createSignal(false);

    onMount(async () => {
        const tokenFromUrl = searchParams.token;

        // Ưu tiên 1: token từ URL (đã được lưu vào localStorage ở module-level code phía trên)
        if (tokenFromUrl) {
            setIsVerifyingToken(true);
            try {

                const user = await TenantAccountService.tenantAccountGetMe(tokenFromUrl);
                if (!user) throw new Error('Token không hợp lệ');

                auth.setAuthData(EAccountType.TENANT, user, tokenFromUrl);
                toast().success(t('tenant.login.welcomeToast', { name: user.fullname || user.phone || '' }));
            } catch (error) {
                console.error('Auto login from URL failed:', error);
                toast().danger(t('tenant.login.sessionInvalid'));
                // TokenManager.removeToken(EAccountType.TENANT);
            } finally {
                setIsVerifyingToken(false);
            }
            return;
        }

        // Ưu tiên 2: đã có token sẵn trong localStorage
        const existingToken = TokenManager.getToken(EAccountType.TENANT);
        if (existingToken && auth.getAccountByType(EAccountType.TENANT)) {
            navigateToPage('tenantDashboard.default');
        }
    });

    createEffect(() => {
        if (isVerifyingToken()) return;
        if (auth.getAccountByType(EAccountType.TENANT)) {
            navigateToPage('tenantDashboard.default');
        }
    });

    const { Form, submitting, submitted } = generateForm({
        handleSubmit: async (values) => {
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
        },
    });

    return (
        <AuthLayout title={t('tenant.login.title')}>
            <Show
                when={!isVerifyingToken()}
                fallback={
                    <div class="flex flex-col items-center justify-center py-20 space-y-4 animate-fade-in">
                        <Icon name="svg-spinners:blocks-scale" class="text-4xl text-blue-600" />
                        <p class="text-sm font-medium text-gray-500">
                            {t('tenant.login.verifying')}
                        </p>
                    </div>
                }
            >
                <div class="mb-8 text-center animate-fade-in">
                    <h1 class="text-2xl font-bold text-gray-900">{t('tenant.login.portalTitle')}</h1>
                    <p class="text-sm text-gray-500 mt-1">{t('tenant.login.subtitle')}</p>
                </div>

                <Form class="w-full flex flex-col gap-y-5">
                    <Form.Fieldset class="flex flex-col gap-y-4">
                        <Form.Field name="code" label={t('tenant.login.orgCodeLabel')} required>
                            <Input autoFocus placeholder={t('tenant.login.orgCodePlaceholder')} class="h-11 w-full rounded-lg border-gray-200" />
                        </Form.Field>
                        <Form.Field name="username" label={t('tenant.login.usernameLabel')} required>
                            <Input placeholder={t('tenant.login.usernamePlaceholder')} class="h-11 w-full rounded-lg border-gray-200" />
                        </Form.Field>
                        <Form.Field name="password" label={t('tenant.login.passwordLabel')} required>
                            <InputPassword placeholder="••••••••" class="h-11 w-full rounded-lg border-gray-200" />
                        </Form.Field>

                        <div class="flex justify-end -mt-1">
                            <button
                                type="button"
                                onClick={() => navigateToPage('merchantAuth.forgotPassword')}
                                class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {t('tenant.login.forgotPassword')}
                            </button>
                        </div>

                        <Form.Error class="text-sm text-red-600 font-medium" />
                        <div class="w-full pt-2">
                            <Button
                                wide main submit
                                class="h-12 w-full text-base font-bold shadow-md rounded-lg"
                                label={t('tenant.login.submit')}
                                loading={submitting()}
                                disabled={submitted()}
                            />
                        </div>
                    </Form.Fieldset>
                </Form>

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

                <div class="mt-8 border-t border-gray-100 pt-6 text-center">
                    <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
                        {t('tenant.login.footer')}
                    </p>
                </div>
            </Show>
        </AuthLayout>
    );
}