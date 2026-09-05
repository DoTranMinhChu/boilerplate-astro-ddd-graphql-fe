import { For, Show, createSignal } from 'solid-js';
import { Dialog } from '@core/components/dialog/Dialog';
import { Input } from '@core/components/control/Input';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { DragList, DragHandle } from './DragList';
import { ContentTypeGroupService, type ContentTypeGroupDTO } from '@/shared/services/contentTypeGroup/contentTypeGroup.service';
import { t } from '@/shared/i18n/t';

/** "Khác"/ungrouped fallback (mục A design) — content type chưa gán nhóm, hoặc nhóm đã bị xoá
 * sau khi content type gán vào nó (groupId mồ côi, không FK cứng nên không tự dọn). */
export function resolveGroupLabel(groups: ContentTypeGroupDTO[], groupId?: string): string {
    const found = groupId ? groups.find((g) => g.id === groupId) : undefined;
    return found?.name ?? t('cms.contentTypeGroups.ungrouped');
}

export interface ManageContentTypeGroupsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    groups: ContentTypeGroupDTO[];
    /** Gọi lại sau khi tạo/sửa/xoá/sắp xếp thành công — cha tự refetch danh sách nhóm. */
    onChanged: () => void;
}

// `useConfirm()`/ConfirmContext tồn tại (2 file: ConfirmContext.tsx định nghĩa,
// ConfirmProvider.tsx implement) nhưng KHÔNG có call site thật nào dùng nó — mọi nơi
// khác trong codebase (CellButtonDelete.tsx, MenuTreeEditor.tsx, TermTreeEditor.tsx,
// PageVersionHistoryPanel.tsx) đều import trực tiếp `confirmAction` từ ConfirmProvider
// và gọi `confirmAction().danger(() => title, { content: () => description, ... })` —
// KHÔNG `confirm({title, description})` như phác thảo ban đầu của brief. Dùng đúng API
// thật (title/content đều là hàm trả JSX.Element, không phải chuỗi title/description
// object), mirror TermTreeEditor.tsx's handleDelete 1:1.
export function ManageContentTypeGroupsDialog(props: ManageContentTypeGroupsDialogProps) {
    const [newName, setNewName] = createSignal('');
    const [editingId, setEditingId] = createSignal<string | undefined>();
    const [editingName, setEditingName] = createSignal('');

    const handleCreate = async () => {
        const name = newName().trim();
        if (!name) return;
        await ContentTypeGroupService.createContentTypeGroup({ data: { name, order: props.groups.length } });
        setNewName('');
        toast().success(t('cms.contentTypeGroups.createSuccess'));
        props.onChanged();
    };

    const startEdit = (group: ContentTypeGroupDTO) => {
        setEditingId(group.id);
        setEditingName(group.name!);
    };

    const commitEdit = async () => {
        const id = editingId();
        if (!id) return;
        await ContentTypeGroupService.updateContentTypeGroup({ id, data: { name: editingName().trim() } });
        setEditingId(undefined);
        toast().success(t('cms.contentTypeGroups.updateSuccess'));
        props.onChanged();
    };

    const handleDelete = async (group: ContentTypeGroupDTO) => {
        const ok = await confirmAction().danger(() => t('cms.contentTypeGroups.deleteConfirmTitle'), {
            content: () => t('cms.contentTypeGroups.deleteConfirmDescription', { name: group.name || '' }),
            submitLabel: t('cms.contentTypeGroups.deleteConfirmSubmitLabel'),
            position: 'right',
        });
        if (!ok) return;
        await ContentTypeGroupService.deleteContentTypeGroup({ id: group.id! });
        toast().success(t('cms.contentTypeGroups.deleteSuccess'));
        props.onChanged();
    };

    const handleReorder = async (next: ContentTypeGroupDTO[]) => {
        await ContentTypeGroupService.reorderContentTypeGroups({
            items: next.map((g, index) => ({ id: g.id!, order: index })),
        });
        props.onChanged();
    };

    return (
        <Dialog id="manage-content-type-groups-dialog" isOpen={props.isOpen} onClose={props.onClose} md scrollable>
            <Dialog.Header title={t('cms.contentTypeGroups.dialogTitle')} />
            <Dialog.Body class="px-5 pb-6 space-y-4">
                <div class="flex gap-2">
                    <Input
                        value={newName()}
                        onChange={setNewName}
                        placeholder={t('cms.contentTypeGroups.newNamePlaceholder')}
                        fieldless
                        class="flex-1"
                    />
                    <Button onClick={handleCreate} disabled={!newName().trim()}>
                        {t('cms.contentTypeGroups.addButton')}
                    </Button>
                </div>

                <Show when={props.groups.length} fallback={<p class="text-sm text-neutral-400">{t('cms.contentTypeGroups.empty')}</p>}>
                    <DragList items={props.groups} onReorder={handleReorder} class="space-y-2">
                        {(group, _index, dragHandle) => (
                            <div class="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
                                <span {...dragHandle}><DragHandle /></span>
                                <Show
                                    when={editingId() === group.id}
                                    fallback={<span class="flex-1 text-sm font-medium text-neutral-800">{group.name}</span>}
                                >
                                    <Input value={editingName()} onChange={setEditingName} fieldless class="flex-1" />
                                </Show>
                                <Show
                                    when={editingId() === group.id}
                                    fallback={
                                        <Button sm outline icon={<Icon name="heroicons-outline:pencil" />} onClick={() => startEdit(group)} />
                                    }
                                >
                                    <Button sm onClick={commitEdit}>{t('cms.contentTypeGroups.saveButton')}</Button>
                                </Show>
                                <Button sm outline interactDanger icon={<Icon name="heroicons-outline:trash" />} onClick={() => handleDelete(group)} />
                            </div>
                        )}
                    </DragList>
                </Show>
            </Dialog.Body>
        </Dialog>
    );
}
