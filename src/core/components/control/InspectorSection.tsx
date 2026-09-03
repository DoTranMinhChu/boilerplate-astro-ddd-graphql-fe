import { createSignal, createUniqueId, createRenderEffect, Show, type JSX } from 'solid-js';
import { BaseIcon } from '@core/components/icon/BaseIcon';
import { IconButton } from '@core/components/control/IconButton';
import { mergeClass } from '@core/helpers/class';

export interface InspectorSectionProps {
    title: string;
    icon?: string;
    defaultOpen?: boolean;
    actions?: JSX.Element;
    children: JSX.Element;
    class?: string;
    /** True when any field in this section differs from its default — renders a small filled
     * dot next to the title. Phase 1 keeps the "what counts as modified" decision to each call
     * site (a section usually just checks "is any of my fields non-undefined"); this component
     * only renders the indicator, it never computes it. */
    isModified?: boolean;
    /** Resets exactly this section's fields — rendered as a ↺ icon-button, ONLY when `isModified`
     * is also true (no point showing "reset" on a section that's already at default). */
    onReset?: () => void;
    /** Label for the reset button (title attribute). Defaults to Vietnamese "Đặt lại" for
     * backwards compatibility; callers that support multiple locales should pass their own
     * translated label here. */
    resetButtonLabel?: string;
    /** Property Inspector Phase 4 — when set and non-empty, this section renders `null` entirely
     * unless `title` contains it (case-insensitive substring match). A match also force-opens an
     * otherwise-collapsed section (see the `createRenderEffect` below) — matching by SECTION TITLE
     * only (not by scanning every field label inside), which is the right scope for "jump to the
     * right group of fields fast" in a panel with ~140 individual controls. Force-open is a
     * one-shot reaction to a NEW match (mount or query change), not a standing override: a manual
     * toggle click afterward (same query) is respected. */
    searchQuery?: string;
}

/** Collapsible Inspector section: icon + uppercase title + chevron, single bottom
 * divider (no per-row borders inside). `actions` (e.g. a per-section "Reset"
 * button) renders as a SIBLING of the collapse-toggle button, not nested inside
 * it — a `<button>` inside a `<button>` is invalid HTML. */
export function InspectorSection(props: InspectorSectionProps) {
    const [open, setOpen] = createSignal(props.defaultOpen ?? true);
    const contentId = createUniqueId();

    const matchesSearch = () => {
        const q = props.searchQuery?.trim().toLowerCase();
        if (!q) return true;
        return props.title.toLowerCase().includes(q);
    };

    /** A search match force-opens an otherwise-collapsed section — but ONLY as a one-shot reaction
     * to the query itself producing a NEW match (mount with a query already set, or the query
     * changing while mounted), never as a standing override. This effect's tracked dependencies
     * are `props.searchQuery` and `matchesSearch()` (which itself reads `props.searchQuery` and
     * `props.title`) ONLY — it deliberately never reads `open()`/`isOpen()` — so once it has forced
     * `open` to `true`, a manual toggle click (which only ever writes `open` via `setOpen`, never
     * `searchQuery`) does not re-run this effect and therefore cannot be immediately overridden
     * back to `true`. The admin can then freely expand/collapse the matched section like any other,
     * until the query string changes again (which re-fires this effect and, if the new query still
     * matches, force-opens it again — treating a query edit as a new "search event").
     *
     * `createRenderEffect` (not `createEffect`) is required here: it runs synchronously during
     * Solid's render pass, so on initial mount with a matching `searchQuery` already set, `open`
     * is already `true` by the time the JSX below is constructed — no effect-flush microtask to
     * wait on, and no separate "isOpen" derivation needed. `open()` is read directly everywhere
     * below. */
    createRenderEffect(() => {
        if (props.searchQuery?.trim() && matchesSearch()) {
            setOpen(true);
        }
    });

    return (
        <Show when={matchesSearch()}>
            <div class={mergeClass('border-b border-nb-border', props.class)}>
                <div class="flex items-center gap-2 px-4 py-2.5">
                    <button
                        type="button"
                        class="flex flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nb-accent"
                        onClick={() => setOpen((v) => !v)}
                        aria-expanded={open()}
                        aria-controls={contentId}
                    >
                        <Show when={props.icon}>
                            <BaseIcon name={props.icon!} class="w-4 h-4 text-nb-text-muted" />
                        </Show>
                        <span class="flex-1 text-xs font-semibold uppercase tracking-wide text-nb-text-muted">{props.title}</span>
                        <Show when={props.isModified}>
                            <span aria-label="modified" class="h-1.5 w-1.5 rounded-full bg-nb-accent" />
                        </Show>
                        <BaseIcon
                            name="heroicons-solid:chevron-down"
                            class={mergeClass('w-3.5 h-3.5 text-nb-text-muted transition-transform', !open() && '-rotate-90')}
                        />
                    </button>
                    <Show when={props.isModified && props.onReset}>
                        <IconButton
                            size="sm"
                            title={props.resetButtonLabel ?? 'Đặt lại'}
                            icon={<BaseIcon name="heroicons-solid:arrow-uturn-left" class="w-3.5 h-3.5" />}
                            onClick={props.onReset}
                        />
                    </Show>
                    <Show when={props.actions}>{props.actions}</Show>
                </div>
                <Show when={open()}>
                    <div id={contentId} class="px-4 pb-4">{props.children}</div>
                </Show>
            </div>
        </Show>
    );
}
