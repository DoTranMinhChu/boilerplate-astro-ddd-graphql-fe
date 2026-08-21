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
