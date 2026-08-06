import { For, Show } from 'solid-js';
import {
    DragDropProvider,
    DragDropSensors,
    SortableProvider,
    createSortable,
    closestCenter,
    type DragEvent,
} from '@thisbeyond/solid-dnd';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { SECTION_TYPE_META } from '@/modules/cms/sectionRegistry';
import type { SectionDTO } from '@/modules/cms/cms.types';

// solid-dnd doesn't ship a JSX.Directives augmentation for `use:sortable` — the value
// passed via bare `use:sortable` (no ={}) is `true` per Solid's directive convention.
declare module 'solid-js' {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface Directives {
            sortable: boolean;
        }
    }
}

function blockSummary(section: SectionDTO): string {
    const content = (section.content || {}) as Record<string, any>;
    return content.heading || content.eyebrow || content.text || '';
}

function SortableRow(props: {
    section: SectionDTO;
    selected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onToggleEnabled: () => void;
    onDuplicate: () => void;
}) {
    const sortable = createSortable(props.section.id!);
    const meta = () => SECTION_TYPE_META[props.section.type ?? ''];
    const hidden = () => props.section.enabled === false;

    return (
        <div
            use:sortable
            classList={{ 'opacity-40': sortable.isActiveDraggable }}
            class={`group flex items-center gap-2 rounded-lg border-2 px-2.5 py-2 cursor-pointer transition ${
                props.selected ? 'border-primary-400 bg-primary-50' : 'border-transparent hover:border-neutral-200 hover:bg-neutral-50'
            }`}
            onClick={props.onSelect}
            title={t('cms.builder.editBlockHint')}
        >
            <span class="cursor-grab text-neutral-300 hover:text-neutral-500" {...sortable.dragActivators} title={t('cms.builder.dragToReorderHint')}>
                <Icon name="heroicons-solid:bars-3" />
            </span>
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
                <Icon name={meta()?.icon ?? 'heroicons-solid:square-2-stack'} />
            </span>
            <div class="min-w-0 flex-1">
                <p class={`truncate text-sm font-medium ${hidden() ? 'text-neutral-400' : 'text-neutral-800'}`}>{meta() ? tOrLiteral(meta().labelKey) : props.section.type}</p>
                <Show when={blockSummary(props.section)}>
                    <p class="truncate text-xs text-neutral-400">{blockSummary(props.section)}</p>
                </Show>
            </div>
            <div class="flex shrink-0 items-center gap-0.5">
                <button
                    type="button"
                    class={`rounded p-1 hover:bg-neutral-100 ${hidden() ? 'text-amber-500 hover:text-amber-600' : 'text-neutral-300 hover:text-neutral-500'}`}
                    title={hidden() ? t('cms.builder.showBlockHint') : t('cms.builder.hideBlockHint')}
                    onClick={(e) => { e.stopPropagation(); props.onToggleEnabled(); }}
                >
                    <Icon name={hidden() ? 'heroicons-solid:eye-slash' : 'heroicons-solid:eye'} />
                </button>
                <button
                    type="button"
                    class="rounded p-1 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500"
                    title={t('cms.builder.duplicateBlockHint')}
                    onClick={(e) => { e.stopPropagation(); props.onDuplicate(); }}
                >
                    <Icon name="heroicons-solid:document-duplicate" />
                </button>
                <button
                    type="button"
                    class="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                    title={t('cms.builder.deleteBlockHint')}
                    onClick={async (e) => {
                        e.stopPropagation();
                        // `confirmAction()` (modal trong app) thay cho `window.confirm()` (popup
                        // trình duyệt) — đồng nhất giao diện với mọi hành động xoá khác trong CMS
                        // (Datatable.CellButtonDelete), và không bị nhầm là chưa có xác nhận.
                        const confirmed = await confirmAction().danger(() => t('cms.builder.deleteBlockConfirm'), { position: 'right', e });
                        if (confirmed) props.onDelete();
                    }}
                >
                    <Icon name="heroicons-solid:trash" />
                </button>
            </div>
        </div>
    );
}

export interface BlockListProps {
    sections: SectionDTO[];
    selectedId?: string;
    onSelect: (id: string) => void;
    onReorder: (orderedIds: string[]) => void;
    onAddBlock: () => void;
    onDelete: (id: string) => void;
    onToggleEnabled: (id: string) => void;
    onDuplicate: (id: string) => void;
}

export function BlockList(props: BlockListProps) {
    const ids = () => props.sections.map((s) => s.id!);

    const onDragEnd = ({ draggable, droppable }: DragEvent) => {
        if (!draggable || !droppable) return;
        const currentIds = ids();
        const fromIndex = currentIds.indexOf(draggable.id as string);
        const toIndex = currentIds.indexOf(droppable.id as string);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
        const next = [...currentIds];
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, draggable.id as string);
        props.onReorder(next);
    };

    return (
        <div class="flex h-full flex-col">
            <div class="flex items-center justify-between px-1 pb-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('cms.builder.blockListTitle')}</p>
            </div>

            <Button solid main wide class="mb-3 w-full" onClick={props.onAddBlock}>
                <Icon name="heroicons-solid:plus" /> {t('cms.builder.addBlockButton')}
            </Button>

            <div class="flex-1 space-y-1 overflow-y-auto scrollbar-custom pr-1">
                <Show when={props.sections.length > 0} fallback={<p class="px-1 py-6 text-center text-xs text-neutral-400">{t('cms.builder.emptyBlockList')}</p>}>
                    <DragDropProvider onDragEnd={onDragEnd} collisionDetector={closestCenter}>
                        <DragDropSensors>
                            <SortableProvider ids={ids()}>
                                <For each={props.sections}>
                                    {(section) => (
                                        <SortableRow
                                            section={section}
                                            selected={props.selectedId === section.id}
                                            onSelect={() => props.onSelect(section.id!)}
                                            onDelete={() => props.onDelete(section.id!)}
                                            onToggleEnabled={() => props.onToggleEnabled(section.id!)}
                                            onDuplicate={() => props.onDuplicate(section.id!)}
                                        />
                                    )}
                                </For>
                            </SortableProvider>
                        </DragDropSensors>
                    </DragDropProvider>
                </Show>
            </div>
        </div>
    );
}
