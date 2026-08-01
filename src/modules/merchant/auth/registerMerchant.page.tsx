// src/pages/merchant/auth/RegisterMerchantPage.tsx

import { createEffect, createSignal, Show } from 'solid-js';
import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { Icon } from '@shared/components/icons/Icon';
import { useSystemConfig } from '@/shared/contexts/systemConfig/SystemConfigContext';

export function RegisterMerchantPage() {
    const { navigateToPage } = useRoutes();
    const auth = useAuth()!;
    const { config } = useSystemConfig();
    const [step, setStep] = createSignal<'form' | 'success'>('form');

    // Merchant tự đăng ký bị quản trị TẮT → hiện thông báo rõ ràng thay vì
    // âm thầm điều hướng về login (khiến người dùng tưởng "bấm không có tác dụng").
    const selfRegisterDisabled = () => {
        const cfg = config();
        return !!cfg && cfg.allowMerchantSelfRegister === false;
    };

    const { Form, submitting } = generateForm({
        handleSubmit: async (values) => {
            if (values.password !== values.confirmPassword) {
                throw new Error('Mật khẩu xác nhận không khớp');
            }

            const res = await MerchantService.registerMerchant({
                input: {
                    username: values.username,
                    password: values.password,
                    email: values.email,
                    fullname: values.fullname,
                    phone: values.phone,
                }
            });

            if (!res?.token || !res?.merchant) throw new Error('Đăng ký thất bại');

            await auth.setMerchantAuthData(res.merchant, res.token);
            setStep('success');
            return { success: true };
        },
    });

    // Redirect sau khi đăng ký thành công → trang chọn nơi làm việc (memberships)
    createEffect(() => {
        if (step() === 'success' && auth.isMerchant()) {
            setTimeout(() => navigateToPage('merchantDashboard.default'), 1200);
        }
    });

    return (
        <AuthLayout title="Tạo tài khoản Merchant">

          <Show
            when={!selfRegisterDisabled()}
            fallback={
                <div class="flex flex-col items-center text-center py-8 animate-fade-in">
                    <div class="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-5">
                        <Icon name="heroicons-outline:lock-closed" class="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 class="text-xl font-bold text-gray-900">Đăng ký đang tạm đóng</h1>
                    <p class="text-sm text-gray-500 mt-2 max-w-xs">
                        Quản trị hệ thống hiện chưa mở đăng ký tài khoản tự do. Bạn có thể
                        đăng ký bằng <span class="font-semibold">mã mời</span> nếu được tổ chức cấp.
                    </p>
                    <div class="flex flex-col gap-2 w-full mt-7">
                        <Button
                            wide main
                            class="h-12 w-full rounded-xl font-bold text-base"
                            label="Đăng ký với mã mời"
                            onClick={() => navigateToPage('merchantAuth.registerByInvite')}
                        />
                        <button
                            onClick={() => navigateToPage('merchantAuth.login')}
                            class="text-sm text-gray-500 hover:text-gray-700 mt-1"
                        >
                            Về trang đăng nhập
                        </button>
                    </div>
                </div>
            }
          >

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div class="mb-7 animate-fade-in">
                <div class="flex items-center gap-3 mb-5">
                    <div class="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
                        <Icon name="heroicons-outline:user-plus" class="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-gray-900 leading-none">Tạo tài khoản</h1>
                        <p class="text-xs text-gray-400 mt-0.5">Merchant Portal</p>
                    </div>
                </div>

                {/* Breadcrumb dạng step */}
                <div class="flex items-center gap-2 text-xs">
                    <span class="font-bold text-violet-600">① Thông tin</span>
                    <Icon name="heroicons-outline:chevron-right" class="w-3 h-3 text-gray-300" />
                    <span class="text-gray-400">② Chọn nơi làm việc</span>
                </div>
            </div>

            {/* ── Form ───────────────────────────────────────────────────────── */}
            <Form class="w-full flex flex-col gap-y-4 animate-fade-in">
                <Form.Fieldset class="flex flex-col gap-y-4">

                    {/* Row 1: Họ tên */}
                    <Form.Field name="fullname" label="Họ và tên">
                        <Input
                            autoFocus
                            placeholder="Nguyễn Văn A"
                            class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                        />
                    </Form.Field>

                    {/* Row 2: Username + Phone */}
                    <div class="grid grid-cols-2 gap-3">
                        <Form.Field name="username" label="Tên đăng nhập" required>
                            <Input
                                placeholder="username"
                                class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white font-mono transition-colors"
                            />
                        </Form.Field>
                        <Form.Field name="phone" label="Số điện thoại">
                            <Input
                                placeholder="09xx xxx xxx"
                                class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                            />
                        </Form.Field>
                    </div>

                    {/* Row 3: Email */}
                    <Form.Field name="email" label="Email" required>
                        <Input
                            type="email"
                            placeholder="ten@example.com"
                            class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                        />
                    </Form.Field>

                    {/* Divider */}
                    <div class="flex items-center gap-3 py-1">
                        <div class="flex-1 h-px bg-gray-100" />
                        <span class="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Bảo mật</span>
                        <div class="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* Row 4: Password */}
                    <Form.Field name="password" label="Mật khẩu" required>
                        <InputPassword
                            placeholder="Tối thiểu 8 ký tự"
                            class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                        />
                    </Form.Field>

                    <Form.Field name="confirmPassword" label="Xác nhận mật khẩu" required>
                        <InputPassword
                            placeholder="Nhập lại mật khẩu"
                            class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors"
                        />
                    </Form.Field>

                    <Form.Error class="text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg" />

                    {/* Submit */}
                    <Button
                        wide main submit
                        class="h-12 w-full rounded-xl font-bold text-base mt-1 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
                        label="Tạo tài khoản"
                        loading={submitting()}
                    />
                </Form.Fieldset>
            </Form>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <div class="mt-6 text-center space-y-2">
                <p class="text-sm text-gray-500">
                    Đã có tài khoản?{' '}
                    <button
                        onClick={() => navigateToPage('merchantAuth.login')}
                        class="text-violet-600 font-semibold hover:underline"
                    >
                        Đăng nhập
                    </button>
                </p>
                <p class="text-xs text-gray-400">
                    Có mã mời?{' '}
                    <button
                        onClick={() => navigateToPage('merchantAuth.registerByInvite')}
                        class="text-indigo-500 font-semibold hover:underline"
                    >
                        Đăng ký với invite code
                    </button>
                </p>
            </div>

          </Show>
        </AuthLayout>
    );
}