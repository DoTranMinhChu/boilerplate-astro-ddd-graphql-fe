// src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.tsx
//
// Admin Data Binding tab for the generic Node tree (Task 24/25) — static/boundField
// mode toggle + field picker, same standalone-control pattern as NodeStyleTab.tsx
// (no `<Form>`/`<Field>` context, so every control needs `fieldless`; no `label` prop
// on Select — labels are plain markup next to the control; `onChange` not `onInput`).
import { Show } from 'solid-js';
import { Select } from '@core/components/control/Select';
import type { DataBinding } from '@/modules/cms/node/node.types';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { t } from '@/shared/i18n/t';

export interface NodeDataBindingTabProps {
    dataBinding: DataBinding;
    /** Node-level data binding (2026-08-17) — field list của Content Type do node cha gần nhất
     * có `repeat.cardinality==='one'` cung cấp (xem NodeBuilder.page.tsx's `boundContentTypeId`
     * walk-up-ancestors, thay hẳn `Page.dataBinding` cũ đã bị gỡ cùng "Cấu hình trang Chi tiết")
     * — rỗng nếu không có ancestor nào như vậy, khi đó tab này chỉ cho phép "static". */
    availableFields: FieldDefinitionDTO[];
    onChange: (next: DataBinding) => void;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-neutral-500';

/** Static value vs. auto-bound-to-page-data toggle for a single tree Node — see
 * DataBinding (Task 10). Consumed by Task 27's NodeInspector. */
export function NodeDataBindingTab(props: NodeDataBindingTabProps) {
    const fieldOptions = () => props.availableFields
        .filter((f): f is FieldDefinitionDTO & { key: string } => !!f.key)
        .map((f) => ({ value: f.key, label: f.label || f.key }));

    return (
        <div class="flex flex-col gap-4 p-4">
            <div>
                <label class={LABEL_CLASS}>{t('cms.node.dataBinding.modeLabel')}</label>
                <Select
                    value={props.dataBinding.mode}
                    options={[
                        { value: 'static', label: t('cms.node.dataBinding.modeStatic') },
                        { value: 'boundField', label: t('cms.node.dataBinding.modeBound') },
                    ]}
                    disabled={props.availableFields.length === 0}
                    onChange={(v) => props.onChange({ ...props.dataBinding, mode: v as DataBinding['mode'] })}
                    fieldless
                />
            </div>
            <Show when={props.availableFields.length === 0}>
                <p class="text-xs text-neutral-500">{t('cms.node.dataBinding.noFieldsHint')}</p>
            </Show>
            <Show when={props.dataBinding.mode === 'boundField'}>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.dataBinding.fieldLabel')}</label>
                    <Select
                        value={props.dataBinding.field ?? ''}
                        options={fieldOptions()}
                        clearable
                        onChange={(v) => props.onChange({ ...props.dataBinding, field: v || undefined })}
                        fieldless
                    />
                </div>
            </Show>
        </div>
    );
}
