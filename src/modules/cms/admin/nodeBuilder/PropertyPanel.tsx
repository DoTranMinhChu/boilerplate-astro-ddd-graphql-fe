// src/modules/cms/admin/nodeBuilder/PropertyPanel.tsx
import { createSignal, Show, type Accessor, type JSX } from 'solid-js';
import { debounce } from '@solid-primitives/scheduled';
import { baseConfig } from '@core/components/config/BaseConfig';
import { Tabs } from '@core/components/tab/Tabs';
import { Input } from '@core/components/control/Input';
import { PropertyPanelHeader } from './PropertyPanelHeader';
import { t } from '@/shared/i18n/t';

/** Trailing-edge delay before a keystroke in the search box reaches the tabs.
 *
 * Not cosmetic — `InspectorSection` (Phase 4 Task 3) treats every CHANGE of `searchQuery` as a new
 * "search event" and force-opens each still-matching section. Wiring the raw `onChange` straight to
 * the signal would therefore re-open a section the admin had just manually collapsed on EVERY
 * keystroke that still matches. 250ms is short enough to feel live and long enough that this only
 * happens once per typed word rather than once per character. (350ms is `DatatableSearch`'s value,
 * but that one debounces a network round-trip; this is a local filter, so it can be snappier.) */
const SEARCH_DEBOUNCE_MS = 250;

export interface PropertyPanelProps {
    open: boolean;
    title: string;
    typeBadge?: string;
    icon?: string;
    showNodeActions: boolean;
    /** Used ONLY as the remount key for the `<Tabs>` subtree (see the `<Show ... keyed>` below),
     * so the active tab resets back to the first one whenever the selection moves to another
     * node. Deliberately NOT forwarded to `Tabs`' own `id` prop — `Tabs.tsx` uses `id` to persist
     * the active tab index in `sessionStorage`, which is the opposite of the reset behaviour the
     * design doc's §5 asks for. */
    selectedNodeId: string | undefined;
    onDuplicate: () => void;
    onDelete: () => void;
    onSaveAsComponent: () => void;
    onClose: () => void;
    /** Property Inspector Phase 4 — each tab is now a FUNCTION of the current (debounced) search
     * query rather than a bare `JSX.Element`, so `PropertyPanel` can own the search input's signal
     * while `NodeBuilder.page.tsx` still builds each tab's actual JSX (it has the node data, this
     * component doesn't). Every call site changes from `contentTab={<div>…</div>}` to
     * `contentTab={(searchQuery) => <div>…</div>}` — a mechanical wrap; forwarding `searchQuery()`
     * down into each tab's own `InspectorSection`s is Task 5's job, not this component's.
     *
     * The parameter is an ACCESSOR (`() => string`), NOT a plain `string`. That distinction is
     * load-bearing, not stylistic: this component calls the builder inside a reactive JSX position
     * (`<Tabs.Tab>{props.contentTab(searchQuery)}</Tabs.Tab>`, which `Tab.tsx` reads through a
     * `<Show>` memo). Passing the resolved string would make that memo track `searchQuery` itself,
     * so every query change would re-run the builder and rebuild the ENTIRE tab body from scratch —
     * discarding all local state inside it (which sections the admin had collapsed, an open colour
     * picker, an in-progress rich-text edit) on every debounce tick. Handing over the accessor
     * instead keeps the builder untracked (called once per tab activation) and pushes the
     * reactivity down to the individual `searchQuery={q()}` prop reads, which is where it belongs
     * in Solid. `PropertyPanel.test.tsx`'s "does not remount the tab body" case guards this. */
    contentTab: (searchQuery: Accessor<string>) => JSX.Element;
    styleTab: (searchQuery: Accessor<string>) => JSX.Element;
    effectsTab: (searchQuery: Accessor<string>) => JSX.Element;
    advancedTab: (searchQuery: Accessor<string>) => JSX.Element;
}

/** Replaces `InspectorPanel.tsx` — same absolute/overlay/`translate-x-full` slide behaviour
 * (kept verbatim; see NodeBuilder.page.tsx's own comment above the call site for why this is a
 * plain absolutely-positioned panel and not a Slideout/Dialog: it must never block Layers-panel
 * multi-select clicks underneath), now with a 4-tab body instead of one long flat scroll.
 *
 * The header itself lives in `PropertyPanelHeader.tsx` (icon + name + type badge +
 * Duplicate/Delete/More/Close). */
export function PropertyPanel(props: PropertyPanelProps) {
    /** Two signals on purpose: `inputValue` is the raw, every-keystroke value the `<Input>` shows
     * (so typing never feels laggy), `searchQuery` is the debounced one the tabs actually filter
     * on. Same split `DatatableSearch.tsx` uses for its own debounced search box. */
    const [inputValue, setInputValue] = createSignal('');
    const [searchQuery, setSearchQuery] = createSignal('');

    const commitQuery = debounce((next: string) => setSearchQuery(next), SEARCH_DEBOUNCE_MS);

    const handleSearchChange = (next: string) => {
        setInputValue(next ?? '');
        if (next) {
            commitQuery(next);
        } else {
            // Clearing (⌫ back to empty, or the clear button) applies IMMEDIATELY: waiting 250ms
            // to reveal the sections again is the one case where the debounce would be felt as
            // lag rather than as smoothing. Also cancels any keystroke still in flight, which
            // would otherwise land after this and re-apply the query that was just cleared.
            commitQuery.clear();
            setSearchQuery('');
        }
    };

    return (
        <div
            class={`absolute inset-y-0 right-0 z-30 flex w-full max-w-[480px] flex-col border-l border-nb-border bg-nb-bg shadow-2xl transition-transform duration-300 ${
                props.open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
            }`}
        >
            <PropertyPanelHeader
                title={props.title}
                typeBadge={props.typeBadge}
                icon={props.icon}
                showNodeActions={props.showNodeActions}
                onDuplicate={props.onDuplicate}
                onDelete={props.onDelete}
                onSaveAsComponent={props.onSaveAsComponent}
                onClose={props.onClose}
            />
            {/* Deliberately a plain `shrink-0` sibling of (not inside) the scroll container below,
                so it stays put without needing `sticky` — the scroll container is the next element,
                and this row is never inside it. `fieldless` keeps the Input out of any surrounding
                `Form` field registration: this is a view filter, not a persisted node field. */}
            <div class="shrink-0 border-b border-nb-border px-3 py-2">
                <Input
                    class="h-8 w-full"
                    value={inputValue()}
                    onChange={handleSearchChange}
                    placeholder={t('cms.nodeBuilder.propertySearchPlaceholder')}
                    icon={baseConfig().iconSearch()}
                    iconClass="text-nb-text-muted"
                    clearable
                    fieldless
                />
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto">
                {/* Keyed on `selectedNodeId`: `Tabs.tsx`'s `currentTabIndex` signal is only ever
                    reset to 0 in its OWN `onMount` — it exposes no prop to force a reset — so
                    without remounting the whole subtree, moving from a Frame (while viewing
                    "Nâng cao") to a Text node would leave the panel stuck on "Nâng cao".
                    `<Show keyed>` compares `when` by VALUE (`a === b`) rather than by
                    truthiness, and re-runs its children factory on every value change, which is
                    exactly the remount-on-change primitive needed here.

                    The children callback MUST declare a parameter: Solid's `Show` only takes the
                    render-function branch when `typeof children === 'function' && children.length
                    > 0` (solid-js 1.9 `flow.ts`). A zero-arg `() => ...` would fall through to the
                    "children is a plain value" branch and be returned from the memo as a bare
                    function, which `insert` then re-invokes inside a tracking render effect —
                    subtly different (and re-runnable) semantics. Hence the named-but-unused
                    parameter below. */}
                <Show when={props.selectedNodeId} keyed>
                    {(_selectedNodeId) => (
                        <Tabs
                            class="w-full"
                            /* Sticky so the tab strip stays reachable while a long tab body
                               scrolls — this div, not the strip, is the scroll container. */
                            labelContainerClass="sticky top-0 z-10 bg-nb-bg px-3 pt-2"
                            contentClass="mt-0 w-full"
                        >
                            {/* `searchQuery` is handed over UNCALLED — see the props doc above for
                                why calling it here would rebuild each tab body on every keystroke. */}
                            <Tabs.Tab label={t('cms.nodeBuilder.tabContent')}>{props.contentTab(searchQuery)}</Tabs.Tab>
                            <Tabs.Tab label={t('cms.nodeBuilder.tabStyle')}>{props.styleTab(searchQuery)}</Tabs.Tab>
                            <Tabs.Tab label={t('cms.nodeBuilder.tabEffects')}>{props.effectsTab(searchQuery)}</Tabs.Tab>
                            <Tabs.Tab label={t('cms.nodeBuilder.tabAdvanced')}>{props.advancedTab(searchQuery)}</Tabs.Tab>
                        </Tabs>
                    )}
                </Show>
            </div>
        </div>
    );
}
