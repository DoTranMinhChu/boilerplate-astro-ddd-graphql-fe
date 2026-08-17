// @vitest-environment jsdom
//
// Named `.test.tsx` (not `.test.ts` as the plan literally shows) — this file renders real JSX
// (`<ContentDetailLayoutTab .../>`), which vitest.config.ts documents both esbuild's default
// `.ts` loader and tsc itself refuse to parse in a plain `.ts` file (JSX syntax is only legal in
// `.tsx`/`.jsx`) — the exact same reasoning RepeaterFieldEditor.test.tsx (Task 2) already
// established for this project. `include` already covers `src/**/*.test.tsx`.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { ContentDetailLayoutTab } from './ContentDetailLayoutTab';

describe('ContentDetailLayoutTab', () => {
    it('shows the no-fields hint when availableFields is empty', () => {
        const { getByText } = render(() => <ContentDetailLayoutTab fieldLayout={[]} availableFields={[]} onChange={vi.fn()} />);
        expect(getByText(/nằm trong khối/)).toBeTruthy();
    });

    it('adds a new layout row', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <ContentDetailLayoutTab fieldLayout={[]} availableFields={[{ key: 'title', label: 'Title', type: 'TEXT' } as any]} onChange={onChange} />
        ));
        fireEvent.click(getByText(/\+ Thêm trường/));
        expect(onChange).toHaveBeenCalledWith([{ key: '', slot: 'body', visible: true }]);
    });

    it('removes a row by index', () => {
        const onChange = vi.fn();
        const fieldLayout = [{ key: 'a', slot: 'body' as const, visible: true }, { key: 'b', slot: 'title' as const, visible: true }];
        const { getAllByRole } = render(() => (
            <ContentDetailLayoutTab fieldLayout={fieldLayout} availableFields={[{ key: 'a', label: 'A', type: 'TEXT' } as any, { key: 'b', label: 'B', type: 'TEXT' } as any]} onChange={onChange} />
        ));
        // Icon renders as a Web Component (`<iconify-icon>`), not a real `<svg>`, under jsdom —
        // select delete buttons by their icon's `icon` attribute instead (the "add" button has no
        // icon at all, so this cleanly picks out just the 2 per-row delete buttons).
        const deleteButtons = getAllByRole('button').filter((b) => b.querySelector('iconify-icon[icon="heroicons-outline:trash"]'));
        expect(deleteButtons).toHaveLength(2);
        fireEvent.click(deleteButtons[0]);
        expect(onChange).toHaveBeenCalledWith([fieldLayout[1]]);
    });
});
