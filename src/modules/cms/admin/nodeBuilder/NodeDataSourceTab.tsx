// src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.tsx
//
// "Nguồn dữ liệu" (Data Source) Inspector tab — node-level data binding (2026-08-17), the
// direct replacement for the old page-level "Cấu hình trang Chi tiết"
// (PageDataBindingModal.tsx). Shown for any node with `capabilities.repeat===true` (FRAME,
// TABLE, CARD_LIST). Same standalone-control pattern as NodeStyleTab.tsx/NodeVisibilityTab.tsx
// (no `<Form>`/`<Field>` context, so every control needs `fieldless`; `Checkbox`/`InputNumber`
// read/write via `value`/`onChange`, not `checked`/`type="number"`).
//
// The filter-row editor below deliberately does NOT reuse `GenericFilterListInput.tsx` — that
// component's internal `createControl<GenericDataSourceFilter[]>('object_array', {})` call
// passes no `fieldless`/`value`/`onChange`, so it can only work inside a real `<Field>` ancestor
// (see PageDataBindingModal.tsx's usage, always inside `generateFormlog()`). This tab has no
// `<Form>` at all — same situation `NodeVisibilityTab.tsx` already solved for its own condition
// list by writing a plain hand-rolled array editor (local add/update/remove operating directly
// on `props.value`/`props.onChange`, no `createControl`) — this file does the same for
// `GenericDataSourceFilter[]` instead of reusing the Field-bound component.
import { For, Index, Show, createResource, createMemo } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { Checkbox } from '@core/components/control/Checkbox';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { ContentTypeService, ContentTypeDTO } from '@/shared/services/contentType/contentType.service';
import { t } from '@/shared/i18n/t';
import type { CollectionRepeat, TableColumnCfg, CardSlotsCfg, FeaturedEntrySlotsCfg, ShowcaseSlotsCfg, LogoGridSlotsCfg } from '@/modules/cms/node/node.types';
import type { GenericDataSourceFilter } from '@/modules/cms/cms.types';
import type { Edge } from '@core/api/types';
import { RepeaterFieldEditor } from './RepeaterFieldEditor';
import type { FieldDescriptor, FieldControl } from '@/modules/cms/node/node.fieldSchema.types';

export interface NodeDataSourceTabProps {
    repeat: CollectionRepeat | null | undefined;
    /** TABLE/CARD_LIST are always list-cardinality by construction (they render N rows/cards
     * internally — see TableNode.tsx/CardListNode.tsx) — the cardinality picker only makes sense
     * for a generic container like FRAME, which can be used either way. */
    nodeType: string;
    onChange: (next: CollectionRepeat | null) => void;
    /** TABLE: `{ columns: TableColumnCfg[] }`. CARD_LIST: `{ slots: CardSlotsCfg, columns: number }`.
     * `undefined`/unread for every other repeat-capable type (FRAME). Lives in `node.props`
     * (controls HOW resolved entries render), not `node.repeat` (controls WHICH entries get
     * fetched) — 2 separate concerns, 2 separate fields on the Node. */
    columnsOrSlots?: Record<string, any>;
    onColumnsOrSlotsChange?: (next: Record<string, any>) => void;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-neutral-500';

const emptyRepeat = (): CollectionRepeat => ({ source: 'own', mode: 'dynamic', cardinality: 'many' });

export function NodeDataSourceTab(props: NodeDataSourceTabProps) {
    const [contentTypes] = createResource(() => ContentTypeService.getAllContentType({ input: { limit: 200 } }));
    const contentTypesFull = () => ((contentTypes()?.edges || []) as Edge<ContentTypeDTO>[]).map((e) => e.node).filter((n): n is ContentTypeDTO => !!n);
    const contentTypeOptions = () => contentTypesFull().map((c) => ({ value: c.id!, label: c.label! }));
    const fieldOptions = createMemo(() => {
        const ct = contentTypesFull().find((c) => c.id === props.repeat?.contentTypeKey);
        return (ct?.fields || []).filter((f): f is NonNullable<typeof f> => !!f?.key).map((f) => ({ value: f.key!, label: f.label || f.key! }));
    });
    const canPickCardinality = () => props.nodeType === 'frame';
    const isEnabled = () => !!props.repeat;

    const patch = (p: Partial<CollectionRepeat>) => props.onChange({ ...(props.repeat ?? emptyRepeat()), ...p });

    return (
        <div class="flex flex-col gap-4 p-4">
            <div class="flex items-center justify-between">
                <label class={LABEL_CLASS}>{t('cms.node.dataSource.enableLabel')}</label>
                <Checkbox value={isEnabled()} onChange={(v) => props.onChange(v ? emptyRepeat() : null)} fieldless />
            </div>
            <Show when={isEnabled()}>
                <Show when={canPickCardinality()}>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.cardinalityLabel')}</label>
                        <Select
                            value={props.repeat?.cardinality ?? 'many'}
                            options={[
                                { value: 'many', label: t('cms.node.dataSource.cardinalityMany') },
                                { value: 'one', label: t('cms.node.dataSource.cardinalityOne') },
                            ]}
                            onChange={(v: string) => patch({ cardinality: v as 'many' | 'one' })}
                            fieldless
                        />
                    </div>
                </Show>
                <Show when={props.nodeType !== 'mixed-feed'}>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.sourceLabel')}</label>
                        <Select
                            value={props.repeat?.source ?? 'own'}
                            options={[
                                { value: 'own', label: t('cms.node.dataSource.sourceOwn') },
                                { value: 'related', label: t('cms.node.dataSource.sourceRelated') },
                                { value: 'backlink', label: t('cms.node.dataSource.sourceBacklink') },
                                { value: 'local', label: t('cms.node.dataSource.sourceLocal') },
                            ]}
                            onChange={(v: string) => patch({ source: v as CollectionRepeat['source'] })}
                            fieldless
                        />
                    </div>
                    <Show when={(props.repeat?.source ?? 'own') === 'own'}>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.dataSource.contentTypeLabel')}</label>
                            <Select value={props.repeat?.contentTypeKey} options={contentTypeOptions()} clearable onChange={(v: string) => patch({ source: 'own', mode: 'dynamic', contentTypeKey: v || undefined })} fieldless />
                        </div>
                        <Show when={props.repeat?.contentTypeKey}>
                            <div>
                                <label class={LABEL_CLASS}>{t('cms.node.dataSource.filtersLabel')}</label>
                                <DataSourceFilterEditor value={props.repeat?.filter ?? []} onChange={(v) => patch({ filter: v })} fieldOptions={fieldOptions()} />
                            </div>
                        </Show>
                    </Show>
                    <Show when={props.repeat?.source === 'backlink'}>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.dataSource.sourceContentTypeLabel')}</label>
                            <Select value={props.repeat?.sourceContentTypeId} options={contentTypeOptions()} clearable onChange={(v: string) => patch({ sourceContentTypeId: v || undefined })} fieldless />
                        </div>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.dataSource.matchFieldLabel')}</label>
                            <Input value={props.repeat?.matchField} onChange={(v: string) => patch({ matchField: v || undefined })} fieldless />
                        </div>
                    </Show>
                    <Show when={props.repeat?.source === 'related'}>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.dataSource.relatedContentTypeLabel')}</label>
                            <Select value={props.repeat?.relatedContentTypeKey} options={contentTypeOptions()} clearable onChange={(v: string) => patch({ relatedContentTypeKey: v || undefined })} fieldless />
                            <p class="mt-1 text-[11px] text-neutral-400">{t('cms.node.dataSource.relatedContentTypeHint')}</p>
                        </div>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.dataSource.matchFieldLabel')}</label>
                            <Input value={props.repeat?.matchField} onChange={(v: string) => patch({ matchField: v || undefined })} fieldless />
                        </div>
                    </Show>
                    <Show when={props.repeat?.source === 'local'}>
                        <LocalItemFieldsEditor
                            value={props.repeat?.localItemFields ?? []}
                            onChange={(v) => patch({ localItemFields: v })}
                            items={props.repeat?.localItems ?? []}
                            onItemsChange={(v) => patch({ localItems: v })}
                        />
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.dataSource.localItemsLabel')}</label>
                            <RepeaterFieldEditor
                                field={{ key: 'localItems', labelKey: 'cms.node.dataSource.localItemsLabel', control: 'repeater', repeaterItemShape: 'object', itemFields: props.repeat?.localItemFields ?? [], addButtonLabelKey: 'cms.node.dataSource.addLocalItemButton' }}
                                value={props.repeat?.localItems ?? []}
                                onChange={(v) => patch({ localItems: v as Record<string, unknown>[] })}
                            />
                        </div>
                    </Show>
                </Show>
                <Show when={props.nodeType === 'mixed-feed'}>
                    <MixedSourcesEditor
                        value={props.repeat?.sources ?? []}
                        onChange={(sources) => props.onChange({ ...(props.repeat ?? { source: 'mixed' }), source: 'mixed', sources })}
                    />
                </Show>
                <Show when={props.nodeType === 'table'}>
                    <TableColumnsEditor fieldOptions={fieldOptions()} value={props.columnsOrSlots as { columns?: TableColumnCfg[] } | undefined} onChange={props.onColumnsOrSlotsChange!} />
                </Show>
                <Show when={props.nodeType === 'card-list'}>
                    <CardSlotsEditor fieldOptions={fieldOptions()} value={props.columnsOrSlots as { slots?: CardSlotsCfg; columns?: number } | undefined} onChange={props.onColumnsOrSlotsChange!} />
                </Show>
                <Show when={props.nodeType === 'featured-entry'}>
                    <SimpleSlotsEditor
                        fieldOptions={fieldOptions()}
                        keys={['imageField', 'categoryField', 'headingField', 'descriptionField']}
                        value={((props.columnsOrSlots as { slots?: FeaturedEntrySlotsCfg })?.slots ?? {}) as Record<string, string | undefined>}
                        onChange={(slots) => props.onColumnsOrSlotsChange!({ slots })}
                    />
                </Show>
                <Show when={props.nodeType === 'project-showcase'}>
                    <SimpleSlotsEditor
                        fieldOptions={fieldOptions()}
                        keys={['headingField', 'imageField', 'descriptionField', 'clientField', 'yearField', 'categoryField']}
                        value={((props.columnsOrSlots as { slots?: ShowcaseSlotsCfg })?.slots ?? {}) as Record<string, string | undefined>}
                        onChange={(slots) => props.onColumnsOrSlotsChange!({ slots })}
                    />
                </Show>
                <Show when={props.nodeType === 'logo-grid'}>
                    <SimpleSlotsEditor
                        fieldOptions={fieldOptions()}
                        keys={['nameField', 'logoField']}
                        value={((props.columnsOrSlots as { slots?: LogoGridSlotsCfg })?.slots ?? {}) as Record<string, string | undefined>}
                        onChange={(slots) => props.onColumnsOrSlotsChange!({ slots })}
                    />
                </Show>
                <Show when={props.repeat?.cardinality === 'one'}>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.onNotFoundLabel')}</label>
                        <Select
                            value={props.repeat?.onNotFound ?? 'hide'}
                            options={[
                                { value: 'hide', label: t('cms.node.dataSource.onNotFoundHide') },
                                { value: '404', label: t('cms.node.dataSource.onNotFound404') },
                            ]}
                            onChange={(v: string) => patch({ onNotFound: v as 'hide' | '404' })}
                            fieldless
                        />
                    </div>
                </Show>
                <Show when={props.repeat?.cardinality !== 'one'}>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.limitLabel')}</label>
                        <InputNumber value={props.repeat?.limit ?? 12} onChange={(v) => patch({ limit: v ?? 12 })} fieldless />
                    </div>
                    <div class="flex items-center justify-between">
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.paginationEnableLabel')}</label>
                        <Checkbox value={!!props.repeat?.pagination} onChange={(v) => patch({ pagination: v ? { mode: 'reload', paramName: 'page', pageSize: props.repeat?.limit ?? 12 } : undefined })} fieldless />
                    </div>
                    <Show when={props.repeat?.pagination}>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.dataSource.paginationModeLabel')}</label>
                            <Select
                                value={props.repeat?.pagination?.mode ?? 'reload'}
                                options={[
                                    { value: 'reload', label: t('cms.node.dataSource.paginationModeReload') },
                                    { value: 'client', label: t('cms.node.dataSource.paginationModeClient') },
                                ]}
                                onChange={(v: string) => patch({ pagination: { ...(props.repeat!.pagination!), mode: v as 'reload' | 'client' } })}
                                fieldless
                            />
                        </div>
                    </Show>
                </Show>
            </Show>
        </div>
    );
}

/** Hand-rolled filter-row editor operating directly on `props.value`/`props.onChange` — see this
 * file's header comment for why `GenericFilterListInput` isn't reused here. Row layout/fields
 * mirror it (field/operator/value-source/value), row markup duplicated rather than shared. */
function DataSourceFilterEditor(props: { value: GenericDataSourceFilter[]; onChange: (v: GenericDataSourceFilter[]) => void; fieldOptions: { value: string; label: string }[] }) {
    const update = (i: number, patch: Partial<GenericDataSourceFilter>) => {
        const next = [...props.value];
        next[i] = { ...next[i], ...patch };
        props.onChange(next);
    };
    const add = () => props.onChange([...props.value, { field: '', valueSource: 'static', operator: '$eq' }]);
    const remove = (i: number) => props.onChange(props.value.filter((_, idx) => idx !== i));

    return (
        <div class="flex flex-col gap-2">
            <For each={props.value}>
                {(filter, i) => (
                    <div class="grid grid-cols-12 gap-2 rounded-lg border border-neutral-200 p-2">
                        <div class="col-span-3"><Select value={filter.field} options={props.fieldOptions} onChange={(v: string) => update(i(), { field: v })} fieldless /></div>
                        <div class="col-span-3">
                            <Select
                                value={filter.operator}
                                options={[
                                    { value: '$eq', label: t('cms.sections.genericFilter.opEq') },
                                    { value: '$ne', label: t('cms.sections.genericFilter.opNe') },
                                    { value: '$gt', label: t('cms.sections.genericFilter.opGt') },
                                    { value: '$gte', label: t('cms.sections.genericFilter.opGte') },
                                    { value: '$lt', label: t('cms.sections.genericFilter.opLt') },
                                    { value: '$lte', label: t('cms.sections.genericFilter.opLte') },
                                    { value: '$like', label: t('cms.sections.genericFilter.opLike') },
                                ]}
                                onChange={(v: string) => update(i(), { operator: v as GenericDataSourceFilter['operator'] })}
                                fieldless
                            />
                        </div>
                        <div class="col-span-3">
                            <Select
                                value={filter.valueSource}
                                options={[
                                    { value: 'static', label: t('cms.sections.genericFilter.valueSourceStatic') },
                                    { value: 'pathParam', label: t('cms.sections.genericFilter.valueSourcePathParam') },
                                    { value: 'queryParam', label: t('cms.sections.genericFilter.valueSourceQueryParam') },
                                ]}
                                onChange={(v: string) => update(i(), { valueSource: v as GenericDataSourceFilter['valueSource'] })}
                                fieldless
                            />
                        </div>
                        <div class="col-span-2">
                            <Show when={filter.valueSource === 'static'} fallback={<Input value={filter.paramName} onChange={(v: string) => update(i(), { paramName: v })} placeholder="tenDanhMuc" fieldless />}>
                                <Input value={filter.staticValue} onChange={(v: string) => update(i(), { staticValue: v })} fieldless />
                            </Show>
                        </div>
                        <div class="col-span-1"><Button sm outline interactDanger icon={<Icon name="heroicons-outline:trash" class="text-red-500" />} onClick={() => remove(i())} /></div>
                    </div>
                )}
            </For>
            <Button sm outline onClick={add}>{t('cms.sections.genericFilter.addButton')}</Button>
        </div>
    );
}

function TableColumnsEditor(props: { fieldOptions: { value: string; label: string }[]; value: { columns?: TableColumnCfg[] } | undefined; onChange: (v: { columns: TableColumnCfg[] }) => void }) {
    const columns = () => props.value?.columns ?? [];
    const update = (i: number, patch: Partial<TableColumnCfg>) => {
        const next = [...columns()];
        next[i] = { ...next[i], ...patch };
        props.onChange({ columns: next });
    };
    const add = () => props.onChange({ columns: [...columns(), { fieldKey: '', headerLabel: '', displayType: 'text' }] });
    const remove = (i: number) => props.onChange({ columns: columns().filter((_, idx) => idx !== i) });

    return (
        <div class="flex flex-col gap-2">
            <label class={LABEL_CLASS}>{t('cms.node.dataSource.columnsLabel')}</label>
            <For each={columns()}>
                {(col, i) => (
                    <div class="grid grid-cols-12 gap-2">
                        <div class="col-span-4"><Select value={col.fieldKey} options={props.fieldOptions} onChange={(v: string) => update(i(), { fieldKey: v })} fieldless /></div>
                        <div class="col-span-4"><Input value={col.headerLabel} onChange={(v: string) => update(i(), { headerLabel: v })} placeholder={t('cms.node.dataSource.columnHeaderPlaceholder')} fieldless /></div>
                        <div class="col-span-3">
                            <Select
                                value={col.displayType}
                                options={[
                                    { value: 'text', label: 'Text' },
                                    { value: 'image', label: 'Image' },
                                    { value: 'link', label: 'Link' },
                                    { value: 'date', label: 'Date' },
                                    { value: 'boolean', label: 'Boolean' },
                                ]}
                                onChange={(v: string) => update(i(), { displayType: v as TableColumnCfg['displayType'] })}
                                fieldless
                            />
                        </div>
                        <div class="col-span-1"><Button sm outline interactDanger icon={<Icon name="heroicons-outline:trash" class="text-red-500" />} onClick={() => remove(i())} /></div>
                    </div>
                )}
            </For>
            <Button sm outline onClick={add}>{t('cms.node.dataSource.addColumnButton')}</Button>
        </div>
    );
}

const CARD_SLOT_KEYS = ['imageField', 'titleField', 'subtitleField', 'descriptionField', 'badgeField', 'ctaLabelField'] as const;

function CardSlotsEditor(props: { fieldOptions: { value: string; label: string }[]; value: { slots?: CardSlotsCfg; columns?: number } | undefined; onChange: (v: { slots: CardSlotsCfg; columns: number }) => void }) {
    const slots = () => props.value?.slots ?? {};
    const columns = () => props.value?.columns ?? 3;
    const patchSlot = (key: (typeof CARD_SLOT_KEYS)[number], v: string) => props.onChange({ slots: { ...slots(), [key]: v || undefined }, columns: columns() });
    const patchColumns = (v: number | null) => props.onChange({ slots: slots(), columns: v ?? 3 });

    return (
        <div class="flex flex-col gap-3">
            <label class={LABEL_CLASS}>{t('cms.node.dataSource.slotsLabel')}</label>
            <For each={CARD_SLOT_KEYS}>
                {(key) => (
                    <div>
                        <p class="mb-1 text-[11px] text-neutral-400">{t(`cms.node.dataSource.slot.${key}` as any)}</p>
                        <Select value={slots()[key]} options={props.fieldOptions} clearable onChange={(v: string) => patchSlot(key, v)} fieldless />
                    </div>
                )}
            </For>
            <div>
                <p class="mb-1 text-[11px] text-neutral-400">{t('cms.node.dataSource.gridColumnsLabel')}</p>
                <InputNumber value={columns()} onChange={patchColumns} fieldless />
            </div>
        </div>
    );
}

/** Generic "pick 1 field per named slot" editor, shared by FeaturedEntry/ProjectShowcase/
 * LogoGrid (Canvas Editor v2, Task 13) — same shape as CardSlotsEditor's CARD_SLOT_KEYS loop,
 * generalized to accept an arbitrary key list + i18n key per slot instead of a hardcoded set. */
function SimpleSlotsEditor(props: { fieldOptions: { value: string; label: string }[]; keys: string[]; value: Record<string, string | undefined>; onChange: (v: Record<string, string | undefined>) => void }) {
    const patchSlot = (key: string, v: string) => props.onChange({ ...props.value, [key]: v || undefined });
    return (
        <div class="flex flex-col gap-3">
            <label class={LABEL_CLASS}>{t('cms.node.dataSource.slotsLabel')}</label>
            <For each={props.keys}>
                {(key) => (
                    <div>
                        <p class="mb-1 text-[11px] text-neutral-400">{t(`cms.node.dataSource.slot.${key}` as any)}</p>
                        <Select value={props.value[key]} options={props.fieldOptions} clearable onChange={(v: string) => patchSlot(key, v)} fieldless />
                    </div>
                )}
            </For>
        </div>
    );
}

/** MixedFeed's `repeat.sources` editor — a list of {contentTypeId, fieldMapping}. Fetches ITS
 * OWN content-type list + per-source field options (unlike every other branch in this file,
 * which shares 1 content-type picker) since each row picks a DIFFERENT content type. Canvas
 * Editor v2, Task 13. */
function MixedSourcesEditor(props: { value: NonNullable<CollectionRepeat['sources']>; onChange: (v: NonNullable<CollectionRepeat['sources']>) => void }) {
    const [contentTypes] = createResource(() => ContentTypeService.getAllContentType({ input: { limit: 200 } }));
    const contentTypesFull = () => ((contentTypes()?.edges || []) as Edge<ContentTypeDTO>[]).map((e) => e.node).filter((n): n is ContentTypeDTO => !!n);
    const contentTypeOptions = () => contentTypesFull().map((c) => ({ value: c.id!, label: c.label! }));
    const fieldOptionsFor = (contentTypeId: string) => {
        const ct = contentTypesFull().find((c) => c.id === contentTypeId);
        return (ct?.fields || []).filter((f): f is NonNullable<typeof f> => !!f?.key).map((f) => ({ value: f.key!, label: f.label || f.key! }));
    };

    const update = (i: number, patch: Partial<NonNullable<CollectionRepeat['sources']>[number]>) => {
        const next = [...props.value];
        next[i] = { ...next[i], ...patch };
        props.onChange(next);
    };
    const add = () => props.onChange([...props.value, { contentTypeId: '', fieldMapping: {} }]);
    const remove = (i: number) => props.onChange(props.value.filter((_, idx) => idx !== i));

    return (
        <div class="flex flex-col gap-2">
            <label class={LABEL_CLASS}>{t('cms.node.dataSource.mixedSourcesLabel')}</label>
            <For each={props.value}>
                {(source, i) => (
                    <div class="flex flex-col gap-2 rounded-lg border border-neutral-200 p-2">
                        <Select value={source.contentTypeId} options={contentTypeOptions()} onChange={(v: string) => update(i(), { contentTypeId: v })} fieldless />
                        <Show when={source.contentTypeId}>
                            <div class="grid grid-cols-3 gap-2">
                                <For each={['heading', 'image', 'description'] as const}>
                                    {(slot) => (
                                        <div>
                                            <p class="mb-1 text-[11px] text-neutral-400">{t(`cms.node.dataSource.slot.${slot}Field` as any)}</p>
                                            <Select
                                                value={source.fieldMapping?.[slot]}
                                                options={fieldOptionsFor(source.contentTypeId)}
                                                clearable
                                                onChange={(v: string) => update(i(), { fieldMapping: { ...source.fieldMapping, [slot]: v || undefined } })}
                                                fieldless
                                            />
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Show>
                        <Button sm outline interactDanger icon={<Icon name="heroicons-outline:trash" class="text-red-500" />} onClick={() => remove(i())}>{t('cms.node.dataSource.removeSourceButton')}</Button>
                    </div>
                )}
            </For>
            <Button sm outline onClick={add}>{t('cms.node.dataSource.addSourceButton')}</Button>
        </div>
    );
}

const LOCAL_FIELD_CONTROLS: { value: FieldControl; labelKey: string }[] = [
    { value: 'text', labelKey: 'cms.node.dataSource.localItemFieldControlText' },
    { value: 'textarea', labelKey: 'cms.node.dataSource.localItemFieldControlTextarea' },
    { value: 'richtext', labelKey: 'cms.node.dataSource.localItemFieldControlRichtext' },
    { value: 'image', labelKey: 'cms.node.dataSource.localItemFieldControlImage' },
    { value: 'number', labelKey: 'cms.node.dataSource.localItemFieldControlNumber' },
];

/** Slugify a hand-typed field label into a stable object key — lowercase, strip anything
 * that isn't a letter/digit. Deliberately simple (no unicode-diacritic folding): a Vietnamese
 * label with diacritics keeps them stripped by the [^a-z0-9] class, which is a harmless (if
 * slightly odd-looking) key like "tiu" for "Tiêu" — the KEY is never shown to a viewer, only
 * used internally to correlate data with its field descriptor, so exact prettiness doesn't
 * matter, only stability and uniqueness within one item shape. */
function slugifyFieldKey(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** When a field's key changes as a result of a label edit, the already-typed `localItems` rows
 * still carry the OLD key — left alone, that data becomes silently unreachable (`items[i][newKey]`
 * is `undefined`). Moves each item's value from `oldKey` to `newKey`, preserving it; items that
 * never had `oldKey` (e.g. added before the field existed) are left untouched. */
function renameItemKey(items: Record<string, unknown>[], oldKey: string, newKey: string): Record<string, unknown>[] {
    if (!oldKey || oldKey === newKey) return items;
    return items.map((item) => {
        if (!(oldKey in item)) return item;
        const { [oldKey]: value, ...rest } = item;
        return { ...rest, [newKey]: value };
    });
}

/** Runtime item-SHAPE editor for a local array repeater — distinct from `RepeaterFieldEditor`
 * (which edits the DATA once a shape exists). No prior art in this codebase: every other
 * `itemFields` array is hardcoded per node type in `nodeRegistry.ts` source, never admin-edited
 * — this is the one place an admin defines a field shape at runtime. Hand-rolled add/update/
 * remove directly on `props.value`/`props.onChange`, matching this file's own established
 * convention (`DataSourceFilterEditor`/`MixedSourcesEditor` above).
 *
 * Rendered via `<Index>` (POSITION-keyed), not `<For>` — `update()`/`updateLabel()` replace the
 * row object on every keystroke, so reference-keyed `<For>` would tear down and remount the row's
 * DOM (and drop focus) on every keystroke. Same trap/fix documented in `RepeaterFieldEditor.tsx`'s
 * header comment for its own row list.
 *
 * Also needs `items`/`onItemsChange` (the sibling `localItems` array) alongside `value`/`onChange`
 * (the `localItemFields` shape) — a label edit that changes a field's derived key must migrate
 * that key in every already-typed item row too (see `renameItemKey` above), otherwise existing
 * data is silently orphaned under the old key. */
function LocalItemFieldsEditor(props: { value: FieldDescriptor[]; onChange: (v: FieldDescriptor[]) => void; items: Record<string, unknown>[]; onItemsChange: (v: Record<string, unknown>[]) => void }) {
    const update = (i: number, patch: Partial<FieldDescriptor>) => {
        const next = [...props.value];
        next[i] = { ...next[i], ...patch };
        props.onChange(next);
    };
    const add = () => props.onChange([...props.value, { key: '', labelKey: '', control: 'text' }]);
    const remove = (i: number) => props.onChange(props.value.filter((_, idx) => idx !== i));
    // A key the admin already hand-edited away from its label's auto-slug must not be silently
    // overwritten on the next label keystroke — only auto-fill when key still matches what the
    // CURRENT label would slugify to (i.e. the admin never touched the key field directly).
    const updateLabel = (i: number, label: string) => {
        const field = props.value[i];
        const keyWasAutoDerived = field.key === slugifyFieldKey(field.labelKey);
        const newKey = keyWasAutoDerived ? slugifyFieldKey(label) : field.key;
        update(i, { labelKey: label, key: newKey });
        if (newKey !== field.key) {
            props.onItemsChange(renameItemKey(props.items, field.key, newKey));
        }
    };

    return (
        <div class="flex flex-col gap-2">
            <label class={LABEL_CLASS}>{t('cms.node.dataSource.localItemFieldsLabel')}</label>
            <Index each={props.value}>
                {(field, i) => (
                    <div class="grid grid-cols-12 gap-2 rounded-lg border border-neutral-200 p-2">
                        <div class="col-span-6">
                            <Input value={field().labelKey} onChange={(v: string) => updateLabel(i, v)} placeholder={t('cms.node.dataSource.localItemFieldLabelPlaceholder')} fieldless />
                        </div>
                        <div class="col-span-5">
                            <Select
                                value={field().control}
                                options={LOCAL_FIELD_CONTROLS.map((c) => ({ value: c.value, label: t(c.labelKey as any) }))}
                                onChange={(v: string) => update(i, { control: v as FieldControl })}
                                fieldless
                            />
                        </div>
                        <div class="col-span-1">
                            <Button sm outline interactDanger aria-label="remove-local-item-field" icon={<Icon name="heroicons-outline:trash" class="text-red-500" />} onClick={() => remove(i)} />
                        </div>
                    </div>
                )}
            </Index>
            <Button sm outline onClick={add}>{t('cms.node.dataSource.addLocalItemFieldButton')}</Button>
        </div>
    );
}
