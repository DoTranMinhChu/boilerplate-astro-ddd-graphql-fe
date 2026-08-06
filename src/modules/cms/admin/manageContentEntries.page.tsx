import { Show, createResource, For } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { InputDate } from '@core/components/control/InputDate';
import { Toggle } from '@core/components/control/Toggle';
import { Select } from '@core/components/control/Select';
import { InputImage } from '@core/components/control/InputImage';
import { Editor } from '@core/components/control/Editor';
import { Textarea } from '@core/components/control/Textarea';
import { ContentEntryDTO, ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { PageService } from '@/shared/services/page/page.service';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { RelationFieldInput } from './RelationFieldInput';
import { Icon } from '@shared/components/icons/Icon';
import { t, tOrLiteral } from '@/shared/i18n/t';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

const STATUS_OPTIONS = () => [
    { value: 'DRAFT', label: t('cms.contentEntries.status.draft') },
    { value: 'PUBLISHED', label: t('cms.contentEntries.status.published') },
    { value: 'UNPUBLISHED', label: t('cms.contentEntries.status.unpublished') },
];

/** Render đúng control theo FieldDefinition.type — không hardcode field theo 1
 * loại content cụ thể (mục 4.6/23 spec CMS: admin không thấy JSON thô). */
function renderFieldControl(field: FieldDefinitionDTO) {
    switch (field.type) {
        case 'RICHTEXT':
            return <Editor />;
        case 'NUMBER':
            return <InputNumber placeholder={field.label} />;
        case 'BOOLEAN':
            return <Toggle text={field.label} />;
        case 'DATE':
            return <InputDate mode="date" />;
        case 'SELECT':
            return <Select options={(field.options || []).filter((o): o is string => !!o).map((o) => ({ value: o, label: o }))} clearable />;
        case 'IMAGE':
            return <InputImage />;
        case 'GALLERY':
            return <InputImage multiple={20} />;
        case 'VIDEO':
            return <Input placeholder={t('cms.contentEntries.fields.videoUrlPlaceholder')} />;
        case 'LINK':
            return <Input placeholder={t('cms.contentEntries.fields.linkPlaceholder')} />;
        case 'RELATION':
            // relationTarget được cấu hình từ trang Content Types (FieldDefinitionArrayInput)
            // — field cũ tạo trước khi có bộ chọn này sẽ không có relationTarget, rơi về ô
            // nhập ID tay như trước (tương thích ngược) thay vì render 1 dropdown rỗng vô dụng.
            return field.relationTarget
                ? <RelationFieldInput contentTypeId={field.relationTarget} multiple={field.relationMultiple} />
                : <Input placeholder={t('cms.contentEntries.fields.relationPlaceholder')} />;
        default:
            return <Input placeholder={field.label} />;
    }
}

export function ManageContentEntriesPage() {
    const { searchParams } = useRoutes();
    const contentTypeId = () => searchParams.contentTypeId as string;

    const [contentType] = createResource(contentTypeId, (id) => ContentTypeService.getOneContentType({ id }));
    // Trang Chi tiết (COLLECTION_DETAIL) đang publish của loại nội dung này, nếu có —
    // dùng để build link "Xem trang" cho từng bản ghi (đúng kịch bản chia sẻ trang
    // chi tiết dự án cụ thể mà không phải đoán URL bằng tay).
    const [detailPathPattern] = createResource(contentTypeId, (id) => PageService.getPublicDetailPathByContentType({ contentTypeId: id }));

    return (
        <Show when={contentType()} fallback={<div class="p-6 text-neutral-400">{t('cms.contentEntries.loading')}</div>}>
            {(ct) => {
                const { Datatable } = generateDatatable<PagingArgsInput, ContentEntryDTO, ContentEntryDTO, ContentEntryDTO, any, any>({
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
                                    <Datatable.Column title={t('cms.contentEntries.columns.slug')}>
                                        {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.slug}</code>}
                                    </Datatable.Column>
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
                                                    return <span class="text-sm text-neutral-700">{String(raw ?? '')}</span>;
                                                }}
                                            </Datatable.Column>
                                        )}
                                    </For>
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
                                                {detailPathPattern() && item.status === 'PUBLISHED' && (
                                                    <Datatable.CellButton
                                                        sm
                                                        icon={<Icon name="heroicons-outline:arrow-top-right-on-square" tooltip={t('cms.contentEntries.viewLiveButton')} />}
                                                        onClick={() => window.open(detailPathPattern()!.replace(':slug', item.slug!), '_blank')}
                                                    />
                                                )}
                                                <Datatable.CellButtonUpdate item={item} />
                                                <Datatable.CellButtonDelete item={item} itemName={item.slug!} />
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
                                    {() => (
                                        <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                            <div class="col-span-8">
                                                <Datatable.Field name="slug" label={t('cms.contentEntries.fields.slug')} description={t('cms.contentEntries.fields.slugHint')}>
                                                    <Input placeholder={t('cms.contentEntries.fields.slugPlaceholder')} />
                                                </Datatable.Field>
                                            </div>
                                            <div class="col-span-4">
                                                <Datatable.Field name="status" label={t('cms.contentEntries.fields.status')}>
                                                    <Select options={STATUS_OPTIONS()} />
                                                </Datatable.Field>
                                            </div>
                                            <For each={(ct().fields || []).filter((f): f is FieldDefinitionDTO => !!f)}>
                                                {(field) => (
                                                    <div class="col-span-12">
                                                        <Datatable.Field name={`data.${field.key}` as any} label={field.label} required={field.required}>
                                                            {renderFieldControl(field)}
                                                        </Datatable.Field>
                                                    </div>
                                                )}
                                            </For>
                                            {/* SEO riêng theo từng bản ghi — cho phép trang Chi tiết (COLLECTION_DETAIL)
                                                chia sẻ đúng tiêu đề/mô tả/ảnh của từng bản ghi thay vì SEO chung của trang.
                                                Backend (page.resolver.ts resolvePage) đã ưu tiên seo của entry nếu có, rồi
                                                mới fallback về seo mặc định của trang chứa nó — để trống ở đây là đủ an toàn. */}
                                            <div class="col-span-12 pt-2 border-t border-neutral-100">
                                                <p class="text-sm font-semibold text-neutral-800">{t('cms.contentEntries.seo.sectionTitle')}</p>
                                                <p class="mt-0.5 text-xs text-neutral-400">{t('cms.contentEntries.seo.sectionHint')}</p>
                                            </div>
                                            <div class="col-span-12">
                                                <Datatable.Field name="seo.title" label={t('cms.contentEntries.seo.title')}>
                                                    <Input placeholder={t('cms.contentEntries.seo.titlePlaceholder')} />
                                                </Datatable.Field>
                                            </div>
                                            <div class="col-span-12">
                                                <Datatable.Field name="seo.description" label={t('cms.contentEntries.seo.description')}>
                                                    <Textarea rows={2} />
                                                </Datatable.Field>
                                            </div>
                                            <div class="col-span-12">
                                                <Datatable.Field name="seo.ogImage" label={t('cms.contentEntries.seo.ogImage')} description={t('cms.contentEntries.seo.ogImageHint')}>
                                                    <InputImage />
                                                </Datatable.Field>
                                            </div>
                                        </div>
                                    )}
                                </Datatable.Formlog>
                            </Datatable>
                        </Card>
                    </div>
                );
            }}
        </Show>
    );
}
