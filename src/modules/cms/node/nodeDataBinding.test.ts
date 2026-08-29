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

describe('resolveBoundValue — itemIndex mode', () => {
    it('formats a 0-based index as a 1-based, zero-padded 2-digit string', () => {
        expect(resolveBoundValue({ mode: 'itemIndex' }, undefined, 'fallback', 0)).toBe('01');
        expect(resolveBoundValue({ mode: 'itemIndex' }, undefined, 'fallback', 4)).toBe('05');
        expect(resolveBoundValue({ mode: 'itemIndex' }, undefined, 'fallback', 10)).toBe('11');
    });

    it('treats a missing contextEntryIndex as 0 (formats as "01")', () => {
        expect(resolveBoundValue({ mode: 'itemIndex' }, undefined, 'fallback')).toBe('01');
    });

    it('ignores contextEntry and field entirely in itemIndex mode', () => {
        expect(resolveBoundValue({ mode: 'itemIndex', field: 'title' }, { title: 'should be ignored' }, 'fallback', 2)).toBe('03');
    });

    it('existing static/boundField modes are byte-for-byte unchanged when contextEntryIndex is passed', () => {
        expect(resolveBoundValue({ mode: 'static' }, { title: 'x' }, 'fallback text', 3)).toBe('fallback text');
        expect(resolveBoundValue({ mode: 'boundField', field: 'title' }, { title: 'Sản phẩm A' }, 'fallback', 3)).toBe('Sản phẩm A');
    });
});

describe('resolveBoundValue — mixedField mode', () => {
    const sources = [
        { contentTypeId: 'ct-blog', fieldMapping: { heading: 'title', image: 'coverImage' } },
        { contentTypeId: 'ct-product', fieldMapping: { heading: 'productName' } },
    ];

    it('resolves the real field name for the matching content type, then reads it off contextEntry', () => {
        const result = resolveBoundValue({ mode: 'mixedField', field: 'heading' }, { title: 'Bài viết A', productName: 'ignored' }, 'fallback', undefined, 'ct-blog', sources);
        expect(result).toBe('Bài viết A');
    });

    it('uses a DIFFERENT real field name for a different content type sharing the same node', () => {
        const result = resolveBoundValue({ mode: 'mixedField', field: 'heading' }, { productName: 'Sản phẩm B' }, 'fallback', undefined, 'ct-product', sources);
        expect(result).toBe('Sản phẩm B');
    });

    it('falls back to staticValue when no source matches the content type', () => {
        expect(resolveBoundValue({ mode: 'mixedField', field: 'heading' }, { title: 'x' }, 'fallback', undefined, 'ct-unknown', sources)).toBe('fallback');
    });

    it('falls back to staticValue when the matched source has no mapping for this field', () => {
        expect(resolveBoundValue({ mode: 'mixedField', field: 'image' }, { productName: 'x' }, 'fallback', undefined, 'ct-product', sources)).toBe('fallback');
    });

    it('existing modes are byte-for-byte unchanged when contextMixedSources is passed', () => {
        expect(resolveBoundValue({ mode: 'static' }, { title: 'x' }, 'fallback', 0, 'ct-blog', sources)).toBe('fallback');
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

    // Task 22 (live regression sweep) — reproduced live: the admin's "+ Thêm nguồn" source-list
    // editor (Task 13) adds a row with contentTypeId:'' before the admin picks a real content
    // type, and the canvas re-renders on every edit — sending that empty id straight to
    // getMixedContentEntries threw a real HTTP 400. Filter incomplete rows before querying.
    it('source="mixed": lọc bỏ các source chưa chọn contentTypeId (row mới thêm, chưa cấu hình) trước khi gọi service', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'mixed' as const, sources: [{ contentTypeId: 'ct-1', limit: 3 }, { contentTypeId: '', fieldMapping: {} }], limit: 12 };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(ContentEntryService.getMixedContentEntries).toHaveBeenCalledWith({ input: { sources: [{ contentTypeId: 'ct-1', limit: 3 }], limit: 12, locale: undefined } });
    });

    // Task 22 — the real bug behind the 400: the BE's real MixedFeedSourceInput GraphQL type
    // (ddd-graphql-be's contentEntry.dto.ts) only declares contentTypeId/limit. fieldMapping is
    // a FE-only concern (MixedFeedNode.tsx reads it straight off node.repeat.sources to label
    // returned entries, never off the response) — sending it in the query variables makes
    // GraphQL's input coercion reject the WHOLE request with a 400, confirmed live once
    // Task 13's admin UI gave admins a real way to persist a configured fieldMapping.
    it('source="mixed": KHÔNG gửi fieldMapping lên service (BE input type không có field này)', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'mixed' as const, sources: [{ contentTypeId: 'ct-1', limit: 3, fieldMapping: { heading: 'title', image: 'img' } }], limit: 12 };
        await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(ContentEntryService.getMixedContentEntries).toHaveBeenCalledWith({ input: { sources: [{ contentTypeId: 'ct-1', limit: 3 }], limit: 12, locale: undefined } });
    });

    it('source="mixed": mọi source đều chưa cấu hình (contentTypeId rỗng) -> trả về [] ngay, không gọi service', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = { source: 'mixed' as const, sources: [{ contentTypeId: '', fieldMapping: {} }] };
        const result = await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(result).toEqual([]);
        expect(ContentEntryService.getMixedContentEntries).not.toHaveBeenCalled();
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

    it('source="local": returns localItems wrapped as entries, with no network call', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = {
            source: 'local' as const,
            localItemFields: [{ key: 'title', labelKey: 'Tiêu đề', control: 'text' as const }],
            localItems: [{ title: 'Mục 1' }, { title: 'Mục 2' }],
        };
        const result = await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(result).toEqual([
            { id: 'local-0', data: { title: 'Mục 1' }, contentTypeId: undefined },
            { id: 'local-1', data: { title: 'Mục 2' }, contentTypeId: undefined },
        ]);
        expect(ContentEntryService.getPublicContentEntries).not.toHaveBeenCalled();
        expect(ContentEntryService.getRelatedContentEntries).not.toHaveBeenCalled();
        expect(ContentEntryService.getBacklinkContentEntries).not.toHaveBeenCalled();
        expect(ContentEntryService.getMixedContentEntries).not.toHaveBeenCalled();
    });

    it('source="local" with no localItems returns an empty array, not undefined/throw', async () => {
        const result = await fetchRepeatEntries({ source: 'local' as const }, { pathParams: {}, queryParams: {} });
        expect(result).toEqual([]);
    });

    // Final-review fix Important #1: local sources used to ignore `limit`/`pagination` entirely
    // (always returned ALL localItems), while `fetchRepeatEntryCount`'s local branch already
    // reported the true unsliced length — Table/CardList call both in one Promise.all, so the
    // pagination UI showed the true page count while every page rendered all N items identically.
    it('source="local" with limit=2 and 5 localItems: only 2 entries come back (Final-review fix Important #1)', async () => {
        const repeat = {
            source: 'local' as const,
            limit: 2,
            localItems: [{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }, { title: 'E' }],
        };
        const result = await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(result).toEqual([
            { id: 'local-0', data: { title: 'A' }, contentTypeId: undefined },
            { id: 'local-1', data: { title: 'B' }, contentTypeId: undefined },
        ]);
    });

    it('source="local" with pagination configured and ?page=2: returns the SECOND page slice, matching the "own"-source pagination offset semantics (Final-review fix Important #1)', async () => {
        const repeat = {
            source: 'local' as const,
            pagination: { mode: 'reload' as const, paramName: 'page', pageSize: 2 },
            localItems: [{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }, { title: 'E' }],
        };
        const result = await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: { page: '2' } });
        expect(result).toEqual([
            { id: 'local-2', data: { title: 'C' }, contentTypeId: undefined },
            { id: 'local-3', data: { title: 'D' }, contentTypeId: undefined },
        ]);
    });

    it('source="local", cardinality="one": still returns exactly 1 entry regardless of localItems length (Final-review fix Important #1)', async () => {
        const repeat = {
            source: 'local' as const,
            cardinality: 'one' as const,
            limit: 50,
            localItems: [{ title: 'A' }, { title: 'B' }, { title: 'C' }],
        };
        const result = await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(result).toEqual([{ id: 'local-0', data: { title: 'A' }, contentTypeId: undefined }]);
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

describe('fetchRepeatEntryCount — source="local" (Phase A1)', () => {
    it('returns the real length of localItems (unlike related/backlink/mixed, which return 0)', async () => {
        const count = await fetchRepeatEntryCount(
            { source: 'local' as const, localItems: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] },
            { pathParams: {}, queryParams: {} },
        );
        expect(count).toBe(3);
    });

    it('returns 0 when localItems is unset', async () => {
        const count = await fetchRepeatEntryCount({ source: 'local' as const }, { pathParams: {}, queryParams: {} });
        expect(count).toBe(0);
    });
});
