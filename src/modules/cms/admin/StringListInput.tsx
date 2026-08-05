import { For } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Input } from '@core/components/control/Input';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';

/** Repeatable plain-string list (industries, service options...) — same
 * `object_array` control pattern as AnimationLayerArrayInput. Reordered via
 * up/down buttons rather than drag: plain strings (unlike the object-array
 * inputs) have no stable identity to hand `DragList`, and duplicate values are
 * common in this kind of list, which is exactly where drag reordering would
 * misbehave without one. */
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
    const move = (index: number, direction: -1 | 1) => {
        const list = [...items()];
        const target = index + direction;
        if (target < 0 || target >= list.length) return;
        [list[index], list[target]] = [list[target], list[index]];
        onChange(list);
    };

    return (
        <div class="space-y-2">
            <For each={items()}>
                {(item, index) => (
                    <div class="flex items-center gap-1">
                        <div class="flex flex-col">
                            <button type="button" disabled={index() === 0} class="text-neutral-400 hover:text-neutral-700 disabled:opacity-25" onClick={() => move(index(), -1)}>
                                <Icon name="heroicons-solid:chevron-up" />
                            </button>
                            <button type="button" disabled={index() === items().length - 1} class="text-neutral-400 hover:text-neutral-700 disabled:opacity-25" onClick={() => move(index(), 1)}>
                                <Icon name="heroicons-solid:chevron-down" />
                            </button>
                        </div>
                        <Input value={item} onChange={(v) => update(index(), String(v ?? ''))} placeholder={props.placeholder} fieldless class="flex-1" />
                        <Button sm outline onClick={() => remove(index())}>Xoá</Button>
                    </div>
                )}
            </For>
            <Button sm onClick={add}>{props.addLabel ?? '+ Thêm dòng'}</Button>
        </div>
    );
}
