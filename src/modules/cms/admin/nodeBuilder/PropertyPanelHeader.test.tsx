// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { PropertyPanelHeader } from './PropertyPanelHeader';

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
});
