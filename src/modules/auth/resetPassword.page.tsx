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

type AccountType = 'admin' | 'merchant';

export function ResetPasswordPage() {
    const { navigateToPage } = useRoutes();
    const [searchParams] = useSearchParams();

    const token = () => searchParams.token as string;
    const type = () => (searchParams.type as AccountType) ?? 'merchant';

    const [success, setSuccess] = createSignal(false);

    const { Form, submitting } = generateForm({
        handleSubmit: async (values: any) => {
            if (!token()) throw new Error('Token không hợp lệ hoặc đã hết hạn');
            if (!values.newPassword || values.newPassword.length < 6) {
                throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
            }
            if (values.newPassword !== values.confirmPassword) {
                throw new Error('Mật khẩu xác nhận không khớp');
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
        <AuthLayout title="Đặt lại mật khẩu">
            <div class="mb-6 text-center animate-fade-in">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 mb-4">
                    <Icon name="heroicons-outline:lock-closed" class="w-8 h-8 text-blue-600" />
                </div>
                <h1 class="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h1>
                <p class="text-sm text-gray-500 mt-1">
                    Nhập mật khẩu mới cho tài khoản <span class="font-medium text-gray-700">{typeLabel()}</span>
                </p>
            </div>

            {/* Thành công */}
            <Show when={success()}>
                <div class="w-full text-center space-y-4">
                    <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                        <Icon name="heroicons-outline:check-circle" class="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p class="text-sm text-green-700 font-medium">Đặt lại mật khẩu thành công!</p>
                        <p class="text-xs text-green-600 mt-1">Bạn có thể đăng nhập bằng mật khẩu mới.</p>
                    </div>
                    <Button
                        wide main
                        class="h-12 w-full text-base font-bold rounded-lg"
                        label="Đăng nhập ngay"
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
                            Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
                        </p>
                        <p class="text-xs text-red-500 mt-1">Token có hiệu lực 30 phút kể từ khi gửi email.</p>
                    </div>
                    <Button
                        wide main
                        class="h-12 w-full text-base font-bold rounded-lg"
                        label="Gửi lại email"
                        onClick={goToForgotPassword}
                    />
                </div>
            </Show>

            {/* Form nhập mật khẩu mới */}
            <Show when={!success() && !!token()}>
                <Form class="w-full flex flex-col gap-y-5">
                    <Form.Fieldset class="flex flex-col gap-y-4">
                        <Form.Field name="newPassword" label="Mật khẩu mới" required>
                            <InputPassword
                                autoFocus
                                placeholder="Tối thiểu 6 ký tự"
                                class="h-11 w-full rounded-lg border-gray-200"
                            />
                        </Form.Field>
                        <Form.Field name="confirmPassword" label="Xác nhận mật khẩu mới" required>
                            <InputPassword
                                placeholder="Nhập lại mật khẩu mới"
                                class="h-11 w-full rounded-lg border-gray-200"
                            />
                        </Form.Field>
                        <Form.Error class="text-sm text-red-600 font-medium" />
                        <Button
                            wide main submit
                            class="h-12 w-full text-base font-bold rounded-lg mt-2"
                            label="Đặt lại mật khẩu"
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
                    Quay lại đăng nhập
                </button>
            </div>
        </AuthLayout>
    );
}
