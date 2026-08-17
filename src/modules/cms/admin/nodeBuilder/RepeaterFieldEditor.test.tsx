// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { RepeaterFieldEditor } from './RepeaterFieldEditor';
import type { FieldDescriptor } from '@/modules/cms/node/node.fieldSchema.types';

const objectField: FieldDescriptor = {
    key: 'content.metrics',
    labelKey: 'cms.node.content.metricsLabel',
    control: 'repeater',
    repeaterItemShape: 'object',
    itemFields: [
        { key: 'label', labelKey: 'cms.node.content.metricLabelLabel', control: 'text' },
        { key: 'value', labelKey: 'cms.node.content.metricValueLabel', control: 'number' },
    ],
};

const stringField: FieldDescriptor = {
    key: 'content.items',
    labelKey: 'cms.node.content.itemsLabel',
    control: 'repeater',
    repeaterItemShape: 'string',
};

describe('RepeaterFieldEditor', () => {
    it('adds a new object row with default sub-field values', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <RepeaterFieldEditor field={objectField} value={[]} onChange={onChange} />);
        fireEvent.click(getByText(/\+/));
        expect(onChange).toHaveBeenCalledWith([{ label: undefined, value: undefined }]);
    });

    it('removes a row by index', () => {
        const onChange = vi.fn();
        const value = [{ label: 'A', value: 1 }, { label: 'B', value: 2 }];
        const { getAllByLabelText } = render(() => <RepeaterFieldEditor field={objectField} value={value} onChange={onChange} />);
        fireEvent.click(getAllByLabelText('remove-row')[0]);
        expect(onChange).toHaveBeenCalledWith([{ label: 'B', value: 2 }]);
    });

    it('reorders a row (move down swaps with the next row)', () => {
        const onChange = vi.fn();
        const value = [{ label: 'A', value: 1 }, { label: 'B', value: 2 }];
        const { getAllByLabelText } = render(() => <RepeaterFieldEditor field={objectField} value={value} onChange={onChange} />);
        fireEvent.click(getAllByLabelText('move-down')[0]);
        expect(onChange).toHaveBeenCalledWith([{ label: 'B', value: 2 }, { label: 'A', value: 1 }]);
    });

    it('adds a new string row as an empty string', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <RepeaterFieldEditor field={stringField} value={['x']} onChange={onChange} />);
        fireEvent.click(getByText(/\+/));
        expect(onChange).toHaveBeenCalledWith(['x', '']);
    });

    it('treats a null/undefined value as an empty list', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <RepeaterFieldEditor field={stringField} value={undefined} onChange={onChange} />);
        fireEvent.click(getByText(/\+/));
        expect(onChange).toHaveBeenCalledWith(['']);
    });
});
