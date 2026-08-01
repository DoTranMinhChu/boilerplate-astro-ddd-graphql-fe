import { useLocation } from '@solidjs/router';

/**
 * Parase 2 — base path theo ngữ cảnh hiện tại: '/agency' hoặc '/tenant'.
 *
 * Các page Tenant được tái sử dụng nguyên vẹn ở giao diện Agency, nên mọi điều
 * hướng tuyệt đối phải bám theo prefix hiện tại (đừng hardcode '/tenant').
 */
export function useOrgRouteBase(): () => string {
    const loc = useLocation();
    return () => (loc.pathname.startsWith('/agency') ? '/agency' : '/tenant');
}

/**
 * Bản không-hook: đọc window.location tại thời điểm gọi. Dùng cho href tĩnh /
 * callback ngoài scope component. SSR fallback về '/tenant'.
 */
export function orgRouteBase(): string {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/agency')) {
        return '/agency';
    }
    return '/tenant';
}
