// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeContainerLayoutTab } from './NodeContainerLayoutTab';

describe('NodeContainerLayoutTab', () => {
    it('shows the Columns field (not Direction/Wrap) and the real stored column count when display is "grid"', () => {
        const { getByText, getByDisplayValue, queryByText } = render(() => (
            <NodeContainerLayoutTab layout={{ display: 'grid', gridTemplate: 'repeat(3, 1fr)' }} onChange={vi.fn()} />
        ));
        expect(getByText('Số cột')).toBeTruthy();
        expect(getByDisplayValue('3')).toBeTruthy();
        expect(queryByText('Hướng')).toBeNull();
    });

    it('shows Direction/Wrap (not Columns) when display is "flex" (the default)', () => {
        const { getByText, queryByText } = render(() => <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} />);
        expect(getByText('Hướng')).toBeTruthy();
        expect(getByText('Tự động xuống dòng')).toBeTruthy();
        expect(queryByText('Số cột')).toBeNull();
    });

    it('writing a column count produces the exact repeat(N, 1fr) gridTemplate applyNodeLayout.ts expects', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <NodeContainerLayoutTab layout={{ display: 'grid', gridTemplate: 'repeat(3, 1fr)' }} onChange={onChange} />
        ));
        fireEvent.input(getByDisplayValue('3'), { target: { value: '4' } });
        expect(onChange).toHaveBeenCalledWith({ display: 'grid', gridTemplate: 'repeat(4, 1fr)' });
    });

    it('clearing the column count clears gridTemplate entirely (not an empty/invalid string)', () => {
        const onChange = vi.fn();
        const { getByDisplayValue } = render(() => (
            <NodeContainerLayoutTab layout={{ display: 'grid', gridTemplate: 'repeat(3, 1fr)' }} onChange={onChange} />
        ));
        fireEvent.input(getByDisplayValue('3'), { target: { value: '' } });
        expect(onChange).toHaveBeenCalledWith({ display: 'grid', gridTemplate: undefined });
    });

    it('does not misparse a non-uniform/hand-authored gridTemplate as a column count', () => {
        const { queryByDisplayValue } = render(() => (
            <NodeContainerLayoutTab layout={{ display: 'grid', gridTemplate: '200px 1fr' }} onChange={vi.fn()} />
        ));
        expect(queryByDisplayValue('200')).toBeNull();
    });
});
