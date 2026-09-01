// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { PropertyPanelHeader } from './PropertyPanelHeader';
import { t } from '@/shared/i18n/t';

describe('PropertyPanelHeader', () => {
    it('renders title and type badge', () => {
        const { getByText } = render(() => (
            <PropertyPanelHeader
                title="Khung"
                typeBadge="frame"
                showNodeActions
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onSaveAsComponent={vi.fn()}
                onClose={vi.fn()}
            />
        ));
        expect(getByText('Khung')).toBeTruthy();
        expect(getByText('frame')).toBeTruthy();
    });

    it('hides Duplicate/Delete/More when showNodeActions is false, keeps Close', () => {
        const { queryByTitle } = render(() => (
            <PropertyPanelHeader
                title="3 đã chọn"
                showNodeActions={false}
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onSaveAsComponent={vi.fn()}
                onClose={vi.fn()}
            />
        ));
        expect(queryByTitle('Nhân bản')).toBeNull();
        expect(queryByTitle('Xoá')).toBeNull();
        expect(queryByTitle('Thêm tuỳ chọn')).toBeNull();
        expect(queryByTitle('Đóng')).toBeTruthy();
    });

    it('calls onDuplicate/onDelete/onClose when their buttons are clicked', () => {
        const onDuplicate = vi.fn();
        const onDelete = vi.fn();
        const onClose = vi.fn();
        const { getByTitle } = render(() => (
            <PropertyPanelHeader
                title="Khung"
                showNodeActions
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onSaveAsComponent={vi.fn()}
                onClose={onClose}
            />
        ));
        fireEvent.click(getByTitle('Nhân bản'));
        fireEvent.click(getByTitle('Xoá'));
        fireEvent.click(getByTitle('Đóng'));
        expect(onDuplicate).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows a real Tooltip (not native title) on hover over the Duplicate button', async () => {
        const label = t('cms.node.commands.duplicateLabel');
        const { getByTitle, findByText } = render(() => (
            <PropertyPanelHeader
                title="Khung"
                showNodeActions
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onSaveAsComponent={vi.fn()}
                onClose={vi.fn()}
            />
        ));
        const btn = getByTitle(label);
        // Tooltip's `reference` is the wrapping <span>, not the <button> itself (IconButton
        // doesn't forward a ref) — same wrapper pattern this file already uses for the
        // `Dropdown reference={moreTriggerRef}` trigger.
        fireEvent.pointerEnter(btn.parentElement!);
        // The floating tooltip renders `content` as real text in the DOM (distinct from the
        // native `title` attribute, which never shows up via getByText/findByText) — this is
        // what proves a real Tooltip mounted, not just the native browser tooltip.
        expect(await findByText(label)).toBeTruthy();
    });

    it('shows a real Tooltip on hover over the always-visible Close button', async () => {
        const label = t('common.close');
        const { getByTitle, findByText } = render(() => (
            <PropertyPanelHeader
                title="3 đã chọn"
                showNodeActions={false}
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onSaveAsComponent={vi.fn()}
                onClose={vi.fn()}
            />
        ));
        const btn = getByTitle(label);
        fireEvent.pointerEnter(btn.parentElement!);
        expect(await findByText(label)).toBeTruthy();
    });
});
