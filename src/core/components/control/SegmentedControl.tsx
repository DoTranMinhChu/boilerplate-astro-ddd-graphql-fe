import { For } from 'solid-js';
import { mergeClass } from '@core/helpers/class';

export interface SegmentedControlOption<T extends string> {
    value: T;
    label: string;
}

export interface SegmentedControlProps<T extends string> {
    value: T;
    options: SegmentedControlOption<T>[];
    onChange: (value: T) => void;
    class?: string;
}

/** Horizontal pill single-select group (Desktop/Tablet/Mobile breakpoint switcher,
 * etc). Accent background marks the active segment. */
export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
    return (
        <div class={mergeClass('inline-flex items-center gap-0.5 rounded-nb-sm bg-nb-bg-subtle p-0.5', props.class)}>
            <For each={props.options}>
                {(opt) => (
                    <button
                        type="button"
                        onClick={() => props.onChange(opt.value)}
                        aria-pressed={props.value === opt.value}
                        classList={{
                            'rounded-[4px] px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nb-accent': true,
                            'bg-nb-accent text-white shadow-sm': props.value === opt.value,
                            'text-nb-text-muted hover:text-nb-text': props.value !== opt.value,
                        }}
                    >
                        {opt.label}
                    </button>
                )}
            </For>
        </div>
    );
}
