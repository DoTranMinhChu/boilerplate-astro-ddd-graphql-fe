import { createEffect, createResource, createSignal, Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@shared/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { useForm } from '@core/components/form/FormContext';
import { ContentTypeDTO, ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { TaxonomyDTO, TaxonomyService } from '@/shared/services/taxonomy/taxonomy.service';
import { ContentTypeGroupDTO, ContentTypeGroupService } from '@/shared/services/contentTypeGroup/contentTypeGroup.service';
import type { CreateContentTypeInput, UpdateContentTypeInput } from '@shared/generated/typed-graphql';
import type { Edge } from '@core/api/types';
import { FieldDefinitionArrayInput } from './FieldDefinitionArrayInput';
import { ContentVisibilityRulesInput } from './ContentVisibilityRulesInput';
import { ManageContentTypeGroupsDialog, resolveGroupLabel } from './ManageContentTypeGroupsDialog';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { t } from '@/shared/i18n/t';

// Giá trị đặc biệt (không phải id thật) cho mục "+ Tạo nhóm mới" trong Select "Nhóm" của
// Formlog — xem ContentTypeGroupField bên dưới: chọn mục này KHÔNG set field `groupId`
// (effect tự phát hiện + reset về giá trị cũ + mở modal Quản lý nhóm ngay lập tức), và
// transformValues cũng lọc phòng hờ (defense-in-depth) trước khi gửi lên BE.
const CREATE_NEW_GROUP_OPTION = '__create_new__';

// `groupFilter`/`triggerRefresh` cần sống Ở CẤP MODULE (cùng cấp với `generateDatatable`
// bên dưới) vì `paginatedQuery` cũng được định nghĩa ở cấp module, chạy 1 lần lúc file
// được import — không có cách nào truyền 1 signal cục bộ của ManageContentTypesPage() vào
// đây. Cùng pattern `refreshTrigger` module-level mà generateDatatable() tự dùng nội bộ.
//
// LƯU Ý QUAN TRỌNG (phát hiện khi audit createData.tsx): việc `paginatedQuery` đọc
// `groupFilter()` ở đây KHÔNG tự động kích hoạt refetch khi signal đổi — `fetchData()`
// (trong createData.tsx) luôn chạy trong `untrack()`, effect ngoài chỉ theo dõi
// limit/page/queryInput (không bao gồm groupFilter). Đây chính là lý do
// manageContentEntries.page.tsx's `contentTypeId()` filter "work" — nó không đổi sau khi
// mount (đọc từ route searchParam), khác với `groupFilter` đổi liên tục do người dùng thao
// tác trên UI. Vì vậy mọi nơi gọi `setGroupFilter` bên dưới ĐỀU phải gọi kèm
// `triggerRefresh()` để buộc load lại danh sách với filter mới.
const [groupFilter, setGroupFilter] = createSignal<string | undefined>(undefined);

const { Datatable, triggerRefresh } = generateDatatable<PagingArgsInput, ContentTypeDTO, ContentTypeDTO, ContentTypeDTO, CreateContentTypeInput, UpdateContentTypeInput>({
    service: ContentTypeService,
    paginatedQuery: ({ input }) => ContentTypeService.getAllContentType({
        input: { ...input, filter: { ...(input?.filter || {}), groupId: groupFilter() || undefined } },
    }),
    itemQuery: (item) => ContentTypeService.getOneContentTypeAdmin({ id: item.id! }),
    createMutation: (data) => ContentTypeService.createContentType({ data }),
    updateMutation: (id, data) => ContentTypeService.updateContentType({ id, data }),
    deleteMutation: (item) => ContentTypeService.deleteContentType({ id: item.id! }),
});

// Select "Nhóm" trong Formlog — ambient mode (KHÔNG fieldless) để `groupId` thực sự được
// đăng ký + gửi lên BE lúc submit (xem generateForm.tsx's submitValues(): chỉ field nào đã
// registerField mới có mặt trong payload — 1 Select `fieldless` đọc/ghi qua useForm() thủ
// công sẽ hiển thị đúng nhưng KHÔNG BAO GIỜ được gửi lên BE, vì submitValues() chỉ duyệt
// qua fields() đã đăng ký). Mục "+ Tạo nhóm mới" là 1 option đặc biệt: khi chọn, effect
// dưới đây phát hiện qua useForm().value() (CÙNG form context với Select), lập tức reset
// field về undefined rồi mở modal — KHÔNG để giá trị giả này lọt vào state/submit.
function ContentTypeGroupField(props: { groups: ContentTypeGroupDTO[]; onCreateNew: () => void }) {
    const { value, setValues } = useForm();
    createEffect(() => {
        if (value('groupId' as any) === CREATE_NEW_GROUP_OPTION) {
            setValues('groupId' as any, undefined);
            props.onCreateNew();
        }
    });
    const options = () => [
        ...props.groups.map((g) => ({ value: g.id!, label: g.name! })),
        { value: CREATE_NEW_GROUP_OPTION, label: t('cms.contentTypeGroups.createNewOption') },
    ];
    return <Select clearable options={options()} />;
}

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

    // Nhóm Content Type (modal "Quản lý nhóm" — không thêm mục sidebar riêng, theo quyết
    // định thiết kế trước đó) — dùng cho cột "Nhóm", bộ lọc trên toolbar, và Select "Nhóm"
    // trong Formlog.
    const [groups, { refetch: refetchGroups }] = createResource(() => ContentTypeGroupService.getAllContentTypeGroup({ input: { limit: 200 } }));
    const groupList = () => ((groups()?.edges || []) as Edge<ContentTypeGroupDTO>[])
        .filter((e) => !!e.node)
        .map((e) => e.node!);
    const [groupsDialogOpen, setGroupsDialogOpen] = createSignal(false);

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="ContentTypeTable">
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.contentTypes.title')} description={t('cms.contentTypes.description')} />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Button sm outline icon={<Icon name="heroicons-outline:tag" />} onClick={() => setGroupsDialogOpen(true)}>
                                {t('cms.contentTypeGroups.manageButton')}
                            </Button>
                            <Datatable.ButtonCreate label={t('cms.contentTypes.createButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                        <Select
                            fieldless
                            class="w-52"
                            options={[
                                { value: '', label: t('cms.contentTypeGroups.filterAllLabel') },
                                ...groupList().map((g) => ({ value: g.id!, label: g.name! })),
                            ]}
                            value={groupFilter() || ''}
                            onChange={(val) => {
                                setGroupFilter((val as string) || undefined);
                                triggerRefresh();
                            }}
                        />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title={t('cms.contentTypes.columns.label')} sortable="label">
                            {(item) => <p class="font-semibold text-gray-900">{item.label}</p>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.contentTypes.columns.key')}>
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.key}</code>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.contentTypeGroups.columnLabel')}>
                            {(item) => <span class="text-sm text-neutral-600">{resolveGroupLabel(groupList(), item.groupId)}</span>}
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
                            let result = values as typeof values & { key?: string; groupId?: string };
                            if (item) {
                                const { key, ...rest } = result;
                                result = rest as typeof result;
                            }
                            // Phòng hờ (defense-in-depth): mục "+ Tạo nhóm mới" đáng lẽ không bao
                            // giờ tới được đây (ContentTypeGroupField's effect tự reset về undefined
                            // ngay khi phát hiện), nhưng lỡ có 1 khoảng trễ nào đó thì cũng không để
                            // giá trị giả này gửi lên BE.
                            if (result.groupId === CREATE_NEW_GROUP_OPTION) {
                                result = { ...result, groupId: undefined };
                            }
                            return result as typeof values;
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
                                <div class="col-span-6">
                                    <Datatable.Field name="groupId" label={t('cms.contentTypeGroups.columnLabel')}>
                                        <ContentTypeGroupField groups={groupList()} onCreateNew={() => setGroupsDialogOpen(true)} />
                                    </Datatable.Field>
                                </div>
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

            <ManageContentTypeGroupsDialog
                isOpen={groupsDialogOpen()}
                onClose={() => setGroupsDialogOpen(false)}
                groups={groupList()}
                onChanged={() => refetchGroups()}
            />
        </div>
    );
}
