// src/modules/customer/ResetPasswordForm.tsx
//
// Form "Đặt lại mật khẩu" Customer công khai (Phase 4 mục 3, Task 13). Hydrate trên
// `dat-lai-mat-khau.astro`. Đọc `token` từ query string (link email thật do BE build --
// xem mail.service.ts: `${origin}/reset-password?token=...&type=customer`; trang
// `reset-password.astro` (dùng chung cho admin/merchant) tự redirect sang đây khi
// `type=customer`, xem comment trong file đó). Gọi
// `CustomerService.resetCustomerPasswordByToken({ token, newPassword })`.
import { createSignal, Show } from 'solid-js';
import { CustomerService } from '@/shared/services/customer/customer.service';
import { Button } from '@core/components/button/Button';
import { InputPassword } from '@core/components/control/InputPasssword';
import { toast, ToastProvider } from '@core/components/toast/ToastProvider';

export function ResetPasswordForm() {
    const token = () => new URLSearchParams(window.location.search).get('token') || '';

    const [newPassword, setNewPassword] = createSignal('');
    const [confirmPassword, setConfirmPassword] = createSignal('');
    const [loading, setLoading] = createSignal(false);
    const [success, setSuccess] = createSignal(false);

    const handleSubmit = async () => {
        if (!token()) {
            toast().danger('Link đặt lại mật khẩu không hợp lệ.');
            return;
        }
        if (newPassword().length < 6) {
            toast().danger('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        if (newPassword() !== confirmPassword()) {
            toast().danger('Mật khẩu nhập lại không khớp.');
            return;
        }
        setLoading(true);
        try {
            await CustomerService.resetCustomerPasswordByToken({ token: token(), newPassword: newPassword() });
            setSuccess(true);
        } catch (err) {
            toast().danger(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại. Link có thể đã hết hạn.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ToastProvider>
            <div class="flex flex-col gap-4 max-w-sm mx-auto">
                <Show
                    when={success()}
                    fallback={
                        <Show
                            when={!!token()}
                            fallback={
                                <div class="text-center space-y-4">
                                    <div class="bg-red-50 border border-red-200 rounded-xl p-4">
                                        <p class="text-sm text-red-700 font-medium">Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
                                    </div>
                                    <a href="/quen-mat-khau" class="text-sm text-violet-600 font-semibold hover:underline">Gửi lại link đặt lại mật khẩu</a>
                                </div>
                            }
                        >
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                                <InputPassword autoFocus value={newPassword()} onChange={(v) => setNewPassword(String(v))} placeholder="Ít nhất 6 ký tự" class="h-11 w-full rounded-lg border-gray-200" autoComplete="new-password" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Nhập lại mật khẩu mới</label>
                                <InputPassword value={confirmPassword()} onChange={(v) => setConfirmPassword(String(v))} placeholder="Nhập lại mật khẩu mới" class="h-11 w-full rounded-lg border-gray-200" autoComplete="new-password" />
                            </div>
                            <Button wide main class="h-12 w-full text-base font-bold rounded-lg" loading={loading()} onClick={handleSubmit} label="Đặt lại mật khẩu" />
                        </Show>
                    }
                >
                    <div class="text-center space-y-4">
                        <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                            <p class="text-sm text-green-700 font-medium">Đặt lại mật khẩu thành công.</p>
                        </div>
                        <Button href="/dang-nhap" nativeAnchor main class="h-12 px-8 text-base font-bold rounded-lg" label="Đăng nhập ngay" />
                    </div>
                </Show>
            </div>
        </ToastProvider>
    );
}
