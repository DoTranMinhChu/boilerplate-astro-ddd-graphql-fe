import { Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Toggle } from '@core/components/control/Toggle';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { TaxonomyDTO, TaxonomyService } from '@/shared/services/taxonomy/taxonomy.service';
import type { CreateTaxonomyInput, UpdateTaxonomyInput } from '@shared/generated/typed-graphql';
import { TermTreeEditor } from './TermTreeEditor';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { t } from '@/shared/i18n/t';

const { Datatable } = generateDatatable<PagingArgsInput, TaxonomyDTO, TaxonomyDTO, TaxonomyDTO, CreateTaxonomyInput, UpdateTaxonomyInput>({
    service: TaxonomyService,
    paginatedQuery: (input) => TaxonomyService.getAllTaxonomy(input),
    itemQuery: (item) => TaxonomyService.getOneTaxonomy({ id: item.id! }),
    createMutation: (data) => TaxonomyService.createTaxonomy({ data }),
    updateMutation: (id, data) => TaxonomyService.updateTaxonomy({ id, data }),
    deleteMutation: (item) => TaxonomyService.deleteTaxonomy({ id: item.id! }),
});

// Màn 2 cấp trên CÙNG 1 route (/admin/cms/taxonomies), phân biệt qua searchParams —
// đúng cơ chế "route con" mà cmsContentEntries dùng (searchParams.contentTypeId), chỉ khác
// là ở đây tái dùng chung 1 page component thay vì tách route riêng: bấm "Quản lý Term"
// điều hướng sang CHÍNH route này kèm searchParams.taxonomyId, nút quay lại xoá searchParams.
export function ManageTaxonomiesPage() {
    const { searchParams, navigateToPage } = useRoutes();
    const taxonomyId = () => searchParams.taxonomyId as string | undefined;

    return (
        <Show when={taxonomyId()} fallback={<TaxonomyListView />}>
            <TermsView
                taxonomyId={taxonomyId()!}
                label={(searchParams.label as string) || ''}
                hierarchical={searchParams.hierarchical === '1'}
                onBack={() => navigateToPage('adminDashboard.cmsTaxonomies')}
            />
        </Show>
    );
}

function TermsView(props: { taxonomyId: string; label: string; hierarchical: boolean; onBack: () => void }) {
    return (
        <div class="space-y-5 animate-in">
            <div class="flex items-center gap-3">
                <Button
                    sm
                    outline
                    icon={<Icon name="heroicons-outline:arrow-left" tooltip={t('cms.taxonomies.backButton')} />}
                    onClick={props.onBack}
                />
                <div class="min-w-0">
                    <h2 class="text-xl font-semibold text-neutral-900 truncate">{props.label}</h2>
                    <p class="text-sm text-neutral-400">
                        {props.hierarchical ? t('cms.taxonomies.hierarchicalBadge.tree') : t('cms.taxonomies.hierarchicalBadge.flat')}
                    </p>
                </div>
            </div>
            <TermTreeEditor taxonomyId={props.taxonomyId} hierarchical={props.hierarchical} />
        </div>
    );
}

function TaxonomyListView() {
    const { navigateToPage } = useRoutes();

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="TaxonomyTable">
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.taxonomies.title')} description={t('cms.taxonomies.description')} />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('cms.taxonomies.createButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title={t('cms.taxonomies.columns.label')} sortable="label">
                            {(item) => <p class="font-semibold text-gray-900">{item.label}</p>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.taxonomies.columns.key')}>
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.key}</code>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.taxonomies.columns.hierarchical')}>
                            {(item) => (
                                <span
                                    class={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${item.hierarchical ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-500'
                                        }`}
                                >
                                    {item.hierarchical ? t('cms.taxonomies.hierarchicalBadge.tree') : t('cms.taxonomies.hierarchicalBadge.flat')}
                                </span>
                            )}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Datatable.CellButton
                                        sm
                                        icon={<Icon name="heroicons-outline:tag" tooltip={t('cms.taxonomies.manageTermsButton')} />}
                                        onClick={() =>
                                            navigateToPage({
                                                route: 'adminDashboard.cmsTaxonomies',
                                                context: { searchParams: { taxonomyId: item.id, label: item.label, hierarchical: item.hierarchical ? '1' : '0' } },
                                            })
                                        }
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
                        class="w-full max-w-[560px]"
                        createTitle={t('cms.taxonomies.createTitle')}
                        updateTitle={t('cms.taxonomies.updateTitle')}
                        // `key` chỉ tồn tại trên CreateTaxonomyInput — UpdateTaxonomyInput không có
                        // field này (key bất biến sau khi tạo, đúng khuôn ContentType.key — xem
                        // manageContentTypes.page.tsx). Gửi "key" trong update payload bị GraphQL
                        // từ chối thẳng, chặn từ trước khi build values thay vì chỉ ẩn field trên UI.
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
                                    <Datatable.Field name="label" label={t('cms.taxonomies.fields.label')} required>
                                        <Input placeholder={t('cms.taxonomies.fields.labelPlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <Show when={!item}>
                                    <div class="col-span-4">
                                        <Datatable.Field name="key" label={t('cms.taxonomies.fields.key')} description={t('cms.taxonomies.fields.keyHint')}>
                                            <Input placeholder={t('cms.taxonomies.fields.keyPlaceholder')} />
                                        </Datatable.Field>
                                    </div>
                                </Show>
                                <div class="col-span-12">
                                    <Datatable.Field name="hierarchical" label={t('cms.taxonomies.fields.hierarchical')} description={t('cms.taxonomies.fields.hierarchicalHint')}>
                                        <Toggle />
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
