import { describe, it, expect } from 'vitest';
import { resolveSeoFieldMapping } from '../resolveSeoFieldMapping';
import type { SeoData } from '@/modules/cms/cms.types';

// Ghi chú: `SeoData` (GetOutput<typeof CrudService.seoFragment>) có 12 key BẮT BUỘC tồn tại
// (giá trị có thể `undefined` nhưng key phải có mặt — đặc điểm mapped type của typed-graphql-
// builder, KHÁC `Partial<>`). Test literal chỉ set vài field cho gọn -> cast `as SeoData` để
// khớp type, không đổi hành vi runtime (staticSeo thật từ GraphQL luôn đủ 11 key).

describe('resolveSeoFieldMapping', () => {
    it('không có seoFieldMapping (trang tĩnh) -> trả nguyên staticSeo', () => {
        const staticSeo = { title: 'Tiêu đề tĩnh', description: 'Mô tả tĩnh' } as SeoData;
        const result = resolveSeoFieldMapping(staticSeo, undefined, { tieuDe: 'Bài viết A' });
        expect(result).toEqual(staticSeo);
    });

    it('không có entryData (trang tĩnh dù có mapping) -> trả nguyên staticSeo', () => {
        const staticSeo = { title: 'Tiêu đề tĩnh' } as SeoData;
        const result = resolveSeoFieldMapping(staticSeo, { title: 'tieuDe' }, undefined);
        expect(result).toEqual(staticSeo);
    });

    it('có mapping + entryData có giá trị -> dùng giá trị field (string field)', () => {
        const result = resolveSeoFieldMapping(
            { title: 'Tĩnh', ogImage: '/static.jpg' } as SeoData,
            { title: 'tieuDe', ogImage: 'anhDaiDien' },
            { tieuDe: 'Bài viết A', anhDaiDien: '/uploads/a.jpg' },
        );
        expect(result!.title).toBe('Bài viết A');
        expect(result!.ogImage).toBe('/uploads/a.jpg');
    });

    it('mapping tới field rỗng/undefined -> fallback staticSeo', () => {
        const result = resolveSeoFieldMapping(
            { title: 'Tĩnh' } as SeoData,
            { title: 'tieuDe' },
            { tieuDe: '' },
        );
        expect(result!.title).toBe('Tĩnh');
    });

    it('robotsIndex/robotsFollow ép kiểu boolean', () => {
        const result = resolveSeoFieldMapping(
            { robotsIndex: true } as SeoData,
            { robotsIndex: 'anHien' },
            { anHien: false },
        );
        expect(result!.robotsIndex).toBe(false);
    });

    it('sitemapPriority ép kiểu number, giá trị không hợp lệ -> fallback staticSeo', () => {
        const result = resolveSeoFieldMapping(
            { sitemapPriority: 0.5 } as SeoData,
            { sitemapPriority: 'doUuTien' },
            { doUuTien: 'không phải số' },
        );
        expect(result!.sitemapPriority).toBe(0.5);
    });

    it('field KHÔNG có trong mapping -> fallback staticSeo cho riêng field đó (không ảnh hưởng field khác)', () => {
        const result = resolveSeoFieldMapping(
            { title: 'Tĩnh', description: 'Mô tả tĩnh' } as SeoData,
            { title: 'tieuDe' },
            { tieuDe: 'Bài viết A', moTa: 'Mô tả entry' },
        );
        expect(result!.title).toBe('Bài viết A');
        expect(result!.description).toBe('Mô tả tĩnh');
    });

    it('Fix I1 (δ final review): structuredData giữ nguyên OBJECT, không bị ép thành String (tránh "[object Object]")', () => {
        const structuredDataFromEntry = { '@context': 'https://schema.org', '@type': 'Product', name: 'Sản phẩm A' };
        const result = resolveSeoFieldMapping(
            { structuredData: undefined } as SeoData,
            { structuredData: 'jsonLd' },
            { jsonLd: structuredDataFromEntry },
        );
        expect(result!.structuredData).toBe(structuredDataFromEntry);
        expect(result!.structuredData).not.toBe('[object Object]');
    });
});
