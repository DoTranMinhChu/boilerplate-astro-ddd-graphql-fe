import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@shared/components/table/GeneratedDatatable';
import { useDatatable } from '@core/components/table/DatatableContext';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { Toggle } from '@core/components/control/Toggle';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { Tabs } from '@core/components/tab/Tabs';
import { useForm } from '@core/components/form/FormContext';
import { ContentTypeDTO, ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { TaxonomyDTO, TaxonomyService } from '@/shared/services/taxonomy/taxonomy.service';
import { ContentTypeGroupDTO, ContentTypeGroupService } from '@/shared/services/contentTypeGroup/contentTypeGroup.service';
import type { CreateContentTypeInput, UpdateContentTypeInput } from '@shared/generated/typed-graphql';
import type { Edge } from '@core/api/types';
import type { FieldDefinitionDTO, FormMode, ViewMode } from '@/modules/cms/cms.types';
import { FieldDefinitionArrayInput } from './FieldDefinitionArrayInput';
import { ContentVisibilityRulesInput } from './ContentVisibilityRulesInput';
import { ContentFilterListInput } from './ContentFilterListInput';
import { FieldGridLayoutDesigner } from './FieldGridLayoutDesigner';
import { getAvailableViewModes, getSelectFieldOptions, getSearchableEligibleFields } from './dataWorkspaceConfig';
import { ManageContentTypeGroupsDialog, resolveGroupLabel } from './ManageContentTypeGroupsDialog';
import { DataWorkspaceViewSwitcher } from './DataWorkspaceViewSwitcher';
import { ListViewLayout } from './ListViewLayout';
import { GridGalleryViewLayout } from './GridGalleryViewLayout';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { t } from '@/shared/i18n/t';

// 4 mode hiển thị CỐ ĐỊNH (hardcode, không đọc từ config) cho CHÍNH trang quản lý Content
// Type — khác `listViewConfig.enabledModes` (per-content-type, đọc qua getAvailableViewModes)
// dùng cho trang Content Entry (Task 10). Trang này là 1 workspace singleton của riêng nó,
// quyết định thiết kế trước đó là không đáng xây UI cấu hình cho chính nó.
const CONTENT_TYPE_LIST_MODES: ViewMode[] = ['table', 'card', 'list', 'gallery'];

// Nhãn cho 6 view mode / 4 form mode (Task 5 + `visualGrid` thêm ở Task 14) — hàm (không phải
// const tĩnh) để re-evaluate t() mỗi khi đổi ngôn ngữ, cùng khuôn STATUS_OPTIONS trong
// manageContentEntries.page.tsx.
const VIEW_MODE_LABELS = () => ({
    table: t('cms.contentTypeConfig.viewModeTable'),
    card: t('cms.contentTypeConfig.viewModeCard'),
    list: t('cms.contentTypeConfig.viewModeList'),
    grid: t('cms.contentTypeConfig.viewModeGrid'),
    gallery: t('cms.contentTypeConfig.viewModeGallery'),
    kanban: t('cms.contentTypeConfig.viewModeKanban'),
});
const FORM_MODES: FormMode[] = ['dialog', 'drawer', 'fullPage', 'visualGrid'];
const FORM_MODE_LABELS = () => ({
    dialog: t('cms.contentTypeConfig.formModeDialog'),
    drawer: t('cms.contentTypeConfig.formModeDrawer'),
    fullPage: t('cms.contentTypeConfig.formModeFullPage'),
    visualGrid: t('cms.contentTypeConfig.formModeVisualGrid'),
});
const FORM_MODE_OPTIONS = () => FORM_MODES.map((m) => ({ value: m, label: FORM_MODE_LABELS()[m] }));

// Giá trị đặc biệt (không phải id thật) cho mục "+ Tạo nhóm mới" trong Select "Nhóm" của
// Formlog — xem ContentTypeGroupField bên dưới: chọn mục này KHÔNG set field `groupId`
// (effect tự phát hiện + reset về giá trị cũ + mở modal Quản lý nhóm ngay lập tức), và
// transformValues cũng lọc phòng hờ (defense-in-depth) trước khi gửi lên BE.
const CREATE_NEW_GROUP_OPTION = '__create_new__';

// `groupFilter`/`triggerRefresh` cần sống Ở CẤP MODULE (cùng cấp với `generateDatatable`
// bên dưới) vì `paginatedQuery` cũng được định nghĩa ở cấp module, chạy 1 lần lúc file
// được import — không có cách nào truyền 1 signal cục bộ của ManageContentTypesPage() vào
// đây. Cùng pattern `refreshTrigger` module-level mà generateDatatable() tự dùng nội bộ.
//
// LƯU Ý QUAN TRỌNG (phát hiện khi audit createData.tsx): việc `paginatedQuery` đọc
// `groupFilter()` ở đây KHÔNG tự động kích hoạt refetch khi signal đổi — `fetchData()`
// (trong createData.tsx) luôn chạy trong `untrack()`, effect ngoài chỉ theo dõi
// limit/page/queryInput (không bao gồm groupFilter). Đây chính là lý do
// manageContentEntries.page.tsx's `contentTypeId()` filter "work" — nó không đổi sau khi
// mount (đọc từ route searchParam), khác với `groupFilter` đổi liên tục do người dùng thao
// tác trên UI. Vì vậy mọi nơi gọi `setGroupFilter` bên dưới ĐỀU phải gọi kèm
// `triggerRefresh()` để buộc load lại danh sách với filter mới.
const [groupFilter, setGroupFilter] = createSignal<string | undefined>(undefined);

const { Datatable, triggerRefresh } = generateDatatable<PagingArgsInput, ContentTypeDTO, ContentTypeDTO, ContentTypeDTO, CreateContentTypeInput, UpdateContentTypeInput>({
    service: ContentTypeService,
    paginatedQuery: ({ input }) => ContentTypeService.getAllContentType({
        input: { ...input, filter: { ...(input?.filter || {}), groupId: groupFilter() || undefined } },
    }),
    itemQuery: (item) => ContentTypeService.getOneContentTypeAdmin({ id: item.id! }),
    createMutation: (data) => ContentTypeService.createContentType({ data }),
    updateMutation: (id, data) => ContentTypeService.updateContentType({ id, data }),
    deleteMutation: (item) => ContentTypeService.deleteContentType({ id: item.id! }),
});

// Select "Nhóm" trong Formlog — ambient mode (KHÔNG fieldless) để `groupId` thực sự được
// đăng ký + gửi lên BE lúc submit (xem generateForm.tsx's submitValues(): chỉ field nào đã
// registerField mới có mặt trong payload — 1 Select `fieldless` đọc/ghi qua useForm() thủ
// công sẽ hiển thị đúng nhưng KHÔNG BAO GIỜ được gửi lên BE, vì submitValues() chỉ duyệt
// qua fields() đã đăng ký). Mục "+ Tạo nhóm mới" là 1 option đặc biệt: khi chọn, effect
// dưới đây phát hiện qua useForm().value() (CÙNG form context với Select), lập tức reset
// field về undefined rồi mở modal — KHÔNG để giá trị giả này lọt vào state/submit.
function ContentTypeGroupField(props: { groups: ContentTypeGroupDTO[]; onCreateNew: () => void }) {
    const { value, setValues } = useForm();
    createEffect(() => {
        if (value('groupId' as any) === CREATE_NEW_GROUP_OPTION) {
            setValues('groupId' as any, undefined);
            props.onCreateNew();
        }
    });
    const options = () => [
        ...props.groups.map((g) => ({ value: g.id!, label: g.name! })),
        { value: CREATE_NEW_GROUP_OPTION, label: t('cms.contentTypeGroups.createNewOption') },
    ];
    return <Select clearable options={options()} />;
}

// `listViewConfig.kanbanGroupFieldKey` chỉ có ý nghĩa khi enabledModes hiện đang bật 'kanban' —
// đây là giá trị đang gõ dở trong CHÍNH form, chưa lưu, nên không thể đọc qua `item` (snapshot
// tĩnh lúc mở form) mà phải qua useForm().value() của Formlog đang mở, cùng cơ chế
// ContentTypeGroupField ở trên dùng để đọc `groupId` (cùng FormContext, Datatable.Field chỉ
// là 1 Field<FormValuesCreate & FormValuesUpdate> cụ thể — xem generateForm.tsx). Tách thành
// component riêng (thay vì gọi useForm() thẳng trong arrow function render-prop của Formlog)
// vì đó là nơi DUY NHẤT đã xác nhận hoạt động đúng trong codebase này.
function KanbanGroupFieldPicker(props: { fieldOptions: { value: string; label: string }[] }) {
    const { value } = useForm();
    const isKanbanEnabled = () => {
        const modes = value('listViewConfig.enabledModes' as any) as ViewMode[] | undefined;
        return Array.isArray(modes) && modes.includes('kanban');
    };
    return (
        <Show when={isKanbanEnabled()}>
            <Datatable.Field name={'listViewConfig.kanbanGroupFieldKey' as any} label={t('cms.contentTypeConfig.kanbanFieldLabel')}>
                <Select options={props.fieldOptions} nullable />
            </Datatable.Field>
        </Show>
    );
}

// `formConfig.gridLayout` (canvas designer, Task 14) chỉ có ý nghĩa khi enabledModes hiện đang
// bật 'visualGrid' — cùng lý do/cùng pattern KanbanGroupFieldPicker ở trên: đây là giá trị đang
// gõ dở trong CHÍNH form (checkbox vừa bật, chưa lưu), nên phải đọc qua useForm().value() của
// Formlog đang mở, không thể đọc qua `item` (snapshot tĩnh lúc mở form).
function GridLayoutDesignerField(props: { fields: FieldDefinitionDTO[] }) {
    const { value } = useForm();
    const isVisualGridEnabled = () => {
        const modes = value('formConfig.enabledModes' as any) as FormMode[] | undefined;
        return Array.isArray(modes) && modes.includes('visualGrid');
    };
    return (
        <Show when={isVisualGridEnabled()}>
            <Datatable.Field name={'formConfig.gridLayout' as any} label={t('cms.contentTypeConfig.gridLayoutLabel')}>
                <FieldGridLayoutDesigner fields={props.fields} />
            </Datatable.Field>
        </Show>
    );
}

// Chế độ hiển thị khác Table (Card/List/Gallery) cho CHÍNH danh sách Content Type — cùng
// pattern `ContentEntryModeViews` (Task 10, manageContentEntries.page.tsx), nhưng khai báo ở
// CẤP MODULE (không phải trong closure của ManageContentTypesPage()) vì `Datatable` ở đây đã
// là 1 hằng số module-level (generateDatatable() gọi 1 lần lúc file được import, không phải
// per-content-type như trang Content Entry) — cùng lý do ContentTypeGroupField/
// KanbanGroupFieldPicker ở trên cũng khai báo ở cấp module. Row shape cố định (label/key/
// fieldCount/groupId), không đọc theo field động như ContentEntryModeViews.
function ContentTypeModeViews(props: { mode: ViewMode; groups: ContentTypeGroupDTO[] }) {
    const { items, loading } = useDatatable();

    const renderRow = (item: ContentTypeDTO) => (
        <div class="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50">
            <div class="flex-1 min-w-0">
                <p class="font-medium text-neutral-800 truncate">{item.label}</p>
                <p class="text-xs text-neutral-400">
                    <code class="font-mono">{item.key}</code> · {resolveGroupLabel(props.groups, item.groupId)}
                </p>
            </div>
            <span class="text-xs text-neutral-400 shrink-0">{item.fields?.length ?? 0} field</span>
            <Datatable.CellButtonUpdate item={item} />
            <Datatable.CellButtonDelete item={item} itemName={item.label!} />
        </div>
    );

    const renderCard = (item: ContentTypeDTO) => (
        <div class="rounded-xl border border-neutral-200 bg-white p-4 space-y-1.5">
            <p class="font-bold text-gray-900">{item.label}</p>
            <p class="text-xs text-gray-500">
                <code class="font-mono">{item.key}</code> · {resolveGroupLabel(props.groups, item.groupId)}
            </p>
            <p class="text-xs text-neutral-400">{item.fields?.length ?? 0} field</p>
            <div class="flex justify-end gap-1 pt-1">
                <Datatable.CellButtonUpdate item={item} />
                <Datatable.CellButtonDelete item={item} itemName={item.label!} />
            </div>
        </div>
    );

    return (
        <>
            <Show when={props.mode === 'list'}>
                <ListViewLayout items={items() as ContentTypeDTO[] | undefined} loading={loading()} renderRow={renderRow} />
            </Show>
            <Show when={props.mode === 'card' || props.mode === 'gallery'}>
                <GridGalleryViewLayout
                    items={items() as ContentTypeDTO[] | undefined}
                    loading={loading()}
                    renderCard={renderCard}
                    variant="gallery"
                />
            </Show>
        </>
    );
}

export function ManageContentTypesPage() {
    const { navigateToPage } = useRoutes();
    // Danh sách để chọn làm đích cho field kiểu RELATION (vd "Sản phẩm" liên quan
    // tới "Bài viết") — xem FieldDefinitionArrayInput.
    const [contentTypes] = createResource(() => ContentTypeService.getAllContentType({ input: { limit: 200 } }));
    const contentTypeOptions = () => ((contentTypes()?.edges || []) as Edge<ContentTypeDTO>[])
        .filter((e) => !!e.node)
        .map((e) => ({ value: e.node!.id!, label: e.node!.label! }));
    // Bản đầy đủ (kèm `fields`) của cùng resource trên — FieldDefinitionArrayInput dùng để
    // tra list field của content type ĐÍCH đã chọn cho control "Hiển thị theo field" (RELATION).
    // Không cần fetch riêng: `contentTypes` resource ở trên đã dùng ContentTypeService.fragment,
    // fragment này đã có sẵn `fields` (key/label...) từ trước Task 5.
    const contentTypesFull = () => ((contentTypes()?.edges || []) as Edge<ContentTypeDTO>[])
        .filter((e) => !!e.node)
        .map((e) => e.node!);

    // Danh sách Taxonomy để chọn cho field kiểu TAXONOMY (Task 4 đã có màn quản lý Taxonomy).
    const [taxonomies] = createResource(() => TaxonomyService.getAllTaxonomy({ input: { limit: 200 } }));
    const taxonomyOptions = () => ((taxonomies()?.edges || []) as Edge<TaxonomyDTO>[])
        .filter((e) => !!e.node)
        .map((e) => ({ value: e.node!.id!, label: e.node!.label! }));

    // Nhóm Content Type (modal "Quản lý nhóm" — không thêm mục sidebar riêng, theo quyết
    // định thiết kế trước đó) — dùng cho cột "Nhóm", bộ lọc trên toolbar, và Select "Nhóm"
    // trong Formlog.
    const [groups, { refetch: refetchGroups }] = createResource(() => ContentTypeGroupService.getAllContentTypeGroup({ input: { limit: 200 } }));
    const groupList = () => ((groups()?.edges || []) as Edge<ContentTypeGroupDTO>[])
        .filter((e) => !!e.node)
        .map((e) => e.node!);
    const [groupsDialogOpen, setGroupsDialogOpen] = createSignal(false);

    // Switcher Table/Card/List/Gallery — CỐ ĐỊNH (CONTENT_TYPE_LIST_MODES), không đọc từ
    // listViewConfig nào (đó là per-content-type, dùng ở trang Content Entry — Task 10).
    const [currentMode, setCurrentMode] = createSignal<ViewMode>('table');

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="ContentTypeTable">
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.contentTypes.title')} description={t('cms.contentTypes.description')} />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Button sm outline icon={<Icon name="heroicons-outline:tag" />} onClick={() => setGroupsDialogOpen(true)}>
                                {t('cms.contentTypeGroups.manageButton')}
                            </Button>
                            <Datatable.ButtonCreate label={t('cms.contentTypes.createButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                        <Select
                            fieldless
                            class="w-52"
                            options={[
                                { value: '', label: t('cms.contentTypeGroups.filterAllLabel') },
                                ...groupList().map((g) => ({ value: g.id!, label: g.name! })),
                            ]}
                            value={groupFilter() || ''}
                            onChange={(val) => {
                                setGroupFilter((val as string) || undefined);
                                triggerRefresh();
                            }}
                        />
                        <DataWorkspaceViewSwitcher modes={CONTENT_TYPE_LIST_MODES} mode={currentMode()} onChange={setCurrentMode} />
                    </Datatable.Toolbar>

                    <Show when={currentMode() === 'table'}>
                        <Datatable.Table>
                            <Datatable.Column title={t('cms.contentTypes.columns.label')} sortable="label">
                                {(item) => <p class="font-semibold text-gray-900">{item.label}</p>}
                            </Datatable.Column>
                            <Datatable.Column title={t('cms.contentTypes.columns.key')}>
                                {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.key}</code>}
                            </Datatable.Column>
                            <Datatable.Column title={t('cms.contentTypeGroups.columnLabel')}>
                                {(item) => <span class="text-sm text-neutral-600">{resolveGroupLabel(groupList(), item.groupId)}</span>}
                            </Datatable.Column>
                            <Datatable.Column title={t('cms.contentTypes.columns.fieldCount')}>
                                {(item) => <span>{item.fields?.length ?? 0}</span>}
                            </Datatable.Column>
                            <Datatable.Column title="">
                                {(item) => (
                                    <Datatable.CellButtons>
                                        <Datatable.CellButton
                                            sm
                                            icon={<Icon name="heroicons-outline:circle-stack" tooltip={t('cms.contentTypes.dataButton')} />}
                                            onClick={() => navigateToPage({ route: 'adminDashboard.cmsContentEntries', context: { searchParams: { contentTypeId: item.id, label: item.label } } })}
                                        />
                                        <Datatable.CellButtonUpdate item={item} />
                                        <Datatable.CellButtonDelete item={item} itemName={item.label!} />
                                    </Datatable.CellButtons>
                                )}
                            </Datatable.Column>
                        </Datatable.Table>
                    </Show>
                    <Show when={currentMode() !== 'table'}>
                        <ContentTypeModeViews mode={currentMode()} groups={groupList()} />
                    </Show>

                    <Show when={currentMode() === 'table'}>
                        <Datatable.Pagination />
                    </Show>

                    <Datatable.Formlog
                        viewMode="modal"
                        class="w-full max-w-[920px]"
                        createTitle={t('cms.contentTypes.createTitle')}
                        updateTitle={t('cms.contentTypes.updateTitle')}
                        // `key` chỉ tồn tại trên CreateContentTypeInput ở GraphQL schema (BE
                        // updateContentType cũng không dùng data.key — key bất biến sau khi tạo,
                        // các entry/relation khác đã tham chiếu theo id chứ không phải key). Gửi
                        // "key" trong update payload bị GraphQL từ chối thẳng ("Field \"key\" is
                        // not defined by type \"UpdateContentTypeInput\"") — chặn luôn từ trước
                        // khi build values, không chỉ ẩn field trên UI.
                        transformValues={(values, item) => {
                            let result = values as typeof values & { key?: string; groupId?: string };
                            if (item) {
                                const { key, ...rest } = result;
                                result = rest as typeof result;
                            }
                            // Phòng hờ (defense-in-depth): mục "+ Tạo nhóm mới" đáng lẽ không bao
                            // giờ tới được đây (ContentTypeGroupField's effect tự reset về undefined
                            // ngay khi phát hiện), nhưng lỡ có 1 khoảng trễ nào đó thì cũng không để
                            // giá trị giả này gửi lên BE.
                            if (result.groupId === CREATE_NEW_GROUP_OPTION) {
                                result = { ...result, groupId: undefined };
                            }
                            return result as typeof values;
                        }}
                    >
                        {(item) => {
                            // `item?.fields` là mảng NULLABLE-PER-PHẦN-TỬ (đúng shape GraphQL trả về —
                            // xem contentType.service.ts's fragment) — cùng lý do
                            // ContentVisibilityRulesInput/ContentFilterListInput's `fieldOptions` bên dưới
                            // phải `.filter((f): f is NonNullable<typeof f> => !!f)` trước khi dùng làm
                            // FieldDefinitionDTO[] (dataWorkspaceConfig.ts's 3 helper). Tính 1 lần, dùng lại
                            // ở mọi tab thay vì lặp lại filter này ở từng chỗ gọi.
                            const fields = () => (item?.fields ?? []).filter((f): f is NonNullable<typeof f> => !!f);
                            return (
                            <div class="col-span-full p-8">
                                <Tabs id="content-type-editor-tabs">
                                    <Tabs.Tab label={t('cms.contentTypeConfig.tabBasic')}>
                                        <div class="grid grid-cols-12 gap-x-6 gap-y-6 p-1">
                                            <div class="col-span-8">
                                                <Datatable.Field name="label" label={t('cms.contentTypes.fields.label')} required>
                                                    <Input placeholder={t('cms.contentTypes.fields.labelPlaceholder')} />
                                                </Datatable.Field>
                                            </div>
                                            <Show when={!item}>
                                                <div class="col-span-4">
                                                    <Datatable.Field name="key" label={t('cms.contentTypes.fields.key')} description={t('cms.contentTypes.fields.keyHint')}>
                                                        <Input placeholder={t('cms.contentTypes.fields.keyPlaceholder')} />
                                                    </Datatable.Field>
                                                </div>
                                            </Show>
                                            <div class="col-span-6">
                                                <Datatable.Field name="groupId" label={t('cms.contentTypeGroups.columnLabel')}>
                                                    <ContentTypeGroupField groups={groupList()} onCreateNew={() => setGroupsDialogOpen(true)} />
                                                </Datatable.Field>
                                            </div>
                                            <div class="col-span-12">
                                                <Datatable.Field name="fields" label={t('cms.contentTypes.fields.fields')}>
                                                    <FieldDefinitionArrayInput
                                                        contentTypeOptions={contentTypeOptions()}
                                                        contentTypesFull={contentTypesFull()}
                                                        taxonomyOptions={taxonomyOptions()}
                                                    />
                                                </Datatable.Field>
                                            </div>
                                        </div>
                                    </Tabs.Tab>

                                    {/* 4 tab config mới (Task 5) + tab "Hiển thị nâng cao" chỉ có ý nghĩa khi đã biết
                                        `fields` của content type — cùng guard `Show when={item}` đã dùng cho
                                        contentVisibilityRules trước Task 5 (chưa lưu lần nào = chưa có gì để cấu hình). */}
                                    <Show when={item}>
                                        <Tabs.Tab label={t('cms.contentTypeConfig.tabListView')}>
                                            <div class="space-y-4 p-1">
                                                <Datatable.Field name={'listViewConfig.defaultMode' as any} label={t('cms.contentTypeConfig.defaultModeLabel')}>
                                                    <Select options={getAvailableViewModes(fields()).map((m) => ({ value: m, label: VIEW_MODE_LABELS()[m] }))} />
                                                </Datatable.Field>
                                                <div>
                                                    <p class="mb-2 text-sm font-medium text-neutral-700">{t('cms.contentTypeConfig.enabledModesLabel')}</p>
                                                    <div class="flex flex-wrap gap-3">
                                                        <For each={getAvailableViewModes(fields())}>
                                                            {(mode) => (
                                                                <label class="flex items-center gap-1.5 text-sm">
                                                                    <Datatable.Field name={`listViewConfig.enabledModes.${mode}` as any} label="">
                                                                        <Toggle />
                                                                    </Datatable.Field>
                                                                    {VIEW_MODE_LABELS()[mode]}
                                                                </label>
                                                            )}
                                                        </For>
                                                    </div>
                                                </div>
                                                <KanbanGroupFieldPicker fieldOptions={getSelectFieldOptions(fields())} />
                                            </div>
                                        </Tabs.Tab>

                                        <Tabs.Tab label={t('cms.contentTypeConfig.tabForm')}>
                                            <div class="space-y-4 p-1">
                                                <Datatable.Field name={'formConfig.defaultMode' as any} label={t('cms.contentTypeConfig.defaultModeLabel')}>
                                                    <Select options={FORM_MODE_OPTIONS()} />
                                                </Datatable.Field>
                                                <div>
                                                    <p class="mb-2 text-sm font-medium text-neutral-700">{t('cms.contentTypeConfig.enabledModesLabel')}</p>
                                                    <div class="flex flex-wrap gap-3">
                                                        <For each={FORM_MODES}>
                                                            {(mode) => (
                                                                <label class="flex items-center gap-1.5 text-sm">
                                                                    <Datatable.Field name={`formConfig.enabledModes.${mode}` as any} label="">
                                                                        <Toggle />
                                                                    </Datatable.Field>
                                                                    {FORM_MODE_LABELS()[mode]}
                                                                </label>
                                                            )}
                                                        </For>
                                                    </div>
                                                </div>
                                                <GridLayoutDesignerField fields={fields()} />
                                            </div>
                                        </Tabs.Tab>

                                        <Tabs.Tab label={t('cms.contentTypeConfig.tabSearch')}>
                                            <div class="space-y-2 p-1">
                                                <p class="text-xs text-neutral-400">{t('cms.contentTypeConfig.searchableFieldsHint')}</p>
                                                <For each={getSearchableEligibleFields(fields())}>
                                                    {(field) => (
                                                        <label class="flex items-center gap-2 text-sm py-1">
                                                            {/* Index tính trên MẢNG GỐC (item.fields, chưa qua filter bỏ null) — đây là
                                                                mảng thật sẽ được submit, `fields()` chỉ bỏ phần tử null/undefined (không
                                                                bao giờ xảy ra với data thật) nên 2 mảng cùng thứ tự/index, nhưng dùng mảng
                                                                gốc ở đây là đúng-về-mặt-ngữ-nghĩa (index phải khớp payload thật). */}
                                                            <Datatable.Field name={`fields.${(item?.fields ?? []).indexOf(field)}.searchable` as any} label="">
                                                                <Toggle />
                                                            </Datatable.Field>
                                                            {field.label}
                                                        </label>
                                                    )}
                                                </For>
                                            </div>
                                        </Tabs.Tab>

                                        <Tabs.Tab label={t('cms.contentTypeConfig.tabFilters')}>
                                            <div class="p-1">
                                                <Datatable.Field name="filters" label="">
                                                    <ContentFilterListInput
                                                        fieldOptions={fields().filter((f) => !!f.key).map((f) => ({ value: f.key!, label: f.label || f.key! }))}
                                                    />
                                                </Datatable.Field>
                                            </div>
                                        </Tabs.Tab>

                                        <Tabs.Tab label={t('cms.contentTypeConfig.tabAdvanced')}>
                                            <div class="p-1">
                                                <p class="mb-1 text-sm font-semibold text-neutral-800">{t('cms.contentTypes.visibility.sectionTitle')}</p>
                                                <p class="mb-3 text-xs text-neutral-400">{t('cms.contentTypes.visibility.sectionHint')}</p>
                                                <Datatable.Field name="contentVisibilityRules" label="">
                                                    <ContentVisibilityRulesInput fieldOptions={fields().filter((f) => !!f.key).map((f) => ({ value: f.key!, label: f.label || f.key! }))} />
                                                </Datatable.Field>
                                            </div>
                                        </Tabs.Tab>
                                    </Show>
                                </Tabs>
                            </div>
                            );
                        }}
                    </Datatable.Formlog>
                </Datatable>
            </Card>

            <ManageContentTypeGroupsDialog
                isOpen={groupsDialogOpen()}
                onClose={() => setGroupsDialogOpen(false)}
                groups={groupList()}
                onChanged={() => refetchGroups()}
            />
        </div>
    );
}
