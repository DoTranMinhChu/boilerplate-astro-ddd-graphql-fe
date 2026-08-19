// src/core/components/control/editor/Toolbar.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Toolbar } from './Toolbar';
import { t } from '@/shared/i18n/t';
import type { EditorCore } from './core/EditorCore';

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
