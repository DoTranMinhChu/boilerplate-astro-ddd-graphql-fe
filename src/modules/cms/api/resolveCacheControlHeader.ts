/**
 * Cache-Control cho các trang CMS công khai (item 3.14 audit Group 3).
 *
 * Bối cảnh triển khai (xác nhận qua Dockerfile, KHÔNG phải giả định): mục tiêu deploy thật của dự
 * án là container Node tự host (`ENV DEPLOY_TARGET=node`, runtime chạy
 * `node ./dist/server/entry.mjs` trong `node:22-alpine`), KHÔNG PHẢI Vercel — `@astrojs/vercel`
 * chỉ tồn tại như một adapter option có thể cấu hình (qua `VERCEL`/`DEPLOY_TARGET=vercel`) nhưng
 * hiện đang DORMANT: không có gì trong Dockerfile/CI thật sự build/deploy qua nó. Vì vậy header
 * này là một `Cache-Control` chuẩn, KHÔNG gắn với cơ chế ISR đặc thù của Vercel — để bất kỳ
 * edge/reverse-proxy/CDN nào đặt trước container Node đều có thể tận dụng.
 *
 * Sau fix SSR `network-only` (Group 0, xem `graphql.ts`/`base.service.ts`), MỌI request server-side
 * đã tự re-fetch dữ liệu app-layer mới nhất — header này KHÔNG thay thế cơ chế đó, mà chỉ mở thêm
 * một cửa sổ "cũ có giới hạn" (60s) ở tầng HTTP, thuần để hấp thụ tải các request lặp lại tại tầng
 * edge/proxy phía trước server thật, cộng thêm 300s `stale-while-revalidate` để trình duyệt/CDN có
 * thể phục vụ bản cache cũ trong lúc âm thầm revalidate ở nền.
 *
 * Trade-off đã biết: một bản publish/edit mới có thể mất tới ~60s (cộng thời gian revalidate nền)
 * mới hiển thị qua một CDN/proxy tôn trọng header này — đây là trade-off được chấp nhận có chủ đích
 * của header này, KHÔNG phải regression từ fix SSR `network-only`.
 *
 * Chỉ áp dụng cho 2 file public route (`src/pages/index.astro`, `src/pages/[...path].astro`), và
 * chỉ trên success path (không set trên response 404/redirect — tránh một intermediary cache lại
 * một 404/redirect tạm thời quá lâu so với thời hạn hữu ích thật của nó). Cân nhắc đưa vào
 * `middleware.ts` đã bị loại bỏ: `isDashboard` dùng tín hiệu hostname trong khi routing dùng
 * path-prefix (2 tín hiệu có thể trôi lệch nhau), middleware chạy cho MỌI request (health check,
 * sitemap, trang auth) nên sẽ cần duy trì một exclusion-list riêng, còn cách scoped-vào-2-file này
 * không bao giờ vô tình cache nhầm một route cần auth trong tương lai.
 */
export function resolveCacheControlHeader(): string {
    return 'public, max-age=60, stale-while-revalidate=300';
}
