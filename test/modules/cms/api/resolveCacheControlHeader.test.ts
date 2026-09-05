import { describe, it, expect } from 'vitest';
import { resolveCacheControlHeader } from '@modules/cms/api/resolveCacheControlHeader';

describe('resolveCacheControlHeader', () => {
    it('trả đúng chuỗi Cache-Control đã chốt (public, max-age=60, swr=300)', () => {
        expect(resolveCacheControlHeader()).toBe('public, max-age=60, stale-while-revalidate=300');
    });

    it('là pure function — gọi nhiều lần vẫn trả cùng một giá trị', () => {
        expect(resolveCacheControlHeader()).toBe(resolveCacheControlHeader());
    });
});
