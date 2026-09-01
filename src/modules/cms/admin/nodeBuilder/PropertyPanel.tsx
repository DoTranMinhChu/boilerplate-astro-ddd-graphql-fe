// src/modules/cms/admin/nodeBuilder/PropertyPanel.tsx
import { Show, type JSX } from 'solid-js';
import { Tabs } from '@core/components/tab/Tabs';
import { PropertyPanelHeader } from './PropertyPanelHeader';
import { t } from '@/shared/i18n/t';

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
    contentTab: JSX.Element;
    styleTab: JSX.Element;
    effectsTab: JSX.Element;
    advancedTab: JSX.Element;
}

/** Replaces `InspectorPanel.tsx` — same absolute/overlay/`translate-x-full` slide behaviour
 * (kept verbatim; see NodeBuilder.page.tsx's own comment above the call site for why this is a
 * plain absolutely-positioned panel and not a Slideout/Dialog: it must never block Layers-panel
 * multi-select clicks underneath), now with a 4-tab body instead of one long flat scroll.
 *
 * The header itself lives in `PropertyPanelHeader.tsx` (icon + name + type badge +
 * Duplicate/Delete/More/Close). */
export function PropertyPanel(props: PropertyPanelProps) {
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
                            <Tabs.Tab label={t('cms.nodeBuilder.tabContent')}>{props.contentTab}</Tabs.Tab>
                            <Tabs.Tab label={t('cms.nodeBuilder.tabStyle')}>{props.styleTab}</Tabs.Tab>
                            <Tabs.Tab label={t('cms.nodeBuilder.tabEffects')}>{props.effectsTab}</Tabs.Tab>
                            <Tabs.Tab label={t('cms.nodeBuilder.tabAdvanced')}>{props.advancedTab}</Tabs.Tab>
                        </Tabs>
                    )}
                </Show>
            </div>
        </div>
    );
}
