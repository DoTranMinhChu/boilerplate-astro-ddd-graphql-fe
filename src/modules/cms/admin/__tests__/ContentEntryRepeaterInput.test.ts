// @vitest-environment jsdom
//
// resolveContentEntryRepeaterItemTitle is a pure function, but it lives inside
// ContentEntryRepeaterInput.tsx alongside Solid UI components (Button ->
// @solidjs/router's <A>) whose modules read `window`/call template() at import
// time (see vitest.config.ts's resolve.conditions:['browser'] + vite-plugin-solid
// for why the .tsx import itself resolves to real browser code). jsdom (already
// present in node_modules as a transitive dep) supplies that `window`/`document`
// — scoped to just this file so every other pure-logic test keeps the faster
// 'node' default. Mirrors SchemaFieldsEditor.test.ts's resolveRepeaterItemTitle
// suite 1-1 (Task 5), adjusted only for FieldDefinitionDTO's shape.
import { describe, it, expect } from 'vitest';
import { resolveContentEntryRepeaterItemTitle } from '../ContentEntryRepeaterInput';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

describe('resolveContentEntryRepeaterItemTitle', () => {
    const itemFields: FieldDefinitionDTO[] = [
        { key: 'title', label: 'Tiêu đề', type: 'TEXT', isRepeaterTitleSource: true } as FieldDefinitionDTO,
        { key: 'body', label: 'Nội dung', type: 'RICHTEXT' } as FieldDefinitionDTO,
    ];

    it('dùng field có isRepeaterTitleSource=true khi có giá trị', () => {
        const result = resolveContentEntryRepeaterItemTitle(itemFields, { title: 'Câu hỏi 1', body: 'Trả lời' }, 0);
        expect(result).toBe('Câu hỏi 1');
    });

    it('không có field nào đánh dấu isRepeaterTitleSource -> fallback field TEXT đầu tiên', () => {
        const noMark: FieldDefinitionDTO[] = [
            { key: 'title', label: 'Tiêu đề', type: 'TEXT' } as FieldDefinitionDTO,
            { key: 'body', label: 'Nội dung', type: 'RICHTEXT' } as FieldDefinitionDTO,
        ];
        const result = resolveContentEntryRepeaterItemTitle(noMark, { title: 'Câu hỏi 2', body: 'Trả lời' }, 0);
        expect(result).toBe('Câu hỏi 2');
    });

    it('field đánh dấu rỗng -> fallback field TEXT đầu tiên có giá trị', () => {
        const result = resolveContentEntryRepeaterItemTitle(itemFields, { title: '', body: 'Trả lời' }, 2);
        expect(result).toBe('Mục #3');
    });

    it('không có field TEXT nào có giá trị -> "Mục #N" (N = index+1)', () => {
        const noTextField: FieldDefinitionDTO[] = [{ key: 'flag', label: 'Cờ', type: 'BOOLEAN' } as FieldDefinitionDTO];
        const result = resolveContentEntryRepeaterItemTitle(noTextField, { flag: true }, 4);
        expect(result).toBe('Mục #5');
    });
});
