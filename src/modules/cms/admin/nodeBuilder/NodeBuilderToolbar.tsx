import { Show } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { IconButton } from '@core/components/control/IconButton';
import { SegmentedControl } from '@core/components/control/SegmentedControl';
import { t } from '@/shared/i18n/t';
import type { Breakpoint } from '@/modules/cms/node/node.types';

export interface NodeBuilderToolbarProps {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    historyLabel?: string;
    gridSnapEnabled: boolean;
    onToggleGridSnap: () => void;
    onOpenHistory: () => void;
    breakpoint: Breakpoint;
    onBreakpointChange: (bp: Breakpoint) => void;
    effectsRevealed: boolean;
    onToggleEffects: () => void;
}

/** Right-hand action cluster of the Node Builder's top bar — extracted from
 * NodeBuilder.page.tsx's inline toolbar JSX (undo/redo, grid-snap, History),
 * restyled with IconButton/SegmentedControl. Same props/handlers as before, no
 * new state. The Desktop/Tablet/Mobile breakpoint switcher (previously only
 * inside the Inspector panel header, visible only once a node was selected)
 * moves here so it's visible at all times — a deliberate, disclosed change,
 * not a silent one. */
export function NodeBuilderToolbar(props: NodeBuilderToolbarProps) {
    return (
        <div class="flex items-center gap-2">
            <SegmentedControl
                value={props.breakpoint}
                onChange={props.onBreakpointChange}
                options={[
                    { value: 'desktop' as const, label: t('cms.node.responsive.desktop') },
                    { value: 'tablet' as const, label: t('cms.node.responsive.tablet') },
                    { value: 'mobile' as const, label: t('cms.node.responsive.mobile') },
                ]}
            />
            <div class="mx-1 h-5 w-px bg-nb-border" />
            <IconButton
                title={t('cms.nodeBuilder.undoButtonTooltip')}
                disabled={!props.canUndo}
                onClick={props.onUndo}
                icon={<Icon name="heroicons-solid:arrow-uturn-left" class="w-4 h-4" />}
            />
            <IconButton
                title={t('cms.nodeBuilder.redoButtonTooltip')}
                disabled={!props.canRedo}
                onClick={props.onRedo}
                icon={<Icon name="heroicons-solid:arrow-uturn-right" class="w-4 h-4" />}
            />
            <Show when={props.historyLabel}>
                <span class="max-w-[220px] truncate text-xs text-nb-text-muted" title={props.historyLabel}>
                    {props.historyLabel}
                </span>
            </Show>
            <IconButton
                title={t('cms.nodeBuilder.gridSnapToggleTooltip')}
                active={props.gridSnapEnabled}
                onClick={props.onToggleGridSnap}
                icon={<Icon name={props.gridSnapEnabled ? 'heroicons-solid:squares-2x2' : 'heroicons-outline:squares-2x2'} class="w-4 h-4" />}
            />
            <IconButton
                title={props.effectsRevealed ? t('cms.nodeBuilder.effectsHideTooltip') : t('cms.nodeBuilder.effectsRevealTooltip')}
                active={props.effectsRevealed}
                onClick={props.onToggleEffects}
                icon={<Icon name={props.effectsRevealed ? 'heroicons-solid:eye-slash' : 'heroicons-solid:eye'} class="w-4 h-4" />}
            />
            <IconButton
                title={t('cms.builder.historyButton')}
                onClick={props.onOpenHistory}
                icon={<Icon name="heroicons-outline:clock" class="w-4 h-4" />}
            />
        </div>
    );
}
