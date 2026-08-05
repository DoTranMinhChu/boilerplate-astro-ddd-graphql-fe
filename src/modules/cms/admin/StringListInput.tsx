import { For } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Input } from '@core/components/control/Input';
import { Button } from '@core/components/button/Button';

/** Repeatable plain-string list (industries, client logo labels...) — same
 * `object_array` control pattern as AnimationLayerArrayInput. */
export function StringListInput(props: { placeholder?: string; addLabel?: string }) {
    const { value, onChange } = createControl<string[]>('object_array', {});
    const items = () => value() || [];

    const update = (index: number, next: string) => {
        const list = [...items()];
        list[index] = next;
        onChange(list);
    };
    const add = () => onChange([...items(), '']);
    const remove = (index: number) => {
        const list = [...items()];
        list.splice(index, 1);
        onChange(list);
    };

    return (
        <div class="space-y-2">
            <For each={items()}>
                {(item, index) => (
                    <div class="flex gap-2">
                        <Input value={item} onChange={(v) => update(index(), String(v ?? ''))} placeholder={props.placeholder} fieldless class="flex-1" />
                        <Button sm outline onClick={() => remove(index())}>Xoá</Button>
                    </div>
                )}
            </For>
            <Button sm onClick={add}>{props.addLabel ?? '+ Thêm dòng'}</Button>
        </div>
    );
}
