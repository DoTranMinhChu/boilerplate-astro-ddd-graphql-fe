import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@shared/components/table/GeneratedDatatable';
import { useDatatable } from '@core/components/table/DatatableContext';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { Toggle } from '@core/components/control/Toggle';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { Tabs } from '@core/components/tab/Tabs';
import { useTab } from '@core/components/tab/TabsContext';
import type { TabProps } from '@core/components/tab/Tab';
import { useForm } from '@core/components/form/FormContext';
import { createControl } from '@core/components/control/createControl';
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
import { ModeMultiSelectField } from './ModeMultiSelectField';
import { getAvailableViewModes, getSelectFieldOptions, getSearchableEligibleFields } from './dataWorkspaceConfig';
import { ManageContentTypeGroupsDialog, resolveGroupLabel } from './ManageContentTypeGroupsDialog';
import { ContentTypeCreationWizard } from './ContentTypeCreationWizard';
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
const FORM_MODES: FormMode[] = ['dialog', 'drawer', 'fullPage'];
const FORM_MODE_LABELS = () => ({
    dialog: t('cms.contentTypeConfig.formModeDialog'),
    drawer: t('cms.contentTypeConfig.formModeDrawer'),
    fullPage: t('cms.contentTypeConfig.formModeFullPage'),
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

// BUG THẬT (Task 19, phát hiện qua live click-through + console instrumentation trực tiếp vào
// generateForm.tsx rồi revert, không đoán): 6 tab của editor này dùng CHUNG 1 nút "Cập nhật
// ContentType" duy nhất ở cuối modal, nhưng `Tab.tsx` (dùng chung, `core/components/tab/Tab.tsx`)
// unmount hẳn nội dung tab không active (`<Show when={currentTabIndex()===tabIndex}>`) — mỗi
// lần rời 1 tab, MỌI `Datatable.Field` bên trong tab đó tự `unregisterField` (Field.tsx's
// onCleanup), nên `generateForm.tsx`'s `submitValues()` (chỉ duyệt qua field ĐANG đăng ký) không
// còn thấy field đó nữa. Hậu quả: đổi giá trị ở tab "Hiển thị danh sách" rồi chuyển sang tab
// "Thêm & Sửa" rồi mới bấm Lưu → thay đổi của tab đầu bị RỚT THẦM LẶNG khỏi payload gửi đi (xác
// nhận qua network tab: `listViewConfig` vắng mặt hoàn toàn trong mutation `updateContentType`).
// BE làm partial update nên dữ liệu CŨ không mất (cột không có mặt trong `data` thì giữ nguyên),
// nhưng bất kỳ thay đổi CHƯA lưu nào ở tab không active tại thời điểm bấm nút đều bị bỏ qua mà
// KHÔNG có cảnh báo — người dùng tưởng đã lưu (toast báo thành công) nhưng thực ra chỉ tab đang
// mở lúc bấm nút mới thực sự được gửi. Cùng lớp bug "silent data loss" đã gặp ở các phase trước
// của roadmap này, nên sửa tại đây thay vì chỉ ghi nhận.
//
// Sửa CỤC BỘ trong file này (KHÔNG sửa `Tab.tsx` dùng chung — còn 8 nơi khác trong codebase dùng
// nó, gồm cả Node Builder's Inspector; đổi hành vi mount ở tầng chia sẻ rủi ro tác dụng phụ ngoài
// phạm vi task này): `PersistentTab` đăng ký label giống hệt `Tab` (qua cùng `useTab()`), nhưng
// giữ `children` LUÔN mounted, chỉ ẩn/hiện bằng class `hidden` — field bên trong không bao giờ
// unregister khi đổi tab, chỉ mất đăng ký thật khi cả Formlog đóng (đúng hành vi người dùng mong
// đợi cho 1 form nhiều tab dùng chung 1 nút Lưu).
function PersistentTab(props: TabProps) {
    const { registerTab, currentTabIndex } = useTab();
    const tabIndex = registerTab(props);
    return (
        <div classList={{ hidden: currentTabIndex() !== tabIndex }}>
            {props.children}
        </div>
    );
}

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

// `formConfig.gridLayoutByMode.<mode>` (fix round mục A/B) — each enabled form mode gets its
// own independent Grid Designer canvas, switched by a small tab strip; ALL 3 stay mounted at
// once (hidden via a `hidden` class only, never unmounted) — same PersistentTab-style reasoning
// as this file's own tab-switch data-loss fix (see PersistentTab's doc comment above): unmounting
// an inactive one would `unregisterField` its `Datatable.Field`, silently dropping any unsaved
// edit made there before the admin hits the shared "Cập nhật ContentType" button.
function GridLayoutDesignerField(props: { fields: FieldDefinitionDTO[] }) {
    const { value } = useForm();
    const enabledFormModes = createMemo(() => {
        const modes = value('formConfig.enabledModes' as any) as FormMode[] | undefined;
        return (['dialog', 'drawer', 'fullPage'] as FormMode[]).filter((m) => Array.isArray(modes) && modes.includes(m));
    });
    const [activeTab, setActiveTab] = createSignal<FormMode>('dialog');

    return (
        <Show when={enabledFormModes().length > 0}>
            <div class="space-y-2">
                <div class="flex gap-1">
                    <For each={enabledFormModes()}>
                        {(mode) => (
                            <button
                                type="button"
                                class={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    activeTab() === mode ? 'bg-main-50 text-main' : 'text-neutral-500 hover:bg-neutral-50'
                                }`}
                                onClick={() => setActiveTab(mode)}
                            >
                                {FORM_MODE_LABELS()[mode]}
                            </button>
                        )}
                    </For>
                </div>
                <For each={['dialog', 'drawer', 'fullPage'] as FormMode[]}>
                    {(mode) => (
                        <div classList={{ hidden: activeTab() !== mode || !enabledFormModes().includes(mode) }}>
                            <Datatable.Field name={`formConfig.gridLayoutByMode.${mode}` as any} label={t('cms.contentTypeConfig.gridLayoutLabel')}>
                                <FieldGridLayoutDesigner fields={props.fields} />
                            </Datatable.Field>
                        </div>
                    )}
                </For>
            </div>
        </Show>
    );
}

// `listViewConfig.tableColumns` (fix round mục E) — ordered field keys chosen as Content Entry
// Table columns. Pre-checks `showInListing`-flagged fields the first time this control has no
// saved value of its own yet (so an existing content type's Table renders identically before and
// after this fix, until the admin explicitly touches this picker) — same "read live form state,
// don't trust a stale `item` snapshot" pattern as KanbanGroupFieldPicker/GridLayoutDesignerField
// above (this reads `fields` too, which can change in the SAME editing session via the "Cơ bản"
// tab's drag-reorder, kept live via the `props.fields` passed down from the render-prop's own
// `fields()` accessor).
//
// DEVIATION from the sketch this was drafted from: `createControl<string[]>('array', {})` alone
// is NOT enough to tell "never saved" apart from "admin explicitly saved an empty selection" —
// traced through `generateForm.tsx`'s `registerField` (`finalValue = currentFieldValue ??
// fieldMetadata.defaultValue`) and `createControl.tsx`'s `getEmptyValue()`: for a plain `'array'`
// control (no `nullable`), `defaultValue` is `[]`, so `registerField` collapses a genuinely-absent
// `listViewConfig.tableColumns` (`undefined` on the item) into the SAME `[]` a deliberately-empty
// saved array would carry — `value()` would read back `[]` in BOTH cases, so the sketch's `saved
// !== null && saved !== undefined` guard could never actually fall through to the `showInListing`
// default for an untouched content type (a real regression: every pre-existing content type would
// open this picker with nothing pre-checked). Passing `{ nullable: true }` instead makes
// `getEmptyValue()` return `null` (checked before the type switch in `createControl.tsx`), so an
// absent value now round-trips as `null` (falls back to `showInListing`) while a real saved `[]`
// still round-trips as `[]` (kept as-is, nothing pre-checked) — `nullable` has no other effect on
// an `'array'`-typed control (`validateForm.tsx` only reads it for `type === 'number'`).
function TableColumnsField(props: { fields: FieldDefinitionDTO[] }) {
    const { value, onChange } = createControl<string[]>('array', { nullable: true });
    const selected = createMemo(() => {
        const saved = value();
        if (saved !== null && saved !== undefined) return saved;
        return props.fields.filter((f) => f?.showInListing).map((f) => f!.key!);
    });
    const toggle = (key: string) => {
        const current = selected();
        onChange(current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
    };
    return (
        <div class="flex flex-wrap gap-3">
            <For each={props.fields.filter((f) => !!f?.key)}>
                {(field) => (
                    <label class="flex items-center gap-2 text-sm py-1 cursor-pointer">
                        <Toggle value={selected().includes(field!.key!)} onChange={() => toggle(field!.key!)} fieldless />
                        {field!.label}
                    </label>
                )}
            </For>
        </div>
    );
}

// Tab "Tìm kiếm" (mục E design) — I6 fix, final whole-branch review. TRƯỚC fix, danh sách field
// đủ điều kiện search VÀ chỉ số mảng dùng để patch `fields.N.searchable` đều tính trên
// `item?.fields` — SNAPSHOT tĩnh chụp lúc Formlog mở. Tab "Cơ bản" (PersistentTab, LUÔN mounted
// cùng lúc — xem chú thích PersistentTab phía trên) cho phép thêm/xoá/kéo-thả sắp xếp lại field
// NGAY TRONG CÙNG phiên sửa, trước khi lưu: sắp xếp lại rồi bật 1 toggle "searchable" sẽ khiến
// submitValues() ghi searchable lên NHẦM field (index cũ trỏ sai vị trí trong mảng MỚI), và field
// vừa thêm không hiện ở tab này cho tới khi lưu-rồi-mở-lại.
//
// Sửa bằng cách đọc mảng `fields` SỐNG của form qua useForm().value() — CÙNG pattern
// KanbanGroupFieldPicker/GridLayoutDesignerField ở trên (đã xác nhận đúng), nên index không bao
// giờ stale dù đang sửa dở. Tách thành component riêng (không đọc useForm() thẳng trong arrow
// function render-prop của Formlog) vì cùng lý do 2 component trên đã tách — xem chú thích của
// chúng. Khớp field theo `key` (định danh ổn định) thay vì theo object reference/thứ tự cũ, để
// đúng cả khi 2 mảng field (danh sách render vs mảng dùng tính index) không tình cờ trùng nhau.
function SearchableFieldsTab() {
    const { value } = useForm();
    const liveFields = () => ((value('fields' as any) as (FieldDefinitionDTO | null | undefined)[] | undefined) ?? [])
        .filter((f): f is FieldDefinitionDTO => !!f);
    return (
        <div class="space-y-2 p-1">
            <p class="text-xs text-neutral-400">{t('cms.contentTypeConfig.searchableFieldsHint')}</p>
            <For each={getSearchableEligibleFields(liveFields())}>
                {(field) => (
                    <label class="flex items-center gap-2 text-sm py-1">
                        <Datatable.Field name={`fields.${liveFields().findIndex((f) => f.key === field.key)}.searchable` as any} label="">
                            <Toggle />
                        </Datatable.Field>
                        {field.label}
                    </label>
                )}
            </For>
        </div>
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

/** Task 18 — cầu nối giữa <ContentTypeCreationWizard> (không tự biết gì về Datatable) và cơ
 * chế mở Formlog THẬT của Datatable. Khai báo Ở CẤP MODULE (như ContentTypeGroupField/
 * KanbanGroupFieldPicker/GridLayoutDesignerField/ContentTypeModeViews ở trên) vì cần
 * `useDatatable()` (setFormlogItem/setIsFormlogOpen THẬT), chỉ dùng được khi render LÀM CON
 * của <Datatable>, không phải ở scope bao ngoài nó (ManageContentTypesPage() là component CHA
 * bao lấy <Datatable>, không phải con của nó).
 *
 * Cơ chế mở Formlog xác nhận qua DatatableButtonCreate.tsx/CreateEntryButton
 * (manageContentEntries.page.tsx, Task 12/15): `setFormlogItem(null)` — KHÔNG phải
 * `undefined` (DatatableFormlog.tsx tự kẹt Spinner mãi mãi nếu formlogItem() === undefined) —
 * rồi `setIsFormlogOpen(true)`. Dữ liệu mồi (`onSeeded`) đi qua
 * `Datatable.Formlog`'s `transformCreateInitialValues` (KHÔNG qua `setFormlogItem(data)` như
 * brief D.5/Task 18 gốc giả định) — `formlogItem()` là discriminant DUY NHẤT create/update,
 * 1 giá trị truthy không có `id` sẽ rơi nhầm vào nhánh UPDATE của handleSubmit. Cùng pattern
 * `duplicateSeed`/`transformCreateInitialValues` đã xác nhận đúng ở manageContentEntries.page.tsx
 * (Task 15) và manageTenants.page.tsx. */
function ContentTypeWizardHost(props: {
    isOpen: boolean;
    onClose: () => void;
    onSeeded: (seed: { fields: any[]; listViewConfig?: any; formConfig?: any }) => void;
}) {
    const { setFormlogItem, setIsFormlogOpen } = useDatatable();
    const handlePrefill = (data: { fields: any[]; listViewConfig?: any; formConfig?: any }) => {
        props.onSeeded(data);
        setFormlogItem(null);
        setIsFormlogOpen(true);
    };
    return <ContentTypeCreationWizard isOpen={props.isOpen} onClose={props.onClose} onPrefill={handlePrefill} />;
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

    // Task 18 — "Chọn kiểu tạo" (Thủ công / Dựa trên mẫu / Nhập từ JSON) đứng trước form Tạo
    // Content Type hiện có. `wizardSeed` chỉ giữ dữ liệu mồi (đi qua
    // `transformCreateInitialValues` của Datatable.Formlog bên dưới — xem ContentTypeWizardHost
    // ở trên), KHÔNG phải discriminant create/update. Reset về undefined khi Formlog đóng
    // (`onClose`) để 1 lượt mở wizard rồi huỷ không rò dữ liệu sang lượt tạo mới kế tiếp — cùng
    // lý do `duplicateSeed` reset ở CreateEntryButton.openCreateFormlog (manageContentEntries.page.tsx).
    const [wizardOpen, setWizardOpen] = createSignal(false);
    const [wizardSeed, setWizardSeed] = createSignal<{ fields: any[]; listViewConfig?: any; formConfig?: any } | undefined>();

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
                            <Datatable.ButtonCreate label={t('cms.contentTypes.createButton')} onClick={() => setWizardOpen(true)} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    {/* Task 18 — PHẢI mount TRƯỚC <Datatable.Formlog> bên dưới (không chỉ đơn thuần
                        "ở đâu đó trong <Datatable>"). Cả 2 đều là Dialog 'main'-mode (mặc định của
                        Modal.tsx khi component cha CHƯA có main modal nào khác đang mở) — thứ tự
                        MOUNT quyết định thứ tự Solid flush 2 effect openModal/closeModal cùng lúc khi
                        wizard đóng + Formlog mở trong CÙNG 1 tick (bấm "Tiếp tục"). Mount wizard TRƯỚC
                        (như CreateContentEntryModePicker/CreateEntryButton, manageContentEntries.page.tsx
                        Task 12 — picker cũng nằm TRƯỚC Formlog) khiến closeModal(wizard) chạy TRƯỚC
                        openModal(Formlog): tại thời điểm đó mainModals vẫn CHỈ có wizard (đóng sạch,
                        đúng nhánh `mainModals.length==1` của ModalProvider.tsx's closeModal), rồi
                        Formlog's openModal thấy mainModals.length>0 nên tự nhận `mode:'sub'` (Modal.tsx
                        mặc định) — đăng ký vào subModals (lớp overlay ĐỘC LẬP), không đụng gì tới
                        mainModals/modalState nữa. Xác nhận THẬT bằng Playwright: mount SAU (thử ban
                        đầu) để lại 1 modal-frame RỖNG, kẹt full-screen, pointer-events:auto — chặn
                        MỌI click sau khi tạo Content Type qua mẫu/JSON thành công (root cause: 2 main
                        modal cùng "transitioning" 1 lúc làm ModalProvider's closeModal 1-lần-đóng
                        không bao giờ chạy nhánh xoá khỏi mainModals — modalState kẹt ở 'visible'). */}
                    <ContentTypeWizardHost
                        isOpen={wizardOpen()}
                        onClose={() => setWizardOpen(false)}
                        onSeeded={setWizardSeed}
                    />

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
                        // Task 18 — mồi initialValues cho form Tạo mới khi mở qua wizard (xem chú
                        // thích dài ở khai báo `wizardSeed`/ContentTypeWizardHost phía trên).
                        transformCreateInitialValues={() => (wizardSeed() ? ({ ...wizardSeed() } as any) : undefined)}
                        onClose={() => setWizardSeed(undefined)}
                        // `key` chỉ tồn tại trên CreateContentTypeInput ở GraphQL schema (BE
                        // updateContentType cũng không dùng data.key — key bất biến sau khi tạo,
                        // các entry/relation khác đã tham chiếu theo id chứ không phải key). Gửi
                        // "key" trong update payload bị GraphQL từ chối thẳng ("Field \"key\" is
                        // not defined by type \"UpdateContentTypeInput\"") — chặn luôn từ trước
                        // khi build values, không chỉ ẩn field trên UI.
                        transformValues={(values, item) => {
                            let result = values as typeof values & { key?: string; groupId?: string; listViewConfig?: any; formConfig?: any };
                            if (item) {
                                const { key, ...rest } = result;
                                result = rest as typeof result;
                            } else {
                                // Task 18 — tab "Hiển thị danh sách"/"Thêm & Sửa" (nơi listViewConfig/
                                // formConfig thật sự có <Datatable.Field>) chỉ hiện trong <Show
                                // when={item}> (item===null lúc Tạo mới) — nên 2 field này KHÔNG BAO
                                // GIỜ được registerField lúc submit Tạo mới (generateForm.tsx: chỉ field
                                // đã registerField mới có mặt trong payload), dù transformCreateInitialValues
                                // đã mồi đúng initialValues. Xác nhận THẬT qua Playwright (đọc network
                                // response): tạo Content Type từ mẫu "Sản phẩm" mà thiếu đoạn này chỉ lưu
                                // listViewConfig mặc định {defaultMode:'table', enabledModes:['table']} —
                                // bỏ mất 6 mode/kanbanGroupFieldKey/cardConfig mà mẫu định sẵn. Mồi thẳng
                                // từ wizardSeed() vào NGAY ĐÂY (transformValues, ngay trước khi gửi) —
                                // CreateContentTypeInput CÓ 2 field này ở schema (typed-graphql.ts, cùng
                                // GraphQLMixed 'string' giả — xem cms.types.ts header), chỉ cần có mặt
                                // trong payload gửi đi, không cần đăng ký <Datatable.Field> riêng cho nó.
                                const seed = wizardSeed();
                                if (seed?.listViewConfig) result = { ...result, listViewConfig: seed.listViewConfig as any };
                                if (seed?.formConfig) result = { ...result, formConfig: seed.formConfig as any };
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
                                    <PersistentTab label={t('cms.contentTypeConfig.tabBasic')}>
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
                                    </PersistentTab>

                                    {/* 4 tab config mới (Task 5) + tab "Hiển thị nâng cao" chỉ có ý nghĩa khi đã biết
                                        `fields` của content type — cùng guard `Show when={item}` đã dùng cho
                                        contentVisibilityRules trước Task 5 (chưa lưu lần nào = chưa có gì để cấu hình). */}
                                    <Show when={item}>
                                        <PersistentTab label={t('cms.contentTypeConfig.tabListView')}>
                                            <div class="space-y-4 p-1">
                                                <Datatable.Field name={'listViewConfig.defaultMode' as any} label={t('cms.contentTypeConfig.defaultModeLabel')}>
                                                    <Select options={getAvailableViewModes(fields()).map((m) => ({ value: m, label: VIEW_MODE_LABELS()[m] }))} />
                                                </Datatable.Field>
                                                <Datatable.Field name={'listViewConfig.enabledModes' as any} label={t('cms.contentTypeConfig.enabledModesLabel')}>
                                                    <ModeMultiSelectField options={getAvailableViewModes(fields()).map((m) => ({ value: m, label: VIEW_MODE_LABELS()[m], kind: m }))} />
                                                </Datatable.Field>
                                                <KanbanGroupFieldPicker fieldOptions={getSelectFieldOptions(fields())} />
                                                <Datatable.Field name={'listViewConfig.tableColumns' as any} label={t('cms.contentTypeConfig.tableColumnsLabel')} description={t('cms.contentTypeConfig.tableColumnsHint')}>
                                                    <TableColumnsField fields={fields()} />
                                                </Datatable.Field>
                                            </div>
                                        </PersistentTab>

                                        <PersistentTab label={t('cms.contentTypeConfig.tabForm')}>
                                            <div class="space-y-4 p-1">
                                                <Datatable.Field name={'formConfig.defaultMode' as any} label={t('cms.contentTypeConfig.defaultModeLabel')}>
                                                    <Select options={FORM_MODE_OPTIONS()} />
                                                </Datatable.Field>
                                                <Datatable.Field name={'formConfig.enabledModes' as any} label={t('cms.contentTypeConfig.enabledModesLabel')}>
                                                    <ModeMultiSelectField options={FORM_MODES.map((m) => ({ value: m, label: FORM_MODE_LABELS()[m], kind: m }))} />
                                                </Datatable.Field>
                                                <GridLayoutDesignerField fields={fields()} />
                                            </div>
                                        </PersistentTab>

                                        <PersistentTab label={t('cms.contentTypeConfig.tabSearch')}>
                                            <SearchableFieldsTab />
                                        </PersistentTab>

                                        <PersistentTab label={t('cms.contentTypeConfig.tabFilters')}>
                                            <div class="p-1">
                                                <Datatable.Field name="filters" label="">
                                                    <ContentFilterListInput
                                                        fieldOptions={fields().filter((f) => !!f.key).map((f) => ({ value: f.key!, label: f.label || f.key! }))}
                                                    />
                                                </Datatable.Field>
                                            </div>
                                        </PersistentTab>

                                        <PersistentTab label={t('cms.contentTypeConfig.tabAdvanced')}>
                                            <div class="p-1">
                                                <p class="mb-1 text-sm font-semibold text-neutral-800">{t('cms.contentTypes.visibility.sectionTitle')}</p>
                                                <p class="mb-3 text-xs text-neutral-400">{t('cms.contentTypes.visibility.sectionHint')}</p>
                                                <Datatable.Field name="contentVisibilityRules" label="">
                                                    <ContentVisibilityRulesInput fieldOptions={fields().filter((f) => !!f.key).map((f) => ({ value: f.key!, label: f.label || f.key! }))} />
                                                </Datatable.Field>
                                            </div>
                                        </PersistentTab>
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
