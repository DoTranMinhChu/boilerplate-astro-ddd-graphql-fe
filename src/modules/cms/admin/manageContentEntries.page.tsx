import { Show, createResource, For } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { useDatatable } from '@core/components/table/DatatableContext';
import { toast } from '@core/components/toast/ToastProvider';
import { Select } from '@core/components/control/Select';
import { ContentEntryDTO, ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { ContentEntryUsagePanel } from './ContentEntryUsagePanel';
import { AddTranslationButton } from './AddTranslationButton';
import { t, tOrLiteral } from '@/shared/i18n/t';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { renderFieldControl } from '@/shared/components/fields/contentEntryFieldRenderer';

const STATUS_OPTIONS = () => [
    { value: 'DRAFT', label: t('cms.contentEntries.status.draft') },
    { value: 'PUBLISHED', label: t('cms.contentEntries.status.published') },
    { value: 'UNPUBLISHED', label: t('cms.contentEntries.status.unpublished') },
];

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
