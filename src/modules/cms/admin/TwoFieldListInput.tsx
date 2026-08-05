import { For } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Input } from '@core/components/control/Input';
import { Textarea } from '@core/components/control/Textarea';
import { Button } from '@core/components/button/Button';

export interface TwoFieldListInputProps {
    field1Key: string;
    field1Label: string;
    field2Key: string;
    field2Label: string;
    field2Multiline?: boolean;
    addLabel?: string;
}

/** Generic repeatable two-field-object list — covers every "heading + list of
 * {label, text}" shape in the CMS (timeline entries, accordion items, process
 * steps, contact columns) without a dedicated array editor per section type. */
export function TwoFieldListInput(props: TwoFieldListInputProps) {
    const { value, onChange } = createControl<Record<string, string>[]>('object_array', {});
    const items = () => value() || [];

    const update = (index: number, key: string, val: string) => {
        const next = [...items()];
        next[index] = { ...next[index], [key]: val };
        onChange(next);
    };
    const add = () => onChange([...items(), { [props.field1Key]: '', [props.field2Key]: '' }]);
    const remove = (index: number) => {
        const next = [...items()];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div class="space-y-2">
            <For each={items()}>
                {(item, index) => (
                    <div class="space-y-2 rounded-lg border border-neutral-200 p-3">
                        <Input value={item[props.field1Key]} onChange={(v) => update(index(), props.field1Key, String(v ?? ''))} placeholder={props.field1Label} fieldless />
                        {props.field2Multiline ? (
                            <Textarea value={item[props.field2Key]} onChange={(v) => update(index(), props.field2Key, String(v ?? ''))} placeholder={props.field2Label} rows={2} fieldless />
                        ) : (
                            <Input value={item[props.field2Key]} onChange={(v) => update(index(), props.field2Key, String(v ?? ''))} placeholder={props.field2Label} fieldless />
                        )}
                        <div class="flex justify-end">
                            <Button sm outline onClick={() => remove(index())}>Xoá</Button>
                        </div>
                    </div>
                )}
            </For>
            <Button sm onClick={add}>{props.addLabel ?? '+ Thêm dòng'}</Button>
        </div>
    );
}
