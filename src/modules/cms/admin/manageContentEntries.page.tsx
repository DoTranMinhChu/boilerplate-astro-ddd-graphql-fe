import { Show, createResource, createSignal, For } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@shared/components/table/GeneratedDatatable';
import { useDatatable } from '@core/components/table/DatatableContext';
import { toast } from '@core/components/toast/ToastProvider';
import { Select } from '@core/components/control/Select';
import { ContentEntryDTO, ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { ContentEntryUsagePanel } from './ContentEntryUsagePanel';
import { AddTranslationButton } from './AddTranslationButton';
import { DataWorkspaceViewSwitcher } from './DataWorkspaceViewSwitcher';
import { ListViewLayout } from './ListViewLayout';
import { GridGalleryViewLayout } from './GridGalleryViewLayout';
import { KanbanViewLayout } from './KanbanViewLayout';
import { groupItemsIntoKanbanColumns } from './groupItemsIntoKanbanColumns';
import { resolveActiveViewModes } from './resolveActiveViewModes';
import { t, tOrLiteral } from '@/shared/i18n/t';
import type { FieldDefinitionDTO, ListViewConfig, ViewMode } from '@/modules/cms/cms.types';
import { renderFieldControl } from '@/shared/components/fields/contentEntryFieldRenderer';
import { EFieldType } from '@/shared/generated/typed-graphql';

const STATUS_OPTIONS = () => [
    { value: 'DRAFT', label: t('cms.contentEntries.status.draft') },
    { value: 'PUBLISHED', label: t('cms.contentEntries.status.published') },
    { value: 'UNPUBLISHED', label: t('cms.contentEntries.status.unpublished') },
];

/** Tên hiển thị ngắn cho 1 entry (vd trong hộp thoại xác nhận xoá) — không còn cột `slug`
 * cứng (mục γ, Task 5) để dùng làm tên mặc định, rơi về giá trị field TEXT đầu tiên của
 * content type, rồi tới id nếu content type không có field TEXT nào. */
function entryDisplayName(item: ContentEntryDTO, fields: FieldDefinitionDTO[]): string {
    const titleField = fields.find((f) => f?.type === EFieldType.TEXT);
    const value = titleField?.key ? (item.data as unknown as Record<string, unknown> | undefined)?.[titleField.key] : undefined;
    return (typeof value === 'string' && value) ? value : String(item.id ?? '');
}

export function ManageContentEntriesPage() {
    const { searchParams } = useRoutes();
    const contentTypeId = () => searchParams.contentTypeId as string;

    const [contentType] = createResource(contentTypeId, (id) => ContentTypeService.getOneContentType({ id }));

    return (
        <Show when={contentType()} fallback={<div class="p-6 text-neutral-400">{t('cms.contentEntries.loading')}</div>}>
            {(ct) => {
                const { Datatable, triggerRefresh } = generateDatatable<PagingArgsInput, ContentEntryDTO, ContentEntryDTO, ContentEntryDTO, any, any>({
                    service: ContentEntryService,
                    paginatedQuery: ({ input }) => ContentEntryService.getAllContentEntry({
                        input: { ...input, filter: { ...(input?.filter || {}), contentTypeId: contentTypeId() } },
                    }),
                    itemQuery: (item) => ContentEntryService.getOneContentEntry({ id: item.id! }),
                    createMutation: (data) => ContentEntryService.createContentEntry({ data: { ...data, contentTypeId: contentTypeId() } }),
                    updateMutation: (id, data) => ContentEntryService.updateContentEntry({ id, data }),
                    deleteMutation: (item) => ContentEntryService.deleteContentEntry({ id: item.id! }),
                });

                // `ct().listViewConfig` giữ nguyên kiểu `string` do giới hạn codegen GraphQLMixed
                // (xem header comment cms.types.ts) — runtime thật ra đã là object, cast 1 lần ở
                // đây, cùng convention `item.data as any`/`as unknown as Record<...>` đã dùng khắp
                // file này cho ContentEntryDTO.data (cùng giới hạn scalar).
                const listViewConfig = () => ct().listViewConfig as unknown as ListViewConfig | undefined;
                const { modes: availableModes, initialMode } = resolveActiveViewModes(
                    listViewConfig(),
                    (ct().fields || []).filter((f): f is FieldDefinitionDTO => !!f),
                );
                const [currentMode, setCurrentMode] = createSignal<ViewMode>(initialMode);

                /** Chế độ hiển thị khác Table (List/Grid/Gallery/Kanban) — đọc trực tiếp
                 * `items()`/`loading()` từ context của chính Datatable đang bao quanh (cùng dữ
                 * liệu Table đã fetch, không query riêng), rồi render qua layout-only component
                 * tương ứng (Tasks 7-9). Khai báo NỘI BỘ trong closure này (không phải module
                 * scope) vì cần dùng đúng `Datatable.CellButtonUpdate`/`CellButtonDelete` của
                 * content type đang xem — 2 component này được `generateDatatable()` bên trên
                 * đóng gói sẵn `itemQuery`/`deleteMutation`, không phải giá trị tĩnh có thể
                 * import từ module scope. Kanban ghi DB thật qua
                 * `ContentEntryService.updateContentEntry` ngay khi thả thẻ (mục "Ràng buộc" —
                 * no optimistic-only state, `triggerRefresh()` sau khi ghi xong để items()
                 * phản ánh đúng dữ liệu đã lưu). */
                function ContentEntryModeViews(props: {
                    mode: ViewMode;
                    fields: FieldDefinitionDTO[];
                    kanbanGroupFieldKey?: string;
                    triggerRefresh: () => void;
                }) {
                    const { items, loading } = useDatatable();

                    const imageField = () => props.fields.find((f) => f?.type === EFieldType.IMAGE || f?.type === EFieldType.GALLERY);
                    const rowTitle = (item: ContentEntryDTO) => entryDisplayName(item, props.fields);
                    const rowImage = (item: ContentEntryDTO) => {
                        const key = imageField()?.key;
                        const raw = key ? (item.data as any)?.[key] : undefined;
                        return typeof raw === 'string' ? raw : undefined;
                    };

                    const renderRow = (item: ContentEntryDTO) => (
                        <div class="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50">
                            <div class="flex-1 min-w-0">
                                <p class="font-medium text-neutral-800 truncate">{rowTitle(item)}</p>
                                <p class="text-xs text-neutral-400">{item.locale} · {item.status}</p>
                            </div>
                            <Datatable.CellButtonUpdate item={item} />
                            <Datatable.CellButtonDelete item={item} itemName={rowTitle(item)} />
                        </div>
                    );

                    const renderCard = (item: ContentEntryDTO) => (
                        <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
                            <Show when={rowImage(item)} fallback={<div class="aspect-square bg-neutral-100" />}>
                                <img src={rowImage(item)} class="aspect-square w-full object-cover" alt={rowTitle(item)} />
                            </Show>
                            <div class="p-3 space-y-1">
                                <p class="font-semibold text-sm text-neutral-900 truncate">{rowTitle(item)}</p>
                                <div class="flex justify-end gap-1">
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Datatable.CellButtonDelete item={item} itemName={rowTitle(item)} />
                                </div>
                            </div>
                        </div>
                    );

                    const handleKanbanDrop = async (item: ContentEntryDTO, columnValue: string) => {
                        if (!props.kanbanGroupFieldKey) return;
                        await ContentEntryService.updateContentEntry({
                            id: item.id!,
                            data: { data: { ...(item.data as any), [props.kanbanGroupFieldKey]: columnValue } } as any,
                        });
                        toast().success(t('cms.contentEntries.kanbanMoveSuccess'));
                        props.triggerRefresh();
                    };

                    return (
                        <>
                            <Show when={props.mode === 'list'}>
                                <ListViewLayout items={items() as ContentEntryDTO[] | undefined} loading={loading()} renderRow={renderRow} />
                            </Show>
                            <Show when={props.mode === 'grid' || props.mode === 'gallery'}>
                                <GridGalleryViewLayout
                                    items={items() as ContentEntryDTO[] | undefined}
                                    loading={loading()}
                                    renderCard={renderCard}
                                    variant={props.mode as 'grid' | 'gallery'}
                                />
                            </Show>
                            <Show when={props.mode === 'kanban' && props.kanbanGroupFieldKey}>
                                <KanbanViewLayout
                                    columns={groupItemsIntoKanbanColumns(
                                        (items() as ContentEntryDTO[] | undefined) ?? [],
                                        (props.fields.find((f) => f?.key === props.kanbanGroupFieldKey)?.options ?? []).map((o) => ({ value: o!, label: o! })),
                                        (item) => (item.data as any)?.[props.kanbanGroupFieldKey!],
                                        t('cms.contentEntries.kanbanUnassigned'),
                                    )}
                                    renderCard={renderCard}
                                    getItemId={(item) => item.id!}
                                    onDropInColumn={handleKanbanDrop}
                                />
                            </Show>
                        </>
                    );
                }

                return (
                    <div class="space-y-6 animate-in">
                        <Card class="border-none shadow-sm">
                            <Datatable id={`ContentEntryTable-${contentTypeId()}`}>
                                <Datatable.Header>
                                    <Datatable.Title
                                        title={t('cms.contentEntries.title', { typeName: ct().label! })}
                                        description={t('cms.contentEntries.description', { typeName: ct().label! })}
                                    />
                                    <Datatable.Buttons>
                                        <Datatable.ButtonRefresh />
                                        <Datatable.ButtonCreate label={t('cms.contentEntries.createButton')} />
                                    </Datatable.Buttons>
                                </Datatable.Header>

                                <Datatable.Toolbar>
                                    <Datatable.Search />
                                    <DataWorkspaceViewSwitcher modes={availableModes} mode={currentMode()} onChange={setCurrentMode} />
                                </Datatable.Toolbar>

                                <Show when={currentMode() === 'table'}>
                                    <Datatable.Table>
                                        <For each={(ct().fields || []).filter((f): f is FieldDefinitionDTO => !!f?.showInListing).slice(0, 3)}>
                                            {(field) => (
                                                <Datatable.Column title={field.label}>
                                                    {(item) => {
                                                        const raw = (item.data as unknown as Record<string, unknown> | undefined)?.[field.key!];
                                                        if (field.type === EFieldType.IMAGE && typeof raw === 'string' && raw) {
                                                            return <img src={raw} alt={field.label} class="h-9 w-9 rounded-md object-cover border border-neutral-100" />;
                                                        }
                                                        if (field.type === EFieldType.BOOLEAN) {
                                                            return <span class="text-sm text-neutral-700">{raw ? '✓' : '—'}</span>;
                                                        }
                                                        if (field.type === EFieldType.REPEATER) {
                                                            const count = Array.isArray(raw) ? raw.length : 0;
                                                            return <span class="text-sm text-neutral-500">{count} mục</span>;
                                                        }
                                                        return <span class="text-sm text-neutral-700">{String(raw ?? '')}</span>;
                                                    }}
                                                </Datatable.Column>
                                            )}
                                        </For>
                                        {/* Important #4 fix (Task 16 review): cột "Ngôn ngữ" — trước fix, bảng không có
                                            cách nào phân biệt các bản dịch của CÙNG 1 nhóm dịch (translationGroupId),
                                            đặc biệt dễ nhầm lẫn khi kết hợp với Critical #1 (2 dòng dữ liệu giống hệt
                                            nhau, không biết dòng nào là bản dịch nào). `item.locale` đã có sẵn trong
                                            fragment FE (ContentEntryService.fragment, Task 15), chỉ thiếu cột hiển thị. */}
                                        <Datatable.Column title={t('cms.contentEntries.columns.locale')}>
                                            {(item) => <span class="text-sm text-neutral-700">{item.locale || '—'}</span>}
                                        </Datatable.Column>
                                        <Datatable.Column title={t('cms.contentEntries.columns.status')}>
                                            {(item) => (
                                                <span class={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                                                    {tOrLiteral(`cms.contentEntries.status.${(item.status || 'draft').toLowerCase()}`)}
                                                </span>
                                            )}
                                        </Datatable.Column>
                                        <Datatable.Column title="">
                                            {(item) => (
                                                <Datatable.CellButtons>
                                                    <ContentEntryUsagePanel entryId={item.id!} />
                                                    <Datatable.CellButtonUpdate item={item} />
                                                    <Datatable.CellButtonDelete item={item} itemName={entryDisplayName(item, (ct().fields || []).filter((f): f is FieldDefinitionDTO => !!f))} />
                                                </Datatable.CellButtons>
                                            )}
                                        </Datatable.Column>
                                    </Datatable.Table>
                                </Show>
                                <Show when={currentMode() !== 'table'}>
                                    <ContentEntryModeViews
                                        mode={currentMode()}
                                        fields={(ct().fields || []).filter((f): f is FieldDefinitionDTO => !!f)}
                                        kanbanGroupFieldKey={listViewConfig()?.kanbanGroupFieldKey}
                                        triggerRefresh={triggerRefresh}
                                    />
                                </Show>

                                <Show when={currentMode() === 'table'}>
                                    <Datatable.Pagination />
                                </Show>

                                <Datatable.Formlog
                                    viewMode="modal"
                                    class="w-full max-w-[640px]"
                                    createTitle={t('cms.contentEntries.createTitle')}
                                    updateTitle={t('cms.contentEntries.updateTitle')}
                                >
                                    {(item) => {
                                        const { setFormlogItem } = useDatatable();

                                        // "+ Thêm bản dịch" (Phase 3 mục 3, Task 15) — nhân bản entry hiện tại
                                        // (giữ nguyên `data`) sang 1 locale mới, xem ContentEntryService.
                                        // createTranslation phía BE. KHÁC Page (sửa nội dung ở Page Builder
                                        // riêng, phải đóng modal + điều hướng) — Content Entry sửa NGAY trong
                                        // modal này, nên chỉ `setFormlogItem(created)` để chuyển form sang bản
                                        // dịch mới, KHÔNG đóng modal — admin dịch nội dung ngay, không mất
                                        // thêm 1 lượt mở lại.
                                        const handleCreateTranslation = async (locale: string) => {
                                            const created = await ContentEntryService.createContentEntryTranslation({ entryId: item!.id!, locale });
                                            toast().success(t('cms.translations.createSuccess'));
                                            triggerRefresh();
                                            setFormlogItem(created);
                                        };

                                        return (
                                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                                <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6">
                                                    <div class="col-span-12">
                                                        <Datatable.Field name="status" label={t('cms.contentEntries.fields.status')}>
                                                            <Select options={STATUS_OPTIONS()} />
                                                        </Datatable.Field>
                                                    </div>
                                                    <For each={(ct().fields || []).filter((f): f is FieldDefinitionDTO => !!f)}>
                                                        {(field) => (
                                                            <div class="col-span-12">
                                                                <Datatable.Field
                                                                    name={`data.${field.key}` as any}
                                                                    label={field.label}
                                                                    // field.autoGenerateFrom (mục α): để trống lúc lưu -> BE tự sinh giá trị
                                                                    // (slugify field nguồn), nên KHÔNG chặn submit ở client dù field đó
                                                                    // required -- validate client-side chạy TRƯỚC khi request tới BE, chặn ở
                                                                    // đây sẽ khiến tổ hợp cấu hình tự nhiên nhất của autoGenerateFrom (bắt
                                                                    // buộc + tự sinh, đúng cách slug thường được cấu hình) không submit được.
                                                                    required={field.required && !field.autoGenerateFrom}
                                                                    description={field.autoGenerateFrom ? 'Để trống sẽ tự động sinh giá trị.' : undefined}
                                                                >
                                                                    {renderFieldControl(field)}
                                                                </Datatable.Field>
                                                            </div>
                                                        )}
                                                    </For>

                                                    {/* "+ Thêm bản dịch" (Task 15) — CHỈ ở chế độ Sửa (entry chưa persist
                                                        lúc tạo mới thì "dịch" nó là vô nghĩa, cùng lý lẽ manageCmsPages). */}
                                                    <Show when={item}>
                                                        <div class="col-span-12 border-t border-gray-100 pt-5">
                                                            <label class="mb-2 block text-sm font-semibold text-gray-700">
                                                                {t('cms.translations.sectionLabel')}
                                                            </label>
                                                            <AddTranslationButton currentLocale={item!.locale} onCreate={handleCreateTranslation} />
                                                        </div>
                                                    </Show>
                                                </div>
                                            </div>
                                        );
                                    }}
                                </Datatable.Formlog>
                            </Datatable>
                        </Card>
                    </div>
                );
            }}
        </Show>
    );
}
