// src/modules/cms/admin/nodeBuilder/InspectorPanel.tsx
import { Show, type JSX } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { IconButton } from '@core/components/control/IconButton';
import { t } from '@/shared/i18n/t';

export interface InspectorPanelProps {
    open: boolean;
    title: string;
    typeBadge?: string;
    icon?: string;
    onClose: () => void;
    children: JSX.Element;
}

/** Sticky header (display name + type badge + close) + scrollable body — replaces
 * NodeBuilder.page.tsx's inline Inspector `<div>` block. Keeps the EXACT same
 * absolute/overlay/`translate-x-full` slide behavior the current markup already
 * has (see NodeBuilder.page.tsx's own comment history: this is a non-modal,
 * absolutely-positioned panel, not a Slideout/Dialog, so it never blocks
 * Layers-panel multi-select clicks underneath it) — this already satisfies spec
 * §7 (drawer overlay, not a 4th flex column) at every viewport width, since
 * `absolute` takes it out of the parent's flex flow entirely. */
export function InspectorPanel(props: InspectorPanelProps) {
    return (
        <div
            class={`absolute inset-y-0 right-0 z-30 flex w-full max-w-[480px] flex-col border-l border-nb-border bg-nb-bg shadow-2xl transition-transform duration-300 ${
                props.open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
            }`}
        >
            <div class="flex shrink-0 items-center gap-2 border-b border-nb-border px-4 py-3">
                <Show when={props.icon}>
                    <Icon name={props.icon!} class="w-4 h-4 text-nb-text-muted" />
                </Show>
                <span class="flex-1 truncate text-base font-medium text-nb-text">{props.title}</span>
                <Show when={props.typeBadge}>
                    <span class="rounded-nb-sm bg-nb-bg-subtle px-1.5 py-0.5 text-[10px] font-medium uppercase text-nb-text-muted">
                        {props.typeBadge}
                    </span>
                </Show>
                <IconButton
                    size="sm"
                    title={t('common.close')}
                    icon={<Icon name="heroicons-solid:x-mark" class="w-4 h-4" />}
                    onClick={props.onClose}
                />
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto">{props.children}</div>
        </div>
    );
}
