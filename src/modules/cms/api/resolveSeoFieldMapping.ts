import type { SeoData } from '@/modules/cms/cms.types';

const BOOLEAN_SEO_KEYS = new Set(['robotsIndex', 'robotsFollow']);
const NUMBER_SEO_KEYS = new Set(['sitemapPriority']);
// `structuredData` là OBJECT (JSON-LD), không phải string -> KHÔNG được ép qua String(raw)
// (sẽ tạo literal "[object Object]" sai hoàn toàn) — giữ nguyên giá trị thô.
const RAW_SEO_KEYS = new Set(['structuredData']);

/**
 * Resolve SEO hiệu lực cho 1 trang có `pageEntry` (block Chi tiết) — mục δ design
 * 2026-08-09-block-driven-content-binding-design.md. Với MỖI key trong `staticSeo`, nếu
 * `seoFieldMapping[key]` có set VÀ `entryData[mappedFieldKey]` có giá trị dùng được (không
 * null/undefined/'') -> dùng giá trị đó (ép kiểu theo key); còn lại giữ nguyên `staticSeo[key]`.
 * Không có `seoFieldMapping`/`entryData` (trang tĩnh, không có block Chi tiết) -> trả nguyên
 * `staticSeo`, không đụng gì — khớp hành vi TRƯỚC δ (page.seo tĩnh luôn thắng trên trang tĩnh).
 */
export function resolveSeoFieldMapping(
    staticSeo: SeoData | undefined,
    seoFieldMapping: Record<string, string> | undefined,
    entryData: Record<string, unknown> | undefined,
): SeoData | undefined {
    if (!staticSeo) return staticSeo;
    if (!seoFieldMapping || !entryData) return staticSeo;

    const result: SeoData = { ...staticSeo };
    for (const key of Object.keys(seoFieldMapping) as (keyof SeoData)[]) {
        const mappedFieldKey = seoFieldMapping[key];
        if (!mappedFieldKey) continue;
        const raw = entryData[mappedFieldKey];
        if (raw === undefined || raw === null || raw === '') continue;

        if (BOOLEAN_SEO_KEYS.has(key as string)) {
            (result as Record<string, unknown>)[key] = Boolean(raw);
        } else if (NUMBER_SEO_KEYS.has(key as string)) {
            const num = Number(raw);
            if (!Number.isNaN(num)) (result as Record<string, unknown>)[key] = num;
        } else if (RAW_SEO_KEYS.has(key as string)) {
            (result as Record<string, unknown>)[key] = raw;
        } else {
            (result as Record<string, unknown>)[key] = String(raw);
        }
    }
    return result;
}
