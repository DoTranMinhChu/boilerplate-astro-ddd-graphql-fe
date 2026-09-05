// ddd-graphql-fe/src/modules/cms/admin/DataWorkspaceViewSwitcher.tsx
import { For } from 'solid-js';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';
import type { ViewMode } from '@/modules/cms/cms.types';

const MODE_ICON: Record<ViewMode, string> = {
    table: 'heroicons-outline:table-cells',
    card: 'heroicons-outline:squares-2x2',
    list: 'heroicons-outline:bars-3-bottom-left',
    grid: 'heroicons-outline:squares-plus',
    gallery: 'heroicons-outline:photo',
    kanban: 'heroicons-outline:view-columns',
};

export interface DataWorkspaceViewSwitcherProps {
    modes: ViewMode[];
    mode: ViewMode;
    onChange: (mode: ViewMode) => void;
}

/** Toolbar chuyển view mode (mục C design) — chỉ hiện các mode có trong `modes` (đã lọc qua
 * resolveActiveViewModes ở call site). 1 mode duy nhất -> vẫn render (không ẩn hẳn switcher)
 * để UI nhất quán giữa các content type. */
export function DataWorkspaceViewSwitcher(props: DataWorkspaceViewSwitcherProps) {
    return (
        <div class="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
            <For each={props.modes}>
                {(mode) => (
                    <button
                        type="button"
                        class={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                            mode === props.mode ? 'bg-main-50 text-main' : 'text-neutral-500 hover:bg-neutral-50'
                        }`}
                        onClick={() => props.onChange(mode)}
                        title={t(`cms.viewSwitcher.${mode}` as any)}
                    >
                        <Icon name={MODE_ICON[mode]} />
                        <span class="hidden sm:inline">{t(`cms.viewSwitcher.${mode}` as any)}</span>
                    </button>
                )}
            </For>
        </div>
    );
}
