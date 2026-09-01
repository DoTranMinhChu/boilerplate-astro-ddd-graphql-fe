// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createSignal } from 'solid-js';
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

describe('InspectorSection — searchQuery (Property Inspector Phase 4)', () => {
    it('renders normally when searchQuery is unset', () => {
        const { queryByText } = render(() => (
            <InspectorSection title="Typography">field content</InspectorSection>
        ));
        expect(queryByText('field content')).toBeTruthy();
    });

    it('renders nothing when searchQuery does not match the title (case-insensitive)', () => {
        const { container } = render(() => (
            <InspectorSection title="Typography" searchQuery="border">field content</InspectorSection>
        ));
        expect(container.textContent).toBe('');
    });

    it('renders when searchQuery matches the title case-insensitively, and force-opens a collapsed section', () => {
        // Note: "typo" (not "type") — "Typography" does NOT contain the substring "type"
        // (t-y-p-o-g... vs t-y-p-e diverge at the 4th character); "typo" is a genuine
        // case-insensitive substring match and exercises the same behavior.
        const { queryByText } = render(() => (
            <InspectorSection title="Typography" searchQuery="TYPO" defaultOpen={false}>field content</InspectorSection>
        ));
        expect(queryByText('field content')).toBeTruthy();
    });

    it('an empty-string searchQuery behaves the same as unset (no filtering)', () => {
        const { queryByText } = render(() => (
            <InspectorSection title="Typography" searchQuery="">field content</InspectorSection>
        ));
        expect(queryByText('field content')).toBeTruthy();
    });

    it('a section force-opened by a search match can still be manually collapsed by clicking the toggle (same query still matching)', () => {
        // Regression test for a Critical review finding on the original searchQuery
        // implementation: `isOpen()` used to OR the match into the open state
        // (`open() || matchesSearch()`), which made the collapse toggle permanently inert
        // for as long as any query kept matching — clicking it flipped the underlying
        // `open` signal, but the rendered/visible state never changed because `isOpen()`
        // stayed `true` regardless.
        const { getByText, queryByText } = render(() => (
            <InspectorSection title="Typography" searchQuery="TYPO" defaultOpen={false}>field content</InspectorSection>
        ));

        // Force-opened on mount by the matching query, despite defaultOpen={false}.
        expect(queryByText('field content')).toBeTruthy();

        // Manual click on the toggle — the query is UNCHANGED and still matches — must
        // still visibly collapse the section (content hidden), not be swallowed by the
        // search-match force-open.
        fireEvent.click(getByText('Typography'));
        expect(queryByText('field content')).toBeNull();
    });

    it('a query CHANGE that still matches re-triggers force-open, even if the section was manually collapsed under the previous (also matching) query', () => {
        const [query, setQuery] = createSignal('TYPO');
        const { getByText, queryByText } = render(() => (
            <InspectorSection title="Typography" searchQuery={query()} defaultOpen={false}>field content</InspectorSection>
        ));

        expect(queryByText('field content')).toBeTruthy();

        // Manually collapse while "TYPO" still matches.
        fireEvent.click(getByText('Typography'));
        expect(queryByText('field content')).toBeNull();

        // Editing the search text to a NEW value that also matches is treated as a fresh
        // "search event" and force-opens the section again, per spec.
        setQuery('TYPOGRAPH');
        expect(queryByText('field content')).toBeTruthy();
    });
});
