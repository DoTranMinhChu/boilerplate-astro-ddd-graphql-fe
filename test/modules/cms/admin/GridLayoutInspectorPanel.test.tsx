// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { GridLayoutInspectorPanel } from '@modules/cms/admin/GridLayoutInspectorPanel';
import type { FieldGridLayoutItem } from '@/modules/cms/cms.types';

const ITEM: FieldGridLayoutItem = { fieldKey: 'title', colStart: 2, colSpan: 4, rowStart: 1, rowSpan: 2 };

describe('GridLayoutInspectorPanel', () => {
    it('renders nothing when item is undefined', () => {
        const { container } = render(() => (
            <GridLayoutInspectorPanel item={undefined} fieldLabel="Title" onPatch={() => {}} onClose={() => {}} />
        ));
        expect(container.querySelector('input')).toBeNull();
    });

    it('shows the field label and the 4 numeric values pre-filled', () => {
        const { container } = render(() => (
            <GridLayoutInspectorPanel item={ITEM} fieldLabel="Title" onPatch={() => {}} onClose={() => {}} />
        ));
        const inputs = container.querySelectorAll('input[type="number"]');
        expect((inputs[0] as HTMLInputElement).value).toBe('2'); // colStart
        expect((inputs[1] as HTMLInputElement).value).toBe('4'); // colSpan
        expect((inputs[2] as HTMLInputElement).value).toBe('1'); // rowStart
        expect((inputs[3] as HTMLInputElement).value).toBe('2'); // rowSpan
    });

    it('calls onPatch with the changed field when a number input changes', () => {
        const onPatch = vi.fn();
        const { container } = render(() => (
            <GridLayoutInspectorPanel item={ITEM} fieldLabel="Title" onPatch={onPatch} onClose={() => {}} />
        ));
        const inputs = container.querySelectorAll('input[type="number"]');
        fireEvent.input(inputs[1], { target: { value: '7' } }); // colSpan is the 2nd numberField rendered
        expect(onPatch).toHaveBeenCalledWith({ colSpan: 7 });
    });

    it('calls onPatch with colStart when the 1st number input changes', () => {
        const onPatch = vi.fn();
        const { container } = render(() => (
            <GridLayoutInspectorPanel item={ITEM} fieldLabel="Title" onPatch={onPatch} onClose={() => {}} />
        ));
        const inputs = container.querySelectorAll('input[type="number"]');
        fireEvent.input(inputs[0], { target: { value: '3' } }); // colStart is the 1st numberField rendered
        expect(onPatch).toHaveBeenCalledWith({ colStart: 3 });
    });

    it('calls onPatch with rowStart when the 3rd number input changes', () => {
        const onPatch = vi.fn();
        const { container } = render(() => (
            <GridLayoutInspectorPanel item={ITEM} fieldLabel="Title" onPatch={onPatch} onClose={() => {}} />
        ));
        const inputs = container.querySelectorAll('input[type="number"]');
        fireEvent.input(inputs[2], { target: { value: '5' } }); // rowStart is the 3rd numberField rendered
        expect(onPatch).toHaveBeenCalledWith({ rowStart: 5 });
    });

    it('calls onPatch with rowSpan when the 4th number input changes', () => {
        const onPatch = vi.fn();
        const { container } = render(() => (
            <GridLayoutInspectorPanel item={ITEM} fieldLabel="Title" onPatch={onPatch} onClose={() => {}} />
        ));
        const inputs = container.querySelectorAll('input[type="number"]');
        fireEvent.input(inputs[3], { target: { value: '6' } }); // rowSpan is the 4th numberField rendered
        expect(onPatch).toHaveBeenCalledWith({ rowSpan: 6 });
    });

    it('clearing minHeight patches it to undefined rather than 0', () => {
        const onPatch = vi.fn();
        const withMinHeight = { ...ITEM, minHeight: 100 };
        const { container } = render(() => (
            <GridLayoutInspectorPanel item={withMinHeight} fieldLabel="Title" onPatch={onPatch} onClose={() => {}} />
        ));
        const minHeightInput = container.querySelectorAll('input[type="number"]')[4]; // 5th number field
        fireEvent.input(minHeightInput, { target: { value: '' } });
        expect(onPatch).toHaveBeenCalledWith({ minHeight: undefined });
    });

    it('calls onPatch with align when the select changes', () => {
        const onPatch = vi.fn();
        const { container } = render(() => (
            <GridLayoutInspectorPanel item={ITEM} fieldLabel="Title" onPatch={onPatch} onClose={() => {}} />
        ));
        const select = container.querySelector('select')!;
        fireEvent.change(select, { target: { value: 'center' } });
        expect(onPatch).toHaveBeenCalledWith({ align: 'center' });
    });

    it('calls onClose when the ✕ button is clicked', () => {
        const onClose = vi.fn();
        const { getByText } = render(() => (
            <GridLayoutInspectorPanel item={ITEM} fieldLabel="Title" onPatch={() => {}} onClose={onClose} />
        ));
        fireEvent.click(getByText('✕'));
        expect(onClose).toHaveBeenCalled();
    });
});
