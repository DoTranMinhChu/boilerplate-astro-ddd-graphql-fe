import { describe, it, expect } from 'vitest';
import { resolveActiveViewModes } from '@/modules/cms/admin/resolveActiveViewModes';
import { EFieldType } from '@shared/generated/typed-graphql';

const IMAGE_FIELD = { key: 'photo', label: 'Ảnh', type: EFieldType.IMAGE };
const TEXT_FIELD = { key: 'title', label: 'Tiêu đề', type: EFieldType.TEXT };

describe('resolveActiveViewModes', () => {
    it('falls back to table-only when listViewConfig is undefined (pre-Phase-1 content type)', () => {
        expect(resolveActiveViewModes(undefined, [TEXT_FIELD] as any)).toEqual({ modes: ['table'], initialMode: 'table' });
    });

    it('honors a configured enabledModes list, intersected with what the fields actually allow', () => {
        // gallery configured but no image field -> stripped
        const result = resolveActiveViewModes({ defaultMode: 'card', enabledModes: ['table', 'card', 'gallery'] } as any, [TEXT_FIELD] as any);
        expect(result).toEqual({ modes: ['table', 'card'], initialMode: 'card' });
    });

    it('falls back to the first available mode when defaultMode itself got stripped', () => {
        const result = resolveActiveViewModes({ defaultMode: 'gallery', enabledModes: ['table', 'gallery'] } as any, [TEXT_FIELD] as any);
        expect(result).toEqual({ modes: ['table'], initialMode: 'table' });
    });

    it('keeps gallery/grid when an image field exists', () => {
        const result = resolveActiveViewModes({ defaultMode: 'gallery', enabledModes: ['table', 'gallery'] } as any, [IMAGE_FIELD] as any);
        expect(result).toEqual({ modes: ['table', 'gallery'], initialMode: 'gallery' });
    });

    it('always keeps at least table, even if enabledModes is empty', () => {
        expect(resolveActiveViewModes({ defaultMode: 'card', enabledModes: [] } as any, [TEXT_FIELD] as any))
            .toEqual({ modes: ['table'], initialMode: 'table' });
    });
});
