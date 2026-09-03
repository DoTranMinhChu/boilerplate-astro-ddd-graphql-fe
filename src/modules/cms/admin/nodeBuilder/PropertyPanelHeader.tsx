// src/modules/cms/admin/nodeBuilder/PropertyPanelHeader.tsx
import { Show } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { IconButton } from '@core/components/control/IconButton';
import { Dropdown } from '@core/components/disclosure/Dropdown';
import { Tooltip } from '@core/components/tooltip/Tooltip';
import { t } from '@/shared/i18n/t';

export interface PropertyPanelHeaderProps {
    title: string;
    typeBadge?: string;
    icon?: string;
    /** Hidden entirely when false — matches the spec's decision that Duplicate only makes sense
     * for a single selected node (multi-select shows a hint instead of tabs, same gate the old
     * InspectorPanel body already used). */
    showNodeActions: boolean;
    onDuplicate: () => void;
    onDelete: () => void;
    onSaveAsComponent: () => void;
    onClose: () => void;
}

/** Sticky Inspector header: icon + name + type badge + Duplicate/Delete/More/Close.
 *
 * Dropdown is floating-ui-based (no Dropdown.Item) — don't add a second onClick to the trigger,
 * Dropdown's own listener already toggles via bubbling, so a second one double-toggles and
 * cancels out (real bug hit before, see ContentEntryUsagePanel.tsx). Solid ref callbacks run
 * synchronously in JSX order, so a sibling can safely read an earlier ref.
 */
export function PropertyPanelHeader(props: PropertyPanelHeaderProps) {
    let moreTriggerRef: HTMLElement | undefined;
    let duplicateRef: HTMLElement | undefined;
    let deleteRef: HTMLElement | undefined;
    let closeRef: HTMLElement | undefined;

    return (
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
            <Show when={props.showNodeActions}>
                <span ref={(el) => (duplicateRef = el)}>
                    <IconButton
                        size="sm"
                        title={t('cms.node.commands.duplicateLabel')}
                        icon={<Icon name="heroicons-outline:document-duplicate" class="w-4 h-4" />}
                        onClick={props.onDuplicate}
                    />
                </span>
                <Tooltip reference={duplicateRef!} content={t('cms.node.commands.duplicateLabel')} placement="bottom" />
                <span ref={(el) => (deleteRef = el)}>
                    <IconButton
                        size="sm"
                        title={t('cms.node.tree.deleteButton')}
                        icon={<Icon name="heroicons-outline:trash" class="w-4 h-4" />}
                        onClick={props.onDelete}
                    />
                </span>
                <Tooltip reference={deleteRef!} content={t('cms.node.tree.deleteButton')} placement="bottom" />
                <span ref={(el) => (moreTriggerRef = el)}>
                    <IconButton
                        size="sm"
                        title={t('cms.node.tree.moreOptionsButton')}
                        icon={<Icon name="heroicons-solid:ellipsis-vertical" class="w-4 h-4" />}
                    />
                </span>
                <Tooltip reference={moreTriggerRef!} content={t('cms.node.tree.moreOptionsButton')} placement="bottom" />
                <Dropdown reference={moreTriggerRef!} placement="bottom-end">
                    <Dropdown.Button
                        label={t('cms.component.saveAsComponentButton')}
                        icon={<Icon name="heroicons-solid:cube" class="w-4 h-4" />}
                        onClick={props.onSaveAsComponent}
                    />
                </Dropdown>
            </Show>
            <span ref={(el) => (closeRef = el)}>
                <IconButton
                    size="sm"
                    title={t('common.close')}
                    icon={<Icon name="heroicons-solid:x-mark" class="w-4 h-4" />}
                    onClick={props.onClose}
                />
            </span>
            <Tooltip reference={closeRef!} content={t('common.close')} placement="bottom" />
        </div>
    );
}
