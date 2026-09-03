// src/modules/cms/node/fetchDataSourceEntries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDataSourceEntries } from '@modules/cms/node/fetchDataSourceEntries';

vi.mock('@/shared/services/contentEntry/contentEntry.service', () => ({
    ContentEntryService: {
        getPublicContentEntries: vi.fn(async () => [{ id: 'e1', data: { title: 'x' } }]),
    },
}));

describe('fetchDataSourceEntries', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns [] when dataSource has no query.contentTypeId', async () => {
        const result = await fetchDataSourceEntries(undefined, { pathParams: {}, queryParams: {} });
        expect(result).toEqual([]);
    });

    it('mode "manual": calls getPublicContentEntries with ids, no filters', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const result = await fetchDataSourceEntries(
            { mode: 'manual', ids: ['e1', 'e2'], query: { contentTypeId: 'ct-1' } },
            { pathParams: {}, queryParams: {} },
        );
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(
            expect.objectContaining({ contentTypeId: 'ct-1', ids: ['e1', 'e2'] }),
        );
        expect(result).toEqual([{ id: 'e1', data: { title: 'x' } }]);
    });

    it('mode "dynamic": resolves genericFilters via pathParams before calling getPublicContentEntries', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        await fetchDataSourceEntries(
            {
                mode: 'dynamic',
                query: { contentTypeId: 'ct-1', limit: 6, sort: { field: 'createdAt', direction: 'DESC' } },
                genericFilters: [{ field: 'categoryId', valueSource: 'pathParam', paramName: 'slug' }],
            },
            { pathParams: { slug: 'ao-thun' }, queryParams: {} },
        );
        expect(ContentEntryService.getPublicContentEntries).toHaveBeenCalledWith(
            expect.objectContaining({
                contentTypeId: 'ct-1',
                filters: [{ field: 'categoryId', operator: '$eq', value: 'ao-thun' }],
                sortField: 'createdAt',
                sortDirection: 'DESC',
                limit: 6,
            }),
        );
    });
});
