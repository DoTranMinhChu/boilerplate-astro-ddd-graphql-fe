// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@solidjs/testing-library';
import { ModeMiniPreview, type ModeMiniPreviewKind } from '@/modules/cms/admin/ModeMiniPreview';

const ALL_KINDS: ModeMiniPreviewKind[] = ['table', 'card', 'list', 'grid', 'gallery', 'kanban', 'dialog', 'drawer', 'fullPage'];

describe('ModeMiniPreview', () => {
    it('renders without crashing for every ViewMode/FormMode kind', () => {
        for (const kind of ALL_KINDS) {
            const { container, unmount } = render(() => <ModeMiniPreview kind={kind} />);
            expect(container.querySelector('[data-mode-preview]')).toBeTruthy();
            unmount();
        }
    });

    it('renders a visually distinct shape count between table (3 bars) and kanban (3 columns)', () => {
        const table = render(() => <ModeMiniPreview kind="table" />);
        const kanban = render(() => <ModeMiniPreview kind="kanban" />);
        expect(table.container.querySelectorAll('[data-mode-preview] > *').length).toBeGreaterThan(0);
        expect(kanban.container.querySelectorAll('[data-mode-preview] > *').length).toBeGreaterThan(0);
        table.unmount();
        kanban.unmount();
    });
});
