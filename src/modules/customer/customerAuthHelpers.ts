// src/modules/customer/customerAuthHelpers.ts
//
// Dùng chung cho LoginForm.tsx/RegisterForm.tsx (Phase 4 mục 3, Task 13) — tách ra sau khi review
// phát hiện 2 vấn đề khi 2 file đó tự lặp lại logic riêng:
//
// 1. Fix Critical: `afterLogin`/`afterAuth` cũ đọc `?redirect=` từ query string rồi gán thẳng vào
//    `window.location.href` KHÔNG validate — open redirect (`?redirect=https://evil.com`, trang
//    login/register tự trở thành trang phishing) VÀ nghiêm trọng hơn: `?redirect=javascript:...`
//    là 1 URL scheme hợp lệ với `location.href`, script bên trong THỰC THI ngay trong origin
//    thật, đúng lúc `token_CUSTOMER` vừa được ghi vào localStorage — exfiltrate token JWT được.
//    `safeRedirect` chỉ chấp nhận path nội bộ bắt đầu bằng "/" và KHÔNG bắt đầu bằng "//" (chặn
//    protocol-relative URL trỏ ra ngoài site, vd "//evil.com" trông giống path nhưng browser hiểu
//    là "https://evil.com").
// 2. Fix Important (race condition Google Identity Services): `onMount` cũ chỉ check
//    `window.google` MỘT LẦN — script GSI (`async defer`) và island Solid (`client:only`, dynamic
//    import) hoàn thành theo thứ tự KHÔNG xác định; nếu island hydrate TRƯỚC khi script GSI load
//    xong, nút Google KHÔNG BAO GIỜ hiện (không lỗi, không retry). Dùng hook chuẩn của Google
//    (`window.onGoogleLibraryLoad`) làm fallback khi `window.google` chưa có lúc mount.
import { TokenManager } from '@/shared/helpers/token.helper';
import { EAccountType } from '@/shared/types/auth.type';

declare global {
    interface Window {
        google?: any;
        onGoogleLibraryLoad?: () => void;
    }
}

/** Chỉ chấp nhận path nội bộ bắt đầu bằng "/" và KHÔNG bắt đầu bằng "//" (chặn protocol-relative
 * URL) — mọi giá trị khác (URL tuyệt đối, `javascript:`, `data:`, ...) rơi về "/". */
export function safeRedirect(raw: string | null): string {
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return '/';
}

/** Gọi sau khi `loginCustomer`/`registerCustomer`/`loginCustomerWithGoogle` trả token thành công —
 * lưu session Customer + điều hướng an toàn theo `?redirect=` (nếu có, đã validate qua
 * `safeRedirect`). */
export function afterCustomerAuth(token: string): void {
    TokenManager.setToken(EAccountType.CUSTOMER, token);
    TokenManager.setActiveType(EAccountType.CUSTOMER);
    const redirect = safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
    window.location.href = redirect;
}

/** Khởi tạo + render nút "Đăng nhập/Đăng ký bằng Google" — chờ đúng cách nếu script GSI chưa load
 * xong lúc mount (xem giải thích #2 ở đầu file), KHÔNG hiện gì nếu `clientId` rỗng (đã ẩn nút ở
 * tầng JSX qua `<Show when={!!clientId}>`, hàm này chỉ lo phần khởi tạo/gắn callback). */
export function initGoogleSignIn(options: {
    clientId: string | undefined;
    buttonElId: string;
    signup?: boolean;
    onCredential: (idToken: string) => void | Promise<void>;
}): void {
    const { clientId, buttonElId, signup, onCredential } = options;
    if (!clientId) return;

    const render = () => {
        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: { credential: string }) => onCredential(response.credential),
        });
        const el = document.getElementById(buttonElId);
        if (el) {
            window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: 320, ...(signup ? { text: 'signup_with' } : {}) });
        }
    };

    if (window.google) {
        render();
    } else {
        // Script GSI (`<script async defer>`) chưa load xong lúc component mount -- đăng ký hook
        // chuẩn của Google, tự gọi lại khi script load xong (không polling/setInterval).
        window.onGoogleLibraryLoad = render;
    }
}
