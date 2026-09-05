import { describe, it, expect } from 'vitest';
import { resolveQuickFilterWidget } from '@/modules/cms/admin/resolveQuickFilterWidget';
import { EFieldType } from '@shared/generated/typed-graphql';
import { EFilterOperator } from '@core/api/types';

describe('resolveQuickFilterWidget', () => {
    it('BETWEEN always resolves to a range widget regardless of field type', () => {
        expect(resolveQuickFilterWidget(EFieldType.NUMBER, EFilterOperator.BETWEEN)).toBe('range');
    });
    it('LIKE always resolves to a text widget', () => {
        expect(resolveQuickFilterWidget(EFieldType.TEXT, EFilterOperator.LIKE)).toBe('text');
    });
    it('BOOLEAN field + EQUALS resolves to a boolean toggle', () => {
        expect(resolveQuickFilterWidget(EFieldType.BOOLEAN, EFilterOperator.EQUALS)).toBe('boolean');
    });
    it('SELECT field + EQUALS/IN resolves to a select dropdown', () => {
        expect(resolveQuickFilterWidget(EFieldType.SELECT, EFilterOperator.EQUALS)).toBe('select');
        expect(resolveQuickFilterWidget(EFieldType.SELECT, EFilterOperator.IN)).toBe('select');
    });
    it('falls back to text for any other combination (e.g. RELATION/TAXONOMY — no dedicated widget yet)', () => {
        expect(resolveQuickFilterWidget(EFieldType.RELATION, EFilterOperator.EQUALS)).toBe('text');
    });
});
