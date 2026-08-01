import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { generateForm } from '@core/components/form/generateForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { Icon } from '@shared/components/icons/Icon';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { createSignal } from 'solid-js';

export function ForgotPasswordMerchantPage() {
    const { navigateToPage } = useRoutes();
    const [submitted, setSubmitted] = createSignal(false);

    const { Form, submitting } = generateForm({
        handleSubmit: async (values: any) => {
            if (!values.login) throw new Error('Vui lòng nhập tài khoản hoặc email');
            await MerchantService.merchantForgotPassword({
                input: {
                    login: values.login,
                    domain: window.location.origin,
                }
            });
            setSubmitted(true);
            return { success: true };
        },
    });

    return (
        <AuthLayout title="Quên mật khẩu">
            <div class="mb-6 text-center animate-fade-in">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 mb-4">
                    <Icon name="heroicons-outline:envelope" class="w-8 h-8 text-amber-600" />
                </div>
                <h1 class="text-2xl font-bold text-gray-900">Quên mật khẩu</h1>
                <p class="text-sm text-gray-500 mt-1">Nhập tài khoản hoặc email để nhận link đặt lại mật khẩu</p>
            </div>

            {submitted() ? (
                <div class="w-full text-center space-y-4">
                    <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                        <Icon name="heroicons-outline:check-circle" class="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p class="text-sm text-green-700 font-medium">
                            Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.
                        </p>
                        <p class="text-xs text-green-600 mt-1">Link có hiệu lực trong 30 phút.</p>
                    </div>
                    <Button
                        wide
                        class="h-11 w-full rounded-lg"
                        label="Quay lại đăng nhập"
                        onClick={() => navigateToPage('merchantAuth.login')}
                    />
                </div>
            ) : (
                <Form class="w-full flex flex-col gap-y-5">
                    <Form.Fieldset class="flex flex-col gap-y-4">
                        <Form.Field name="login" label="Tài khoản / Email" required>
                            <Input
                                autoFocus
                                placeholder="Nhập username hoặc email..."
                                class="h-11 w-full rounded-lg"
                            />
                        </Form.Field>
                        <Form.Error class="text-sm text-red-600 font-medium" />
                        <Button
                            wide main submit
                            class="h-12 w-full text-base font-bold rounded-lg mt-2"
                            label="Gửi link đặt lại mật khẩu"
                            loading={submitting()}
                        />
                    </Form.Fieldset>
                </Form>
            )}

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
