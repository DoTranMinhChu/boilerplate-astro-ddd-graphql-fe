import { Show, For } from 'solid-js';
import { Form } from '@core/components/form/Form';
import { Field } from '@core/components/form/Field';
import { useForm } from '@core/components/form/FormContext';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { Textarea } from '@core/components/control/Textarea';
import { Editor } from '@core/components/control/Editor';
import { InputImage } from '@core/components/control/InputImage';
import { InputNumber } from '@core/components/control/InputNumber';
import { t } from '@/shared/i18n/t';
import { StringListInput } from '../StringListInput';
import { TwoFieldListInput } from '../TwoFieldListInput';
import { MetricListInput } from '../MetricListInput';
import { DetailFieldLayoutInput } from '../DetailFieldLayoutInput';
import { MixedFeedSourcesInput } from '../MixedFeedSourcesInput';
import { CustomBlockElementsInput } from '../CustomBlockElementsInput';
import { FeatureListInput } from '../FeatureListInput';
import { ESectionType, EDataSourceMode, ESortDirection, ESpacing } from '@/modules/cms/cms.constants';
import type { SectionDTO, FieldDefinitionDTO } from '@/modules/cms/cms.types';
import type { ContentTypeDTO } from '@/shared/services/contentType/contentType.service';
import { sectionFieldSchemas } from '@/modules/cms/sectionRegistry';
import { renderBlockFieldControl } from '@/shared/components/fields/SchemaFieldsEditor';


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

export interface ContentTabProps {
    section: SectionDTO;
    contentTypeOptions: { value: string; label: string }[];
    /** Fields of the page's bound Object Type — only populated (by the Page Builder)
     * when the current page is COLLECTION_DETAIL, for the `content-detail` field
     * layout editor below, and for RELATED_ENTRIES's match-field/field-mapping selects
     * (that block only makes sense on a Detail page, same content type as the entry). */
    detailFields?: FieldDefinitionDTO[];
    /** Full ContentType list (with `.fields`) — MIXED_FEED's per-source field pickers. */
    contentTypesFull?: ContentTypeDTO[];
    /** Fires with the full partial-update payload whenever any field changes (debounced upstream). */
    onChange: (data: Partial<SectionDTO>) => void;
}

/** A `dataSource`(manual/dynamic) + Object Type `fieldMapping` block, identical
 * in shape to `content-grid`'s — reused by every section that lists entries of
 * an admin-defined Object Type (Projects, Partners, Articles...) instead of
 * hardcoding content. `slots` describes which fieldMapping keys this section
 * type reads (see the matching section component for how each slot is used).
 * Field → X luôn là SELECT lấy field THẬT của content type vừa chọn — không ai nhớ
 * nổi field key gõ tay, và gõ sai âm thầm không hiện gì trên trang mà không báo lỗi. */
function DataSourceFields(props: { contentTypeOptions: { value: string; label: string }[]; contentTypesFull: ContentTypeDTO[]; slots: { key: string; label: string }[]; showLimit?: boolean }) {
    const { value } = useForm();
    const selectedContentTypeId = () => value?.('dataSource.query.contentTypeId' as any) as string | undefined;
    const fieldOptions = () => {
        const ct = props.contentTypesFull.find((c) => c.id === selectedContentTypeId());
        return (ct?.fields || [])
            .filter((f): f is NonNullable<typeof f> => !!f?.key)
            .map((f) => ({ value: f.key!, label: f.label || f.key! }));
    };

    return (
        <>
            <Field name="dataSource.mode" label={t('cms.sections.fields.dataSourceMode')} required>
                <Select options={DATASOURCE_MODE_OPTIONS()} />
            </Field>
            <Field name="dataSource.query.contentTypeId" label={t('cms.sections.fields.contentType')} required>
                <Select options={props.contentTypeOptions} clearable />
            </Field>
            <Show when={props.showLimit}>
                <div class="grid grid-cols-2 gap-3">
                    <Field name="dataSource.query.limit" label={t('cms.sections.fields.displayLimit')} description={t('cms.sections.fields.displayLimitHint')}>
                        <InputNumber placeholder="12" />
                    </Field>
                    <Field name="dataSource.query.sort.direction" label={t('cms.sections.fields.sortDirection')}>
                        <Select options={SORT_DIRECTION_OPTIONS()} clearable />
                    </Field>
                </div>
            </Show>
            <Show
                when={selectedContentTypeId()}
                fallback={<p class="text-xs text-neutral-400">{t('cms.sections.fields.fieldMappingNoContentType')}</p>}
            >
                <p class="text-xs text-neutral-400">{t('cms.sections.fields.fieldMappingHint')}</p>
                <div class="grid grid-cols-3 gap-3">
                    {props.slots.map((slot) => (
                        <Field name={`fieldMapping.${slot.key}` as any} label={slot.label}>
                            <Select options={fieldOptions()} clearable />
                        </Field>
                    ))}
                </div>
            </Show>
        </>
    );
}

/** BACKLINK_ENTRIES — ngược với DataSourceFields: field cần select không phải của
 * ContentType đang xem (đã có sẵn qua `detailFields`) mà của ContentType NGUỒN vừa
 * chọn (`dataSource.sourceContentTypeId`) — tra field list qua `contentTypesFull`
 * giống cơ chế MixedFeedSourcesInput. */
function BacklinkEntriesFields(props: { contentTypeOptions: { value: string; label: string }[]; contentTypesFull: ContentTypeDTO[] }) {
    const { value } = useForm();
    const selectedSourceId = () => value?.('dataSource.sourceContentTypeId' as any) as string | undefined;
    const sourceFieldOptions = () => {
        const ct = props.contentTypesFull.find((c) => c.id === selectedSourceId());
        return (ct?.fields || [])
            .filter((f): f is NonNullable<typeof f> => !!f?.key)
            .map((f) => ({ value: f.key!, label: f.label || f.key! }));
    };

    return (
        <>
            <Field name="content.heading" label={t('cms.sections.fields.heading')}><Input placeholder="Bài viết cùng danh mục" /></Field>
            <Field name="dataSource.sourceContentTypeId" label={t('cms.builder.backlinkEntries.sourceContentType')} description={t('cms.builder.backlinkEntries.sourceContentTypeHint')} required>
                <Select options={props.contentTypeOptions} clearable />
            </Field>
            <Show
                when={selectedSourceId()}
                fallback={<p class="text-xs text-neutral-400">{t('cms.builder.backlinkEntries.matchFieldNone')}</p>}
            >
                <Field name="dataSource.matchField" label={t('cms.builder.backlinkEntries.matchField')} description={t('cms.builder.backlinkEntries.matchFieldHint')} required>
                    <Select options={sourceFieldOptions()} clearable />
                </Field>
                <div class="grid grid-cols-2 gap-3">
                    <Field name="fieldMapping.heading" label={t('cms.sections.fields.fieldMappingHeading')}>
                        <Select options={sourceFieldOptions()} clearable />
                    </Field>
                    <Field name="fieldMapping.image" label={t('cms.sections.fields.fieldMappingImage')}>
                        <Select options={sourceFieldOptions()} clearable />
                    </Field>
                </div>
            </Show>
            <Field name="dataSource.limit" label={t('cms.sections.fields.displayLimit')}>
                <InputNumber placeholder="12" />
            </Field>
            <p class="text-xs text-neutral-400">{t('cms.builder.backlinkEntries.hint')}</p>
        </>
    );
}

/** Per-type content form — same field set/shape as the original table view's
 * `SectionFormBody`, but self-contained (own `<Form>`, not tied to a Datatable). */
export function ContentTab(props: ContentTabProps) {
    const detailFieldOptions = () => (props.detailFields || [])
        .filter((f): f is FieldDefinitionDTO & { key: string } => !!f.key)
        .map((f) => ({ value: f.key, label: f.label || f.key }));
    const schema = () => sectionFieldSchemas[props.section.type as string]?.();

    return (
        <Form
            grid
            initialValues={props.section as any}
            onChange={(values) => props.onChange(values as Partial<SectionDTO>)}
        >
            <div class="space-y-5">
                <div class="grid grid-cols-2 gap-3">
                    <Field name="layoutPreset" label={t('cms.sections.fields.layoutPreset')}>
                        <Input placeholder="grid-3" />
                    </Field>
                    <Field name="responsiveSettings.spacing" label={t('cms.sections.fields.spacing')}>
                        <Select options={SPACING_OPTIONS()} clearable />
                    </Field>
                </div>

                <Show when={schema()}>
                    <For each={schema()!}>
                        {(field) => (
                            <Field name={`content.${field.key}` as any} label={field.label} required={field.required}>
                                {renderBlockFieldControl(field)}
                            </Field>
                        )}
                    </For>
                </Show>

                <Show when={props.section.type === ESectionType.CONTENT_GRID}>
                    <Field name="content.heading" label={t('cms.sections.fields.heading')}><Input /></Field>
                    <Field name="content.description" label={t('cms.sections.fields.description')}><Editor /></Field>
                    <DataSourceFields
                        contentTypeOptions={props.contentTypeOptions}
                        contentTypesFull={props.contentTypesFull || []}
                        showLimit
                        slots={[
                            { key: 'heading', label: t('cms.sections.fields.fieldMappingHeading') },
                            { key: 'image', label: t('cms.sections.fields.fieldMappingImage') },
                            { key: 'description', label: t('cms.sections.fields.fieldMappingDescription') },
                        ]}
                    />
                </Show>

                <Show when={props.section.type === ESectionType.MEDIA_HERO}>
                    <Field name="content.image" label={t('cms.sections.fields.image')} required><InputImage /></Field>
                    <Field name="content.caption" label={t('cms.sections.editorial.caption')}><Input /></Field>
                    <Field name="content.arrowHref" label={t('cms.sections.editorial.arrowHref')}><Input placeholder="#about" /></Field>
                </Show>

                <Show when={props.section.type === ESectionType.INTRO_RAIL}>
                    <Field name="content.railTitle" label={t('cms.sections.editorial.railTitle')} description="Xuống dòng: dùng phím Enter"><Textarea rows={2} /></Field>
                    <Field name="content.railArrowHref" label={t('cms.sections.editorial.railArrowHref')}><Input placeholder="#services" /></Field>
                    <div class="grid grid-cols-2 gap-3">
                        <Field name="content.railServiceTitle" label={t('cms.sections.editorial.railServiceTitle')}><Input /></Field>
                        <Field name="content.railServiceText" label={t('cms.sections.editorial.railServiceText')}><Input /></Field>
                    </div>
                    <Field name="content.heading" label={t('cms.sections.fields.heading')} required><Textarea rows={2} /></Field>
                    <Field name="content.lead" label={t('cms.sections.editorial.lead')} required><Editor /></Field>
                    <Field name="content.featureColumns" label={t('cms.sections.editorial.featuresColumns')} description="2 - 4">
                        <InputNumber placeholder="3" />
                    </Field>
                    <Field name="content.features" label={t('cms.sections.editorial.features')}>
                        <FeatureListInput />
                    </Field>
                </Show>

                <Show when={props.section.type === ESectionType.PROJECT_SHOWCASE}>
                    <Field name="content.heading" label={t('cms.sections.fields.heading')}><Input placeholder="CREATIVE DESIGN" /></Field>
                    <Field name="content.subtitle" label={t('cms.sections.editorial.subtitle')}><Input /></Field>
                    <Field name="content.introArrowHref" label={t('cms.sections.editorial.arrowHref')}><Input placeholder="#projects" /></Field>
                    <DataSourceFields
                        contentTypeOptions={props.contentTypeOptions}
                        contentTypesFull={props.contentTypesFull || []}
                        slots={[
                            { key: 'heading', label: t('cms.sections.fields.fieldMappingHeading') },
                            { key: 'image', label: t('cms.sections.fields.fieldMappingImage') },
                            { key: 'description', label: t('cms.sections.fields.fieldMappingDescription') },
                            { key: 'client', label: t('cms.sections.editorial.fieldMappingClient') },
                            { key: 'year', label: t('cms.sections.editorial.fieldMappingYear') },
                            { key: 'category', label: t('cms.sections.editorial.fieldMappingCategory') },
                        ]}
                    />
                </Show>

                <Show when={props.section.type === ESectionType.SPOTLIGHT_LIST}>
                    <Field name="content.railTitle" label={t('cms.sections.editorial.railTitle')}><Input /></Field>
                    <Field name="content.railText" label={t('cms.sections.editorial.railText')}><Editor /></Field>
                    <Field name="content.railArrowHref" label={t('cms.sections.editorial.railArrowHref')}><Input placeholder="#clients" /></Field>
                    <Field name="content.items" label={t('cms.sections.editorial.items')}><StringListInput placeholder="vd: Food & Beverages" addLabel="+ Thêm dòng" /></Field>
                </Show>

                <Show when={props.section.type === ESectionType.LOGO_GRID}>
                    <Field name="content.railTitle" label={t('cms.sections.editorial.railTitle')}><Input /></Field>
                    <Field name="content.railText" label={t('cms.sections.editorial.railText')}><Editor /></Field>
                    <DataSourceFields
                        contentTypeOptions={props.contentTypeOptions}
                        contentTypesFull={props.contentTypesFull || []}
                        showLimit
                        slots={[
                            { key: 'name', label: t('cms.sections.editorial.fieldMappingName') },
                            { key: 'logo', label: t('cms.sections.editorial.fieldMappingLogo') },
                        ]}
                    />
                </Show>

                <Show when={props.section.type === ESectionType.STAT_METRICS}>
                    <Field name="content.heading" label={t('cms.sections.fields.heading')}><Input /></Field>
                    <Field name="content.metrics" label={t('cms.sections.editorial.metrics')}><MetricListInput /></Field>
                </Show>

                <Show when={props.section.type === ESectionType.TIMELINE_LIST}>
                    <Field name="content.heading" label={t('cms.sections.fields.heading')}><Input /></Field>
                    <Field name="content.timeline" label={t('cms.sections.editorial.timeline')}>
                        <TwoFieldListInput field1Key="year" field1Label={t('cms.sections.editorial.timelineYear')} field2Key="text" field2Label={t('cms.sections.editorial.timelineText')} field2Multiline addLabel="+ Thêm mốc thời gian" />
                    </Field>
                </Show>

                <Show when={props.section.type === ESectionType.PROCESS_STEPS}>
                    <Field name="content.heading" label={t('cms.sections.fields.heading')}><Input /></Field>
                    <Field name="content.steps" label={t('cms.sections.editorial.steps')}>
                        <TwoFieldListInput field1Key="title" field1Label={t('cms.sections.editorial.stepTitle')} field2Key="text" field2Label={t('cms.sections.editorial.stepText')} field2Multiline addLabel="+ Thêm bước" />
                    </Field>
                </Show>

                <Show when={props.section.type === ESectionType.CONTACT_COLUMNS}>
                    <Field name="content.heading" label={t('cms.sections.fields.heading')}><Input /></Field>
                    <div class="grid grid-cols-3 gap-3">
                        <Field name="content.hotlineLabel" label={t('cms.sections.editorial.hotlineLabel')}><Input /></Field>
                        <Field name="content.hotline" label={t('cms.sections.editorial.hotline')}><Input /></Field>
                        <Field name="content.email" label={t('cms.sections.fields.email')}><Input /></Field>
                    </div>
                    <Field name="content.columns" label={t('cms.sections.editorial.columns')}>
                        <TwoFieldListInput field1Key="title" field1Label={t('cms.sections.editorial.columnTitle')} field2Key="text" field2Label={t('cms.sections.editorial.columnText')} field2Multiline addLabel="+ Thêm cột" />
                    </Field>
                </Show>

                <Show when={props.section.type === ESectionType.INQUIRY_FORM}>
                    <Field name="content.heading" label={t('cms.sections.fields.heading')}><Input /></Field>
                    <Field name="content.subtitle" label={t('cms.sections.editorial.subtitle')}><Editor /></Field>
                    <Field name="content.serviceOptions" label={t('cms.sections.editorial.serviceOptions')}><StringListInput placeholder="vd: Thiết kế bao bì" addLabel="+ Thêm lựa chọn" /></Field>
                    <div class="grid grid-cols-2 gap-3">
                        <Field name="content.submitLabel" label={t('cms.sections.editorial.submitLabel')}><Input /></Field>
                        <Field name="content.successMessage" label={t('cms.sections.editorial.successMessage')}><Input /></Field>
                    </div>
                </Show>

                <Show when={props.section.type === ESectionType.FEATURED_ENTRY}>
                    <Field name="content.eyebrow" label={t('cms.sections.fields.eyebrow')}><Input /></Field>
                    <DataSourceFields
                        contentTypeOptions={props.contentTypeOptions}
                        contentTypesFull={props.contentTypesFull || []}
                        slots={[
                            { key: 'heading', label: t('cms.sections.fields.fieldMappingHeading') },
                            { key: 'image', label: t('cms.sections.fields.fieldMappingImage') },
                            { key: 'description', label: t('cms.sections.fields.fieldMappingDescription') },
                            { key: 'category', label: t('cms.sections.editorial.fieldMappingCategory') },
                        ]}
                    />
                    <p class="text-xs text-neutral-400">{t('cms.sections.editorial.featuredEntryHint')}</p>
                </Show>

                <Show when={props.section.type === ESectionType.CONTENT_DETAIL}>
                    <Show
                        when={(props.detailFields?.length ?? 0) > 0}
                        fallback={<p class="text-xs text-neutral-400">{t('cms.sections.fields.detailLayoutNoContentType')}</p>}
                    >
                        <Field name="content.fieldLayout" label={t('cms.sections.fields.detailLayout')}>
                            <DetailFieldLayoutInput contentTypeFields={props.detailFields!} />
                        </Field>
                    </Show>
                </Show>

                <Show when={props.section.type === ESectionType.RELATED_ENTRIES}>
                    <Field name="content.heading" label={t('cms.sections.fields.heading')}><Input placeholder="Bài viết liên quan" /></Field>
                    <Show
                        when={(props.detailFields?.length ?? 0) > 0}
                        fallback={<p class="text-xs text-neutral-400">{t('cms.sections.fields.detailLayoutNoContentType')}</p>}
                    >
                        <Field name="dataSource.matchField" label={t('cms.builder.relatedEntries.matchField')} description={t('cms.builder.relatedEntries.matchFieldHint')}>
                            <Select options={detailFieldOptions()} clearable placeholder={t('cms.builder.relatedEntries.matchFieldNone')} />
                        </Field>
                        <div class="grid grid-cols-2 gap-3">
                            <Field name="fieldMapping.heading" label={t('cms.sections.fields.fieldMappingHeading')}>
                                <Select options={detailFieldOptions()} clearable />
                            </Field>
                            <Field name="fieldMapping.image" label={t('cms.sections.fields.fieldMappingImage')}>
                                <Select options={detailFieldOptions()} clearable />
                            </Field>
                        </div>
                    </Show>
                    <Field name="dataSource.limit" label={t('cms.sections.fields.displayLimit')}>
                        <InputNumber placeholder="3" />
                    </Field>
                    <p class="text-xs text-neutral-400">{t('cms.builder.relatedEntries.hint')}</p>
                </Show>

                <Show when={props.section.type === ESectionType.MIXED_FEED}>
                    <Field name="content.heading" label={t('cms.sections.fields.heading')}><Input /></Field>
                    <Field name="dataSource.limit" label={t('cms.builder.mixedFeed.overallLimit')}>
                        <InputNumber placeholder="12" />
                    </Field>
                    <Field name="dataSource.sources" label="">
                        <MixedFeedSourcesInput contentTypeOptions={props.contentTypeOptions} contentTypesFull={props.contentTypesFull || []} />
                    </Field>
                    <p class="text-xs text-neutral-400">{t('cms.builder.mixedFeed.hint')}</p>
                </Show>

                <Show when={props.section.type === ESectionType.CUSTOM_BLOCK}>
                    <p class="text-xs text-neutral-400">{t('cms.builder.customBlock.hint')}</p>
                    <Field name="content.elements" label={t('cms.builder.customBlock.elements')}>
                        <CustomBlockElementsInput />
                    </Field>
                </Show>

                <Show when={props.section.type === ESectionType.BACKLINK_ENTRIES}>
                    <BacklinkEntriesFields contentTypeOptions={props.contentTypeOptions} contentTypesFull={props.contentTypesFull || []} />
                </Show>
            </div>
        </Form>
    );
}

export type { ContentTypeDTO };
