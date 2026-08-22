// src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeDataBindingTab } from './NodeDataBindingTab';
import { t } from '@/shared/i18n/t';

describe('NodeDataBindingTab — itemIndex mode (local-repeater close-out, 2026-08-21)', () => {
    it('selecting the "Số thứ tự (STT)" option calls onChange({ mode: "itemIndex" })', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeDataBindingTab
                dataBinding={{ mode: 'static' }}
                availableFields={[{ key: 'title', label: 'Tiêu đề' }] as any}
                onChange={onChange}
            />
        ));
        const modeLabel = getByText(t('cms.node.dataBinding.modeLabel'));
        const modeInput = modeLabel.closest('div')!.querySelector('input')!;
        fireEvent.focus(modeInput);
        // DropdownSelect wires option selection via `onMouseDown` (not `onClick`, to avoid the
        // input's blur racing the selection) — see NodeContainerLayoutTab.test.tsx's identical
        // `fireEvent.mouseDown` pattern for this same Select component.
        fireEvent.mouseDown(getByText(t('cms.node.dataBinding.itemIndexLabel')));
        expect(onChange).toHaveBeenCalledWith({ mode: 'itemIndex' });
    });

    it('the bound-field picker does not render when mode is "itemIndex"', () => {
        const { queryByText } = render(() => (
            <NodeDataBindingTab
                dataBinding={{ mode: 'itemIndex' }}
                availableFields={[{ key: 'title', label: 'Tiêu đề' }] as any}
                onChange={vi.fn()}
            />
        ));
        expect(queryByText(t('cms.node.dataBinding.fieldLabel'))).toBeNull();
    });
});

describe('NodeDataBindingTab — mode Select reachability + mixedField mode (MixedFeed close-out, Task 1)', () => {
    it('the mode Select is NOT disabled when availableFields is empty (regression guard — itemIndex/mixedField must stay reachable)', () => {
        const { getByText } = render(() => (
            <NodeDataBindingTab
                dataBinding={{ mode: 'static' }}
                availableFields={[]}
                onChange={vi.fn()}
            />
        ));
        const modeLabel = getByText(t('cms.node.dataBinding.modeLabel'));
        const modeInput = modeLabel.closest('div')!.querySelector('input')! as HTMLInputElement;
        expect(modeInput.disabled).toBe(false);
    });

    it('selecting "mixedField" calls onChange({ mode: "mixedField" }) with no stale field', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeDataBindingTab
                dataBinding={{ mode: 'boundField', field: 'title' }}
                availableFields={[]}
                onChange={onChange}
            />
        ));
        const modeLabel = getByText(t('cms.node.dataBinding.modeLabel'));
        const modeInput = modeLabel.closest('div')!.querySelector('input')!;
        fireEvent.focus(modeInput);
        fireEvent.mouseDown(getByText(t('cms.node.dataBinding.mixedFieldLabel')));
        expect(onChange).toHaveBeenCalledWith({ mode: 'mixedField' });
    });

    it('the 3-slot field picker only renders when mode is "mixedField"', () => {
        const { queryByText } = render(() => (
            <NodeDataBindingTab
                dataBinding={{ mode: 'static' }}
                availableFields={[]}
                onChange={vi.fn()}
            />
        ));
        expect(queryByText(t('cms.node.dataBinding.mixedFieldSlotLabel'))).toBeNull();
    });

    it('the 3-slot field picker renders when mode is "mixedField", and selecting a slot calls onChange with the right field', () => {
        const onChange = vi.fn();
        const { getByText, getAllByText } = render(() => (
            <NodeDataBindingTab
                dataBinding={{ mode: 'mixedField' }}
                availableFields={[]}
                onChange={onChange}
            />
        ));
        expect(getByText(t('cms.node.dataBinding.mixedFieldSlotLabel'))).toBeTruthy();
        const slotLabel = getByText(t('cms.node.dataBinding.mixedFieldSlotLabel'));
        const slotInput = slotLabel.closest('div')!.querySelector('input')!;
        fireEvent.focus(slotInput);
        // With no field selected yet (`value=''`), this Select's closed-state display falls
        // back to showing the FIRST option's own label ("Tiêu đề") rather than a blank
        // placeholder — a pre-existing quirk of the shared Select component, not something new
        // here. Once focused/open, the SAME label text also appears as the real clickable list
        // item, so `getByText` matches both. The clickable option is the SECOND match in DOM
        // order (the closed-display copy renders first, is non-interactive, has no
        // `cursor-pointer` class) — index it explicitly rather than relying on `getByText`'s
        // single-match assumption.
        const options = getAllByText(t('cms.node.dataBinding.mixedFieldHeading'));
        fireEvent.mouseDown(options[options.length - 1]);
        expect(onChange).toHaveBeenCalledWith({ mode: 'mixedField', field: 'heading' });
    });
});
