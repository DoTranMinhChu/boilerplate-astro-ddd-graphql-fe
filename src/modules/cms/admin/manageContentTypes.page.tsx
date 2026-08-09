import { createResource, Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Icon } from '@shared/components/icons/Icon';
import { ContentTypeDTO, ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { TaxonomyDTO, TaxonomyService } from '@/shared/services/taxonomy/taxonomy.service';
import type { CreateContentTypeInput, UpdateContentTypeInput } from '@shared/generated/typed-graphql';
import type { Edge } from '@core/api/types';
import { FieldDefinitionArrayInput } from './FieldDefinitionArrayInput';
import { ContentVisibilityRulesInput } from './ContentVisibilityRulesInput';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { t } from '@/shared/i18n/t';

const { Datatable } = generateDatatable<PagingArgsInput, ContentTypeDTO, ContentTypeDTO, ContentTypeDTO, CreateContentTypeInput, UpdateContentTypeInput>({
    service: ContentTypeService,
    paginatedQuery: (input) => ContentTypeService.getAllContentType(input),
    itemQuery: (item) => ContentTypeService.getOneContentTypeAdmin({ id: item.id! }),
    createMutation: (data) => ContentTypeService.createContentType({ data }),
    updateMutation: (id, data) => ContentTypeService.updateContentType({ id, data }),
    deleteMutation: (item) => ContentTypeService.deleteContentType({ id: item.id! }),
});

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

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="ContentTypeTable">
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.contentTypes.title')} description={t('cms.contentTypes.description')} />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('cms.contentTypes.createButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title={t('cms.contentTypes.columns.label')} sortable="label">
                            {(item) => <p class="font-semibold text-gray-900">{item.label}</p>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.contentTypes.columns.key')}>
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.key}</code>}
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

                    <Datatable.Pagination />

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
                            if (item) {
                                const { key, ...rest } = values as typeof values & { key?: string };
                                return rest as typeof values;
                            }
                            return values;
                        }}
                    >
                        {(item) => (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
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
                                <div class="col-span-12">
                                    <Datatable.Field name="fields" label={t('cms.contentTypes.fields.fields')}>
                                        <FieldDefinitionArrayInput
                                            contentTypeOptions={contentTypeOptions()}
                                            contentTypesFull={contentTypesFull()}
                                            taxonomyOptions={taxonomyOptions()}
                                        />
                                    </Datatable.Field>
                                </div>
                                <Show when={item}>
                                    <div class="col-span-12 border-t border-dashed border-neutral-200 pt-6">
                                        <p class="mb-1 text-sm font-semibold text-neutral-800">{t('cms.contentTypes.visibility.sectionTitle')}</p>
                                        <p class="mb-3 text-xs text-neutral-400">{t('cms.contentTypes.visibility.sectionHint')}</p>
                                        <Datatable.Field name="contentVisibilityRules" label="">
                                            <ContentVisibilityRulesInput fieldOptions={(item?.fields || []).filter((f): f is NonNullable<typeof f> => !!f?.key).map((f) => ({ value: f.key!, label: f.label || f.key! }))} />
                                        </Datatable.Field>
                                    </div>
                                </Show>
                            </div>
                        )}
                    </Datatable.Formlog>
                </Datatable>
            </Card>
        </div>
    );
}
