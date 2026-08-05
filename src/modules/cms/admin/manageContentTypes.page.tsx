import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { ContentTypeDTO, ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { FieldDefinitionArrayInput } from './FieldDefinitionArrayInput';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';

const { Datatable } = generateDatatable<PagingArgsInput, ContentTypeDTO, ContentTypeDTO, ContentTypeDTO, any, any>({
    service: ContentTypeService,
    paginatedQuery: (input) => ContentTypeService.getAllContentType(input),
    itemQuery: (item) => ContentTypeService.getOneContentType({ id: item.id! }),
    createMutation: (data) => ContentTypeService.createContentType({ data }),
    updateMutation: (id, data) => ContentTypeService.updateContentType({ id, data }),
    deleteMutation: (item) => ContentTypeService.deleteContentType({ id: item.id! }),
});

export function ManageContentTypesPage() {
    const { navigateToPage } = useRoutes();

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="ContentTypeTable">
                    <Datatable.Header>
                        <Datatable.Title
                            title="Content Types (Object Type)"
                            description="Admin tự tạo loại nội dung mới (Sản phẩm, Tin tức, Đối tác...) kèm field tuỳ ý — không cần dev."
                        />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label="Tạo Content Type" />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title="Label" sortable="label">
                            {(item) => <p class="font-semibold text-gray-900">{item.label}</p>}
                        </Datatable.Column>
                        <Datatable.Column title="Key">
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.key}</code>}
                        </Datatable.Column>
                        <Datatable.Column title="Số field">
                            {(item) => <span>{item.fields?.length ?? 0}</span>}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Datatable.CellButton
                                        sm
                                        onClick={() => navigateToPage({ route: 'adminDashboard.cmsContentEntries', context: { searchParams: { contentTypeId: item.id, label: item.label } } })}
                                    >
                                        Dữ liệu
                                    </Datatable.CellButton>
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Datatable.CellButtonDelete item={item} itemName={item.label!} />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>
                    </Datatable.Table>

                    <Datatable.Pagination />

                    <Datatable.Formlog
                        viewMode="modal"
                        class="w-full max-w-[720px]"
                        createTitle="Tạo Content Type"
                        updateTitle="Sửa Content Type"
                    >
                        {() => (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                <div class="col-span-8">
                                    <Datatable.Field name="label" label="Tên hiển thị" required>
                                        <Input placeholder="vd: Đối tác" />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    <Datatable.Field name="key" label="Key (slug)" description="Để trống sẽ tự sinh từ tên">
                                        <Input placeholder="vd: doi-tac" />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="fields" label="Fields">
                                        <FieldDefinitionArrayInput />
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
