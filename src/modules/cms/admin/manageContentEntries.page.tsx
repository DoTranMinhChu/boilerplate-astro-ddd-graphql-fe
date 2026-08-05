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
import { ContentEntryDTO, ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'UNPUBLISHED', label: 'Unpublished' },
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
            return <Input placeholder="URL video" />;
        case 'LINK':
            return <Input placeholder="https://..." />;
        case 'RELATION':
            return <Input placeholder="ID bản ghi liên quan" />;
        default:
            return <Input placeholder={field.label} />;
    }
}

export function ManageContentEntriesPage() {
    const { searchParams } = useRoutes();
    const contentTypeId = () => searchParams.contentTypeId as string;

    const [contentType] = createResource(contentTypeId, (id) => ContentTypeService.getOneContentType({ id }));

    return (
        <Show when={contentType()} fallback={<div class="p-6 text-neutral-400">Đang tải content type...</div>}>
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
                                        title={`Dữ liệu — ${ct().label}`}
                                        description={`Quản lý các bản ghi thuộc content type "${ct().label}"`}
                                    />
                                    <Datatable.Buttons>
                                        <Datatable.ButtonRefresh />
                                        <Datatable.ButtonCreate label="Thêm bản ghi" />
                                    </Datatable.Buttons>
                                </Datatable.Header>

                                <Datatable.Toolbar>
                                    <Datatable.Search />
                                </Datatable.Toolbar>

                                <Datatable.Table>
                                    <Datatable.Column title="Slug">
                                        {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.slug}</code>}
                                    </Datatable.Column>
                                    <For each={(ct().fields || []).filter((f): f is FieldDefinitionDTO => !!f?.showInListing).slice(0, 3)}>
                                        {(field) => (
                                            <Datatable.Column title={field.label}>
                                                {(item) => <span class="text-sm text-neutral-700">{String((item.data as unknown as Record<string, unknown> | undefined)?.[field.key!] ?? '')}</span>}
                                            </Datatable.Column>
                                        )}
                                    </For>
                                    <Datatable.Column title="Trạng thái">
                                        {(item) => (
                                            <span class={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                                                {item.status}
                                            </span>
                                        )}
                                    </Datatable.Column>
                                    <Datatable.Column title="">
                                        {(item) => (
                                            <Datatable.CellButtons>
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
                                    createTitle="Thêm bản ghi"
                                    updateTitle="Sửa bản ghi"
                                >
                                    {() => (
                                        <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                            <div class="col-span-8">
                                                <Datatable.Field name="slug" label="Slug" description="Để trống sẽ tự sinh">
                                                    <Input placeholder="vd: almaz" />
                                                </Datatable.Field>
                                            </div>
                                            <div class="col-span-4">
                                                <Datatable.Field name="status" label="Trạng thái">
                                                    <Select options={STATUS_OPTIONS} />
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
