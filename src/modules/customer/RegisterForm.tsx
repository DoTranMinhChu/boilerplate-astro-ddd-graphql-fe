// src/modules/customer/RegisterForm.tsx
//
// Form đăng ký Customer công khai (mật khẩu + Google OAuth2, Phase 4 mục 3, Task 13).
// Mirror LoginForm.tsx -- xem file đó cho giải thích chi tiết về ToastProvider tự bọc
// + cách ẩn nút Google khi thiếu PUBLIC_GOOGLE_CLIENT_ID.
import { createSignal, onMount, Show } from 'solid-js';
import { CustomerService } from '@/shared/services/customer/customer.service';
import { TokenManager } from '@/shared/helpers/token.helper';
import { EAccountType } from '@/shared/types/auth.type';
import { Button } from '@core/components/button/Button';
import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { toast, ToastProvider } from '@core/components/toast/ToastProvider';

declare global {
    interface Window { google?: any; }
}

const googleClientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID as string | undefined;

export function RegisterForm() {
    const [fullname, setFullname] = createSignal('');
    const [email, setEmail] = createSignal('');
    const [phone, setPhone] = createSignal('');
    const [password, setPassword] = createSignal('');
    const [confirmPassword, setConfirmPassword] = createSignal('');
    const [loading, setLoading] = createSignal(false);

    const afterAuth = (token: string) => {
        TokenManager.setToken(EAccountType.CUSTOMER, token);
        TokenManager.setActiveType(EAccountType.CUSTOMER);
        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
        window.location.href = redirect;
    };

    const handleRegister = async () => {
        if (!email() || !password()) {
            toast().danger('Vui lòng nhập đầy đủ email và mật khẩu.');
            return;
        }
        if (password().length < 6) {
            toast().danger('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }
        if (password() !== confirmPassword()) {
            toast().danger('Mật khẩu nhập lại không khớp.');
            return;
        }
        setLoading(true);
        try {
            const result = await CustomerService.registerCustomer({
                data: {
                    email: email(),
                    password: password(),
                    fullname: fullname() || undefined,
                    phone: phone() || undefined,
                },
            });
            if (!result?.token) throw new Error('Đăng ký thất bại.');
            toast().success('Đăng ký thành công!');
            afterAuth(result.token);
        } catch (err) {
            toast().danger(err instanceof Error ? err.message : 'Đăng ký thất bại.');
        } finally {
            setLoading(false);
        }
    };

    onMount(() => {
        if (!googleClientId) return;
        if (!window.google) return;
        window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: { credential: string }) => {
                try {
                    const result = await CustomerService.loginCustomerWithGoogle({ idToken: response.credential });
                    if (!result?.token) throw new Error('Đăng ký/Đăng nhập Google thất bại.');
                    afterAuth(result.token);
                } catch (err) {
                    toast().danger(err instanceof Error ? err.message : 'Đăng ký/Đăng nhập Google thất bại.');
                }
            },
        });
        window.google.accounts.id.renderButton(document.getElementById('google-signup-btn'), { theme: 'outline', size: 'large', width: 320, text: 'signup_with' });
    });

    return (
        <ToastProvider>
            <div class="flex flex-col gap-4 max-w-sm mx-auto">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                    <Input value={fullname()} onChange={(v) => setFullname(v)} placeholder="Nguyễn Văn A" class="h-11 w-full rounded-lg border-gray-200" autoComplete="name" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <Input value={email()} onChange={(v) => setEmail(v)} placeholder="ban@example.com" type="email" class="h-11 w-full rounded-lg border-gray-200" autoComplete="username" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <Input value={phone()} onChange={(v) => setPhone(v)} placeholder="09xxxxxxxx" type="tel" class="h-11 w-full rounded-lg border-gray-200" autoComplete="tel" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                    <InputPassword value={password()} onChange={(v) => setPassword(String(v))} placeholder="Ít nhất 6 ký tự" class="h-11 w-full rounded-lg border-gray-200" autoComplete="new-password" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nhập lại mật khẩu</label>
                    <InputPassword value={confirmPassword()} onChange={(v) => setConfirmPassword(String(v))} placeholder="Nhập lại mật khẩu" class="h-11 w-full rounded-lg border-gray-200" autoComplete="new-password" />
                </div>
                <Button wide main class="h-12 w-full text-base font-bold rounded-lg" loading={loading()} onClick={handleRegister} label="Đăng ký" />

                <Show when={!!googleClientId}>
                    <div class="flex items-center gap-3 text-xs text-gray-400 my-1">
                        <div class="flex-1 h-px bg-gray-200" />
                        <span>hoặc</span>
                        <div class="flex-1 h-px bg-gray-200" />
                    </div>
                    <div id="google-signup-btn" class="flex justify-center" />
                </Show>

                <p class="text-center text-sm text-gray-500 mt-2">
                    Đã có tài khoản?{' '}
                    <a href="/dang-nhap" class="text-violet-600 font-semibold hover:underline">Đăng nhập</a>
                </p>
            </div>
        </ToastProvider>
    );
}
