// src/core/components/control/editor/Toolbar.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Toolbar } from '@core/components/control/editor/Toolbar';
import { t } from '@/shared/i18n/t';
import type { EditorCore } from '@core/components/control/editor/core/EditorCore';

function fakeCore(): EditorCore {
    return {
        on: () => () => {},
        isActive: () => false,
        exec: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
        root: document.createElement('div'),
    } as unknown as EditorCore;
}

describe('Toolbar restructure (Node Builder Inspector Polish, Task 10)', () => {
    it('always-visible cluster: bold/italic/underline/strike, one alignment control, lists, link, undo/redo all present', () => {
        const core = fakeCore();
        const { getByTitle } = render(() => <Toolbar core={() => core} />);
        for (const label of [t('editor.toolbar.bold'), t('editor.toolbar.italic'), t('editor.toolbar.underline'), t('editor.toolbar.strike'), t('editor.toolbar.bulletedList'), t('editor.toolbar.numberedList'), t('editor.toolbar.link'), t('editor.toolbar.undo'), t('editor.toolbar.redo')]) {
            expect(getByTitle(label)).toBeTruthy();
        }
    });

    it('less-common commands are NOT visible at the top level (moved into the overflow menu)', () => {
        const core = fakeCore();
        const { queryByTitle } = render(() => <Toolbar core={() => core} />);
        for (const label of [t('editor.toolbar.blockquote'), t('editor.toolbar.codeBlock'), t('editor.toolbar.horizontalLine'), t('editor.toolbar.outdent'), t('editor.toolbar.indent'), t('editor.toolbar.removeFormat')]) {
            expect(queryByTitle(label)).toBeNull();
        }
    });

    it('opening the "More formatting" overflow reveals every moved command', () => {
        const core = fakeCore();
        const { getByTitle, getByText } = render(() => <Toolbar core={() => core} />);
        getByText(t('editor.toolbar.moreFormatting')).click();
        for (const label of [t('editor.toolbar.blockquote'), t('editor.toolbar.codeBlock'), t('editor.toolbar.horizontalLine'), t('editor.toolbar.outdent'), t('editor.toolbar.indent'), t('editor.toolbar.removeFormat'), t('editor.toolbar.table'), t('editor.toolbar.embed')]) {
            expect(getByTitle(label)).toBeTruthy();
        }
    });

    it('clicking bold still calls core.exec("bold") exactly as before the restructure', () => {
        const core = fakeCore();
        const { getByTitle } = render(() => <Toolbar core={() => core} />);
        getByTitle(t('editor.toolbar.bold')).click();
        expect(core.exec).toHaveBeenCalledWith('bold');
    });
});

describe('Toolbar "More formatting" nested popover lifecycle — final-review fix', () => {
    it('the table-grid-picker does not spring back open when "More formatting" is reopened after being closed with it still open', () => {
        const core = fakeCore();
        const { getByTitle, getByText, queryByText } = render(() => <Toolbar core={() => core} />);

        // Open "More formatting".
        const moreButton = getByText(t('editor.toolbar.moreFormatting'));
        moreButton.click();

        // Open the nested table-grid-picker.
        getByTitle(t('editor.toolbar.table')).click();
        // Sanity: the picker's hover-count readout is now in the DOM.
        expect(queryByText('1 x 1')).toBeTruthy();

        // Close "More formatting" via its own toggle button — the table picker is still
        // logically "open" (showTablePicker never got reset by the old code).
        moreButton.click();
        expect(queryByText('1 x 1')).toBeNull();

        // Reopen "More formatting". Before the fix, the nested Floating remounted with
        // showTablePicker still `true` and sprang back open unprompted.
        moreButton.click();
        expect(queryByText('1 x 1')).toBeNull();

        // A fresh click on the table button still opens it normally.
        getByTitle(t('editor.toolbar.table')).click();
        expect(queryByText('1 x 1')).toBeTruthy();
    });
});
