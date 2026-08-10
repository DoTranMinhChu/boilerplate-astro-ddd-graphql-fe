import { Accessor, Show, createEffect, createMemo, createResource, createSignal } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { generateFormlog } from '@core/components/dialog/Formlog';
import { useForm } from '@core/components/form/FormContext';
import type { FieldProps } from '@core/components/form/Field';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { toast } from '@core/components/toast/ToastProvider';
import { DragList, DragHandle } from './DragList';
import { MenuItemDTO, MenuService } from '@/shared/services/menu/menu.service';
import { PageService } from '@/shared/services/page/page.service';
import { EMenuItemTargetType } from '@shared/generated/typed-graphql';
import type { CreateMenuItemInput, UpdateMenuItemInput } from '@shared/generated/typed-graphql';
import type { Edge } from '@core/api/types';
import { t } from '@/shared/i18n/t';

const TARGET_TYPE_OPTIONS = () => [
    { value: EMenuItemTargetType.NONE, label: t('cms.menus.items.targetTypeOptions.none') },
    { value: EMenuItemTargetType.PAGE, label: t('cms.menus.items.targetTypeOptions.page') },
    { value: EMenuItemTargetType.URL, label: t('cms.menus.items.targetTypeOptions.url') },
    { value: EMenuItemTargetType.ANCHOR, label: t('cms.menus.items.targetTypeOptions.anchor') },
];

export interface MenuTreeEditorProps {
    menuId: string;
}

/** Quản lý MenuItem của 1 Menu — cây (parentId), luôn phân cấp (khác Term/Taxonomy, Menu
 * không có tuỳ chọn "phẳng" — 1 menu điều hướng luôn có thể có menu con).
 *
 * Mirror ĐÚNG TermTreeEditor.tsx (xem file đó cho rationale đầy đủ): kéo-thả
 * (DragList/@thisbeyond/solid-dnd) chỉ dùng để ĐỔI THỨ TỰ (order) trong cùng 1 nhóm cha — mỗi
 * cấp cha render 1 <DragList> riêng (đệ quy qua MenuItemGroup). Đổi CHA (parentId) dùng Select
 * "Chuyển cha" trong dialog sửa từng mục (BFS loại trừ chính nó + hậu duệ, giống
 * TermFormDialog.excludedIds) thay vì kéo-thả xuyên cấp — cùng lý do độ phức tạp không tương
 * xứng đã ghi ở TermTreeEditor.
 *
 * Khác Term ở 2 điểm: (1) không có slug; (2) mỗi mục có `targetType` (PAGE/URL/ANCHOR/NONE)
 * quyết định field nào trong pageId/url/anchor có giá trị — panel dialog hiện/ẩn tương ứng,
 * cùng pattern registry RELATION/TAXONOMY của FieldDefinitionArrayInput.tsx.
 */
export function MenuTreeEditor(props: MenuTreeEditorProps) {
    const [itemsResource, { refetch }] = createResource(
        () => props.menuId,
        (menuId) => MenuService.getMenuItemsByMenu({ menuId }),
    );

    const [localItems, setLocalItems] = createSignal<MenuItemDTO[]>([]);
    createEffect(() => {
        setLocalItems(itemsResource() || []);
    });

    // Danh sách trang để tra label hiển thị (dòng cây) + Select "Trang" trong dialog khi
    // targetType = PAGE — limit lớn, không phân trang thật (đúng khuôn contentTypeOptions ở
    // manageCmsPages.page.tsx: số Page hiếm khi vượt vài trăm).
    const [pagesResource] = createResource(() => PageService.getAllPage({ input: { limit: 500 } }));
    const pageOptions = createMemo(() =>
        ((pagesResource()?.edges || []) as Edge<{ id?: string; internalName?: string; path?: string }>[])
            .filter((e): e is Edge<{ id?: string; internalName?: string; path?: string }> & { node: { id?: string; internalName?: string; path?: string } } => !!e?.node)
            .map((e) => ({ value: e.node.id!, label: `${e.node.internalName} (${e.node.path})` })),
    );

    const [dialogState, setDialogState] = createSignal<{ item?: MenuItemDTO; parentId?: string } | null>(null);

    const persistOrder = async (updates: { id: string; order: number }[]) => {
        try {
            await Promise.all(updates.map((u) => MenuService.updateMenuItem({ id: u.id, data: { order: u.order } })));
        } catch (err: any) {
            toast().danger(t('cms.menus.items.reorderFailed'), err?.message);
            refetch();
        }
    };

    // Mutate `order` TẠI CHỖ trên chính các object đang sống trong localItems() rồi chỉ đổi
    // reference của MẢNG NGOÀI — cùng lý do DragList's stableKey() tra theo reference object,
    // xem chú giải đầy đủ ở TermTreeEditor.handleReorderGroup.
    const handleReorderGroup = (_parentId: string | undefined, next: MenuItemDTO[]) => {
        next.forEach((item, idx) => { item.order = idx; });
        setLocalItems((all) => [...all]);
        persistOrder(next.map((item, idx) => ({ id: item.id!, order: idx })));
    };

    const handleDelete = async (item: MenuItemDTO) => {
        const res = await confirmAction().danger(() => t('cms.menus.items.deleteConfirmTitle'), {
            content: () => t('cms.menus.items.deleteConfirmContent', { label: item.label || '' }),
            submitLabel: t('cms.menus.items.deleteConfirmSubmitLabel'),
            position: 'right',
        });
        if (!res) return;
        try {
            await MenuService.deleteMenuItem({ id: item.id! });
            toast().success(t('cms.toasts.saved'));
            refetch();
        } catch (err: any) {
            toast().danger(t('cms.menus.items.deleteFailed'), err?.message);
        }
    };

    const rootCount = createMemo(() => localItems().filter((item) => !item.parentId).length);

    return (
        <Card class="border-none shadow-sm">
            <div class="p-5 sm:p-6 space-y-5">
                <div class="flex items-center justify-between gap-3">
                    <p class="text-sm text-neutral-400 max-w-2xl">{t('cms.menus.items.description')}</p>
                    <Button
                        sm
                        solid
                        icon={<Icon name="heroicons-outline:plus" />}
                        label={t('cms.menus.items.addButton')}
                        onClick={() => setDialogState({})}
                    />
                </div>

                <Show
                    when={!itemsResource.loading}
                    fallback={<div class="py-10 text-center text-sm text-neutral-400">{t('cms.menus.items.loading')}</div>}
                >
                    <Show
                        when={rootCount() > 0}
                        fallback={
                            <div class="py-10 text-center text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
                                {t('cms.menus.items.emptyState')}
                            </div>
                        }
                    >
                        <MenuItemGroup
                            parentId={undefined}
                            depth={0}
                            allItems={localItems}
                            pageOptions={pageOptions}
                            onReorder={handleReorderGroup}
                            onEdit={(item) => setDialogState({ item })}
                            onDelete={handleDelete}
                            onAddChild={(parentId) => setDialogState({ parentId })}
                        />
                    </Show>
                </Show>
            </div>

            {/* LUÔN mount MenuItemFormDialog (không bọc <Show>) — xem giải thích đầy đủ ở call
              site tương đương trong TermTreeEditor.tsx (Modal chỉ dọn backdrop qua effect lắng
              isOpen true→false; unmount đột ngột bỏ lỡ effect đó, để lại backdrop chặn click). */}
            <MenuItemFormDialog
                menuId={props.menuId}
                allItems={localItems()}
                pageOptions={pageOptions}
                isOpen={dialogState() !== null}
                item={dialogState()?.item}
                defaultParentId={dialogState()?.parentId}
                onClose={() => setDialogState(null)}
                onSaved={() => { setDialogState(null); refetch(); }}
            />
        </Card>
    );
}

// ── MenuItemGroup: render 1 nhóm anh em (cùng parentId) qua DragList — đệ quy render nhóm
// con của mỗi mục, thụt lề theo depth. Luôn đệ quy (Menu không có chế độ "phẳng" như
// Taxonomy), khác TermGroup ở việc bỏ hẳn <Show when={hierarchical}>. ─────────────────────
function MenuItemGroup(props: {
    parentId: string | undefined;
    depth: number;
    allItems: Accessor<MenuItemDTO[]>;
    pageOptions: Accessor<{ value: string; label: string }[]>;
    onReorder: (parentId: string | undefined, next: MenuItemDTO[]) => void;
    onEdit: (item: MenuItemDTO) => void;
    onDelete: (item: MenuItemDTO) => void;
    onAddChild: (parentId: string) => void;
}) {
    const siblings = createMemo(() =>
        props.allItems()
            .filter((item) => (item.parentId || undefined) === props.parentId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    );

    const targetSummary = (item: MenuItemDTO): string => {
        switch (item.targetType) {
            case EMenuItemTargetType.PAGE:
                return props.pageOptions().find((p) => p.value === item.pageId)?.label || item.pageId || '—';
            case EMenuItemTargetType.URL:
                return item.url || '—';
            case EMenuItemTargetType.ANCHOR:
                return item.anchor ? `#${item.anchor}` : '—';
            default:
                return t('cms.menus.items.targetTypeOptions.none');
        }
    };

    return (
        <DragList items={siblings()} onReorder={(next) => props.onReorder(props.parentId, next)} class="space-y-2">
            {(item) => (
                <div>
                    <div
                        class="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3"
                        style={{ 'margin-left': `${props.depth * 1.75}rem` }}
                    >
                        <DragHandle />
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-neutral-900 truncate">{item.label}</p>
                            <code class="text-xs text-neutral-400">{targetSummary(item)}</code>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <Button
                                sm
                                outline
                                icon={<Icon name="heroicons-outline:plus" tooltip={t('cms.menus.items.addChildButton')} />}
                                onClick={() => props.onAddChild(item.id!)}
                            />
                            <Button
                                sm
                                outline
                                icon={<Icon name="heroicons-outline:pencil-square" tooltip={t('cms.menus.items.editHint')} />}
                                onClick={() => props.onEdit(item)}
                            />
                            <Button
                                sm
                                outline
                                interactDanger
                                icon={<Icon name="heroicons-outline:trash" tooltip={t('cms.menus.items.deleteHint')} />}
                                onClick={() => props.onDelete(item)}
                            />
                        </div>
                    </div>
                    <div class="mt-2 space-y-2">
                        <MenuItemGroup
                            parentId={item.id}
                            depth={props.depth + 1}
                            allItems={props.allItems}
                            pageOptions={props.pageOptions}
                            onReorder={props.onReorder}
                            onEdit={props.onEdit}
                            onDelete={props.onDelete}
                            onAddChild={props.onAddChild}
                        />
                    </div>
                </div>
            )}
        </DragList>
    );
}

// ── MenuItemFormDialog: tạo/sửa 1 MenuItem — Label, Select "Loại đích" (đổi hiện Select
// Trang / Input URL / Input anchor tương ứng, xem MenuItemTargetFields), và Select "Chuyển
// cha" (rationale đầy đủ ở JSDoc của MenuTreeEditor phía trên). ─────────────────────────────
function MenuItemFormDialog(props: {
    menuId: string;
    allItems: MenuItemDTO[];
    pageOptions: Accessor<{ value: string; label: string }[]>;
    isOpen: boolean;
    item?: MenuItemDTO;
    defaultParentId?: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    // Hàm, KHÔNG phải const boolean — dialog này mount VĨNH VIỄN (xem call site trong
    // MenuTreeEditor), tái dùng cho mọi lượt mở, nên phải đọc props.item MỚI NHẤT tại thời
    // điểm dùng (submit/render) thay vì chốt cứng 1 lần lúc mount — cùng lý do TermFormDialog.
    const isUpdate = () => !!props.item;

    // Loại trừ chính mục đang sửa + toàn bộ hậu duệ của nó khỏi lựa chọn "Chuyển cha" — BFS
    // 1-1 với TermFormDialog.excludedIds (tránh admin tự tạo vòng lặp cha/con qua UI; BE cũng
    // chặn ở assertNoCycle, lọc trước ở đây đỡ round-trip báo lỗi cho 1 lựa chọn vô nghĩa).
    const excludedIds = createMemo(() => {
        const selfId = props.item?.id;
        if (!selfId) return new Set<string>();
        const ids = new Set<string>([selfId]);
        let changed = true;
        while (changed) {
            changed = false;
            for (const item of props.allItems) {
                if (item.id && item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
                    ids.add(item.id);
                    changed = true;
                }
            }
        }
        return ids;
    });

    const parentOptions = createMemo(() => {
        const excluded = excludedIds();
        const byParent = (parentId: string | undefined) =>
            props.allItems
                .filter((item) => (item.parentId || undefined) === parentId && !excluded.has(item.id!))
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const options: { value: string; label: string }[] = [];
        const walk = (parentId: string | undefined, depth: number) => {
            byParent(parentId).forEach((item) => {
                options.push({ value: item.id!, label: `${'—'.repeat(depth)}${depth ? ' ' : ''}${item.label}` });
                walk(item.id, depth + 1);
            });
        };
        walk(undefined, 0);
        return options;
    });

    const siblingCount = (parentId: string | undefined) =>
        props.allItems.filter((item) => (item.parentId || undefined) === parentId).length;

    const { Formlog } = generateFormlog<Record<string, any>, MenuItemDTO>({
        handleSubmit: async (values) => {
            const label = (values.label as string) || '';
            const targetType = (values.targetType as EMenuItemTargetType) || EMenuItemTargetType.NONE;
            const parentId = (values.parentId as string) || undefined;
            try {
                let res: MenuItemDTO | undefined | null;
                // GraphQL client rớt hẳn key khỏi payload khi giá trị là `undefined` (xem chú
                // giải TermFormDialog.parentIdForPayload) — dùng `null` tường minh cho pageId/
                // url/anchor của các nhánh targetType KHÔNG được chọn, để BE thực sự dọn field
                // cũ khi admin đổi loại đích (vd PAGE -> URL không được để sót pageId cũ lại).
                // Nhánh ĐANG được chọn thì giữ `undefined` nếu để trống — BE (assertValidTarget)
                // sẽ từ chối rõ ràng "Thiếu pageId/url/anchor" thay vì lưu 1 targetType không có
                // đích thật.
                const pageIdForPayload = (targetType === EMenuItemTargetType.PAGE ? ((values.pageId as string) || undefined) : null) as string | undefined;
                const urlForPayload = (targetType === EMenuItemTargetType.URL ? ((values.url as string) || undefined) : null) as string | undefined;
                const anchorForPayload = (targetType === EMenuItemTargetType.ANCHOR ? ((values.anchor as string) || undefined) : null) as string | undefined;
                const parentIdForPayload = (parentId ?? null) as string | undefined;
                if (isUpdate()) {
                    const data: UpdateMenuItemInput = {
                        label,
                        targetType,
                        pageId: pageIdForPayload,
                        url: urlForPayload,
                        anchor: anchorForPayload,
                        parentId: parentIdForPayload,
                    };
                    const oldParentId = props.item!.parentId || undefined;
                    // Đổi cha → đặt lại order = cuối danh sách con của nhóm cha MỚI, tránh
                    // trùng order với anh em ở nhóm cũ — cùng lý do TermFormDialog.
                    if (oldParentId !== parentId) {
                        data.order = siblingCount(parentId);
                    }
                    res = await MenuService.updateMenuItem({ id: props.item!.id!, data });
                } else {
                    const data: CreateMenuItemInput = {
                        menuId: props.menuId,
                        label,
                        targetType,
                        pageId: pageIdForPayload,
                        url: urlForPayload,
                        anchor: anchorForPayload,
                        parentId: parentIdForPayload,
                        order: siblingCount(parentId),
                    };
                    res = await MenuService.createMenuItem({ data });
                }
                toast().success(t('cms.toasts.saved'));
                return res as MenuItemDTO;
            } catch (err: any) {
                toast().danger(t('cms.menus.items.saveFailed'), err?.message);
                throw err;
            }
        },
    });

    return (
        <Formlog
            id="MenuItemFormDialog"
            title={isUpdate() ? t('cms.menus.items.updateTitle') : t('cms.menus.items.createTitle')}
            submitLabel={isUpdate() ? t('cms.menus.items.updateTitle') : t('cms.menus.items.createTitle')}
            isOpen={props.isOpen}
            modalType="dialog"
            position="center"
            class="w-full sm:w-[520px] shadow-2xl rounded-xl overflow-hidden"
            bodyClass="p-0"
            initialValues={{
                label: props.item?.label || '',
                targetType: props.item?.targetType || EMenuItemTargetType.NONE,
                pageId: props.item?.pageId || '',
                url: props.item?.url || '',
                anchor: props.item?.anchor || '',
                parentId: props.item?.parentId || props.defaultParentId || '',
            }}
            onClose={props.onClose}
            onSubmitted={() => props.onSaved()}
        >
            <div class="col-span-full grid grid-cols-12 gap-x-4 gap-y-4 p-5 sm:p-6">
                <div class="col-span-12">
                    <Formlog.Field name="label" label={t('cms.menus.items.fields.label')} required>
                        <Input placeholder={t('cms.menus.items.fields.labelPlaceholder')} />
                    </Formlog.Field>
                </div>
                <div class="col-span-12">
                    {/* `Select` (KHÔNG phải `NativeSelect`) ở chế độ ambient — xem chú giải đầy
                      đủ ở TermFormDialog cho "Term cha": NativeSelect không tự nối vào
                      FieldContext nên không đọc/ghi được giá trị khi dùng ambient (không truyền
                      value/onChange tay). */}
                    <Formlog.Field name="targetType" label={t('cms.menus.items.fields.targetType')} required>
                        <Select options={TARGET_TYPE_OPTIONS()} />
                    </Formlog.Field>
                </div>
                <MenuItemTargetFields Field={Formlog.Field as (fieldProps: FieldProps) => JSX.Element} pageOptions={props.pageOptions} />
                <div class="col-span-12">
                    <Formlog.Field name="parentId" label={t('cms.menus.items.fields.parent')}>
                        <Select
                            options={parentOptions()}
                            clearable
                            emptyPlaceholder={t('cms.menus.items.fields.parentNone')}
                        />
                    </Formlog.Field>
                </div>
            </div>
        </Formlog>
    );
}

// Field "Loại đích" quyết định hiện Select Trang / Input URL / Input anchor tương ứng — theo
// dõi qua useForm() (FieldContext của Formlog bao ngoài) đúng khuôn TermSlugField (đọc field
// KHÁC do 1 control khác ghi ra để quyết định hiện/ẩn, cùng lớp reactivity mà panel RELATION
// của FieldDefinitionArrayInput.tsx dùng getField() tracked để tránh — đọc props.item.targetType
// thẳng ở đây sẽ không bao giờ re-run khi admin đổi Select "Loại đích").
function MenuItemTargetFields(props: {
    Field: (fieldProps: FieldProps) => JSX.Element;
    pageOptions: Accessor<{ value: string; label: string }[]>;
}) {
    const { value } = useForm();
    const targetType = () => (value('targetType' as any) as string) || EMenuItemTargetType.NONE;
    const Field = props.Field;

    return (
        <>
            <Show when={targetType() === EMenuItemTargetType.PAGE}>
                <div class="col-span-12">
                    <Field name="pageId" label={t('cms.menus.items.fields.page')} required>
                        <Select options={props.pageOptions()} clearable emptyPlaceholder={t('cms.menus.items.fields.pagePlaceholder')} />
                    </Field>
                </div>
            </Show>
            <Show when={targetType() === EMenuItemTargetType.URL}>
                <div class="col-span-12">
                    <Field name="url" label={t('cms.menus.items.fields.url')} required>
                        <Input placeholder={t('cms.menus.items.fields.urlPlaceholder')} />
                    </Field>
                </div>
            </Show>
            <Show when={targetType() === EMenuItemTargetType.ANCHOR}>
                <div class="col-span-12">
                    <Field name="anchor" label={t('cms.menus.items.fields.anchor')} required>
                        <Input placeholder={t('cms.menus.items.fields.anchorPlaceholder')} />
                    </Field>
                </div>
            </Show>
        </>
    );
}
