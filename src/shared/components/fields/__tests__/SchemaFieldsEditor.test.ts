// @vitest-environment jsdom
//
// resolveRepeaterItemTitle is a pure function, but it lives inside
// SchemaFieldsEditor.tsx alongside Solid UI components (Button -> @solidjs/router's
// <A>) whose modules read `window`/call template() at import time (see
// vitest.config.ts's resolve.conditions:['browser'] + vite-plugin-solid for why the
// .tsx import itself resolves to real browser code). jsdom (already present in
// node_modules as a transitive dep) supplies that `window`/`document` — scoped to
// just this file so every other pure-logic test keeps the faster 'node' default.
import { describe, it, expect } from 'vitest';
import { resolveRepeaterItemTitle, computeNewItemIndex, computeClampedPage } from '../SchemaFieldsEditor';
import type { BlockFieldDefinition } from '../blockField.types';

describe('resolveRepeaterItemTitle', () => {
    const itemFields: BlockFieldDefinition[] = [
        { key: 'title', label: 'Tiêu đề', type: 'TEXT', isRepeaterTitleSource: true },
        { key: 'body', label: 'Nội dung', type: 'RICHTEXT' },
    ];

    it('dùng field có isRepeaterTitleSource=true khi có giá trị', () => {
        const result = resolveRepeaterItemTitle(itemFields, { title: 'Câu hỏi 1', body: 'Trả lời' }, 0);
        expect(result).toBe('Câu hỏi 1');
    });

    it('không có field nào đánh dấu isRepeaterTitleSource -> fallback field TEXT đầu tiên', () => {
        const noMark: BlockFieldDefinition[] = [
            { key: 'title', label: 'Tiêu đề', type: 'TEXT' },
            { key: 'body', label: 'Nội dung', type: 'RICHTEXT' },
        ];
        const result = resolveRepeaterItemTitle(noMark, { title: 'Câu hỏi 2', body: 'Trả lời' }, 0);
        expect(result).toBe('Câu hỏi 2');
    });

    it('field đánh dấu rỗng -> fallback field TEXT đầu tiên có giá trị', () => {
        const result = resolveRepeaterItemTitle(itemFields, { title: '', body: 'Trả lời' }, 2);
        expect(result).toBe('Mục #3');
    });

    it('không có field TEXT nào có giá trị -> "Mục #N" (N = index+1)', () => {
        const noTextField: BlockFieldDefinition[] = [{ key: 'flag', label: 'Cờ', type: 'BOOLEAN' }];
        const result = resolveRepeaterItemTitle(noTextField, { flag: true }, 4);
        expect(result).toBe('Mục #5');
    });
});

describe('computeNewItemIndex', () => {
    it('trả về đúng độ dài mảng TRƯỚC khi thêm (index 0-based của mục vừa thêm)', () => {
        // Bug gốc: đọc items().length SAU khi onChange() đã chạy setValue() đồng
        // bộ -> lấy nhầm độ dài MỚI (N+1) thay vì độ dài CŨ (N). Hàm này nhận thẳng
        // độ dài CŨ nên phải trả lại chính giá trị đó.
        expect(computeNewItemIndex(0)).toBe(0);
        expect(computeNewItemIndex(5)).toBe(5);
    });
});

describe('computeClampedPage', () => {
    it('giữ nguyên page nếu vẫn còn trong phạm vi hợp lệ', () => {
        expect(computeClampedPage(0, 10, 10)).toBe(0);
        expect(computeClampedPage(1, 15, 10)).toBe(1);
    });

    it('clamp page về trang cuối cùng khi mảng co lại khiến page hiện tại không còn tồn tại', () => {
        // Kịch bản bug: 11 mục, đang ở trang 2 (page=1), xoá mục thứ 11 -> còn 10
        // mục -> chỉ còn 1 trang (index 0) -> phải clamp page 1 -> 0.
        expect(computeClampedPage(1, 10, 10)).toBe(0);
    });

    it('không clamp âm khi itemCount = 0 (luôn ít nhất 1 trang)', () => {
        expect(computeClampedPage(2, 0, 10)).toBe(0);
    });
});
