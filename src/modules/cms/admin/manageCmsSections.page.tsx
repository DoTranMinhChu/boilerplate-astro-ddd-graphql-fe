import { Show, createResource } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Textarea } from '@core/components/control/Textarea';
import { Select } from '@core/components/control/Select';
import { NativeSelect } from '@core/components/control/NativeSelect';
import { InputImage } from '@core/components/control/InputImage';
import { InputNumber } from '@core/components/control/InputNumber';
import { useForm } from '@core/components/form/FormContext';
import type { FieldProps } from '@core/components/form/Field';
import { SectionDTO, SectionService } from '@/shared/services/section/section.service';
import { PageService } from '@/shared/services/page/page.service';
import { ContentTypeDTO, ContentTypeService } from '@/shared/services/contentType/contentType.service';
import type { Edge } from '@core/api/types';
import { AnimationLayerArrayInput } from './AnimationLayerArrayInput';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { SECTION_TYPE_OPTIONS } from '@/modules/cms/sectionRegistry';
import { ESectionType, EDataSourceMode, ESortDirection, ESectionTheme, EImagePosition, ESpacing } from '@/modules/cms/cms.constants';
import { toast } from '@core/components/toast/ToastProvider';
import { t } from '@/shared/i18n/t';

const SPACING_OPTIONS = () => [
    { value: ESpacing.SM, label: t('cms.sections.spacingOptions.sm') },
    { value: ESpacing.MD, label: t('cms.sections.spacingOptions.md') },
    { value: ESpacing.LG, label: t('cms.sections.spacingOptions.lg') },
];

const DATASOURCE_MODE_OPTIONS = () => [
    { value: EDataSourceMode.MANUAL, label: t('cms.sections.dataSourceModeOptions.manual') },
    { value: EDataSourceMode.DYNAMIC, label: t('cms.sections.dataSourceModeOptions.dynamic') },
];

const SORT_DIRECTION_OPTIONS = () => [
    { value: ESortDirection.DESC, label: t('cms.sections.sortDirectionOptions.desc') },
    { value: ESortDirection.ASC, label: t('cms.sections.sortDirectionOptions.asc') },
];

const THEME_OPTIONS = () => [
    { value: ESectionTheme.LIGHT, label: t('cms.sections.themeOptions.light') },
    { value: ESectionTheme.DARK, label: t('cms.sections.themeOptions.dark') },
];

const IMAGE_POSITION_OPTIONS = () => [
    { value: EImagePosition.LEFT, label: t('cms.sections.imagePositionOptions.left') },
    { value: EImagePosition.RIGHT, label: t('cms.sections.imagePositionOptions.right') },
];

const ANIMATION_TARGETS: Record<string, string[]> = {
    [ESectionType.HERO]: ['eyebrow', 'heading', 'description', 'image', 'cta'],
    [ESectionType.TEXT_IMAGE]: ['heading', 'text', 'image'],
    [ESectionType.CTA]: ['heading', 'description', 'cta'],
    [ESectionType.CONTENT_GRID]: ['heading', 'grid'],
    [ESectionType.CONTENT_DETAIL]: ['heading', 'image', 'body'],
};

// Nội dung tĩnh khác nhau theo từng section type (mục 5/6 spec CMS) — admin
// không thấy JSON thô, mỗi type có form riêng. `Field` được truyền vào từ
// Datatable.Field của generateDatatable() (khởi tạo động theo pageId).
// `content`/`dataSource`/`fieldMapping`/`responsiveSettings` sinh ra kiểu string do hạn
// chế codegen với scalar Mixed (xem cms.types.ts) — Field name="content.eyebrow" là
// dot-path THẬT vào 1 object JSON tự do, TypeScript không thể biểu diễn tĩnh shape này
// (khác với Pages/HeaderPreset/FooterPreset — nơi mọi field đều có shape cố định, đã
// dùng thẳng CreateXInput/UpdateXInput thật). `FieldProps` (không chỉ định generic,
// mặc định `any` ngay tại định nghĩa gốc) là lựa chọn type-safe nhất có thể ở đây.
function SectionFormBody(props: { Field: (fieldProps: FieldProps) => JSX.Element; contentTypeOptions: { value: string; label: string }[] }) {
    const Field = props.Field;
    const { value } = useForm();
    const type = () => value?.('type') as string;

    return (
        <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
            <div class="col-span-6">
                <Field name="type" label={t('cms.sections.fields.type')} required>
                    <NativeSelect options={SECTION_TYPE_OPTIONS} optionGroups={[]} emptyPlaceholder="--" />
                </Field>
            </div>
            <div class="col-span-3">
                <Field name="layoutPreset" label={t('cms.sections.fields.layoutPreset')}>
                    <Input placeholder="vd: grid-3" />
                </Field>
            </div>
            <div class="col-span-3">
                <Field name="responsiveSettings.spacing" label={t('cms.sections.fields.spacing')}>
                    <Select options={SPACING_OPTIONS()} clearable />
                </Field>
            </div>

            <Show when={type() === ESectionType.HERO}>
                <div class="col-span-6"><Field name="content.eyebrow" label={t('cms.sections.fields.eyebrow')}><Input /></Field></div>
                <div class="col-span-6"><Field name="content.theme" label={t('cms.builder.style.themeLabel')}><Select options={THEME_OPTIONS()} clearable /></Field></div>
                <div class="col-span-12"><Field name="content.heading" label={t('cms.sections.fields.heading')} required><Input /></Field></div>
                <div class="col-span-12"><Field name="content.description" label={t('cms.sections.fields.description')}><Textarea rows={2} /></Field></div>
                <div class="col-span-12"><Field name="content.image" label={t('cms.sections.fields.image')}><InputImage /></Field></div>
                <div class="col-span-6"><Field name="content.ctaLabel" label={t('cms.sections.fields.ctaLabel')}><Input /></Field></div>
                <div class="col-span-6"><Field name="content.ctaHref" label={t('cms.sections.fields.ctaHref')}><Input placeholder="/lien-he" /></Field></div>
            </Show>

            <Show when={type() === ESectionType.TEXT_IMAGE}>
                <div class="col-span-12"><Field name="content.heading" label={t('cms.sections.fields.heading')} required><Input /></Field></div>
                <div class="col-span-12"><Field name="content.text" label={t('cms.sections.fields.text')}><Textarea rows={4} /></Field></div>
                <div class="col-span-6"><Field name="content.image" label={t('cms.sections.fields.image')}><InputImage /></Field></div>
                <div class="col-span-6"><Field name="content.imagePosition" label={t('cms.sections.fields.imagePosition')}><Select options={IMAGE_POSITION_OPTIONS()} clearable /></Field></div>
            </Show>

            <Show when={type() === ESectionType.CTA}>
                <div class="col-span-12"><Field name="content.heading" label={t('cms.sections.fields.heading')} required><Input /></Field></div>
                <div class="col-span-12"><Field name="content.description" label={t('cms.sections.fields.description')}><Textarea rows={2} /></Field></div>
                <div class="col-span-4"><Field name="content.buttonLabel" label={t('cms.sections.fields.buttonLabel')}><Input /></Field></div>
                <div class="col-span-4"><Field name="content.buttonHref" label={t('cms.sections.fields.buttonHref')}><Input /></Field></div>
                <div class="col-span-4"><Field name="content.email" label={t('cms.sections.fields.email')}><Input /></Field></div>
            </Show>

            <Show when={type() === ESectionType.CONTENT_GRID}>
                <div class="col-span-12"><Field name="content.heading" label={t('cms.sections.fields.heading')}><Input /></Field></div>
                <div class="col-span-12"><Field name="content.description" label={t('cms.sections.fields.description')}><Textarea rows={2} /></Field></div>
                <div class="col-span-6"><Field name="dataSource.mode" label={t('cms.sections.fields.dataSourceMode')} required><Select options={DATASOURCE_MODE_OPTIONS()} /></Field></div>
                <div class="col-span-6"><Field name="dataSource.query.contentTypeId" label={t('cms.sections.fields.contentType')} required><Select options={props.contentTypeOptions} clearable /></Field></div>
                <div class="col-span-4"><Field name="dataSource.query.limit" label={t('cms.sections.fields.displayLimit')} description={t('cms.sections.fields.displayLimitHint')}><InputNumber placeholder="12" /></Field></div>
                <div class="col-span-4"><Field name="dataSource.query.sort.field" label={t('cms.sections.fields.sortField')} description={t('cms.sections.fields.sortFieldHint')}><Input placeholder="createdAt" /></Field></div>
                <div class="col-span-4"><Field name="dataSource.query.sort.direction" label={t('cms.sections.fields.sortDirection')}><Select options={SORT_DIRECTION_OPTIONS()} clearable /></Field></div>
                <div class="col-span-12 text-xs text-neutral-400 -mb-2">{t('cms.sections.fields.fieldMappingHint')}</div>
                <div class="col-span-4"><Field name="fieldMapping.heading" label={t('cms.sections.fields.fieldMappingHeading')}><Input placeholder="vd: tenDuAn" /></Field></div>
                <div class="col-span-4"><Field name="fieldMapping.image" label={t('cms.sections.fields.fieldMappingImage')}><Input placeholder="vd: anhChinh" /></Field></div>
                <div class="col-span-4"><Field name="fieldMapping.description" label={t('cms.sections.fields.fieldMappingDescription')}><Input placeholder="vd: moTa" /></Field></div>
            </Show>

            <div class="col-span-12">
                <Field name="animation" label={t('cms.sections.fields.animation')}>
                    <AnimationLayerArrayInput targetOptions={ANIMATION_TARGETS[type()] || []} />
                </Field>
            </div>
        </div>
    );
}

export function ManageCmsSectionsPage() {
    const { searchParams, navigateToPage } = useRoutes();
    const pageId = () => searchParams.pageId as string;
    const pageName = () => searchParams.pageName as string;

    const [page] = createResource(pageId, (id) => PageService.getOnePage({ id }));
    const [contentTypes] = createResource(() => ContentTypeService.getAllContentType({ input: { limit: 200 } }));
    const contentTypeOptions = () => ((contentTypes()?.edges || []) as Edge<ContentTypeDTO>[])
        .filter((e) => !!e.node)
        .map((e) => ({ value: e.node!.id!, label: e.node!.label! }));

    const { Datatable, triggerRefresh } = generateDatatable<PagingArgsInput, SectionDTO, SectionDTO, SectionDTO, any, any>({
        service: SectionService,
        paginatedQuery: () => SectionService.getAllPageSections(pageId()),
        createMutation: (data) => SectionService.createSection({ data: { ...data, pageId: pageId() } }),
        updateMutation: (id, data) => SectionService.updateSection({ id, data }),
        deleteMutation: (item) => SectionService.deleteSection({ id: item.id! }),
    });

    const move = async (item: SectionDTO, direction: -1 | 1) => {
        const list = await SectionService.getSectionsByPage({ pageId: pageId() });
        const idx = list.findIndex((s) => s.id === item.id);
        const swapIdx = idx + direction;
        if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
        const a = list[idx];
        const b = list[swapIdx];
        await SectionService.reorderSections({ items: [{ id: a.id!, order: b.order! }, { id: b.id!, order: a.order! }] });
        triggerRefresh();
    };

    const duplicate = async (item: SectionDTO) => {
        await SectionService.duplicateSection({ id: item.id! });
        toast().success(t('cms.sections.duplicateSuccess'));
        triggerRefresh();
    };

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id={`SectionTable-${pageId()}`}>
                    <Datatable.Header>
                        <Datatable.Title title={t('cms.sections.title', { pageName: pageName() || '' })} description={t('cms.sections.description')} />
                        <Datatable.Buttons>
                            <Show when={page()?.path}>
                                <Datatable.Button
                                    sm
                                    solid
                                    onClick={() => navigateToPage({ route: 'adminDashboard.cmsBuilder', context: { searchParams: { pageId: pageId() } } })}
                                >
                                    {t('cms.pages.editButton')}
                                </Datatable.Button>
                                <Datatable.Button
                                    sm
                                    onClick={() => navigateToPage({ route: 'adminDashboard.cmsPreview', context: { searchParams: { path: page()!.path! } } })}
                                >
                                    {t('cms.pages.previewButton')}
                                </Datatable.Button>
                            </Show>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('cms.sections.addButton')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Table>
                        <Datatable.Column title={t('cms.sections.columns.order')} fitContent>
                            {(item) => <span class="text-sm text-neutral-400">{item.order}</span>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.sections.columns.type')}>
                            {(item) => <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{item.type}</code>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.sections.columns.layout')}>
                            {(item) => <span class="text-sm text-neutral-600">{item.layoutPreset || '—'}</span>}
                        </Datatable.Column>
                        <Datatable.Column title={t('cms.sections.columns.status')}>
                            {(item) => (
                                <span class={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                                    {item.enabled ? t('cms.sections.visible') : t('cms.sections.hidden')}
                                </span>
                            )}
                        </Datatable.Column>
                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Datatable.CellButton sm onClick={() => move(item, -1)}>↑</Datatable.CellButton>
                                    <Datatable.CellButton sm onClick={() => move(item, 1)}>↓</Datatable.CellButton>
                                    <Datatable.CellButton sm onClick={() => duplicate(item)}>{t('cms.sections.duplicateButton')}</Datatable.CellButton>
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Datatable.CellButtonDelete item={item} itemName={item.type!} />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>
                    </Datatable.Table>

                    <Datatable.Pagination />

                    <Datatable.Formlog
                        viewMode="drawer"
                        class="w-full max-w-[900px]"
                        createTitle={t('cms.sections.createTitle')}
                        updateTitle={t('cms.sections.updateTitle')}
                    >
                        {() => <SectionFormBody Field={Datatable.Field} contentTypeOptions={contentTypeOptions()} />}
                    </Datatable.Formlog>
                </Datatable>
            </Card>
        </div>
    );
}
