import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveBoundValue, fetchRepeatEntries, fetchRepeatEntryCount } from './nodeDataBinding';

vi.mock('@/shared/services/contentEntry/contentEntry.service', () => ({
    ContentEntryService: {
        getPublicContentEntries: vi.fn(async () => [{ id: 'e1' }]),
        getPublicContentEntriesCount: vi.fn(async () => 0),
        getRelatedContentEntries: vi.fn(async () => [{ id: 'e2' }]),
        getBacklinkContentEntries: vi.fn(async () => [{ id: 'e3' }]),
        getMixedContentEntries: vi.fn(async () => [{ id: 'e4' }]),
    },
}));

vi.mock('@/shared/services/page/page.service', () => ({
    PageService: {
        getPublicDetailPathByContentType: vi.fn(),
    },
}));

describe('resolveBoundValue', () => {
    it('mode "static" always returns the static value, ignoring contextEntry', () => {
        expect(resolveBoundValue({ mode: 'static' }, { title: 'from entry' }, 'static text')).toBe('static text');
    });

    it('mode "boundField" reads the field from contextEntry', () => {
        expect(resolveBoundValue({ mode: 'boundField', field: 'title' }, { title: 'Sản phẩm A', price: 100 }, 'fallback')).toBe('Sản phẩm A');
    });

    it('mode "boundField" with no contextEntry falls back to the static value', () => {
        expect(resolveBoundValue({ mode: 'boundField', field: 'title' }, undefined, 'fallback')).toBe('fallback');
    });

    it('mode "boundField" with a field missing on contextEntry falls back to the static value', () => {
        expect(resolveBoundValue({ mode: 'boundField', field: 'missingField' }, { title: 'x' }, 'fallback')).toBe('fallback');
    });
});

describe('fetchRepeatEntries (Phase 0 M1 Task 8)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('source="own", mode="dynamic": build filters qua resolveGenericDataSource, gọi getPublicContentEntries', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = {
            source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1',
            filter: [{ field: 'categoryId', valueSource: 'pathParam' as const, paramName: 'tenDanhMuc' }],
        };
        await fetchRepeatEntries(repeat, { pathParams: { tenDanhMuc: 'ao-thun' }, queryParams: {} });
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(expect.objectContaining({
            contentTypeId: 'ct-1',
            filters: [{ field: 'categoryId', operator: '$eq', value: 'ao-thun' }],
        }));
    });

    it('source="own", mode="dynamic": repeat.filter shape CŨ (không phải array) không throw, degrade về "no filter" (Final-review fix Important #2)', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = {
            source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1',
            // Legacy pre-Task-7/8 shape: Record<string, any> instead of GenericDataSourceFilter[].
            filter: { categoryId: 'ao-thun' } as any,
        };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(expect.objectContaining({
            contentTypeId: 'ct-1',
            filters: undefined,
        }));
    });

    it('source="own", mode="manual": gọi getPublicContentEntries với ids=entryIds, không filter', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'own' as const, mode: 'manual' as const, contentTypeKey: 'ct-1', entryIds: ['e1', 'e2'] };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(expect.objectContaining({ contentTypeId: 'ct-1', ids: ['e1', 'e2'] }));
    });

    it('source="related": gọi getRelatedContentEntries với entryId từ contextEntryId (Final-review fix Critical #1)', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'related' as const, matchField: 'categoryId', limit: 4 };
        const result = await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {}, contextEntryId: 'current-entry', locale: 'vi' });
        expect(ContentEntryService.getRelatedContentEntries).toHaveBeenCalledWith({ input: { entryId: 'current-entry', matchField: 'categoryId', limit: 4, locale: 'vi' } });
        expect(result).toEqual([{ id: 'e2' }]);
    });

    it('source="related" không có contextEntryId -> trả rỗng, KHÔNG gọi service', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const result = await fetchRepeatEntries({ source: 'related' as const }, { pathParams: {}, queryParams: {} });
        expect(result).toEqual([]);
        expect(ContentEntryService.getRelatedContentEntries).not.toHaveBeenCalled();
    });

    it('source="backlink": gọi getBacklinkContentEntries với entryId từ contextEntryId', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'backlink' as const, sourceContentTypeId: 'ct-2', matchField: 'danhMucId', limit: 6 };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {}, contextEntryId: 'e-current' });
        expect(ContentEntryService.getBacklinkContentEntries).toHaveBeenCalledWith({ input: { entryId: 'e-current', sourceContentTypeId: 'ct-2', matchField: 'danhMucId', limit: 6, locale: undefined } });
    });

    it('source="mixed": gọi getMixedContentEntries với sources', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'mixed' as const, sources: [{ contentTypeId: 'ct-1', limit: 3 }], limit: 12 };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(ContentEntryService.getMixedContentEntries).toHaveBeenCalledWith({ input: { sources: [{ contentTypeId: 'ct-1', limit: 3 }], limit: 12, locale: undefined } });
    });

    it('source="own", linkToDetail=true: gắn __detailHref vào mỗi entry theo getPublicDetailPathByContentType', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const { PageService } = await import('@/shared/services/page/page.service');
        vi.mocked(PageService.getPublicDetailPathByContentType).mockResolvedValueOnce({ path: '/du-an/:slug', bindings: [{ paramName: 'slug', fieldKey: 'slug' }] });
        // `data` is codegen-typed `string` on the real ContentEntryDTO (Mixed scalar, not
        // overridden here the way NodeDTO/PageDTO are) — cast to `any` before mocking a
        // field-object `data`, same convention already used for this exact DTO in
        // resolveCmsPageProps.test.ts.
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValueOnce([{ id: 'e1', contentTypeId: 'ct-1', data: { slug: 'du-an-a' } }]);
        const repeat = { source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1', linkToDetail: true };
        const result = await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(result[0].__detailHref).toBe('/du-an/du-an-a');
    });

    it('source="own", linkToDetail=false hoặc không set: KHÔNG gọi getPublicDetailPathByContentType, không có __detailHref', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const { PageService } = await import('@/shared/services/page/page.service');
        (ContentEntryService.getPublicContentEntries as any).mockResolvedValueOnce([{ id: 'e1', contentTypeId: 'ct-1', data: {} }]);
        const repeat = { source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1' };
        const result = await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(PageService.getPublicDetailPathByContentType).not.toHaveBeenCalled();
        expect(result[0].__detailHref).toBeUndefined();
    });

    it('source="mixed", linkToDetail=true: mỗi entry lấy __detailHref theo ĐÚNG contentTypeId của chính nó (không dùng chung 1 pattern)', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const { PageService } = await import('@/shared/services/page/page.service');
        (ContentEntryService.getMixedContentEntries as any).mockResolvedValueOnce([
            { id: 'e1', contentTypeId: 'ct-1', data: { slug: 'a' } },
            { id: 'e2', contentTypeId: 'ct-2', data: { slug: 'b' } },
        ]);
        vi.mocked(PageService.getPublicDetailPathByContentType).mockImplementation(async ({ contentTypeId }) =>
            contentTypeId === 'ct-1' ? { path: '/tin-tuc/:slug', bindings: [{ paramName: 'slug', fieldKey: 'slug' }] } : { path: '/doi-tac/:slug', bindings: [{ paramName: 'slug', fieldKey: 'slug' }] });
        const repeat = { source: 'mixed' as const, sources: [{ contentTypeId: 'ct-1' }, { contentTypeId: 'ct-2' }], linkToDetail: true };
        const result = await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(result[0].__detailHref).toBe('/tin-tuc/a');
        expect(result[1].__detailHref).toBe('/doi-tac/b');
    });
});

describe('fetchRepeatEntries — cardinality "one" (node-level data binding)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('source="own", mode="dynamic", cardinality="one": forces limit=1 regardless of repeat.limit', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1', cardinality: 'one' as const, limit: 50 };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }));
    });

    it('source="related", cardinality="one": forces limit=1', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'related' as const, cardinality: 'one' as const, limit: 12 };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {}, contextEntryId: 'e0' });
        expect(ContentEntryService.getRelatedContentEntries).toHaveBeenCalledWith({ input: { entryId: 'e0', matchField: undefined, limit: 1, locale: undefined } });
    });

    it('cardinality unset behaves identically to "many" (backward compatible)', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1', limit: 24 };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(expect.objectContaining({ limit: 24 }));
    });

    it('mode="manual" without cardinality: still sends limit=undefined (no regression on the "no auto-cap" behavior)', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'own' as const, mode: 'manual' as const, contentTypeKey: 'ct-1', entryIds: ['e1', 'e2'] };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(expect.objectContaining({ ids: ['e1', 'e2'], limit: undefined }));
    });
});

describe('fetchRepeatEntries — pagination offset (node-level data binding)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('source="own", mode="dynamic", pagination set, page=1: offset=0', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1', limit: 10, pagination: { mode: 'reload' as const, paramName: 'page', pageSize: 10 } };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: { page: '1' } });
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 0 }));
    });

    it('source="own", mode="dynamic", pagination set, page=3, pageSize=10: offset=20', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1', pagination: { mode: 'reload' as const, paramName: 'page', pageSize: 10 } };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: { page: '3' } });
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 20 }));
    });

    it('no pagination config: offset undefined (unaffected)', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1' };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(expect.objectContaining({ offset: undefined }));
    });

    it('missing/invalid page query param falls back to page 1 (offset=0), does not throw', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1', pagination: { mode: 'reload' as const, paramName: 'page', pageSize: 10 } };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: { page: 'not-a-number' } });
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
    });

    it('cardinality="one": offset never computed even if pagination is (nonsensically) set', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1', cardinality: 'one' as const, pagination: { mode: 'reload' as const, paramName: 'page', pageSize: 10 } };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: { page: '3' } });
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(expect.objectContaining({ offset: undefined, limit: 1 }));
    });
});

describe('fetchRepeatEntryCount', () => {
    beforeEach(() => vi.clearAllMocks());

    it('source="own", mode="dynamic": calls getPublicContentEntriesCount with the same resolved filters', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        (ContentEntryService.getPublicContentEntriesCount as any).mockResolvedValueOnce(37);
        const repeat = { source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1', filter: [{ field: 'categoryId', valueSource: 'pathParam' as const, paramName: 'cat' }] };
        const result = await fetchRepeatEntryCount(repeat, { pathParams: { cat: 'shoes' }, queryParams: {} });
        expect(result).toBe(37);
        expect(ContentEntryService.getPublicContentEntriesCount).toHaveBeenCalledWith(expect.objectContaining({
            contentTypeId: 'ct-1',
            filters: [{ field: 'categoryId', operator: '$eq', value: 'shoes' }],
        }));
    });

    it('cardinality="one": returns 0, does not call the service (count is meaningless for a single-entry source)', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'own' as const, mode: 'dynamic' as const, contentTypeKey: 'ct-1', cardinality: 'one' as const };
        const result = await fetchRepeatEntryCount(repeat, { pathParams: {}, queryParams: {} });
        expect(result).toBe(0);
        expect(ContentEntryService.getPublicContentEntriesCount).not.toHaveBeenCalled();
    });

    it('source="related"/"backlink"/"mixed"/mode="manual": returns 0, does not call the service (unsupported shapes)', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        for (const repeat of [
            { source: 'related' as const },
            { source: 'backlink' as const, sourceContentTypeId: 'ct-2', matchField: 'x' },
            { source: 'mixed' as const, sources: [{ contentTypeId: 'ct-1' }] },
            { source: 'own' as const, mode: 'manual' as const, contentTypeKey: 'ct-1', entryIds: ['e1'] },
        ]) {
            const result = await fetchRepeatEntryCount(repeat, { pathParams: {}, queryParams: {} });
            expect(result).toBe(0);
        }
        expect(ContentEntryService.getPublicContentEntriesCount).not.toHaveBeenCalled();
    });

    it('missing contentTypeKey: returns 0, does not call the service', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const result = await fetchRepeatEntryCount({ source: 'own' as const, mode: 'dynamic' as const }, { pathParams: {}, queryParams: {} });
        expect(result).toBe(0);
        expect(ContentEntryService.getPublicContentEntriesCount).not.toHaveBeenCalled();
    });
});
