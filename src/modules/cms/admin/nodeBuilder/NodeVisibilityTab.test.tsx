// src/modules/cms/admin/nodeBuilder/NodeVisibilityTab.test.tsx
// @vitest-environment jsdom
//
// Property Inspector Phase 4, Task 5 — this component had NO test file at all before; created
// here for the `searchQuery` threading case the task requires (one per touched file), plus two
// baseline render assertions so the file isn't a single-purpose stub.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeVisibilityTab } from './NodeVisibilityTab';
import { t } from '@/shared/i18n/t';

describe('NodeVisibilityTab', () => {
    it('renders the section with its empty hint when there are no rules', () => {
        const { container } = render(() => <NodeVisibilityTab rules={undefined} onChange={vi.fn()} />);
        expect(container.textContent).toContain(t('cms.node.visibility.tabLabel'));
        expect(container.textContent).toContain(t('cms.node.visibility.emptyHint'));
    });

    it('adding a condition writes a default device condition', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <NodeVisibilityTab rules={undefined} onChange={onChange} />);
        fireEvent.click(getByText(t('cms.node.visibility.addButton')));
        expect(onChange).toHaveBeenCalledWith({
            logic: 'AND',
            conditions: [{ type: 'device', value: 'mobile' }],
        });
    });
});

/** `searchQuery` is threaded into this file's single `InspectorSection`. */
describe('NodeVisibilityTab — searchQuery threading (Phase 4, Task 5)', () => {
    it('renders nothing when the query does not match the section title', () => {
        const { container } = render(() => (
            <NodeVisibilityTab rules={undefined} onChange={vi.fn()} searchQuery="zzz-khong-ton-tai" />
        ));
        expect(container.textContent).toBe('');
    });

    it('still renders when the query matches the section title', () => {
        const { container } = render(() => (
            <NodeVisibilityTab rules={undefined} onChange={vi.fn()} searchQuery={t('cms.node.visibility.tabLabel')} />
        ));
        expect(container.textContent).toContain(t('cms.node.visibility.emptyHint'));
    });

    it('renders normally when the query is empty', () => {
        const { container } = render(() => (
            <NodeVisibilityTab rules={undefined} onChange={vi.fn()} searchQuery="" />
        ));
        expect(container.textContent).toContain(t('cms.node.visibility.emptyHint'));
    });
});
