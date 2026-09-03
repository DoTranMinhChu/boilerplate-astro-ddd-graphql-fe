// src/modules/cms/admin/RelationFieldInput.test.tsx
// @vitest-environment jsdom
//
// Post-Phase-8 content build-out dogfooding find: RelationFieldInput's option-label
// fallback used `data.slug` when the Content Type builder's "Hiển thị theo field"
// (displayField) wasn't configured — the common case, since nothing prompts an admin
// to set it while creating a Quan hệ field. But ContentEntry dropped its hardcoded
// `slug` column (mục γ, Task 5) and no admin-defined Content Type has a field literally
// named "slug" (confirmed live against 10 real Content Types built in this session:
// Sản phẩm, Game, Khóa học, Món ăn, ... all start with a "ten" field, never "slug"), so
// the fallback always fell straight through to the raw entry UUID — every relation
// dropdown showed a column of unreadable UUIDs instead of names. Reproduced live in the
// admin Content Entry form for "Sản phẩm"'s "Danh mục" (Quan hệ→Danh mục sản phẩm)
// field. Fix: fall back to the first non-empty string value found in `data` (same
// "first TEXT field" spirit as `entryDisplayName()` in manageContentEntries.page.tsx)
// instead of the dead `slug` convention.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@solidjs/testing-library';
import { RelationFieldInput } from '@modules/cms/admin/RelationFieldInput';

vi.mock('@/shared/services/contentEntry/contentEntry.service', () => ({
    ContentEntryService: {
        getAllContentEntry: vi.fn(async () => ({
            edges: [
                { node: { id: 'cat-1', data: { ten: 'Thức ăn vặt', slugAlt: 'thuc-an-vat' } } },
                { node: { id: 'cat-2', data: { ten: 'Thức ăn khô', slugAlt: 'thuc-an-kho' } } },
            ],
        })),
    },
}));

describe('RelationFieldInput — option label fallback', () => {
    it('shows the first string field value ("ten") as the option label, not the raw entry id', async () => {
        const { container, getByText, queryByText } = render(() => (
            <RelationFieldInput contentTypeId="ct-danh-muc" onChange={vi.fn()} fieldless />
        ));
        const input = container.querySelector('input')!;
        await waitFor(() => fireEvent.focus(input));

        await waitFor(() => expect(getByText('Thức ăn vặt')).toBeTruthy());
        expect(getByText('Thức ăn khô')).toBeTruthy();
        expect(queryByText('cat-1')).toBeNull();
        expect(queryByText('cat-2')).toBeNull();
    });

    it('prefers the explicit displayField over the first-string-value fallback when configured', async () => {
        const { container, getByText, queryByText } = render(() => (
            <RelationFieldInput contentTypeId="ct-danh-muc" displayField="slugAlt" onChange={vi.fn()} fieldless />
        ));
        const input = container.querySelector('input')!;
        await waitFor(() => fireEvent.focus(input));

        await waitFor(() => expect(getByText('thuc-an-vat')).toBeTruthy());
        expect(queryByText('Thức ăn vặt')).toBeNull();
    });
});
