// src/modules/cms/admin/nodeBuilder/InspectorPanel.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { InspectorPanel } from './InspectorPanel';

describe('InspectorPanel', () => {
    it('renders the title and type badge', () => {
        const { getByText } = render(() => (
            <InspectorPanel open title="Hero Frame" typeBadge="FRAME" onClose={vi.fn()}>
                <div>body</div>
            </InspectorPanel>
        ));
        expect(getByText('Hero Frame')).toBeTruthy();
        expect(getByText('FRAME')).toBeTruthy();
    });

    it('renders children in the scrollable body', () => {
        const { getByText } = render(() => (
            <InspectorPanel open title="Hero Frame" onClose={vi.fn()}>
                <div>tab content</div>
            </InspectorPanel>
        ));
        expect(getByText('tab content')).toBeTruthy();
    });

    it('calls onClose when the close button is clicked', async () => {
        const onClose = vi.fn();
        const { getByRole } = render(() => (
            <InspectorPanel open title="Hero Frame" onClose={onClose}>
                <div>body</div>
            </InspectorPanel>
        ));
        await fireEvent.click(getByRole('button'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('applies the slide-out (closed) class when open=false', () => {
        const { container } = render(() => (
            <InspectorPanel open={false} title="Hero Frame" onClose={vi.fn()}>
                <div>body</div>
            </InspectorPanel>
        ));
        expect(container.firstElementChild?.className).toContain('translate-x-full');
    });
});
