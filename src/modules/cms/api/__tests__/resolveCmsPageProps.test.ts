import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveRelationDisplays, resolveTaxonomyDisplays } from '../resolveCmsPageProps';
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
            path: '/du-an/:slug', paramName: 'slug', fieldKey: 'slug',
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
