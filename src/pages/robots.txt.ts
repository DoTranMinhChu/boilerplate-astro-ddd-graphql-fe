import type { APIRoute } from 'astro';

/** robots.txt động — trước đây là file tĩnh trỏ nhầm sang "sitemap-index.xml" (không
 * tồn tại) và domain hardcode "example.com". Chuyển sang route động để Sitemap: luôn
 * khớp đúng route /sitemap.xml thật + domain thật lấy từ `site` config (env SITE_URL),
 * không phải sửa tay 2 nơi mỗi khi đổi domain. */
export const GET: APIRoute = ({ site }) => {
  const origin = (site?.toString() || 'https://example.com').replace(/\/$/, '');

  const body = `User-agent: *
Disallow: /admin
Disallow: /agency
Disallow: /tenant
Disallow: /merchant
Allow: /

Sitemap: ${origin}/sitemap.xml
`;

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
