// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { InspectorSection } from './InspectorSection';

describe('InspectorSection', () => {
    it('does not show a modified dot or reset button by default', () => {
        const { queryByLabelText, queryByTitle } = render(() => (
            <InspectorSection title="Typography">content</InspectorSection>
        ));
        expect(queryByLabelText('modified')).toBeNull();
        expect(queryByTitle('Đặt lại')).toBeNull();
    });

    it('shows a modified dot when isModified is true, and no reset button without onReset', () => {
        const { getByLabelText, queryByTitle } = render(() => (
            <InspectorSection title="Typography" isModified>content</InspectorSection>
        ));
        expect(getByLabelText('modified')).toBeTruthy();
        expect(queryByTitle('Đặt lại')).toBeNull();
    });

    it('shows a reset button only when isModified is true AND onReset is provided, and calls onReset on click', () => {
        const onReset = vi.fn();
        const { getByTitle } = render(() => (
            <InspectorSection title="Typography" isModified onReset={onReset}>content</InspectorSection>
        ));
        fireEvent.click(getByTitle('Đặt lại'));
        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('existing collapse/expand behavior still works with the new props absent', () => {
        const { getByText, queryByText } = render(() => (
            <InspectorSection title="Typography">
                <p>field content</p>
            </InspectorSection>
        ));
        expect(queryByText('field content')).toBeTruthy();
        fireEvent.click(getByText('Typography'));
        expect(queryByText('field content')).toBeNull();
    });

    it('is expanded by default and shows its children', () => {
        const { getByText } = render(() => (
            <InspectorSection title="Layout"><div>child content</div></InspectorSection>
        ));
        expect(getByText('child content')).toBeTruthy();
    });

    it('collapses on header click, hiding children', async () => {
        const { getByText, queryByText } = render(() => (
            <InspectorSection title="Layout"><div>child content</div></InspectorSection>
        ));
        await fireEvent.click(getByText('Layout'));
        expect(queryByText('child content')).toBeNull();
    });

    it('respects defaultOpen=false', () => {
        const { queryByText } = render(() => (
            <InspectorSection title="Layout" defaultOpen={false}><div>child content</div></InspectorSection>
        ));
        expect(queryByText('child content')).toBeNull();
    });

    it('renders actions outside the collapse-toggle button (no nested buttons)', () => {
        const { container } = render(() => (
            <InspectorSection title="Layout" actions={<button type="button">Reset</button>}>
                <div>child</div>
            </InspectorSection>
        ));
        expect(container.querySelectorAll('button button').length).toBe(0);
    });

    it('the collapse toggle has aria-controls pointing to a real content element id', () => {
        const { getByRole, container } = render(() => (
            <InspectorSection title="Typography">content</InspectorSection>
        ));
        const toggle = getByRole('button', { expanded: true });
        const controlsId = toggle.getAttribute('aria-controls');
        expect(controlsId).toBeTruthy();
        expect(container.querySelector(`#${controlsId}`)).toBeTruthy();
    });
});
