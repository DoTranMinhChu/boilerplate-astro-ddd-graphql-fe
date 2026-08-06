import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { RedirectDTO, RedirectService } from '@/shared/services/redirect/redirect.service';
import type { CreateRedirectInput, UpdateRedirectInput } from '@shared/generated/typed-graphql';
import { t } from '@/shared/i18n/t';

const STATUS_CODE_OPTIONS = () => [
    { value: 301, label: t('cms.redirects.statusCodeOptions.permanent') },
    { value: 302, label: t('cms.redirects.statusCodeOptions.temporary') },
];

const { Datatable } = generateDatatable<PagingArgsInput, RedirectDTO, RedirectDTO, RedirectDTO, CreateRedirectInput, UpdateRedirectInput>({
    service: RedirectService,
    paginatedQuery: (input) => RedirectService.getAllRedirect(input),
    itemQuery: (item) => RedirectService.getOneRedirect({ id: item.id! }),
    createMutation: (data) => RedirectService.createRedirect({ data }),
    updateMutation: (id, data) => RedirectService.updateRedirect({ id, data }),
    deleteMutation: (item) => RedirectService.deleteRedirect({ id: item.id! }),
});

export function ManageRedirectsPage() {
    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="RedirectTable">
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.redirects.title')} description={t('cms.redirects.description')} />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('cms.redirects.createButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title={t('cms.redirects.columns.fromPath')}>
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.fromPath}</code>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.redirects.columns.toPath')}>
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.toPath}</code>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.redirects.columns.statusCode')}>
                            {(item) => <span class="text-sm text-neutral-600">{item.statusCode}</span>}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Datatable.CellButtonDelete item={item} itemName={item.fromPath!} />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>
                    </Datatable.Table>

                    <Datatable.Pagination />

                    <Datatable.Formlog
                        viewMode="modal"
                        class="w-full max-w-[480px]"
                        createTitle={t('cms.redirects.createTitle')}
                        updateTitle={t('cms.redirects.updateTitle')}
                    >
                        {() => (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                <div class="col-span-12">
                                    <Datatable.Field name="fromPath" label={t('cms.redirects.fields.fromPath')} required>
                                        <Input placeholder={t('cms.redirects.fields.fromPathPlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="toPath" label={t('cms.redirects.fields.toPath')} required>
                                        <Input placeholder={t('cms.redirects.fields.toPathPlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="statusCode" label={t('cms.redirects.fields.statusCode')}>
                                        <Select options={STATUS_CODE_OPTIONS()} />
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
