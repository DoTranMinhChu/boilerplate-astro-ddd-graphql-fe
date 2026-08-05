import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { RedirectDTO, RedirectService } from '@/shared/services/redirect/redirect.service';

const STATUS_CODE_OPTIONS = [
    { value: 301, label: '301 - Permanent' },
    { value: 302, label: '302 - Temporary' },
];

const { Datatable } = generateDatatable<PagingArgsInput, RedirectDTO, RedirectDTO, RedirectDTO, any, any>({
    service: RedirectService,
    paginatedQuery: (input) => RedirectService.getAllRedirect(input),
    createMutation: (data) => RedirectService.createRedirect({ data }),
    deleteMutation: (item) => RedirectService.deleteRedirect({ id: item.id! }),
});

export function ManageRedirectsPage() {
    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="RedirectTable">
                    <Datatable.Header>
                        <Datatable.Title
                            title="Redirects"
                            description="Redirect được tự tạo khi đổi path/slug. Có thể thêm tay redirect khác tại đây."
                        />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label="Thêm redirect" />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title="Từ path">
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.fromPath}</code>}
                        </Datatable.Column>
                        <Datatable.Column title="Đến path">
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.toPath}</code>}
                        </Datatable.Column>
                        <Datatable.Column title="Loại">
                            {(item) => <span class="text-sm text-neutral-600">{item.statusCode}</span>}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Datatable.CellButtonDelete item={item} itemName={item.fromPath!} />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>
                    </Datatable.Table>

                    <Datatable.Pagination />

                    <Datatable.Formlog
                        viewMode="modal"
                        class="w-full max-w-[480px]"
                        createTitle="Thêm redirect"
                        updateTitle="Sửa redirect"
                    >
                        {() => (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                <div class="col-span-12">
                                    <Datatable.Field name="fromPath" label="Từ path" required>
                                        <Input placeholder="/duong-dan-cu" />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="toPath" label="Đến path" required>
                                        <Input placeholder="/duong-dan-moi" />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="statusCode" label="Loại redirect">
                                        <Select options={STATUS_CODE_OPTIONS} />
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
