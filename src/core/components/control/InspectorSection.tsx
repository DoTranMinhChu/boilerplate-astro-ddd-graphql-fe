import { createSignal, Show, type JSX } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { mergeClass } from '@core/helpers/class';

export interface InspectorSectionProps {
    title: string;
    icon?: string;
    defaultOpen?: boolean;
    actions?: JSX.Element;
    children: JSX.Element;
    class?: string;
}

/** Collapsible Inspector section: icon + uppercase title + chevron, single bottom
 * divider (no per-row borders inside). `actions` (e.g. a per-section "Reset"
 * button) renders as a SIBLING of the collapse-toggle button, not nested inside
 * it — a `<button>` inside a `<button>` is invalid HTML. */
export function InspectorSection(props: InspectorSectionProps) {
    const [open, setOpen] = createSignal(props.defaultOpen ?? true);
    return (
        <div class={mergeClass('border-b border-nb-border', props.class)}>
            <div class="flex items-center gap-2 px-4 py-2.5">
                <button
                    type="button"
                    class="flex flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nb-accent"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open()}
                >
                    <Show when={props.icon}>
                        <Icon name={props.icon!} class="w-4 h-4 text-nb-text-muted" />
                    </Show>
                    <span class="flex-1 text-xs font-semibold uppercase tracking-wide text-nb-text-muted">{props.title}</span>
                    <Icon
                        name="heroicons-solid:chevron-down"
                        class={mergeClass('w-3.5 h-3.5 text-nb-text-muted transition-transform', !open() && '-rotate-90')}
                    />
                </button>
                <Show when={props.actions}>{props.actions}</Show>
            </div>
            <Show when={open()}>
                <div class="px-4 pb-4">{props.children}</div>
            </Show>
        </div>
    );
}
