// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { IconButton } from '@core/components/control/IconButton';

describe('IconButton', () => {
    it('calls onClick when clicked', async () => {
        const onClick = vi.fn();
        const { getByRole } = render(() => <IconButton icon={<span>icon</span>} title="Undo" onClick={onClick} />);
        await fireEvent.click(getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('exposes the title as the accessible name', () => {
        const { getByRole } = render(() => <IconButton icon={<span>icon</span>} title="Undo" onClick={vi.fn()} />);
        expect(getByRole('button', { name: 'Undo' })).toBeTruthy();
    });

    it('applies an active-state class when active=true', () => {
        const { getByRole } = render(() => <IconButton icon={<span>icon</span>} title="Snap" active onClick={vi.fn()} />);
        expect(getByRole('button').className).toContain('bg-nb-accent');
    });

    it('does not call onClick when disabled', async () => {
        const onClick = vi.fn();
        const { getByRole } = render(() => <IconButton icon={<span>icon</span>} title="X" disabled onClick={onClick} />);
        await fireEvent.click(getByRole('button'));
        expect(onClick).not.toHaveBeenCalled();
    });
});
