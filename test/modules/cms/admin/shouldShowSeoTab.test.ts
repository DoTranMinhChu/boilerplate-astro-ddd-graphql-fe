import { describe, it, expect } from 'vitest';
import { shouldShowSeoTab } from '@/modules/cms/admin/shouldShowSeoTab';

describe('shouldShowSeoTab', () => {
    it('shows the tab when a field key contains "seo" (case-insensitive)', () => {
        expect(shouldShowSeoTab([{ key: 'metaSeoTitle', label: 'X' }] as any)).toBe(true);
    });

    it('shows the tab when a field label contains "meta"', () => {
        expect(shouldShowSeoTab([{ key: 'x', label: 'Meta description' }] as any)).toBe(true);
    });

    it('hides the tab when no field key/label mentions seo/meta', () => {
        expect(shouldShowSeoTab([{ key: 'title', label: 'Tiêu đề' }, { key: 'price', label: 'Giá' }] as any)).toBe(false);
    });

    it('hides the tab for an empty field list', () => {
        expect(shouldShowSeoTab([])).toBe(false);
    });
});
