import { describe, it, expect } from 'vitest';
import { resolveTableColumns } from '@/modules/cms/admin/resolveTableColumns';
import { EFieldType } from '@/shared/generated/typed-graphql';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

const FIELDS = [
    { key: 'name', label: 'Name', type: EFieldType.TEXT, showInListing: true },
    { key: 'coverImage', label: 'Cover', type: EFieldType.IMAGE, showInListing: false },
    { key: 'status', label: 'Status', type: EFieldType.SELECT, showInListing: true },
    { key: 'price', label: 'Price', type: EFieldType.NUMBER, showInListing: false },
] as unknown as FieldDefinitionDTO[];

describe('resolveTableColumns', () => {
    it('uses tableColumns, in that exact order, when non-empty', () => {
        const result = resolveTableColumns(FIELDS, ['price', 'name']);
        expect(result.map((f) => f.key)).toEqual(['price', 'name']);
    });

    it('silently skips a tableColumns key that no longer matches a real field', () => {
        const result = resolveTableColumns(FIELDS, ['name', 'deleted-field', 'status']);
        expect(result.map((f) => f.key)).toEqual(['name', 'status']);
    });

    it('falls back to ALL showInListing fields (no cap) when tableColumns is empty', () => {
        const result = resolveTableColumns(FIELDS, []);
        expect(result.map((f) => f.key)).toEqual(['name', 'status']);
    });

    it('falls back to ALL showInListing fields when tableColumns is undefined', () => {
        const result = resolveTableColumns(FIELDS, undefined);
        expect(result.map((f) => f.key)).toEqual(['name', 'status']);
    });

    it('falls back to a smart default (first TEXT, then first IMAGE, then first SELECT) when nothing is configured', () => {
        const noShowInListing = FIELDS.map((f) => ({ ...f, showInListing: false })) as FieldDefinitionDTO[];
        const result = resolveTableColumns(noShowInListing, undefined);
        expect(result.map((f) => f.key)).toEqual(['name', 'coverImage', 'status']);
    });

    it('smart default only includes types that actually exist', () => {
        const textOnly = [{ key: 'name', label: 'Name', type: EFieldType.TEXT, showInListing: false }] as unknown as FieldDefinitionDTO[];
        const result = resolveTableColumns(textOnly, undefined);
        expect(result.map((f) => f.key)).toEqual(['name']);
    });

    it('returns an empty array when the content type genuinely has 0 fields', () => {
        expect(resolveTableColumns([], undefined)).toEqual([]);
    });
});
