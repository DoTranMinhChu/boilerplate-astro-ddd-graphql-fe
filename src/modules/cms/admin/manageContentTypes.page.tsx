import { createResource } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Icon } from '@shared/components/icons/Icon';
import { ContentTypeDTO, ContentTypeService } from '@/shared/services/contentType/contentType.service';
import type { CreateContentTypeInput, UpdateContentTypeInput } from '@shared/generated/typed-graphql';
import type { Edge } from '@core/api/types';
import { FieldDefinitionArrayInput } from './FieldDefinitionArrayInput';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { t } from '@/shared/i18n/t';

const { Datatable } = generateDatatable<PagingArgsInput, ContentTypeDTO, ContentTypeDTO, ContentTypeDTO, CreateContentTypeInput, UpdateContentTypeInput>({
    service: ContentTypeService,
    paginatedQuery: (input) => ContentTypeService.getAllContentType(input),
    itemQuery: (item) => ContentTypeService.getOneContentType({ id: item.id! }),
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
                    >
                        {() => (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                <div class="col-span-8">
                                    <Datatable.Field name="label" label={t('cms.contentTypes.fields.label')} required>
                                        <Input placeholder={t('cms.contentTypes.fields.labelPlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    <Datatable.Field name="key" label={t('cms.contentTypes.fields.key')} description={t('cms.contentTypes.fields.keyHint')}>
                                        <Input placeholder={t('cms.contentTypes.fields.keyPlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="fields" label={t('cms.contentTypes.fields.fields')}>
                                        <FieldDefinitionArrayInput contentTypeOptions={contentTypeOptions()} />
                                    </Datatable.Field>
                                </div>
                            </div>
                        )}
                    </Datatable.Formlog>
                </Datatable>
            </Card>
        </div>
    );
}
