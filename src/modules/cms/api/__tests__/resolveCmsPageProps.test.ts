import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCmsPageProps } from '../resolveCmsPageProps';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { PageService } from '@/shared/services/page/page.service';
import { NodeService } from '@/shared/services/node/node.service';

vi.mock('@/shared/services/contentEntry/contentEntry.service');
vi.mock('@/shared/services/contentType/contentType.service');
vi.mock('@/shared/services/page/page.service');
vi.mock('@/shared/services/node/node.service');

describe('resolveCmsPageProps — availableTranslations (Phase 3 mục 3, Task 15)', () => {
    beforeEach(() => vi.resetAllMocks());

    it('page có translationGroupId -> gọi getPageTranslations(translationGroupId, excludeLocale=resolved.locale) và trả kết quả vào availableTranslations', async () => {
        (PageService.pageResolver as any).mockResolvedValue({
            page: { id: 'page-1', translationGroupId: 'group-1', path: '/gioi-thieu', seo: {} },
            seo: {},
            locale: 'vi',
        });
        (PageService.getPageTranslations as any).mockResolvedValue([{ locale: 'en', path: '/en/gioi-thieu' }]);

        const result = await resolveCmsPageProps('/gioi-thieu');

        expect(PageService.getPageTranslations).toHaveBeenCalledWith({ translationGroupId: 'group-1', excludeLocale: 'vi' });
        expect(result?.availableTranslations).toEqual([{ locale: 'en', path: '/en/gioi-thieu' }]);
    });

    it('page KHÔNG có translationGroupId -> KHÔNG gọi getPageTranslations, availableTranslations = []', async () => {
        (PageService.pageResolver as any).mockResolvedValue({
            page: { id: 'page-1', path: '/gioi-thieu', seo: {} },
            seo: {},
            locale: 'vi',
        });

        const result = await resolveCmsPageProps('/gioi-thieu');

        expect(PageService.getPageTranslations).not.toHaveBeenCalled();
        expect(result?.availableTranslations).toEqual([]);
    });

    it('pageResolver trả null -> 404 sớm, không gọi getPageTranslations', async () => {
        (PageService.pageResolver as any).mockResolvedValue(null);

        const result = await resolveCmsPageProps('/khong-ton-tai');

        expect(result).toBeNull();
        expect(PageService.getPageTranslations).not.toHaveBeenCalled();
    });
});

describe('resolveCmsPageProps — pageEntry từ Page.dataBinding (Phase 0 M3a)', () => {
    beforeEach(() => vi.resetAllMocks());

    it('page có dataBinding mode="detail" -> gọi getPublicContentEntries với limit=1 và filter đã resolve theo pathParam, pageEntry = entry tìm được', async () => {
        (PageService.pageResolver as any).mockResolvedValue({
            page: {
                id: 'page-1', path: '/bai-viet/:slug', seo: {},
                dataBinding: {
                    mode: 'detail', contentTypeId: 'ct-bai-viet',
                    genericFilters: [{ field: 'slug', valueSource: 'pathParam', paramName: 'slug' }],
                },
            },
            params: { slug: 'bai-viet-a' },
            seo: {},
            locale: 'vi',
        });
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValue([
            { id: 'entry-1', contentTypeId: 'ct-bai-viet', data: { slug: 'bai-viet-a', tieuDe: 'Bài A' } },
        ]);

        const result = await resolveCmsPageProps('/bai-viet/bai-viet-a');

        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(
            expect.objectContaining({
                contentTypeId: 'ct-bai-viet',
                limit: 1,
                filters: [{ field: 'slug', operator: '$eq', value: 'bai-viet-a' }],
            }),
        );
        expect(result?.pageEntry).toEqual({ id: 'entry-1', contentTypeId: 'ct-bai-viet', data: { slug: 'bai-viet-a', tieuDe: 'Bài A' } });
    });

    it('page có dataBinding mode="detail" nhưng KHÔNG tìm thấy entry nào khớp -> trả null (404), giữ đúng hành vi cũ', async () => {
        (PageService.pageResolver as any).mockResolvedValue({
            page: {
                id: 'page-1', path: '/bai-viet/:slug', seo: {},
                dataBinding: {
                    mode: 'detail', contentTypeId: 'ct-bai-viet',
                    genericFilters: [{ field: 'slug', valueSource: 'pathParam', paramName: 'slug' }],
                },
            },
            params: { slug: 'khong-ton-tai' },
            seo: {},
            locale: 'vi',
        });
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValue([]);

        const result = await resolveCmsPageProps('/bai-viet/khong-ton-tai');

        expect(result).toBeNull();
    });

    it('page KHÔNG có dataBinding (trang tĩnh) -> KHÔNG gọi getPublicContentEntries để tìm pageEntry, pageEntry undefined', async () => {
        (PageService.pageResolver as any).mockResolvedValue({
            page: { id: 'page-1', path: '/gioi-thieu', seo: {} },
            seo: {},
            locale: 'vi',
        });

        const result = await resolveCmsPageProps('/gioi-thieu');

        expect(ContentEntryService.getPublicContentEntries).not.toHaveBeenCalled();
        expect(result?.pageEntry).toBeUndefined();
    });

    // Final whole-branch review fix Critical #1: mọi filter của genericFilters đều KHÔNG resolve
    // được giá trị (vd valueSource='pathParam' nhưng URL hiện tại không có param đó) -> PHẢI trả
    // null (404), KHÔNG được gửi query rỗng-filter (sẽ "trúng số" 1 entry tuỳ ý của content type).
    it('page có dataBinding mode="detail" nhưng filter KHÔNG resolve được giá trị nào (thiếu pathParam) -> trả null (404), KHÔNG gọi getPublicContentEntries với filters rỗng', async () => {
        (PageService.pageResolver as any).mockResolvedValue({
            page: {
                id: 'page-1', path: '/bai-viet/:slug', seo: {},
                dataBinding: {
                    mode: 'detail', contentTypeId: 'ct-bai-viet',
                    genericFilters: [{ field: 'slug', valueSource: 'pathParam', paramName: 'slugKhongTonTai' }],
                },
            },
            params: { slug: 'bai-viet-a' },
            seo: {},
            locale: 'vi',
        });

        const result = await resolveCmsPageProps('/bai-viet/bai-viet-a');

        expect(result).toBeNull();
        expect(ContentEntryService.getPublicContentEntries).not.toHaveBeenCalled();
    });
});

describe('resolveCmsPageProps — nodeTree build gated by rootNodeId only (M3b: flag removed)', () => {
    beforeEach(() => vi.resetAllMocks());

    it('page KHÔNG có rootNodeId -> nodeTree undefined, KHÔNG gọi NodeService.getNodesByPage', async () => {
        (PageService.pageResolver as any).mockResolvedValue({
            page: { id: 'page-1', path: '/gioi-thieu', rootNodeId: null, seo: {} },
            seo: {},
            locale: 'vi',
        });

        const result = await resolveCmsPageProps('/gioi-thieu');

        expect(NodeService.getNodesByPage).not.toHaveBeenCalled();
        expect(result?.nodeTree).toBeUndefined();
    });

    it('page CÓ rootNodeId -> gọi NodeService.getNodesByPage với đúng pageId, nodeTree = kết quả buildNodeTree(...)', async () => {
        (PageService.pageResolver as any).mockResolvedValue({
            page: { id: 'page-1', path: '/gioi-thieu', rootNodeId: 'node-root-1', seo: {} },
            seo: {},
            locale: 'vi',
        });
        (NodeService.getNodesByPage as any).mockResolvedValue([
            { id: 'node-root-1', parentId: null, order: 0, type: 'CONTAINER' },
            { id: 'node-child-1', parentId: 'node-root-1', order: 0, type: 'TEXT' },
        ]);

        const result = await resolveCmsPageProps('/gioi-thieu');

        expect(NodeService.getNodesByPage).toHaveBeenCalledWith({ pageId: 'page-1' });
        expect(result?.nodeTree).toEqual([
            expect.objectContaining({
                id: 'node-root-1',
                children: [expect.objectContaining({ id: 'node-child-1', children: [] })],
            }),
        ]);
    });
});

// Final-review fix Important #2: `CmsPageProps.locale` phải phản chiếu đúng `resolved.locale`
// (giá trị đã dùng cho mọi query ContentEntry khác trong hàm này) -- CmsPageShell.astro thread
// field này vào NodeRenderContext.locale để NodeRenderer.tsx's fetchRepeatEntries lọc đúng
// locale, tránh trộn lẫn entry mọi locale trong 1 nhóm dịch vào cùng 1 node repeat.
describe('resolveCmsPageProps — locale threading (final-review fix Important #2)', () => {
    beforeEach(() => vi.resetAllMocks());

    it('trả về locale = resolved.locale (cùng giá trị đã dùng cho mọi query ContentEntry khác)', async () => {
        (PageService.pageResolver as any).mockResolvedValue({
            page: { id: 'page-1', path: '/gioi-thieu', seo: {} },
            seo: {},
            locale: 'en',
        });

        const result = await resolveCmsPageProps('/gioi-thieu');

        expect(result?.locale).toBe('en');
    });
});
