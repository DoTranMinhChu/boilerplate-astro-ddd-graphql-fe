import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveRelationDisplays, resolveTaxonomyDisplays, resolveCmsPageProps } from '../resolveCmsPageProps';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { PageService } from '@/shared/services/page/page.service';
import { TermService } from '@/shared/services/term/term.service';
import { NodeService } from '@/shared/services/node/node.service';

vi.mock('@/shared/services/contentEntry/contentEntry.service');
vi.mock('@/shared/services/contentType/contentType.service');
vi.mock('@/shared/services/page/page.service');
vi.mock('@/shared/services/term/term.service');
vi.mock('@/shared/services/node/node.service');

describe('resolveRelationDisplays — quét vào itemFields của REPEATER (mục E.1)', () => {
    beforeEach(() => vi.resetAllMocks());

    it('field RELATION lồng trong REPEATER được join đúng tên, key dạng "repeaterKey.index.subKey"', async () => {
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValue([
            { id: 'du-an-1', data: { tenDuAn: 'Dự Án Alpha', slug: 'du-an-alpha' } },
        ]);
        (ContentTypeService.getOneContentType as any).mockResolvedValue({
            fields: [{ key: 'tenDuAn', type: 'TEXT' }],
        });
        (PageService.getPublicDetailPathByContentType as any).mockResolvedValue({
            path: '/du-an/:slug', bindings: [{ paramName: 'slug', fieldKey: 'slug' }],
        });

        const fields = [
            {
                key: 'lienKet', type: 'REPEATER', itemFields: [
                    { key: 'duAnLienQuan', type: 'RELATION', relationTarget: 'ct-du-an' },
                ],
            },
        ] as any;
        const data = { lienKet: [{ duAnLienQuan: 'du-an-1' }] };

        const result = await resolveRelationDisplays(fields, data);
        expect(result['lienKet.0.duAnLienQuan']).toEqual([
            { id: 'du-an-1', label: 'Dự Án Alpha', href: '/du-an/du-an-alpha' },
        ]);
    });

    it('field RELATION cấp cao nhất vẫn hoạt động y hệt trước (không regression)', async () => {
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValue([{ id: 'e1', data: { tieuDe: 'X' } }]);
        (ContentTypeService.getOneContentType as any).mockResolvedValue({ fields: [{ key: 'tieuDe', type: 'TEXT' }] });
        (PageService.getPublicDetailPathByContentType as any).mockResolvedValue(null);

        const fields = [{ key: 'lienQuan', type: 'RELATION', relationTarget: 'ct-x' }] as any;
        const result = await resolveRelationDisplays(fields, { lienQuan: 'e1' });
        expect(result['lienQuan']).toEqual([{ id: 'e1', label: 'X', href: undefined }]);
    });

    // Fix Important (Task 16 re-review): lookup entry bằng `ids` tường minh (giá trị field
    // RELATION) KHÔNG truyền locale -- 1 id đã là selector duy nhất, lọc thêm locale chỉ khiến
    // "join" RỖNG khi entry đích chưa có bản dịch cùng locale. `locale` VẪN truyền cho
    // getPublicDetailPathByContentType (build href tới đúng page-locale, không phải lookup entry).
    it('KHÔNG truyền locale xuống getPublicContentEntries (ids tường minh), NHƯNG vẫn truyền cho getPublicDetailPathByContentType', async () => {
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValue([{ id: 'e1', data: { tieuDe: 'X' } }]);
        (ContentTypeService.getOneContentType as any).mockResolvedValue({ fields: [{ key: 'tieuDe', type: 'TEXT' }] });
        (PageService.getPublicDetailPathByContentType as any).mockResolvedValue(null);

        const fields = [{ key: 'lienQuan', type: 'RELATION', relationTarget: 'ct-x' }] as any;
        await resolveRelationDisplays(fields, { lienQuan: 'e1' }, 'en');

        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith({ contentTypeId: 'ct-x', ids: ['e1'] });
        expect(PageService.getPublicDetailPathByContentType).toHaveBeenCalledWith({ contentTypeId: 'ct-x', locale: 'en' });
    });
});

describe('resolveTaxonomyDisplays — quét vào itemFields của REPEATER (mục E.1)', () => {
    beforeEach(() => vi.resetAllMocks());

    it('field TAXONOMY lồng trong REPEATER được join đúng nhãn Term, key dạng "repeaterKey.index.subKey"', async () => {
        (TermService.getAllTerm as any).mockResolvedValue({
            edges: [{ node: { id: 'term-1', label: 'Ẩm thực' } }],
        });

        const fields = [
            {
                key: 'muc', type: 'REPEATER', itemFields: [
                    { key: 'danhMuc', type: 'TAXONOMY', taxonomyId: 'tax-1' },
                ],
            },
        ] as any;
        const data = { muc: [{ danhMuc: 'term-1' }] };

        const result = await resolveTaxonomyDisplays(fields, data);
        expect(result['muc.0.danhMuc']).toEqual([{ id: 'term-1', label: 'Ẩm thực' }]);
    });
});

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

describe('resolveCmsPageProps — resolveRelationDisplays (Critical #1 fix Task 16 review + Important fix Task 16 re-review)', () => {
    beforeEach(() => vi.resetAllMocks());

    // Fix Important (Task 16 re-review): getPublicContentEntries (lookup theo `ids` tường minh
    // của field RELATION) KHÔNG nhận locale -- id đã là selector duy nhất. getPublicDetailPathByContentType
    // (build href tới đúng page-locale của content type đích) VẪN nhận resolved.locale -- 2 lớp
    // khác nhau, chỉ lớp sau cần locale.
    it('pageEntry có field RELATION -> getPublicContentEntries KHÔNG kèm locale, getPublicDetailPathByContentType VẪN nhận resolved.locale', async () => {
        (PageService.pageResolver as any).mockResolvedValue({
            page: { id: 'page-1', path: '/bai-viet/bai-a', seo: {} },
            entry: { id: 'entry-1', contentTypeId: 'ct-bai-viet', data: { danhMucId: 'dm-1' } },
            seo: {},
            locale: 'en',
        });
        (ContentTypeService.getOneContentType as any).mockResolvedValue({
            fields: [{ key: 'danhMucId', type: 'RELATION', relationTarget: 'ct-danh-muc' }],
        });
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValue([{ id: 'dm-1', data: { tenDanhMuc: 'Tin tức' } }]);
        (PageService.getPublicDetailPathByContentType as any).mockResolvedValue(null);

        await resolveCmsPageProps('/en/bai-viet/bai-a');

        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(
            expect.objectContaining({ contentTypeId: 'ct-danh-muc', ids: ['dm-1'] }),
        );
        expect(ContentEntryService.getPublicContentEntries).not.toHaveBeenCalledWith(
            expect.objectContaining({ locale: expect.anything() }),
        );
        expect(PageService.getPublicDetailPathByContentType).toHaveBeenCalledWith({ contentTypeId: 'ct-danh-muc', locale: 'en' });
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
