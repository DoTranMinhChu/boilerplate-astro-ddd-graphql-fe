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
    // `grid-cols-2 sm:grid-cols-4` (the first version, caught live) forces the SAME column
    // count regardless of how many options exist or how narrow the parent is — a 2-option group
    // in a `col-span-4`/6-column-wide field still got squeezed into 4 columns, wrapping each
    // label letter-by-letter. `repeat(auto-fit, minmax(...))` sizes columns by available width
    // AND option count instead, so a 2-option group gets 2 comfortable columns and a 5-option
    // group (Theme's motion.signature) still wraps naturally onto a 2nd row.
    return (
        <div class={mergeClass('grid gap-2', props.class)} style={{ 'grid-template-columns': 'repeat(auto-fit, minmax(84px, 1fr))' }}>
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
