import { describe, it, expect } from 'vitest';
import { prepareDuplicateData } from '@/modules/cms/admin/prepareDuplicateData';

const FIELDS = [
    { key: 'title', label: 'Tiêu đề' },
    { key: 'slug', label: 'Slug', unique: true, autoGenerateFrom: 'title' },
    { key: 'sku', label: 'SKU', unique: true },
    { key: 'price', label: 'Giá' },
] as any;

describe('prepareDuplicateData', () => {
    it('clears fields flagged unique or autoGenerateFrom, keeps everything else', () => {
        const result = prepareDuplicateData({ title: 'Áo thun', slug: 'ao-thun', sku: 'SKU-1', price: 100000 }, FIELDS);
        expect(result).toEqual({ title: 'Áo thun', slug: undefined, sku: undefined, price: 100000 });
    });

    it('does not mutate the source object', () => {
        const source = { title: 'Áo thun', slug: 'ao-thun' };
        prepareDuplicateData(source, FIELDS);
        expect(source.slug).toBe('ao-thun');
    });
});
