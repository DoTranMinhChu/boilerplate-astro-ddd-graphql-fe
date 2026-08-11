import { createResource, Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Icon } from '@shared/components/icons/Icon';
import { FormDTO, FormService } from '@/shared/services/form/form.service';
import { ContentTypeDTO, ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { TaxonomyDTO, TaxonomyService } from '@/shared/services/taxonomy/taxonomy.service';
import type { CreateFormInput, UpdateFormInput } from '@shared/generated/typed-graphql';
import type { Edge } from '@core/api/types';
import { FieldDefinitionArrayInput } from './FieldDefinitionArrayInput';
import { FormVisibilityRulesInput } from './FormVisibilityRulesInput';
import { FormSubmissionsPanel } from './FormSubmissionsPanel';
import { t } from '@/shared/i18n/t';

/** `Form.notifyEmail` KHÔNG có @Field trên ObjectType 'Form' (bảo mật — xem comment đầu
 * form.service.ts), nên `FormDTO` (fragment) không có field này -- `itemQuery` bên dưới gộp thêm
 * `getFormNotifyEmail(id)` (staff-only) vào mỗi bản ghi trước khi đổ vào Formlog, để form sửa hiện
 * đúng giá trị hiện tại. Ghi lại vẫn qua CreateFormInput/UpdateFormInput.notifyEmail như thường. */
type FormEditDTO = FormDTO & { notifyEmail?: string };

const { Datatable } = generateDatatable<PagingArgsInput, FormDTO, FormDTO, FormEditDTO, CreateFormInput, UpdateFormInput>({
    service: FormService,
    paginatedQuery: (input) => FormService.getAllForm(input),
    itemQuery: async (item) => {
        const [form, notifyEmail] = await Promise.all([
            FormService.getOneForm({ id: item.id! }),
            FormService.getFormNotifyEmail({ id: item.id! }),
        ]);
        return { ...form, notifyEmail };
    },
    createMutation: (data) => FormService.createForm({ data }),
    updateMutation: (id, data) => FormService.updateForm({ id, data }),
    deleteMutation: (item) => FormService.deleteForm({ id: item.id! }),
});

/**
 * Admin CRUD Form (Form Builder, mục 1 kế hoạch Phase 4, Task 4) — mirror cấu trúc
 * manageContentTypes.page.tsx (generateDatatable + Datatable.Formlog dạng modal, KHÔNG cần
 * useDatatable()). `fields` tái dùng NGUYÊN FieldDefinitionArrayInput (cùng shape FieldDefinition
 * với Content Type — 1 field Form cũng có thể là RELATION/TAXONOMY trỏ tới Content Type/Taxonomy,
 * vd form đặt phòng chọn 1 "Hạng phòng" là 1 ContentEntry). `visibilityRules` dùng mini editor
 * riêng (FormVisibilityRulesInput.tsx, ý nghĩa ĐẢO NGƯỢC so với Content Visibility Rules — xem
 * comment đầu file đó).
 */
export function ManageFormsPage() {
    // Danh sách Content Type để chọn làm đích cho field kiểu RELATION (cùng nhu cầu với Content
    // Type builder — xem manageContentTypes.page.tsx).
    const [contentTypes] = createResource(() => ContentTypeService.getAllContentType({ input: { limit: 200 } }));
    const contentTypeOptions = () => ((contentTypes()?.edges || []) as Edge<ContentTypeDTO>[])
        .filter((e) => !!e.node)
        .map((e) => ({ value: e.node!.id!, label: e.node!.label! }));
    const contentTypesFull = () => ((contentTypes()?.edges || []) as Edge<ContentTypeDTO>[])
        .filter((e) => !!e.node)
        .map((e) => e.node!);

    // Danh sách Taxonomy để chọn cho field kiểu TAXONOMY.
    const [taxonomies] = createResource(() => TaxonomyService.getAllTaxonomy({ input: { limit: 200 } }));
    const taxonomyOptions = () => ((taxonomies()?.edges || []) as Edge<TaxonomyDTO>[])
        .filter((e) => !!e.node)
        .map((e) => ({ value: e.node!.id!, label: e.node!.label! }));

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="FormTable">
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.forms.title')} description={t('cms.forms.description')} />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('cms.forms.createButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    <Datatable.Table>
                        <Datatable.Column title={t('cms.forms.columns.label')} sortable="label">
                            {(item) => <p class="font-semibold text-gray-900">{item.label}</p>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.forms.columns.key')}>
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.key}</code>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.forms.columns.fieldCount')}>
                            {(item) => <span>{item.fields?.length ?? 0}</span>}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    <FormSubmissionsPanel form={item} />
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
                        createTitle={t('cms.forms.createTitle')}
                        updateTitle={t('cms.forms.updateTitle')}
                    >
                        {(item) => (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                <div class="col-span-8">
                                    <Datatable.Field name="label" label={t('cms.forms.fields.label')} required>
                                        <Input placeholder={t('cms.forms.fields.labelPlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <Show when={!item}>
                                    <div class="col-span-4">
                                        <Datatable.Field name="key" label={t('cms.forms.fields.key')} description={t('cms.forms.fields.keyHint')}>
                                            <Input placeholder={t('cms.forms.fields.keyPlaceholder')} />
                                        </Datatable.Field>
                                    </div>
                                </Show>

                                <div class="col-span-6">
                                    <Datatable.Field name="submitLabel" label={t('cms.forms.fields.submitLabel')}>
                                        <Input placeholder={t('cms.forms.fields.submitLabelPlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-6">
                                    <Datatable.Field name="notifyEmail" label={t('cms.forms.fields.notifyEmail')} description={t('cms.forms.fields.notifyEmailHint')}>
                                        <Input placeholder={t('cms.forms.fields.notifyEmailPlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="successMessage" label={t('cms.forms.fields.successMessage')}>
                                        <Input placeholder={t('cms.forms.fields.successMessagePlaceholder')} />
                                    </Datatable.Field>
                                </div>

                                <div class="col-span-12">
                                    <Datatable.Field name="fields" label={t('cms.forms.fields.fields')}>
                                        <FieldDefinitionArrayInput
                                            contentTypeOptions={contentTypeOptions()}
                                            contentTypesFull={contentTypesFull()}
                                            taxonomyOptions={taxonomyOptions()}
                                        />
                                    </Datatable.Field>
                                </div>

                                <Show when={item}>
                                    <div class="col-span-12 border-t border-dashed border-neutral-200 pt-6">
                                        <p class="mb-1 text-sm font-semibold text-neutral-800">{t('cms.forms.visibility.sectionTitle')}</p>
                                        <p class="mb-3 text-xs text-neutral-400">{t('cms.forms.visibility.sectionHint')}</p>
                                        <Datatable.Field name="visibilityRules" label="">
                                            <FormVisibilityRulesInput fieldOptions={(item?.fields || []).filter((f): f is NonNullable<typeof f> => !!f?.key).map((f) => ({ value: f.key!, label: f.label || f.key! }))} />
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
