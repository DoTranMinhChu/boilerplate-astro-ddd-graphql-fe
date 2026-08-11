// src/modules/customer/LoginForm.tsx
//
// Form đăng nhập Customer công khai (mật khẩu + Google OAuth2, Phase 4 mục 3, Task 13).
// Island độc lập, hydrate trên trang Astro `dang-nhap.astro` -- KHÔNG nằm trong SPA
// `<App client:only="solid-js">` dùng cho admin/merchant/agency/tenant, nên tự bọc
// <ToastProvider> để toast().danger/... thực sự có nơi render (không có Toaster nào
// khác được mount sẵn trên trang public này).
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

// Rỗng ở môi trường chưa cấu hình Google Cloud OAuth Client ID thật (xem README/.env.example) --
// PHẢI luôn kiểm tra truthy trước khi gọi bất kỳ API `window.google.accounts.*` nào, KHÔNG hiện
// nút rồi crash khi bấm, KHÔNG hiện nút disabled gây nhầm lẫn -- ẨN HẲN khi thiếu.
const googleClientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID as string | undefined;

export function LoginForm() {
    const [email, setEmail] = createSignal('');
    const [password, setPassword] = createSignal('');
    const [loading, setLoading] = createSignal(false);

    const afterLogin = (token: string) => {
        TokenManager.setToken(EAccountType.CUSTOMER, token);
        TokenManager.setActiveType(EAccountType.CUSTOMER);
        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
        window.location.href = redirect;
    };

    const handleLogin = async () => {
        if (!email() || !password()) {
            toast().danger('Vui lòng nhập đầy đủ email và mật khẩu.');
            return;
        }
        setLoading(true);
        try {
            const result = await CustomerService.loginCustomer({ data: { email: email(), password: password() } });
            if (!result?.token) throw new Error('Đăng nhập thất bại.');
            afterLogin(result.token);
        } catch (err) {
            toast().danger(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
        } finally {
            setLoading(false);
        }
    };

    onMount(() => {
        // Không có Client ID thật -> không đụng tới window.google, nút Google đã bị ẨN HẲN ở
        // phần render (Show when={!!googleClientId}) nên không có gì để gắn sự kiện vào cả.
        if (!googleClientId) return;
        if (!window.google) return; // script Google chưa load xong (chậm mạng/bị chặn) -- chỉ còn form password
        window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: { credential: string }) => {
                try {
                    const result = await CustomerService.loginCustomerWithGoogle({ idToken: response.credential });
                    if (!result?.token) throw new Error('Đăng nhập Google thất bại.');
                    afterLogin(result.token);
                } catch (err) {
                    toast().danger(err instanceof Error ? err.message : 'Đăng nhập Google thất bại.');
                }
            },
        });
        window.google.accounts.id.renderButton(document.getElementById('google-signin-btn'), { theme: 'outline', size: 'large', width: 320 });
    });

    return (
        <ToastProvider>
            <div class="flex flex-col gap-4 max-w-sm mx-auto">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <Input value={email()} onChange={(v) => setEmail(v)} placeholder="ban@example.com" type="email" class="h-11 w-full rounded-lg border-gray-200" autoComplete="username" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                    <InputPassword value={password()} onChange={(v) => setPassword(String(v))} placeholder="••••••••" class="h-11 w-full rounded-lg border-gray-200" autoComplete="current-password" />
                </div>
                <div class="text-right -mt-2">
                    <a href="/quen-mat-khau" class="text-sm text-violet-600 hover:underline">Quên mật khẩu?</a>
                </div>
                <Button wide main class="h-12 w-full text-base font-bold rounded-lg" loading={loading()} onClick={handleLogin} label="Đăng nhập" />

                <Show when={!!googleClientId}>
                    <div class="flex items-center gap-3 text-xs text-gray-400 my-1">
                        <div class="flex-1 h-px bg-gray-200" />
                        <span>hoặc</span>
                        <div class="flex-1 h-px bg-gray-200" />
                    </div>
                    <div id="google-signin-btn" class="flex justify-center" />
                </Show>

                <p class="text-center text-sm text-gray-500 mt-2">
                    Chưa có tài khoản?{' '}
                    <a href="/dang-ky" class="text-violet-600 font-semibold hover:underline">Đăng ký ngay</a>
                </p>
            </div>
        </ToastProvider>
    );
}
