// src/modules/cms/admin/nodeBuilder/NodeGridItemTab.test.tsx
// @vitest-environment jsdom
//
// Property Inspector redesign, Task 5 (Phase 3) — this tab had NO reset mechanism at all
// before; adds the standard `isModified`/`onReset` InspectorSection pattern Phase 1 Task 9
// proved out on NodeStyleTab.tsx.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeGridItemTab } from './NodeGridItemTab';
import { t } from '@/shared/i18n/t';

describe('NodeGridItemTab', () => {
    it('round-trips colSpan/colStart', () => {
        const { getByDisplayValue } = render(() => (
            <NodeGridItemTab layout={{ colSpan: 4, colStart: 2 }} onChange={vi.fn()} />
        ));
        expect(getByDisplayValue('4')).toBeTruthy();
        expect(getByDisplayValue('2')).toBeTruthy();
    });

    it('typing a new colSpan writes it while preserving colStart', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <NodeGridItemTab layout={{ colSpan: 4, colStart: 2 }} onChange={onChange} />
        ));
        fireEvent.input(getByDisplayValue('4'), { target: { value: '6' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ colSpan: 6, colStart: 2 }));
    });
});

describe('NodeGridItemTab — modified indicator + reset (Property Inspector redesign, Task 5, Phase 3 — this tab had no reset mechanism at all before)', () => {
    const RESET_LABEL = t('cms.node.transform.resetButton');

    it('hides the reset button when colSpan/colStart are unset', () => {
        const { queryByTitle } = render(() => <NodeGridItemTab layout={{}} onChange={vi.fn()} />);
        expect(queryByTitle(RESET_LABEL)).toBeNull();
    });

    it('hides the reset button when layout is entirely absent', () => {
        const { queryByTitle } = render(() => <NodeGridItemTab onChange={vi.fn()} />);
        expect(queryByTitle(RESET_LABEL)).toBeNull();
    });

    it('shows the modified dot + reset button when colSpan is set', () => {
        const { getByText, getByTitle } = render(() => <NodeGridItemTab layout={{ colSpan: 4 }} onChange={vi.fn()} />);
        const section = getByText(t('cms.node.gridItem.title')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeTruthy();
        expect(getByTitle(RESET_LABEL)).toBeTruthy();
    });

    it('shows the modified dot when only colStart is set', () => {
        const { getByText } = render(() => <NodeGridItemTab layout={{ colStart: 3 }} onChange={vi.fn()} />);
        const section = getByText(t('cms.node.gridItem.title')).closest('.border-b') as HTMLElement;
        expect(section.querySelector('[aria-label="modified"]')).toBeTruthy();
    });

    it('clicking reset clears colSpan/colStart, preserving sibling LayoutProps keys owned by other tabs (x/direction)', () => {
        const onChange = vi.fn();
        const { getByTitle } = render(() => (
            <NodeGridItemTab layout={{ colSpan: 4, colStart: 2, x: 10, direction: 'row' }} onChange={onChange} />
        ));
        fireEvent.click(getByTitle(RESET_LABEL));
        expect(onChange).toHaveBeenCalledWith({
            colSpan: undefined,
            colStart: undefined,
            x: 10,
            direction: 'row',
        });
    });
});
