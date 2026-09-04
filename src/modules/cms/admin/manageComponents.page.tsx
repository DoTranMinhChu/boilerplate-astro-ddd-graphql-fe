import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@shared/components/table/GeneratedDatatable';
import { Icon } from '@shared/components/icons/Icon';
import { ComponentService, ComponentDefinitionDTO } from '@/shared/services/component/component.service';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { tOrLiteral } from '@/shared/i18n/t';

const { Datatable } = generateDatatable<PagingArgsInput, ComponentDefinitionDTO, ComponentDefinitionDTO, ComponentDefinitionDTO, never, never>({
    service: ComponentService,
    paginatedQuery: (input) => ComponentService.getAllComponent(input),
    itemQuery: (item) => ComponentService.getOneComponent({ id: item.id! }),
    deleteMutation: (item) => ComponentService.deleteComponentDefinition({ id: item.id! }),
});

// v1 scope cut (per design spec): list + edit (jump to Node Builder on the definition page) +
// delete only — no thumbnail column, no usage-count column. deleteMutation calls
// deleteComponentDefinition with `force` unset (defaults to false server-side), so the BE's
// ConflictException when live instances exist surfaces via the Datatable's existing
// error-toast path, same as any other delete failure.
export function ManageComponentsPage() {
    const { navigateToPage } = useRoutes();

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="ComponentTable">
                    <Datatable.Header>
                        <Datatable.Title title={tOrLiteral('cms.component.listTitle')} description={tOrLiteral('cms.component.listDescription')} />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title={tOrLiteral('cms.component.columns.label')} sortable="label">
                            {(item) => <p class="font-semibold text-gray-900">{item.label}</p>}
                        </Datatable.Column>
                        <Datatable.Column title={tOrLiteral('cms.component.columns.key')}>
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.key}</code>}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Datatable.CellButton
                                        sm
                                        icon={<Icon name="heroicons-outline:pencil-square" tooltip={tOrLiteral('cms.component.editButton')} />}
                                        onClick={() => navigateToPage({ route: 'adminDashboard.cmsNodeBuilder', context: { searchParams: { pageId: item.definitionPageId } } })}
                                    />
                                    <Datatable.CellButtonDelete item={item} itemName={item.label!} />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>
                    </Datatable.Table>

                    <Datatable.Pagination />
                </Datatable>
            </Card>
        </div>
    );
}
