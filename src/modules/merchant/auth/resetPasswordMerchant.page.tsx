import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Button } from '@core/components/button/Button';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { Icon } from '@shared/components/icons/Icon';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { useSearchParams } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';

export function ResetPasswordMerchantPage() {
    const { navigateToPage } = useRoutes();
    const [searchParams] = useSearchParams();
    const token = () => searchParams.token as string;
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

            await MerchantService.merchantResetPassword({
                input: {
                    token: token(),
                    newPassword: values.newPassword,
                }
            });
            setSuccess(true);
            return { success: true };
        },
    });

    return (
        <AuthLayout title="Đặt lại mật khẩu">
            <div class="mb-6 text-center animate-fade-in">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 mb-4">
                    <Icon name="heroicons-outline:lock-closed" class="w-8 h-8 text-blue-600" />
                </div>
                <h1 class="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h1>
                <p class="text-sm text-gray-500 mt-1">Nhập mật khẩu mới cho tài khoản của bạn</p>
            </div>

            <Show when={!success()} fallback={
                <div class="w-full text-center space-y-4">
                    <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                        <Icon name="heroicons-outline:check-circle" class="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p class="text-sm text-green-700 font-medium">
                            Đặt lại mật khẩu thành công!
                        </p>
                        <p class="text-xs text-green-600 mt-1">Bạn có thể đăng nhập bằng mật khẩu mới.</p>
                    </div>
                    <Button
                        wide main
                        class="h-12 w-full text-base font-bold rounded-lg"
                        label="Đăng nhập"
                        onClick={() => navigateToPage('merchantAuth.login')}
                    />
                </div>
            }>
                <Show when={token()} fallback={
                    <div class="w-full text-center space-y-4">
                        <div class="bg-red-50 border border-red-200 rounded-xl p-4">
                            <Icon name="heroicons-outline:exclamation-circle" class="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <p class="text-sm text-red-700 font-medium">
                                Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
                            </p>
                        </div>
                        <Button
                            wide
                            class="h-11 w-full rounded-lg"
                            label="Quay lại Quên mật khẩu"
                            onClick={() => navigateToPage('merchantAuth.forgotPassword')}
                        />
                    </div>
                }>
                    <Form class="w-full flex flex-col gap-y-5">
                        <Form.Fieldset class="flex flex-col gap-y-4">
                            <Form.Field name="newPassword" label="Mật khẩu mới" required>
                                <InputPassword placeholder="Tối thiểu 6 ký tự" class="h-11 w-full rounded-lg" />
                            </Form.Field>
                            <Form.Field name="confirmPassword" label="Xác nhận mật khẩu mới" required>
                                <InputPassword placeholder="Nhập lại mật khẩu mới" class="h-11 w-full rounded-lg" />
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
            </Show>

            <div class="mt-8 text-center">
                <button
                    onClick={() => navigateToPage('merchantAuth.login')}
                    class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                    Quay lại đăng nhập
                </button>
            </div>
        </AuthLayout>
    );
}
