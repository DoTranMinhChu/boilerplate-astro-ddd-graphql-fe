import { For } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { mergeClass } from '@core/helpers/class';

export interface IconRadioOption<T extends string> {
    value: T;
    label: string;
    icon: string;
}
export interface IconRadioGroupProps<T extends string> {
    value: T | undefined;
    options: IconRadioOption<T>[];
    onChange: (value: T) => void;
    class?: string;
}

/** Icon-illustrated single-select group — the visual sibling of `SegmentedControl` for enum
 * fields where a small icon communicates the option faster than its label alone (motion
 * signature, header/footer layout variant). Standalone control (explicit value/onChange), wired
 * manually via `useForm()` at each call site exactly like `ColorControl` — NOT `createControl`/
 * `FieldContext`-native, so it must NOT be nested inside `<Datatable.Field>`/`<Field>` (that
 * would double-render a label, same caveat `ColorControl`'s own header comment documents). */
export function IconRadioGroup<T extends string>(props: IconRadioGroupProps<T>) {
    return (
        <div class={mergeClass('grid grid-cols-2 gap-2 sm:grid-cols-4', props.class)}>
            <For each={props.options}>
                {(opt) => (
                    <button
                        type="button"
                        onClick={() => props.onChange(opt.value)}
                        aria-pressed={props.value === opt.value}
                        classList={{
                            'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nb-accent': true,
                            'border-nb-accent bg-nb-accent text-white shadow-sm': props.value === opt.value,
                            'border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50': props.value !== opt.value,
                        }}
                    >
                        <Icon name={opt.icon} class="text-xl" />
                        <span class="text-xs font-medium leading-tight">{opt.label}</span>
                    </button>
                )}
            </For>
        </div>
    );
}
