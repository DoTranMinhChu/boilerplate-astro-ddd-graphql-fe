import { Show, createResource, For } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { useDatatable } from '@core/components/table/DatatableContext';
import { toast } from '@core/components/toast/ToastProvider';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { InputDate } from '@core/components/control/InputDate';
import { Toggle } from '@core/components/control/Toggle';
import { Select } from '@core/components/control/Select';
import { InputImage } from '@core/components/control/InputImage';
import { Editor } from '@core/components/control/Editor';
import { ContentEntryDTO, ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { RelationFieldInput } from './RelationFieldInput';
import { TaxonomyFieldInput } from './TaxonomyFieldInput';
import { ContentEntryRepeaterInput } from './ContentEntryRepeaterInput';
import { ContentEntryUsagePanel } from './ContentEntryUsagePanel';
import { AddTranslationButton } from './AddTranslationButton';
import { t, tOrLiteral } from '@/shared/i18n/t';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

const STATUS_OPTIONS = () => [
    { value: 'DRAFT', label: t('cms.contentEntries.status.draft') },
    { value: 'PUBLISHED', label: t('cms.contentEntries.status.published') },
    { value: 'UNPUBLISHED', label: t('cms.contentEntries.status.unpublished') },
];

/** 1 field ở chế độ CONTROLLED (dùng bên trong ContentEntryRepeaterInput — 1 item của
 * REPEATER không có path <Datatable.Field name="..."> ổn định). RelationFieldInput hỗ
 * trợ cả 2 chế độ (xem RelationFieldInput.tsx) nên RELATION trong repeater cũng dùng
 * dropdown chọn thật khi field có relationTarget, chỉ rơi về ô nhập ID tay cho field cũ
 * chưa cấu hình relationTarget (giống hệt logic ambient-mode ở registry bên dưới). */
function renderControlledFieldControl(field: FieldDefinitionDTO, value: any, onChange: (v: any) => void) {
    switch (field.type) {
        case 'RICHTEXT':
            return <Editor value={value} onChange={onChange} fieldless />;
        case 'NUMBER':
            return <InputNumber value={value} onChange={onChange} placeholder={field.label} fieldless />;
        case 'BOOLEAN':
            return <Toggle value={value} onChange={onChange} fieldless />;
        case 'DATE':
            return <InputDate mode="date" value={value} onChange={onChange} fieldless />;
        case 'SELECT':
            return <Select options={(field.options || []).filter((o): o is string => !!o).map((o) => ({ value: o, label: o }))} value={value} onChange={onChange} clearable fieldless />;
        case 'IMAGE':
            return <InputImage value={value} onChange={onChange} fieldless />;
        case 'GALLERY':
            return <InputImage multiple={20} value={value} onChange={onChange} fieldless />;
        case 'VIDEO':
            return <Input value={value} onChange={onChange} placeholder={t('cms.contentEntries.fields.videoUrlPlaceholder')} fieldless />;
        case 'LINK':
            return <Input value={value} onChange={onChange} placeholder={t('cms.contentEntries.fields.linkPlaceholder')} fieldless />;
        case 'RELATION':
            return field.relationTarget
                ? <RelationFieldInput contentTypeId={field.relationTarget} multiple={field.relationMultiple} displayField={field.relationDisplayField} value={value} onChange={onChange} fieldless />
                : <Input value={value} onChange={onChange} placeholder={t('cms.contentEntries.fields.relationPlaceholder')} fieldless />;
        case 'TAXONOMY':
            return field.taxonomyId
                ? <TaxonomyFieldInput taxonomyId={field.taxonomyId} multiple={field.taxonomyMultiple} value={value} onChange={onChange} fieldless />
                : <p class="text-xs text-neutral-400">Chưa cấu hình Taxonomy cho field này.</p>;
        case 'REPEATER':
            // Cast: FieldDefinitionDTO.itemFields được GraphQL fragment (contentType.service.ts)
            // chọn field con ở đúng 1 cấp (không đệ quy itemFields của itemFields — REPEATER
            // lồng REPEATER không được hỗ trợ), nên type của nó hẹp hơn FieldDefinitionDTO đúng
            // 1 trường (thiếu itemFields ở cấp con) chứ không phải shape sai — an toàn để cast.
            return (
                <ContentEntryRepeaterInput
                    itemFields={(field.itemFields || []) as FieldDefinitionDTO[]}
                    renderField={renderControlledFieldControl}
                    value={value}
                    onChange={onChange}
                    fieldless
                />
            );
        default:
            return <Input value={value} onChange={onChange} placeholder={field.label} fieldless />;
    }
}

/** Render đúng control theo FieldDefinition.type — không hardcode field theo 1
 * loại content cụ thể (mục 4.6/23 spec CMS: admin không thấy JSON thô). Registry
 * thay cho switch (Phase 2a) — thêm 1 kiểu field mới là thêm 1 dòng, không phải
 * tìm đúng chỗ trong 1 khối switch dài. */
const contentEntryFieldRegistry: Partial<Record<string, (field: FieldDefinitionDTO) => JSX.Element>> = {
    RICHTEXT: () => <Editor />,
    NUMBER: (field) => <InputNumber placeholder={field.label} />,
    BOOLEAN: (field) => <Toggle text={field.label} />,
    DATE: () => <InputDate mode="date" />,
    SELECT: (field) => <Select options={(field.options || []).filter((o): o is string => !!o).map((o) => ({ value: o, label: o }))} clearable />,
    IMAGE: () => <InputImage />,
    GALLERY: () => <InputImage multiple={20} />,
    VIDEO: (field) => <Input placeholder={t('cms.contentEntries.fields.videoUrlPlaceholder')} />,
    LINK: (field) => <Input placeholder={t('cms.contentEntries.fields.linkPlaceholder')} />,
    RELATION: (field) => {
        // relationTarget được cấu hình từ trang Content Types (FieldDefinitionArrayInput)
        // — field cũ tạo trước khi có bộ chọn này sẽ không có relationTarget, rơi về ô
        // nhập ID tay như trước (tương thích ngược) thay vì render 1 dropdown rỗng vô dụng.
        return field.relationTarget
            ? <RelationFieldInput contentTypeId={field.relationTarget} multiple={field.relationMultiple} displayField={field.relationDisplayField} />
            : <Input placeholder={t('cms.contentEntries.fields.relationPlaceholder')} />;
    },
    TAXONOMY: (field) => field.taxonomyId
        ? <TaxonomyFieldInput taxonomyId={field.taxonomyId} multiple={field.taxonomyMultiple} />
        : <p class="text-xs text-neutral-400">Chưa cấu hình Taxonomy cho field này.</p>,
    REPEATER: (field) => (
        <ContentEntryRepeaterInput
            itemFields={(field.itemFields || []) as FieldDefinitionDTO[]}
            renderField={renderControlledFieldControl}
        />
    ),
};

function renderFieldControl(field: FieldDefinitionDTO) {
    const renderer = contentEntryFieldRegistry[field.type as string];
    return renderer ? renderer(field) : <Input placeholder={field.label} />;
}

/** Tên hiển thị ngắn cho 1 entry (vd trong hộp thoại xác nhận xoá) — không còn cột `slug`
 * cứng (mục γ, Task 5) để dùng làm tên mặc định, rơi về giá trị field TEXT đầu tiên của
 * content type, rồi tới id nếu content type không có field TEXT nào. */
function entryDisplayName(item: ContentEntryDTO, fields: FieldDefinitionDTO[]): string {
    const titleField = fields.find((f) => f?.type === 'TEXT');
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
                                </Datatable.Toolbar>

                                <Datatable.Table>
                                    <For each={(ct().fields || []).filter((f): f is FieldDefinitionDTO => !!f?.showInListing).slice(0, 3)}>
                                        {(field) => (
                                            <Datatable.Column title={field.label}>
                                                {(item) => {
                                                    const raw = (item.data as unknown as Record<string, unknown> | undefined)?.[field.key!];
                                                    if (field.type === 'IMAGE' && typeof raw === 'string' && raw) {
                                                        return <img src={raw} alt={field.label} class="h-9 w-9 rounded-md object-cover border border-neutral-100" />;
                                                    }
                                                    if (field.type === 'BOOLEAN') {
                                                        return <span class="text-sm text-neutral-700">{raw ? '✓' : '—'}</span>;
                                                    }
                                                    if (field.type === 'REPEATER') {
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

                                <Datatable.Pagination />

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
