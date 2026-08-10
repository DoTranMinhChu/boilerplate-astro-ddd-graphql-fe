import { Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { MenuDTO, MenuService } from '@/shared/services/menu/menu.service';
import type { CreateMenuInput, UpdateMenuInput } from '@shared/generated/typed-graphql';
import { MenuTreeEditor } from './MenuTreeEditor';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { t } from '@/shared/i18n/t';
import type { PaginationCursor } from '@core/api/types';

// getAllMenu trả về danh sách phẳng (không phân trang thật — xem menu.resolver.ts phía BE,
// cùng lý do getAllHeaderPresets), bọc thành shape cursor giả để tái dùng generateDatatable —
// đúng khuôn getAllHeaderPresetsCursor (headerPreset.service.ts).
const getAllMenuCursor = async (): Promise<PaginationCursor<MenuDTO>> => {
    const items = await MenuService.getAllMenu();
    return {
        edges: items.map((node) => ({ node, cursor: node.id! })),
        pageInfo: { hasNextPage: false, hasPreviousPage: false, totalCount: items.length, totalPage: 1, limit: items.length },
    };
};

const { Datatable } = generateDatatable<PagingArgsInput, MenuDTO, MenuDTO, MenuDTO, CreateMenuInput, UpdateMenuInput>({
    service: MenuService,
    paginatedQuery: () => getAllMenuCursor(),
    // Không có getOneMenu ở BE (menu.resolver.ts chỉ có getAllMenu) — không cần thật, fragment
    // Menu chỉ có `name` và đã có sẵn đầy đủ trên chính dòng danh sách, nên trả thẳng lại item
    // đó thay vì round-trip gọi getAllMenu() lần nữa chỉ để tìm lại đúng bản ghi đang có.
    itemQuery: (item) => Promise.resolve(item),
    createMutation: (data) => MenuService.createMenu({ data }),
    updateMutation: (id, data) => MenuService.updateMenu({ id, data }),
    deleteMutation: (item) => MenuService.deleteMenu({ id: item.id! }),
});

// Màn 2 cấp trên CÙNG 1 route (/admin/cms/menus), phân biệt qua searchParams — đúng khuôn
// ManageTaxonomiesPage (manageTaxonomies.page.tsx): bấm "Quản lý mục" điều hướng sang CHÍNH
// route này kèm searchParams.menuId, nút quay lại xoá searchParams. Tái dùng route "con" thay
// vì Slideout/modal vì đây chính là cách TermTreeEditor (khuôn mẫu MenuTreeEditor phải mirror)
// được mở trong thực tế — nhất quán với chính component nó mirror hơn là dựng thêm 1 cơ chế
// mở panel khác cho riêng Menu.
export function ManageMenusPage() {
    const { searchParams, navigateToPage } = useRoutes();
    const menuId = () => searchParams.menuId as string | undefined;

    return (
        <Show when={menuId()} fallback={<MenuListView />}>
            <MenuItemsView
                menuId={menuId()!}
                name={(searchParams.name as string) || ''}
                onBack={() => navigateToPage('adminDashboard.cmsMenus')}
            />
        </Show>
    );
}

function MenuItemsView(props: { menuId: string; name: string; onBack: () => void }) {
    return (
        <div class="space-y-5 animate-in">
            <div class="flex items-center gap-3">
                <Button
                    sm
                    outline
                    icon={<Icon name="heroicons-outline:arrow-left" tooltip={t('cms.menus.backButton')} />}
                    onClick={props.onBack}
                />
                <div class="min-w-0">
                    <h2 class="text-xl font-semibold text-neutral-900 truncate">{props.name}</h2>
                </div>
            </div>
            <MenuTreeEditor menuId={props.menuId} />
        </div>
    );
}

function MenuListView() {
    const { navigateToPage } = useRoutes();

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="MenuTable">
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.menus.title')} description={t('cms.menus.description')} />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('cms.menus.createButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title={t('cms.menus.columns.name')} sortable="name">
                            {(item) => <p class="font-semibold text-gray-900">{item.name}</p>}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Datatable.CellButton
                                        sm
                                        icon={<Icon name="heroicons-outline:bars-3-bottom-left" tooltip={t('cms.menus.manageItemsButton')} />}
                                        onClick={() =>
                                            navigateToPage({
                                                route: 'adminDashboard.cmsMenus',
                                                context: { searchParams: { menuId: item.id, name: item.name } },
                                            })
                                        }
                                    />
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Datatable.CellButtonDelete item={item} itemName={item.name!} />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>
                    </Datatable.Table>

                    <Datatable.Pagination />

                    <Datatable.Formlog
                        viewMode="modal"
                        class="w-full max-w-[480px]"
                        createTitle={t('cms.menus.createTitle')}
                        updateTitle={t('cms.menus.updateTitle')}
                    >
                        {() => (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                <div class="col-span-12">
                                    <Datatable.Field name="name" label={t('cms.menus.fields.name')} required>
                                        <Input placeholder={t('cms.menus.fields.namePlaceholder')} />
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
