import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { AuthLayout } from '@layouts/auth/AuthLayout';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { createEffect, createSignal, onMount, Show } from 'solid-js';
import { EAccountType } from '@/shared/types/auth.type';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';
import { TokenManager } from '@/shared/helpers/token.helper';
import { toast } from '@core/components/toast/ToastProvider';
import { Icon } from '@shared/components/icons/Icon';


export function LoginAgencyPage() {
    const { navigateToPage, searchParams } = useRoutes();
    const auth = useAuth();
    const [isVerifyingToken, setIsVerifyingToken] = createSignal(false);

    onMount(async () => {
        const tokenFromUrl = searchParams.token;

        if (tokenFromUrl) {
            setIsVerifyingToken(true);
            try {


                const user = await AgencyAccountService.agencyAccountGetMe(tokenFromUrl);
                if (!user) throw new Error('Token không hợp lệ');
                console.log("[LoginAgencyPage] Auto login from URL successful:", { user });
                console.log("[LoginAgencyPage] Setting auth data with token from URL:", { tokenFromUrl });
                auth.setAuthData(EAccountType.AGENCY, user, tokenFromUrl);

                toast().success(`Xin chào, ${user.fullname ?? user.phone}`);
            } catch (error) {
                console.error('Auto login from URL failed:', error);
                toast().danger('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
                //    TokenManager.removeToken(EAccountType.AGENCY);
            } finally {
                setIsVerifyingToken(false);
            }
            return;
        }

        const existingToken = TokenManager.getToken(EAccountType.AGENCY);
        if (existingToken && auth.getAccountByType(EAccountType.AGENCY)) {
            navigateToPage('agencyDashboard.default');
        }
    });

    createEffect(() => {
        if (isVerifyingToken()) return;
        if (auth.getAccountByType(EAccountType.AGENCY)) {
            navigateToPage('agencyDashboard.default');
        }
    });

    const { Form, submitting, submitted } = generateForm({
        handleSubmit: async (values) => {
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

            throw new Error('Login failed');
        },
    });

    return (
        <AuthLayout title="Agency Portal">
            <Show
                when={!isVerifyingToken()}
                fallback={
                    <div class="flex flex-col items-center justify-center py-20 space-y-4 animate-fade-in">
                        <Icon name="svg-spinners:blocks-scale" class="text-4xl text-violet-600" />
                        <p class="text-sm font-medium text-gray-500">
                            Đang xác thực phiên đăng nhập...
                        </p>
                    </div>
                }
            >
                <div class="mb-8 text-center animate-fade-in">
                    <h1 class="text-2xl font-bold text-gray-900">Agency Portal</h1>
                    <p class="text-sm text-gray-500 mt-1">Đăng nhập với tài khoản đối tác</p>
                </div>

                <Form class="w-full flex flex-col gap-y-5">
                    <Form.Fieldset class="flex flex-col gap-y-4">
                        <Form.Field name="code" label="Mã đối tác" required>
                            <Input autoFocus placeholder="Nhập mã đối tác..." class="h-11 w-full rounded-lg border-gray-200" />
                        </Form.Field>
                        <Form.Field name="username" label="Tên đăng nhập" required>
                            <Input autoFocus placeholder="Nhập username..." class="h-11 w-full rounded-lg border-gray-200" />
                        </Form.Field>
                        <Form.Field name="password" label="Mật khẩu" required>
                            <InputPassword placeholder="••••••••" class="h-11 w-full rounded-lg border-gray-200" />
                        </Form.Field>

                        <div class="flex justify-end -mt-1">
                            <button
                                type="button"
                                onClick={() => navigateToPage('merchantAuth.forgotPassword')}
                                class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Quên mật khẩu?
                            </button>
                        </div>

                        <Form.Error class="text-sm text-red-600 font-medium" />
                        <div class="w-full pt-2">
                            <Button
                                wide main submit
                                class="h-12 w-full text-base font-bold shadow-md rounded-lg"
                                label="Đăng nhập"
                                loading={submitting()}
                                disabled={submitted()}
                            />
                        </div>
                    </Form.Fieldset>
                </Form>

                <div class="mt-10 border-t border-gray-100 pt-6 text-center">
                    <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
                        Agri Enterprise System - Agency
                    </p>
                </div>
            </Show>
        </AuthLayout>
    );
}