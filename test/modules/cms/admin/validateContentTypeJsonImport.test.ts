import { describe, it, expect } from 'vitest';
import { validateContentTypeJsonImport } from '@/modules/cms/admin/validateContentTypeJsonImport';

describe('validateContentTypeJsonImport', () => {
    it('accepts a well-formed payload', () => {
        const result = validateContentTypeJsonImport(JSON.stringify({ fields: [{ key: 'title', label: 'Tiêu đề', type: 'TEXT' }] }));
        expect(result.ok).toBe(true);
    });

    it('rejects invalid JSON', () => {
        const result = validateContentTypeJsonImport('{ not json');
        expect(result).toEqual({ ok: false, error: expect.stringContaining('JSON') });
    });

    it('rejects a payload with no fields array', () => {
        const result = validateContentTypeJsonImport(JSON.stringify({ label: 'x' }));
        expect(result.ok).toBe(false);
    });

    it('rejects duplicate field keys', () => {
        const result = validateContentTypeJsonImport(JSON.stringify({
            fields: [{ key: 'title', label: 'A', type: 'TEXT' }, { key: 'title', label: 'B', type: 'TEXT' }],
        }));
        expect(result.ok).toBe(false);
    });

    it('rejects REPEATER nested inside REPEATER (same 1-level limit as the BE)', () => {
        const result = validateContentTypeJsonImport(JSON.stringify({
            fields: [{
                key: 'faq', label: 'FAQ', type: 'REPEATER',
                itemFields: [{ key: 'nested', label: 'Nested', type: 'REPEATER', itemFields: [{ key: 'x', label: 'X', type: 'TEXT' }] }],
            }],
        }));
        expect(result.ok).toBe(false);
    });
});
