import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveBoundValue, fetchRepeatEntries } from './nodeDataBinding';

vi.mock('@/shared/services/contentEntry/contentEntry.service', () => ({
    ContentEntryService: {
        getPublicContentEntries: vi.fn(async () => [{ id: 'e1' }]),
        getRelatedContentEntries: vi.fn(async () => [{ id: 'e2' }]),
        getBacklinkContentEntries: vi.fn(async () => [{ id: 'e3' }]),
        getMixedContentEntries: vi.fn(async () => [{ id: 'e4' }]),
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
});
