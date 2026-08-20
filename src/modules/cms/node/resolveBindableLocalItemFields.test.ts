import { describe, it, expect } from 'vitest';
import { resolveBindableLocalItemFields } from './resolveBindableLocalItemFields';
import type { NodeDTO } from './node.types';

function node(overrides: Partial<NodeDTO>): NodeDTO {
    return { id: 'n', type: 'frame', ...overrides } as NodeDTO;
}

describe('resolveBindableLocalItemFields', () => {
    it('returns the localItemFields of the node itself when it has a local repeat', () => {
        const fields = [{ key: 'title', labelKey: 'Tiêu đề', control: 'text' as const }];
        const map = new Map<string, NodeDTO>([
            ['a', node({ id: 'a', repeat: { source: 'local', localItemFields: fields } as any })],
        ]);
        expect(resolveBindableLocalItemFields('a', map)).toBe(fields);
    });

    it('walks up through non-repeat ancestors to find the nearest local repeat', () => {
        const fields = [{ key: 'year', labelKey: 'Năm', control: 'text' as const }];
        const map = new Map<string, NodeDTO>([
            ['root', node({ id: 'root', repeat: { source: 'local', localItemFields: fields } as any })],
            ['mid', node({ id: 'mid', parentId: 'root' })],
            ['leaf', node({ id: 'leaf', parentId: 'mid' })],
        ]);
        expect(resolveBindableLocalItemFields('leaf', map)).toBe(fields);
    });

    it('skips a "mixed" or "own" repeat ancestor and keeps walking up for a local one further out', () => {
        const fields = [{ key: 'label', labelKey: 'Nhãn', control: 'text' as const }];
        const map = new Map<string, NodeDTO>([
            ['outer', node({ id: 'outer', repeat: { source: 'local', localItemFields: fields } as any })],
            ['inner', node({ id: 'inner', parentId: 'outer', repeat: { source: 'mixed' } as any })],
            ['leaf', node({ id: 'leaf', parentId: 'inner' })],
        ]);
        expect(resolveBindableLocalItemFields('leaf', map)).toBe(fields);
    });

    it('returns undefined when no ancestor (inclusive) has a local repeat', () => {
        const map = new Map<string, NodeDTO>([
            ['a', node({ id: 'a', repeat: { source: 'own', contentTypeKey: 'ct-1' } as any })],
        ]);
        expect(resolveBindableLocalItemFields('a', map)).toBeUndefined();
    });

    it('returns undefined for an undefined nodeId', () => {
        expect(resolveBindableLocalItemFields(undefined, new Map())).toBeUndefined();
    });

    it('a local repeat with no localItemFields set is treated as not-yet-bindable (keeps walking up)', () => {
        const fields = [{ key: 'x', labelKey: 'X', control: 'text' as const }];
        const map = new Map<string, NodeDTO>([
            ['outer', node({ id: 'outer', repeat: { source: 'local', localItemFields: fields } as any })],
            ['inner', node({ id: 'inner', parentId: 'outer', repeat: { source: 'local' } as any })],
            ['leaf', node({ id: 'leaf', parentId: 'inner' })],
        ]);
        expect(resolveBindableLocalItemFields('leaf', map)).toBe(fields);
    });
});
