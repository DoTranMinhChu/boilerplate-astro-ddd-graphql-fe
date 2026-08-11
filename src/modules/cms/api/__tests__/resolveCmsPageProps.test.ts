import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveRelationDisplays, resolveTaxonomyDisplays, resolveCmsPageProps, resolveSectionDataSource } from '../resolveCmsPageProps';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { PageService } from '@/shared/services/page/page.service';
import { TermService } from '@/shared/services/term/term.service';
import { NodeService } from '@/shared/services/node/node.service';
import { isNodeTreeEnabled } from '@/modules/cms/node/nodeTreeFlag';
import { ESectionType } from '@/modules/cms/cms.constants';

vi.mock('@/shared/services/contentEntry/contentEntry.service');
vi.mock('@/shared/services/contentType/contentType.service');
vi.mock('@/shared/services/page/page.service');
vi.mock('@/shared/services/term/term.service');
vi.mock('@/shared/services/node/node.service');
vi.mock('@/modules/cms/node/nodeTreeFlag');

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

describe('resolveSectionDataSource — truyền locale xuống mọi query công khai (Critical #1 fix, Task 16 review)', () => {
    beforeEach(() => vi.resetAllMocks());

    it('CONTENT_DETAIL (mode="detail", limit=1) -- truyền locale xuống getPublicContentEntries', async () => {
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValue([{ id: 'e1', data: { slug: 'a' } }]);
        (PageService.getPublicDetailPathByContentType as any).mockResolvedValue(null);

        const section = {
            id: 'sec-1', type: ESectionType.CONTENT_DETAIL, order: 0, enabled: true,
            dataSource: {
                mode: 'detail', query: { contentTypeId: 'ct-1' },
                genericFilters: [{ field: 'slug', valueSource: 'pathParam', paramName: 'slug' }],
            },
        } as any;

        await resolveSectionDataSource(section, undefined, { slug: 'bai-viet-a' }, {}, 'vi');

        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(
            expect.objectContaining({ contentTypeId: 'ct-1', limit: 1, locale: 'vi' }),
        );
    });

    it('CONTENT_GRID mode="dynamic" -- truyền locale xuống getPublicContentEntries', async () => {
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValue([]);
        (PageService.getPublicDetailPathByContentType as any).mockResolvedValue(null);

        const section = {
            id: 'sec-1', type: ESectionType.CONTENT_GRID, order: 0, enabled: true,
            dataSource: { mode: 'dynamic', query: { contentTypeId: 'ct-1', limit: 6 } },
        } as any;

        await resolveSectionDataSource(section, undefined, {}, {}, 'en');

        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(
            expect.objectContaining({ contentTypeId: 'ct-1', locale: 'en' }),
        );
    });

    // Fix Important (Task 16 re-review): mode "manual" lookup bằng `ids` ghim tay tường minh --
    // KHÔNG truyền locale (id đã là selector duy nhất; lọc thêm locale chỉ khiến khối RỖNG khi
    // bản dịch trang chưa tự trỏ ids sang entry cùng locale).
    it('CONTENT_GRID mode="manual" (ids) -- KHÔNG truyền locale xuống getPublicContentEntries', async () => {
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValue([]);
        (PageService.getPublicDetailPathByContentType as any).mockResolvedValue(null);

        const section = {
            id: 'sec-1', type: ESectionType.CONTENT_GRID, order: 0, enabled: true,
            dataSource: { mode: 'manual', ids: ['e1', 'e2'], query: { contentTypeId: 'ct-1' } },
        } as any;

        await resolveSectionDataSource(section, undefined, {}, {}, 'en');

        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith({ contentTypeId: 'ct-1', ids: ['e1', 'e2'] });
    });

    it('RELATED_ENTRIES -- truyền locale trong input của getRelatedContentEntries VÀ xuống getPublicDetailPathByContentType', async () => {
        (ContentEntryService.getRelatedContentEntries as any).mockResolvedValue([{ id: 'e2', contentTypeId: 'ct-1', data: {} }]);
        (PageService.getPublicDetailPathByContentType as any).mockResolvedValue(null);

        const section = { id: 'sec-1', type: ESectionType.RELATED_ENTRIES, order: 0, enabled: true, dataSource: { matchField: 'loai' } } as any;

        await resolveSectionDataSource(section, 'e1', {}, {}, 'vi');

        expect(ContentEntryService.getRelatedContentEntries).toHaveBeenCalledWith({
            input: expect.objectContaining({ entryId: 'e1', locale: 'vi' }),
        });
        expect(PageService.getPublicDetailPathByContentType).toHaveBeenCalledWith({ contentTypeId: 'ct-1', locale: 'vi' });
    });

    it('BACKLINK_ENTRIES -- truyền locale trong input của getBacklinkContentEntries VÀ xuống getPublicDetailPathByContentType', async () => {
        (ContentEntryService.getBacklinkContentEntries as any).mockResolvedValue([]);
        (PageService.getPublicDetailPathByContentType as any).mockResolvedValue(null);

        const section = {
            id: 'sec-1', type: ESectionType.BACKLINK_ENTRIES, order: 0, enabled: true,
            dataSource: { sourceContentTypeId: 'ct-danh-muc', matchField: 'danhMucId' },
        } as any;

        await resolveSectionDataSource(section, 'e1', {}, {}, 'en');

        expect(ContentEntryService.getBacklinkContentEntries).toHaveBeenCalledWith({
            input: expect.objectContaining({ entryId: 'e1', sourceContentTypeId: 'ct-danh-muc', locale: 'en' }),
        });
        expect(PageService.getPublicDetailPathByContentType).toHaveBeenCalledWith({ contentTypeId: 'ct-danh-muc', locale: 'en' });
    });

    it('MIXED_FEED -- truyền locale trong input của getMixedContentEntries', async () => {
        (ContentEntryService.getMixedContentEntries as any).mockResolvedValue([]);

        const section = {
            id: 'sec-1', type: ESectionType.MIXED_FEED, order: 0, enabled: true,
            dataSource: { sources: [{ contentTypeId: 'ct-1', limit: 5 }] },
        } as any;

        await resolveSectionDataSource(section, undefined, {}, {}, 'en');

        expect(ContentEntryService.getMixedContentEntries).toHaveBeenCalledWith({
            input: expect.objectContaining({ sources: [{ contentTypeId: 'ct-1', limit: 5 }], locale: 'en' }),
        });
    });

    it('không truyền locale (vd Page Builder canvas) -- giữ hành vi cũ, locale=undefined xuống query', async () => {
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValue([]);
        (PageService.getPublicDetailPathByContentType as any).mockResolvedValue(null);

        const section = {
            id: 'sec-1', type: ESectionType.CONTENT_GRID, order: 0, enabled: true,
            dataSource: { mode: 'dynamic', query: { contentTypeId: 'ct-1' } },
        } as any;

        await resolveSectionDataSource(section);

        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(
            expect.objectContaining({ locale: undefined }),
        );
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
            sections: [],
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
            sections: [],
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
            sections: [],
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

describe('resolveCmsPageProps — Node-Tree feature-flag gating (Task 23 review finding)', () => {
    beforeEach(() => vi.resetAllMocks());

    it('cờ OFF + page CÓ rootNodeId -> nodeTree undefined, KHÔNG gọi NodeService.getNodesByPage', async () => {
        (isNodeTreeEnabled as any).mockReturnValue(false);
        (PageService.pageResolver as any).mockResolvedValue({
            page: { id: 'page-1', path: '/gioi-thieu', rootNodeId: 'node-root-1', seo: {} },
            sections: [],
            seo: {},
            locale: 'vi',
        });

        const result = await resolveCmsPageProps('/gioi-thieu');

        expect(NodeService.getNodesByPage).not.toHaveBeenCalled();
        expect(result?.nodeTree).toBeUndefined();
    });

    it('cờ ON + page KHÔNG có rootNodeId -> nodeTree undefined, KHÔNG gọi NodeService.getNodesByPage', async () => {
        (isNodeTreeEnabled as any).mockReturnValue(true);
        (PageService.pageResolver as any).mockResolvedValue({
            page: { id: 'page-1', path: '/gioi-thieu', rootNodeId: null, seo: {} },
            sections: [],
            seo: {},
            locale: 'vi',
        });

        const result = await resolveCmsPageProps('/gioi-thieu');

        expect(NodeService.getNodesByPage).not.toHaveBeenCalled();
        expect(result?.nodeTree).toBeUndefined();
    });

    it('cờ ON + page CÓ rootNodeId -> gọi NodeService.getNodesByPage với đúng pageId, nodeTree = kết quả buildNodeTree(...)', async () => {
        (isNodeTreeEnabled as any).mockReturnValue(true);
        (PageService.pageResolver as any).mockResolvedValue({
            page: { id: 'page-1', path: '/gioi-thieu', rootNodeId: 'node-root-1', seo: {} },
            sections: [],
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
