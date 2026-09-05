import { describe, it, expect } from 'vitest';
import type { ListViewConfig, FormConfig, ContentFilterConfig, FieldGridLayoutItem } from '@/modules/cms/cms.types';

// These are compile-time-only checks — if the shapes in cms.types.ts drift from what the rest
// of the codebase expects, `tsc`/vitest's type-check step fails to build this file at all. The
// runtime assertions just give the test *something* to run so it shows up green in CI.
describe('cms.types.ts — ListViewConfig/FormConfig/ContentFilterConfig/FieldGridLayoutItem shapes', () => {
    it('a fully-populated ListViewConfig satisfies the type', () => {
        const config: ListViewConfig = {
            defaultMode: 'table',
            enabledModes: ['table', 'card', 'kanban'],
            kanbanGroupFieldKey: 'status',
            cardConfig: { imageFieldKey: 'image', subtitleFieldKey: 'category' },
        };
        expect(config.enabledModes).toContain('kanban');
    });

    it('a fully-populated FormConfig + FieldGridLayoutItem satisfies the type', () => {
        const layout: FieldGridLayoutItem = { fieldKey: 'title', colStart: 1, colSpan: 6, row: 0 };
        const config: FormConfig = { defaultMode: 'dialog', enabledModes: ['dialog', 'visualGrid'], gridLayout: [layout] };
        expect(config.gridLayout?.[0].fieldKey).toBe('title');
    });

    it('a ContentFilterConfig satisfies the type', () => {
        const filter: ContentFilterConfig = { key: 'f1', label: 'Trạng thái', field: 'status', operator: 'EQUALS' as any };
        expect(filter.field).toBe('status');
    });
});
