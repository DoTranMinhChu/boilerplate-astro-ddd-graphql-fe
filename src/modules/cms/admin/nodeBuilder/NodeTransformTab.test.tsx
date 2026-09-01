// src/modules/cms/admin/nodeBuilder/NodeTransformTab.test.tsx
// @vitest-environment jsdom
//
// Property Inspector redesign, Task 5 (Phase 3) — converts this tab's pre-existing bespoke
// `actions`-based reset button (always visible, regardless of whether anything was set) into
// the standard `isModified`/`onReset` InspectorSection pattern Phase 1 Task 9 proved out on
// NodeStyleTab.tsx. Reuses the EXACT SAME `reset` function already defined in the component —
// only WHEN the button is shown changes (an intended UX improvement, not a regression: an
// always-visible reset on an already-empty section is exactly the noise Task 9 was introduced
// to fix elsewhere).
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeTransformTab } from './NodeTransformTab';
import { t } from '@/shared/i18n/t';

describe('NodeTransformTab', () => {
    it('round-trips x/y/width/height', () => {
        const { getByDisplayValue } = render(() => (
            <NodeTransformTab layout={{ x: 10, y: 20, width: 100, height: 50 }} onChange={vi.fn()} />
        ));
        expect(getByDisplayValue('10')).toBeTruthy();
        expect(getByDisplayValue('20')).toBeTruthy();
        expect(getByDisplayValue('100')).toBeTruthy();
        expect(getByDisplayValue('50')).toBeTruthy();
    });

    it('typing a new width writes it while preserving other layout fields', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <NodeTransformTab layout={{ x: 10, width: 100 }} onChange={onChange} />
        ));
        fireEvent.input(getByDisplayValue('100'), { target: { value: '200' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ x: 10, width: 200 }));
    });
});

describe('NodeTransformTab — modified indicator + reset (Property Inspector redesign, Task 5, Phase 3)', () => {
    const RESET_LABEL = t('cms.node.transform.resetButton');

    it('hides the reset button when x/y/width/height/rotation/zIndex are all unset (previously always visible)', () => {
        const { queryByTitle } = render(() => <NodeTransformTab layout={{}} onChange={vi.fn()} />);
        expect(queryByTitle(RESET_LABEL)).toBeNull();
    });

    it('hides the reset button when layout is entirely absent', () => {
        const { queryByTitle } = render(() => <NodeTransformTab onChange={vi.fn()} />);
        expect(queryByTitle(RESET_LABEL)).toBeNull();
    });

    it('shows the modified dot + reset button when x is set', () => {
        const { getByText, getByTitle } = render(() => <NodeTransformTab layout={{ x: 10 }} onChange={vi.fn()} />);
        const section = getByText(t('cms.node.transform.title')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeTruthy();
        expect(getByTitle(RESET_LABEL)).toBeTruthy();
    });

    it('shows the modified dot when only rotation is set', () => {
        const { getByText } = render(() => <NodeTransformTab layout={{ rotation: 15 }} onChange={vi.fn()} />);
        const section = getByText(t('cms.node.transform.title')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeTruthy();
    });

    it('shows the modified dot when only zIndex is set', () => {
        const { getByText } = render(() => <NodeTransformTab layout={{ zIndex: 3 }} onChange={vi.fn()} />);
        const section = getByText(t('cms.node.transform.title')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeTruthy();
    });

    it('clicking reset clears x/y/width/height/rotation/zIndex, preserving sibling LayoutProps keys owned by other tabs (colSpan/direction)', () => {
        const onChange = vi.fn();
        const { getByTitle } = render(() => (
            <NodeTransformTab
                layout={{ x: 10, y: 20, width: 100, height: 50, rotation: 15, zIndex: 3, colSpan: 4, direction: 'row' }}
                onChange={onChange}
            />
        ));
        fireEvent.click(getByTitle(RESET_LABEL));
        expect(onChange).toHaveBeenCalledWith({
            x: undefined,
            y: undefined,
            width: undefined,
            height: undefined,
            rotation: undefined,
            zIndex: undefined,
            colSpan: 4,
            direction: 'row',
        });
    });

    it('does not render a bare unconditional <button> reset anymore (no `actions` slot leftover)', () => {
        const { getByText, container } = render(() => <NodeTransformTab layout={{}} onChange={vi.fn()} />);
        const section = getByText(t('cms.node.transform.title')).closest('.border-b') as HTMLElement;
        // This tab's body has no <button> controls of its own (InputNumber/SliderInput only), so
        // the only <button> possible is the section's collapse-toggle — the old always-visible
        // bespoke reset button is gone entirely when unmodified.
        expect(section.querySelectorAll('button').length).toBe(1);
        expect(container.textContent).not.toContain(RESET_LABEL);
    });
});

/** Property Inspector Phase 4, Task 5 — `searchQuery` is threaded into this file's single
 * `InspectorSection`. */
describe('NodeTransformTab — searchQuery threading (Phase 4, Task 5)', () => {
    it('renders nothing when the query does not match the section title', () => {
        const { container } = render(() => (
            <NodeTransformTab layout={{ x: 10 }} onChange={vi.fn()} searchQuery="zzz-khong-ton-tai" />
        ));
        expect(container.textContent).toBe('');
    });

    it('still renders when the query matches the section title', () => {
        const { container } = render(() => (
            <NodeTransformTab layout={{ x: 10 }} onChange={vi.fn()} searchQuery={t('cms.node.transform.title')} />
        ));
        expect(container.textContent).toContain(t('cms.node.transform.title'));
    });

    it('renders normally when the query is empty', () => {
        const { container } = render(() => (
            <NodeTransformTab layout={{ x: 10 }} onChange={vi.fn()} searchQuery="" />
        ));
        expect(container.textContent).toContain(t('cms.node.transform.title'));
    });
});
