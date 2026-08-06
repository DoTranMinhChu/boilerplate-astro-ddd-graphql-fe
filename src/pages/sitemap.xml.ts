import type { APIRoute } from 'astro';
import { PageService } from '@/shared/services/page/page.service';

/** sitemap.xml động — mọi trang tĩnh + entry của trang Chi tiết đang publish, trừ
 * URL nào admin đặt robotsIndex=false (xem PageResolver.getSitemapUrls). `Astro.site`
 * (config `site` trong astro.config.mjs, từ env SITE_URL) làm gốc cho URL tuyệt đối —
 * bắt buộc với sitemap chuẩn, không dùng URL tương đối. */
export const GET: APIRoute = async ({ site }) => {
  const urls = (await PageService.getSitemapUrls().catch(() => [])) || [];
  const origin = (site?.toString() || 'https://example.com').replace(/\/$/, '');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => {
    if (!u?.path) return '';
    const loc = `${origin}${u.path}`;
    const lastmod = u.updatedAt ? `\n    <lastmod>${new Date(u.updatedAt).toISOString()}</lastmod>` : '';
    const changefreq = u.changeFreq ? `\n    <changefreq>${escapeXml(u.changeFreq)}</changefreq>` : '';
    const priority = u.priority !== undefined && u.priority !== null ? `\n    <priority>${u.priority}</priority>` : '';
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
  }).filter(Boolean).join('\n')}
</urlset>`;

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}
