import { For } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Input } from '@core/components/control/Input';
import { Editor } from '@core/components/control/Editor';
import { InputImage } from '@core/components/control/InputImage';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { Toggle } from '@core/components/control/Toggle';
import { Button } from '@core/components/button/Button';
import { DragList, DragHandle } from '@/modules/cms/admin/DragList';
import type { BlockFieldDefinition } from './blockField.types';

const fieldLabelClass = 'mb-1 text-[11px] font-medium text-neutral-400';

/** 1 field ở chế độ AMBIENT — không nhận value/onChange, đọc/ghi qua
 * <Field name="..."> bao ngoài. Dùng cho field TOP-LEVEL của 1 khối
 * trong ContentTab.tsx (xem Task 8). */
export function renderBlockFieldControl(field: BlockFieldDefinition) {
    switch (field.type) {
        case 'RICHTEXT':
            return <Editor />;
        case 'NUMBER':
            return <InputNumber placeholder={field.placeholder || field.label} />;
        case 'BOOLEAN':
            return <Toggle text={field.label} />;
        case 'IMAGE':
            return <InputImage />;
        case 'GALLERY':
            return <InputImage multiple={20} />;
        case 'SELECT':
            return <Select options={field.options || []} clearable />;
        case 'LINK':
            return <Input placeholder={field.placeholder || '/duong-dan'} />;
        case 'REPEATER':
            return <RepeaterFieldInput itemFields={field.itemFields || []} />;
        default:
            return <Input placeholder={field.placeholder || field.label} />;
    }
}

/** 1 field ở chế độ CONTROLLED (value/onChange tường minh) — dùng bên trong 1
 * item của REPEATER, nơi không có path <Field name="..."> ổn định (mỗi item
 * là 1 phần tử mảy, không phải 1 key cố định trên form). */
function renderControlledField(field: BlockFieldDefinition, value: any, onChange: (v: any) => void) {
    switch (field.type) {
        case 'RICHTEXT':
            return <Editor value={value} onChange={onChange} fieldless />;
        case 'NUMBER':
            return <InputNumber value={value} onChange={onChange} placeholder={field.placeholder || field.label} fieldless />;
        case 'BOOLEAN':
            return <Toggle text={field.label} value={value} onChange={onChange} fieldless />;
        case 'IMAGE':
            return <InputImage value={value} onChange={onChange} fieldless />;
        case 'GALLERY':
            return <InputImage multiple={20} value={value} onChange={onChange} fieldless />;
        case 'SELECT':
            return <Select options={field.options || []} value={value} onChange={onChange} clearable fieldless />;
        case 'LINK':
            return <Input value={value} onChange={onChange} placeholder={field.placeholder || '/duong-dan'} fieldless />;
        case 'REPEATER':
            return <RepeaterFieldInput itemFields={field.itemFields || []} value={value} onChange={onChange} fieldless />;
        default:
            return <Input value={value} onChange={onChange} placeholder={field.placeholder || field.label} fieldless />;
    }
}

/** Editor CONTROLLED cho 1 object theo `fields` — dùng đệ quy bên trong mỗi
 * item của RepeaterFieldInput (1 item = 1 object con theo `itemFields`). */
export function SchemaFieldsEditor(props: {
    fields: BlockFieldDefinition[];
    value?: Record<string, any>;
    onChange: (next: Record<string, any>) => void;
}) {
    const data = () => props.value || {};
    const update = (key: string, val: any) => props.onChange({ ...data(), [key]: val });

    return (
        <div class="space-y-3">
            <For each={props.fields}>
                {(field) => (
                    <div>
                        <p class={fieldLabelClass}>{field.label}{field.required ? ' *' : ''}</p>
                        {renderControlledField(field, data()[field.key], (v) => update(field.key, v))}
                    </div>
                )}
            </For>
        </div>
    );
}

/** Danh sách lặp lại (REPEATER) — mỗi item là 1 object theo `itemFields`.
 * Dùng chung 1 component cho cả 2 chế độ (ambient khi gọi không kèm
 * value/onChange, controlled khi gọi kèm value/onChange+fieldless) nhờ
 * `createControl` đã hỗ trợ sẵn cả 2 (xem TwoFieldListInput.tsx, cùng cơ chế).
 * Mutate item TẠI CHỖ (Object.assign) trước khi bọc mảng mới cho onChange —
 * giữ nguyên object reference của item để DragList không remount hàng đang gõ
 * dở (xem comment gốc trong TwoFieldListInput.tsx cho lý do đầy đủ). */
function RepeaterFieldInput(props: {
    itemFields: BlockFieldDefinition[];
    value?: Record<string, any>[];
    onChange?: (v: Record<string, any>[]) => void;
    fieldless?: boolean;
}) {
    const { value, onChange } = createControl<Record<string, any>[]>('object_array', {
        value: props.value,
        onChange: props.onChange,
        fieldless: props.fieldless,
    });
    const items = () => value() || [];

    const add = () => onChange([...items(), {}]);
    const updateItem = (index: number, patch: Record<string, any>) => {
        const next = [...items()];
        Object.assign(next[index], patch);
        onChange(next);
    };
    const remove = (index: number) => {
        const next = [...items()];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div class="space-y-2">
            <DragList items={items()} onReorder={onChange} class="space-y-2">
                {(item, index, dragHandle) => (
                    <div class="flex gap-2 rounded-lg border border-neutral-200 p-3">
                        <DragHandle {...dragHandle} />
                        <div class="flex-1">
                            <SchemaFieldsEditor fields={props.itemFields} value={item} onChange={(patch) => updateItem(index(), patch)} />
                        </div>
                        <Button sm outline onClick={() => remove(index())}>Xoá</Button>
                    </div>
                )}
            </DragList>
            <Button sm onClick={add}>+ Thêm mục</Button>
        </div>
    );
}
