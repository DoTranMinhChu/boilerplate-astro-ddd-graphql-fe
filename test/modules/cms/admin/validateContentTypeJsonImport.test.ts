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

    // I7 (final whole-branch review) — field.type wasn't checked against EFieldType at all before
    // this fix, letting a typo'd/legacy type through to every field-type-driven consumer unchecked.
    describe('field.type validation (I7)', () => {
        it('rejects an unrecognized top-level field type', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{ key: 'title', label: 'Title', type: 'STRING' }],
            }));
            expect(result).toEqual({ ok: false, error: expect.stringContaining('STRING') });
        });

        it('rejects an unrecognized type nested inside a REPEATER\'s itemFields', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{
                    key: 'faq', label: 'FAQ', type: 'REPEATER',
                    itemFields: [{ key: 'q', label: 'Q', type: 'NOT_A_TYPE' }],
                }],
            }));
            expect(result.ok).toBe(false);
        });

        it('accepts every real EFieldType value', () => {
            // All 13 EFieldType values, including REPEATER (with no itemFields — a bare REPEATER
            // with nothing nested is a valid, non-recursing field, same as every other type here).
            const types = ['TEXT', 'RICHTEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT', 'IMAGE', 'GALLERY', 'VIDEO', 'LINK', 'RELATION', 'TAXONOMY', 'REPEATER'];
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: types.map((type, i) => ({ key: `f${i}`, label: type, type })),
            }));
            expect(result.ok).toBe(true);
        });
    });

    // I7 — a malformed listViewConfig/formConfig (e.g. enabledModes as a bare string, whose own
    // truthy .length slips past a naive `?.length` guard) used to sail through and crash
    // resolveActiveViewModes.ts's `.filter()` call the next time the Content Entry list opened.
    describe('listViewConfig / formConfig shape validation (I7)', () => {
        it('rejects listViewConfig.enabledModes as a non-array string', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{ key: 'title', label: 'Title', type: 'TEXT' }],
                listViewConfig: { enabledModes: 'table' },
            }));
            expect(result.ok).toBe(false);
        });

        it('rejects an unknown mode inside listViewConfig.enabledModes', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{ key: 'title', label: 'Title', type: 'TEXT' }],
                listViewConfig: { enabledModes: ['table', 'not-a-mode'] },
            }));
            expect(result.ok).toBe(false);
        });

        it('rejects an unknown listViewConfig.defaultMode', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{ key: 'title', label: 'Title', type: 'TEXT' }],
                listViewConfig: { enabledModes: ['table'], defaultMode: 'nope' },
            }));
            expect(result.ok).toBe(false);
        });

        it('rejects formConfig.gridLayoutByMode when not an object', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{ key: 'title', label: 'Title', type: 'TEXT' }],
                formConfig: { enabledModes: ['fullPage'], gridLayoutByMode: 'not-an-object' },
            }));
            expect(result.ok).toBe(false);
        });

        it('rejects formConfig.gridLayoutByMode with a non-array mode value', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{ key: 'title', label: 'Title', type: 'TEXT' }],
                formConfig: { enabledModes: ['fullPage'], gridLayoutByMode: { fullPage: 'not-an-array' } },
            }));
            expect(result.ok).toBe(false);
        });

        it('rejects formConfig.gridLayoutByMode with an unknown breakpoint key', () => {
            const payload = JSON.stringify({
                fields: [{ key: 'title', type: 'TEXT' }],
                formConfig: { gridLayoutByMode: { dialog: { notABreakpoint: [] } } },
            });
            const result = validateContentTypeJsonImport(payload);
            expect(result.ok).toBe(false);
        });

        it('rejects a gridLayoutByMode item missing rowStart/rowSpan', () => {
            const payload = JSON.stringify({
                fields: [{ key: 'title', type: 'TEXT' }],
                formConfig: { gridLayoutByMode: { dialog: { desktop: [{ fieldKey: 'title', colStart: 1, colSpan: 6 }] } } },
            });
            const result = validateContentTypeJsonImport(payload);
            expect(result.ok).toBe(false);
        });

        it('rejects a gridLayoutByMode item with an invalid align value', () => {
            const payload = JSON.stringify({
                fields: [{ key: 'title', type: 'TEXT' }],
                formConfig: {
                    gridLayoutByMode: {
                        dialog: { desktop: [{ fieldKey: 'title', colStart: 1, colSpan: 6, rowStart: 0, rowSpan: 1, align: 'nope' }] },
                    },
                },
            });
            const result = validateContentTypeJsonImport(payload);
            expect(result.ok).toBe(false);
        });

        it('accepts a well-formed nested-by-breakpoint gridLayoutByMode', () => {
            const payload = JSON.stringify({
                fields: [{ key: 'title', type: 'TEXT' }],
                formConfig: {
                    gridLayoutByMode: {
                        dialog: {
                            desktop: [{ fieldKey: 'title', colStart: 1, colSpan: 6, rowStart: 0, rowSpan: 2, minHeight: 80, align: 'start' }],
                            mobile: [],
                        },
                    },
                },
            });
            const result = validateContentTypeJsonImport(payload);
            expect(result.ok).toBe(true);
        });

        it('rejects "visualGrid" as a formConfig mode (removed in the fix round)', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{ key: 'title', label: 'Title', type: 'TEXT' }],
                formConfig: { enabledModes: ['visualGrid'] },
            }));
            expect(result.ok).toBe(false);
        });

        it('rejects an unknown mode inside formConfig.enabledModes', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{ key: 'title', label: 'Title', type: 'TEXT' }],
                formConfig: { enabledModes: ['dialog', 'not-a-mode'] },
            }));
            expect(result.ok).toBe(false);
        });

        it('accepts a well-formed listViewConfig + formConfig', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{ key: 'title', label: 'Title', type: 'TEXT' }],
                listViewConfig: { enabledModes: ['table', 'kanban'], defaultMode: 'table', tableColumns: ['title'] },
                formConfig: { enabledModes: ['dialog', 'fullPage'], defaultMode: 'dialog', gridLayoutByMode: { fullPage: { desktop: [] } } },
            }));
            expect(result.ok).toBe(true);
        });

        it('rejects listViewConfig.tableColumns when not an array of strings', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{ key: 'title', label: 'Title', type: 'TEXT' }],
                listViewConfig: { tableColumns: 'title' },
            }));
            expect(result.ok).toBe(false);
        });

        it('accepts a payload with neither listViewConfig nor formConfig present', () => {
            const result = validateContentTypeJsonImport(JSON.stringify({
                fields: [{ key: 'title', label: 'Title', type: 'TEXT' }],
            }));
            expect(result.ok).toBe(true);
        });
    });
});
