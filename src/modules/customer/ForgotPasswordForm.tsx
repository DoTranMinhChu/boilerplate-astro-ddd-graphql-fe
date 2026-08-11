// src/modules/customer/ForgotPasswordForm.tsx
//
// Form "Quên mật khẩu" Customer công khai (Phase 4 mục 3, Task 13). Hydrate trên
// `quen-mat-khau.astro`. Gọi `CustomerService.requestCustomerPasswordReset` -- BE
// (customer.service.ts requestPasswordReset()) đã tự đảm bảo KHÔNG throw khi email
// không tồn tại (silent return, tránh lộ "email này có tồn tại hay không"). Ở đây FE
// còn CHỦ ĐỘNG bọc thêm 1 lớp: LUÔN hiện đúng 1 thông báo thành công chung cho MỌI
// trường hợp (kể cả khi mutation thật sự throw vì lý do hạ tầng khác, ví dụ SMTP chưa
// cấu hình) -- người dùng cuối không bao giờ thấy 2 kết quả khác nhau giữa "email tồn
// tại" và "email không tồn tại".
import { createSignal, Show } from 'solid-js';
import { CustomerService } from '@/shared/services/customer/customer.service';
import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { toast, ToastProvider } from '@core/components/toast/ToastProvider';

export function ForgotPasswordForm() {
    const [email, setEmail] = createSignal('');
    const [loading, setLoading] = createSignal(false);
    const [sent, setSent] = createSignal(false);

    const handleSubmit = async () => {
        if (!email()) {
            toast().danger('Vui lòng nhập email.');
            return;
        }
        setLoading(true);
        try {
            await CustomerService.requestCustomerPasswordReset({ email: email(), domain: window.location.origin });
        } catch {
            // Nuốt lỗi có chủ đích -- xem comment đầu file. Không phân biệt input hợp lệ hay
            // không tồn tại, không phân biệt lỗi hạ tầng (mail chưa cấu hình) với thành công.
        } finally {
            setLoading(false);
            setSent(true);
        }
    };

    return (
        <ToastProvider>
            <div class="flex flex-col gap-4 max-w-sm mx-auto">
                <Show
                    when={!sent()}
                    fallback={
                        <div class="text-center space-y-4">
                            <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                                <p class="text-sm text-green-700 font-medium">
                                    Nếu email này có trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.
                                </p>
                                <p class="text-xs text-green-600 mt-1">Vui lòng kiểm tra hộp thư (kể cả mục spam).</p>
                            </div>
                            <a href="/dang-nhap" class="text-sm text-violet-600 font-semibold hover:underline">Quay lại đăng nhập</a>
                        </div>
                    }
                >
                    <p class="text-sm text-gray-500 -mt-2">Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <Input value={email()} onChange={(v) => setEmail(v)} placeholder="ban@example.com" type="email" class="h-11 w-full rounded-lg border-gray-200" autoComplete="username" />
                    </div>
                    <Button wide main class="h-12 w-full text-base font-bold rounded-lg" loading={loading()} onClick={handleSubmit} label="Gửi link đặt lại mật khẩu" />
                    <a href="/dang-nhap" class="text-center text-sm text-gray-400 hover:text-gray-600 mt-2">Quay lại đăng nhập</a>
                </Show>
            </div>
        </ToastProvider>
    );
}
