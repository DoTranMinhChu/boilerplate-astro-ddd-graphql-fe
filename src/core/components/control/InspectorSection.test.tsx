// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { InspectorSection } from './InspectorSection';

describe('InspectorSection', () => {
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
});
