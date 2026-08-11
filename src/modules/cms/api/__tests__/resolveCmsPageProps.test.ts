import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveRelationDisplays, resolveTaxonomyDisplays, resolveCmsPageProps } from '../resolveCmsPageProps';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { PageService } from '@/shared/services/page/page.service';
import { TermService } from '@/shared/services/term/term.service';

vi.mock('@/shared/services/contentEntry/contentEntry.service');
vi.mock('@/shared/services/contentType/contentType.service');
vi.mock('@/shared/services/page/page.service');
vi.mock('@/shared/services/term/term.service');

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
