// src/modules/tenant/pages/auth/registerStaff.page.tsx
//
// Nhân sự truy cập thẳng trang tenant có thể tự đăng ký tại đây.
// - Tạo tài khoản Merchant (identity dùng chung)
// - Đồng thời tự gửi "lời xin làm nhân sự" cho Tenant (nếu Tenant bật cho tự đăng ký)
//   → joinStatus: APPROVED (auto-duyệt) | PENDING (chờ chủ đơn vị duyệt) | NOT_ALLOWED

import { createEffect, createResource, createSignal, Show } from 'solid-js';
import { AuthLayout } from '@layouts/auth/AuthLayout';
import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { generateForm } from '@core/components/form/generateForm';
import { useRoutes } from '@shared/contexts/routes/RoutesContext';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { TenantStaffSettingService } from '@/shared/services/tenantStaffSetting/tenantStaffSetting.service';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';

type JoinStatus = 'APPROVED' | 'PENDING' | 'NOT_ALLOWED';

export function RegisterStaffPage() {
    const { navigateToPage, searchParams } = useRoutes();
    const auth = useAuth()!;

    const [tenantCode, setTenantCode] = createSignal((searchParams.code ?? '').trim());
    const [result, setResult] = createSignal<{ status: JoinStatus; message: string } | null>(null);

    // Tra cứu công khai thông tin tổ chức theo mã (tên + có mở đăng ký hay không)
    const [publicSetting] = createResource(
        () => tenantCode() || null,
        async (code) => {
            try {
                return await TenantStaffSettingService.getPublicTenantStaffSetting({ tenantCode: code });
            } catch {
                return null; // mã không hợp lệ
            }
        },
    );

    const { Form, submitting } = generateForm({
        handleSubmit: async (values) => {
            const code = (values.code ?? tenantCode()).trim();
            if (!code) throw new Error('Vui lòng nhập mã tổ chức');
            if (values.password !== values.confirmPassword) {
                throw new Error('Mật khẩu xác nhận không khớp');
            }

            const res = await MerchantService.registerAndJoinTenant({
                input: {
                    email: values.email?.trim(),
                    username: values.username?.trim(),
                    password: values.password,
                    fullname: values.fullname?.trim(),
                    phone: values.phone?.trim(),
                    tenantCode: code,
                },
            });

            if (!res?.token || !res?.merchant) throw new Error('Đăng ký thất bại');

            await auth.setMerchantAuthData(res.merchant, res.token);
            setResult({ status: (res.joinStatus as JoinStatus) ?? 'NOT_ALLOWED', message: res.joinMessage ?? '' });
            return { success: true };
        },
    });

    // Điều hướng sau khi hoàn tất
    const goToMemberships = () => navigateToPage('merchantDashboard.default');

    createEffect(() => {
        if (result()?.status === 'APPROVED') {
            toast().success('Bạn đã trở thành nhân sự của đơn vị!');
        }
    });

    return (
        <AuthLayout title="Đăng ký nhân sự">
            <Show
                when={!result()}
                fallback={
                    <ResultScreen result={result()!} onContinue={goToMemberships} />
                }
            >
                {/* ── Header ─────────────────────────────────────────────── */}
                <div class="mb-6 animate-fade-in">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                            <Icon name="heroicons-outline:user-plus" class="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 class="text-xl font-bold text-gray-900 leading-none">Đăng ký nhân sự</h1>
                            <p class="text-xs text-gray-400 mt-0.5">Tự tạo tài khoản & xin vào đơn vị</p>
                        </div>
                    </div>
                </div>

                <Form
                    class="w-full flex flex-col gap-y-4 animate-fade-in"
                    initialValues={{ code: tenantCode() }}
                    onChange={(values: any) => setTenantCode((values.code ?? '').trim())}
                >
                    <Form.Fieldset class="flex flex-col gap-y-4">

                        {/* Mã tổ chức + tra cứu */}
                        <Form.Field name="code" label="Mã tổ chức" required>
                            <Input
                                autoFocus={!tenantCode()}
                                placeholder="Nhập mã tổ chức..."
                                class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white font-mono transition-colors"
                            />
                        </Form.Field>

                        {/* Trạng thái tổ chức */}
                        <Show when={tenantCode()}>
                            <Show
                                when={!publicSetting.loading}
                                fallback={
                                    <div class="flex items-center gap-2 text-xs text-gray-400 -mt-2">
                                        <Icon name="svg-spinners:ring-resize" class="w-4 h-4" /> Đang kiểm tra...
                                    </div>
                                }
                            >
                                <Show
                                    when={publicSetting()}
                                    fallback={
                                        <div class="-mt-2 flex items-center gap-2 text-xs text-red-500">
                                            <Icon name="heroicons-outline:x-circle" class="w-4 h-4" />
                                            Không tìm thấy tổ chức với mã này
                                        </div>
                                    }
                                >
                                    {(s) => (
                                        <div class={`-mt-2 rounded-lg px-3 py-2 text-xs border flex items-start gap-2 ${s().allowSelfRegistration
                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                            : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                                            <Icon
                                                name={s().allowSelfRegistration ? 'heroicons-outline:building-office-2' : 'heroicons-outline:lock-closed'}
                                                class="w-4 h-4 mt-0.5 shrink-0"
                                            />
                                            <span>
                                                <span class="font-semibold">{s().tenantName}</span>
                                                {' — '}
                                                {s().allowSelfRegistration
                                                    ? 'Đang mở đăng ký nhân sự. Yêu cầu của bạn sẽ được gửi tới đơn vị.'
                                                    : 'Chưa mở đăng ký tự do. Bạn vẫn tạo được tài khoản nhưng cần được mời để vào đơn vị.'}
                                            </span>
                                        </div>
                                    )}
                                </Show>
                            </Show>
                        </Show>

                        <Form.Field name="fullname" label="Họ và tên">
                            <Input placeholder="Nguyễn Văn A" class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors" />
                        </Form.Field>

                        <div class="grid grid-cols-2 gap-3">
                            <Form.Field name="username" label="Tên đăng nhập" required>
                                <Input placeholder="username" class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white font-mono transition-colors" />
                            </Form.Field>
                            <Form.Field name="phone" label="Số điện thoại">
                                <Input placeholder="09xx xxx xxx" class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors" />
                            </Form.Field>
                        </div>

                        <Form.Field name="email" label="Email" required>
                            <Input type="email" placeholder="ten@example.com" class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors" />
                        </Form.Field>

                        <div class="flex items-center gap-3 py-1">
                            <div class="flex-1 h-px bg-gray-100" />
                            <span class="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Bảo mật</span>
                            <div class="flex-1 h-px bg-gray-100" />
                        </div>

                        <Form.Field name="password" label="Mật khẩu" required>
                            <InputPassword placeholder="Tối thiểu 8 ký tự" class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors" />
                        </Form.Field>
                        <Form.Field name="confirmPassword" label="Xác nhận mật khẩu" required>
                            <InputPassword placeholder="Nhập lại mật khẩu" class="h-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors" />
                        </Form.Field>

                        <Form.Error class="text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg" />

                        <Button
                            wide main submit
                            class="h-12 w-full rounded-xl font-bold text-base mt-1 shadow-md shadow-emerald-200 transition-all active:scale-[0.98]"
                            label="Đăng ký & gửi yêu cầu"
                            loading={submitting()}
                        />
                    </Form.Fieldset>
                </Form>

                <div class="mt-6 text-center">
                    <p class="text-sm text-gray-500">
                        Đã có tài khoản?{' '}
                        <button
                            onClick={() => navigateToPage('tenantAuth.login')}
                            class="text-emerald-600 font-semibold hover:underline"
                        >
                            Đăng nhập
                        </button>
                    </p>
                </div>
            </Show>
        </AuthLayout>
    );
}

// ─── Màn hình kết quả sau đăng ký ────────────────────────────────────────────

function ResultScreen(props: { result: { status: JoinStatus; message: string }; onContinue: () => void }) {
    const cfg = () => {
        switch (props.result.status) {
            case 'APPROVED':
                return {
                    icon: 'heroicons-solid:check-circle', color: 'text-emerald-500', bg: 'bg-emerald-50',
                    title: 'Đã vào đơn vị!', sub: 'Bạn đã được duyệt làm nhân sự.',
                };
            case 'PENDING':
                return {
                    icon: 'heroicons-outline:clock', color: 'text-amber-500', bg: 'bg-amber-50',
                    title: 'Đã gửi yêu cầu', sub: 'Đang chờ chủ đơn vị phê duyệt.',
                };
            default:
                return {
                    icon: 'heroicons-outline:information-circle', color: 'text-violet-500', bg: 'bg-violet-50',
                    title: 'Đã tạo tài khoản', sub: 'Đơn vị chưa mở đăng ký tự do — bạn cần được mời để vào.',
                };
        }
    };

    return (
        <div class="flex flex-col items-center text-center py-8 animate-fade-in">
            <div class={`w-16 h-16 rounded-2xl ${cfg().bg} flex items-center justify-center mb-5`}>
                <Icon name={cfg().icon} class={`w-9 h-9 ${cfg().color}`} />
            </div>
            <h1 class="text-xl font-bold text-gray-900">{cfg().title}</h1>
            <p class="text-sm text-gray-500 mt-1 max-w-xs">{props.result.message || cfg().sub}</p>
            <Button
                wide main
                class="h-12 w-full rounded-xl font-bold text-base mt-7"
                label="Tới trang của tôi"
                onClick={props.onContinue}
            />
        </div>
    );
}
