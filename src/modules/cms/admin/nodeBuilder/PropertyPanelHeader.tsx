// src/modules/cms/admin/nodeBuilder/PropertyPanelHeader.tsx
import { Show } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { IconButton } from '@core/components/control/IconButton';
import { Dropdown } from '@core/components/disclosure/Dropdown';
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

/** Sticky Inspector header: icon + name + type badge + Duplicate/Delete/More/Close. Replaces
 * InspectorPanel.tsx's inline header markup (kept as a separate component here, unlike the old
 * file's hand-rolled header, so PropertyPanel.tsx's own JSX stays focused on the tab shell).
 *
 * The "More" button uses the REAL `Dropdown` API (`src/core/components/disclosure/Dropdown.tsx`),
 * which is floating-ui-based, not a wrapping-component-with-a-`Button`-sub-component API —
 * `Dropdown` takes a `reference` (the trigger DOM node) and renders its menu as a sibling
 * positioned by floating-ui; there is no `Dropdown.Item`, only `Dropdown.Button` (a full-width
 * `label`+`icon` row that auto-closes the menu on click) and `Dropdown.Divider`. `IconButton`
 * doesn't forward a `ref` to its underlying `<button>`, so the trigger is wrapped in a plain
 * `<span>` to capture the DOM node — the same "ref a wrapping element, pass it as `reference`"
 * pattern already used by `DashboardAccount.tsx` and `ContentEntryUsagePanel.tsx`. No `onClick`
 * is attached to the trigger `IconButton` itself: `Dropdown`'s own click listener toggles on the
 * `reference` element via pointer-event bubbling — attaching a second onClick toggle there
 * creates two independent toggle mechanisms reacting to the same click and cancels itself out
 * (see `ContentEntryUsagePanel.tsx`'s identical comment for the exact QA bug this caused before).
 */
export function PropertyPanelHeader(props: PropertyPanelHeaderProps) {
    let moreTriggerRef: HTMLElement | undefined;

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
                <IconButton
                    size="sm"
                    title={t('cms.node.commands.duplicateLabel')}
                    icon={<Icon name="heroicons-outline:document-duplicate" class="w-4 h-4" />}
                    onClick={props.onDuplicate}
                />
                <IconButton
                    size="sm"
                    title={t('cms.node.tree.deleteButton')}
                    icon={<Icon name="heroicons-outline:trash" class="w-4 h-4" />}
                    onClick={props.onDelete}
                />
                <span ref={(el) => (moreTriggerRef = el)}>
                    <IconButton
                        size="sm"
                        title={t('cms.node.tree.moreOptionsButton')}
                        icon={<Icon name="heroicons-solid:ellipsis-vertical" class="w-4 h-4" />}
                    />
                </span>
                <Dropdown reference={moreTriggerRef!} placement="bottom-end">
                    <Dropdown.Button
                        label={t('cms.component.saveAsComponentButton')}
                        icon={<Icon name="heroicons-solid:cube" class="w-4 h-4" />}
                        onClick={props.onSaveAsComponent}
                    />
                </Dropdown>
            </Show>
            <IconButton
                size="sm"
                title={t('common.close')}
                icon={<Icon name="heroicons-solid:x-mark" class="w-4 h-4" />}
                onClick={props.onClose}
            />
        </div>
    );
}
