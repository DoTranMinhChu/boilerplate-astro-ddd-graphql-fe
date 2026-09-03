// src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.tsx
//
// Node-level data binding Inspector tab ("Nguồn dữ liệu") — replaces the old page-level
// PageDataBindingModal.tsx. Shown for any node with `capabilities.repeat===true` (FRAME, TABLE,
// CARD_LIST). Same standalone-control pattern as NodeStyleTab.tsx/NodeVisibilityTab.tsx (no
// `<Form>`/`<Field>` context, so every control needs `fieldless`; `Checkbox`/`InputNumber`
// read/write via `value`/`onChange`, not `checked`/`type="number"`).
//
// The filter-row editor below deliberately does NOT reuse `GenericFilterListInput.tsx` — that
// component's `createControl` call requires a real `<Field>` ancestor (see
// PageDataBindingModal.tsx's usage), but this tab has no `<Form>` at all, so it hand-rolls its
// own array editor directly on `props.value`/`props.onChange`, the same approach
// `NodeVisibilityTab.tsx` uses for its own condition list.
import { For, Index, Show, createResource, createMemo } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { Checkbox } from '@core/components/control/Checkbox';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { ContentTypeService, ContentTypeDTO } from '@/shared/services/contentType/contentType.service';
import { t } from '@/shared/i18n/t';
import type { CollectionRepeat, TableColumnCfg, CardSlotsCfg } from '@/modules/cms/node/node.types';
import { ERepeatSource, ERepeatCardinality, ERepeatPaginationMode, ERepeatOnNotFound, ERepeatMode } from '@/modules/cms/node/node.types';
import type { GenericDataSourceFilter } from '@/modules/cms/cms.types';
import { EFilterValueSource } from '@/modules/cms/cms.types';
import { CMS_FILTER_OPERATOR_OPTIONS, CMS_VALUE_SOURCE_OPTIONS } from '@/modules/cms/cmsFilterOperator.constants';
import { EFilterOperator, type Edge } from '@core/api/types';
import { RepeaterFieldEditor } from './RepeaterFieldEditor';
import type { FieldDescriptor } from '@/modules/cms/node/node.fieldSchema.types';
import { EFieldControl } from '@/modules/cms/node/node.fieldSchema.types';

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

const emptyRepeat = (): CollectionRepeat => ({ source: ERepeatSource.OWN, mode: ERepeatMode.DYNAMIC, cardinality: ERepeatCardinality.MANY });

export function NodeDataSourceTab(props: NodeDataSourceTabProps) {
    const [contentTypes] = createResource(() => ContentTypeService.getAllContentType({ input: { limit: 200 } }));
    const contentTypesFull = () => ((contentTypes()?.edges || []) as Edge<ContentTypeDTO>[]).map((e) => e.node).filter((n): n is ContentTypeDTO => !!n);
    const contentTypeOptions = () => contentTypesFull().map((c) => ({ value: c.id!, label: c.label! }));
    // Post-Phase-8 content build-out dogfooding find: for source==='related'/'backlink' this
    // memo only ever read `props.repeat?.contentTypeKey` — a field that's NEVER set in those two
    // modes (only 'own' sets it; 'related' has `relatedContentTypeKey`, 'backlink' has
    // `sourceContentTypeId` — see CollectionRepeat's own doc comments on those 2 fields, node.types.ts).
    // So the Card List/Table field pickers (Bố cục thẻ/Table columns) always resolved to `undefined`
    // in those 2 modes, leaving every slot's dropdown permanently empty with no freeform-entry
    // fallback — a real blocking gap, hit live wiring up a "related products" Card List (source=
    // related, matchField=danhMuc) for Báo Bối Pet Spa's product Detail page. `relatedContentTypeKey`'s
    // own doc comment already says its ONE job is "used only to compute the Data Binding tab's
    // available-fields list" — this memo just never actually did that.
    const effectiveContentTypeKey = () => {
        const source = props.repeat?.source ?? ERepeatSource.OWN;
        if (source === ERepeatSource.RELATED) return props.repeat?.relatedContentTypeKey;
        if (source === ERepeatSource.BACKLINK) return props.repeat?.sourceContentTypeId;
        return props.repeat?.contentTypeKey;
    };
    const fieldOptions = createMemo(() => {
        const ct = contentTypesFull().find((c) => c.id === effectiveContentTypeKey());
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
                            value={props.repeat?.cardinality ?? ERepeatCardinality.MANY}
                            options={[
                                { value: ERepeatCardinality.MANY, label: t('cms.node.dataSource.cardinalityMany') },
                                { value: ERepeatCardinality.ONE, label: t('cms.node.dataSource.cardinalityOne') },
                            ]}
                            onChange={(v: string) => patch({ cardinality: v as ERepeatCardinality })}
                            fieldless
                        />
                    </div>
                </Show>
                <div>
                    <label class={LABEL_CLASS}>{t('cms.node.dataSource.sourceLabel')}</label>
                    <Select
                        value={props.repeat?.source ?? ERepeatSource.OWN}
                        options={[
                            { value: ERepeatSource.OWN, label: t('cms.node.dataSource.sourceOwn') },
                            { value: ERepeatSource.RELATED, label: t('cms.node.dataSource.sourceRelated') },
                            { value: ERepeatSource.BACKLINK, label: t('cms.node.dataSource.sourceBacklink') },
                            { value: ERepeatSource.LOCAL, label: t('cms.node.dataSource.sourceLocal') },
                        ]}
                        onChange={(v: string) => patch({ source: v as CollectionRepeat['source'] })}
                        fieldless
                    />
                </div>
                <Show when={(props.repeat?.source ?? ERepeatSource.OWN) === ERepeatSource.OWN}>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.contentTypeLabel')}</label>
                        <Select value={props.repeat?.contentTypeKey} options={contentTypeOptions()} clearable onChange={(v: string) => patch({ source: ERepeatSource.OWN, mode: ERepeatMode.DYNAMIC, contentTypeKey: v || undefined })} fieldless />
                    </div>
                    <Show when={props.repeat?.contentTypeKey}>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.dataSource.filtersLabel')}</label>
                            <DataSourceFilterEditor value={props.repeat?.filter ?? []} onChange={(v) => patch({ filter: v })} fieldOptions={fieldOptions()} />
                        </div>
                    </Show>
                </Show>
                <Show when={props.repeat?.source === ERepeatSource.BACKLINK}>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.sourceContentTypeLabel')}</label>
                        <Select value={props.repeat?.sourceContentTypeId} options={contentTypeOptions()} clearable onChange={(v: string) => patch({ sourceContentTypeId: v || undefined })} fieldless />
                    </div>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.matchFieldLabel')}</label>
                        <Input value={props.repeat?.matchField} onChange={(v: string) => patch({ matchField: v || undefined })} fieldless />
                    </div>
                </Show>
                <Show when={props.repeat?.source === ERepeatSource.RELATED}>
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
                <Show when={props.repeat?.source === ERepeatSource.LOCAL}>
                    <LocalItemFieldsEditor
                        value={props.repeat?.localItemFields ?? []}
                        onChange={(v) => patch({ localItemFields: v })}
                        items={props.repeat?.localItems ?? []}
                        onItemsChange={(v) => patch({ localItems: v })}
                    />
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.localItemsLabel')}</label>
                        <RepeaterFieldEditor
                            field={{ key: 'localItems', labelKey: 'cms.node.dataSource.localItemsLabel', control: EFieldControl.REPEATER, repeaterItemShape: 'object', itemFields: props.repeat?.localItemFields ?? [], addButtonLabelKey: 'cms.node.dataSource.addLocalItemButton' }}
                            value={props.repeat?.localItems ?? []}
                            onChange={(v) => patch({ localItems: v as Record<string, unknown>[] })}
                        />
                    </div>
                </Show>
                <Show when={(props.repeat?.source ?? ERepeatSource.OWN) !== ERepeatSource.LOCAL}>
                    <div class="flex items-center justify-between">
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.dataSource.linkToDetailLabel')}</label>
                            <p class="text-[11px] text-neutral-400">{t('cms.node.dataSource.linkToDetailHint')}</p>
                        </div>
                        <Checkbox value={!!props.repeat?.linkToDetail} onChange={(v) => patch({ linkToDetail: v })} fieldless />
                    </div>
                </Show>
                <Show when={props.nodeType === 'table'}>
                    <TableColumnsEditor fieldOptions={fieldOptions()} value={props.columnsOrSlots as { columns?: TableColumnCfg[] } | undefined} onChange={props.onColumnsOrSlotsChange!} />
                </Show>
                <Show when={props.nodeType === 'card-list'}>
                    <CardSlotsEditor fieldOptions={fieldOptions()} value={props.columnsOrSlots as { slots?: CardSlotsCfg; columns?: number } | undefined} onChange={props.onColumnsOrSlotsChange!} />
                </Show>
                <Show when={props.repeat?.cardinality === ERepeatCardinality.ONE}>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.onNotFoundLabel')}</label>
                        <Select
                            value={props.repeat?.onNotFound ?? ERepeatOnNotFound.HIDE}
                            options={[
                                { value: ERepeatOnNotFound.HIDE, label: t('cms.node.dataSource.onNotFoundHide') },
                                { value: ERepeatOnNotFound.NOT_FOUND, label: t('cms.node.dataSource.onNotFound404') },
                            ]}
                            onChange={(v: string) => patch({ onNotFound: v as ERepeatOnNotFound })}
                            fieldless
                        />
                    </div>
                </Show>
                <Show when={props.repeat?.cardinality !== ERepeatCardinality.ONE}>
                    <div>
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.limitLabel')}</label>
                        <InputNumber value={props.repeat?.limit ?? 12} onChange={(v) => patch({ limit: v ?? 12 })} fieldless />
                    </div>
                    <div class="flex items-center justify-between">
                        <label class={LABEL_CLASS}>{t('cms.node.dataSource.paginationEnableLabel')}</label>
                        <Checkbox value={!!props.repeat?.pagination} onChange={(v) => patch({ pagination: v ? { mode: ERepeatPaginationMode.RELOAD, paramName: 'page', pageSize: props.repeat?.limit ?? 12 } : undefined })} fieldless />
                    </div>
                    <Show when={props.repeat?.pagination}>
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.dataSource.paginationModeLabel')}</label>
                            <Select
                                value={props.repeat?.pagination?.mode ?? ERepeatPaginationMode.RELOAD}
                                options={[
                                    { value: ERepeatPaginationMode.RELOAD, label: t('cms.node.dataSource.paginationModeReload') },
                                    { value: ERepeatPaginationMode.CLIENT, label: t('cms.node.dataSource.paginationModeClient') },
                                ]}
                                onChange={(v: string) => patch({ pagination: { ...(props.repeat!.pagination!), mode: v as ERepeatPaginationMode } })}
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
    const add = () => props.onChange([...props.value, { field: '', valueSource: EFilterValueSource.STATIC, operator: EFilterOperator.EQUALS }]);
    const remove = (i: number) => props.onChange(props.value.filter((_, idx) => idx !== i));

    return (
        <div class="flex flex-col gap-2">
            <For each={props.value}>
                {(filter, i) => (
                    <div class="grid grid-cols-12 gap-2 rounded-lg border border-neutral-200 p-2">
                        <div class="col-span-3"><Select value={filter.field} options={props.fieldOptions} onChange={(v: string) => update(i(), { field: v })} fieldless /></div>
                        <div class="col-span-3">
                            {/* Task 9: was a hand-typed 7-member array duplicating
                                CMS_FILTER_OPERATOR_OPTIONS's exact value/order/label set 1:1 — now
                                derives from it directly (no filtering needed, same full 7-member set). */}
                            <Select
                                value={filter.operator}
                                options={CMS_FILTER_OPERATOR_OPTIONS()}
                                onChange={(v: string) => update(i(), { operator: v as GenericDataSourceFilter['operator'] })}
                                fieldless
                            />
                        </div>
                        <div class="col-span-3">
                            <Select
                                value={filter.valueSource}
                                options={CMS_VALUE_SOURCE_OPTIONS()}
                                onChange={(v: string) => update(i(), { valueSource: v as GenericDataSourceFilter['valueSource'] })}
                                fieldless
                            />
                        </div>
                        <div class="col-span-2">
                            <Show when={filter.valueSource === EFilterValueSource.STATIC} fallback={<Input value={filter.paramName} onChange={(v: string) => update(i(), { paramName: v })} placeholder="tenDanhMuc" fieldless />}>
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

const CARD_VARIANT_OPTIONS: { value: 'grid' | 'list' | 'featured'; labelKey: string }[] = [
    { value: 'grid', labelKey: 'cms.node.dataSource.variantGrid' },
    { value: 'list', labelKey: 'cms.node.dataSource.variantList' },
    { value: 'featured', labelKey: 'cms.node.dataSource.variantFeatured' },
];

function CardSlotsEditor(props: { fieldOptions: { value: string; label: string }[]; value: { slots?: CardSlotsCfg; columns?: number; variant?: 'grid' | 'list' | 'featured' } | undefined; onChange: (v: { slots: CardSlotsCfg; columns: number; variant?: 'grid' | 'list' | 'featured' }) => void }) {
    const slots = () => props.value?.slots ?? {};
    const columns = () => props.value?.columns ?? 3;
    // Post-Phase-8 dogfooding find: a Card List forced into `columns:1` to read as a "list"
    // (the only lever the Inspector exposed before this field existed) just stretched each
    // card's `aspect-4/3` image to the full row width — a single service card filling the whole
    // viewport height, worse than the 3-column grid it replaced. `variant:'list'` is a real,
    // separate rendering mode in CardListNode.tsx (small fixed-size image/icon left, text right,
    // no full-width aspect-ratio image) rather than overloading `columns` to mean two different
    // things.
    const variant = () => props.value?.variant ?? 'grid';
    const patchSlot = (key: (typeof CARD_SLOT_KEYS)[number], v: string) => props.onChange({ slots: { ...slots(), [key]: v || undefined }, columns: columns(), variant: variant() });
    const patchColumns = (v: number | null) => props.onChange({ slots: slots(), columns: v ?? 3, variant: variant() });
    const patchVariant = (v: 'grid' | 'list' | 'featured') => props.onChange({ slots: slots(), columns: columns(), variant: v });

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
                <p class="mb-1 text-[11px] text-neutral-400">{t('cms.node.dataSource.variantLabel')}</p>
                <Select
                    value={variant()}
                    options={CARD_VARIANT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey as any) }))}
                    onChange={(v: 'grid' | 'list' | 'featured') => patchVariant(v)}
                    fieldless
                />
            </div>
            <Show when={variant() === 'grid'}>
                <div>
                    <p class="mb-1 text-[11px] text-neutral-400">{t('cms.node.dataSource.gridColumnsLabel')}</p>
                    <InputNumber value={columns()} onChange={patchColumns} fieldless />
                </div>
            </Show>
        </div>
    );
}

const LOCAL_FIELD_CONTROLS: { value: EFieldControl; labelKey: string }[] = [
    { value: EFieldControl.TEXT, labelKey: 'cms.node.dataSource.localItemFieldControlText' },
    { value: EFieldControl.TEXTAREA, labelKey: 'cms.node.dataSource.localItemFieldControlTextarea' },
    { value: EFieldControl.RICHTEXT, labelKey: 'cms.node.dataSource.localItemFieldControlRichtext' },
    { value: EFieldControl.IMAGE, labelKey: 'cms.node.dataSource.localItemFieldControlImage' },
    { value: EFieldControl.NUMBER, labelKey: 'cms.node.dataSource.localItemFieldControlNumber' },
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
 * convention (`DataSourceFilterEditor` above).
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
    const add = () => props.onChange([...props.value, { key: '', labelKey: '', control: EFieldControl.TEXT }]);
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
    // Design doc §3: the key is editable — a hand-typed key is an explicit override, exactly the
    // same "was this auto-derived or hand-edited" tracking `updateLabel` already relies on, just
    // applied in the other direction: after this fires, `field.key` no longer equals
    // `slugifyFieldKey(field.labelKey)` (unless the admin happens to type the exact slug), so
    // `updateLabel`'s `keyWasAutoDerived` guard naturally stops auto-overwriting it on future
    // label edits — no separate "was hand-edited" flag needed. Also migrates existing `localItems`
    // data from the old key to the new one, same as `updateLabel` does.
    const updateKey = (i: number, key: string) => {
        const field = props.value[i];
        update(i, { key });
        if (key !== field.key) {
            props.onItemsChange(renameItemKey(props.items, field.key, key));
        }
    };
    // Non-blocking validation cue (design doc §3 intent) — an empty key can never be bound to
    // anything (Task 2's fieldOptions filters `!!f.key`), and a key colliding with a sibling
    // field's key means one of the two silently shadows the other in `localItems`. Doesn't
    // prevent typing, just surfaces the problem so the admin isn't stuck with no error shown.
    const keyIssue = (i: number) => {
        const key = props.value[i]?.key ?? '';
        if (!key) return true;
        return props.value.some((f, idx) => idx !== i && f.key === key);
    };

    return (
        <div class="flex flex-col gap-2">
            <label class={LABEL_CLASS}>{t('cms.node.dataSource.localItemFieldsLabel')}</label>
            <Index each={props.value}>
                {(field, i) => (
                    <div class="grid grid-cols-12 gap-2 rounded-lg border border-neutral-200 p-2">
                        <div class="col-span-5">
                            <Input value={field().labelKey} onChange={(v: string) => updateLabel(i, v)} placeholder={t('cms.node.dataSource.localItemFieldLabelPlaceholder')} fieldless />
                        </div>
                        <div class="col-span-3">
                            <Input value={field().key} onChange={(v: string) => updateKey(i, v)} placeholder={t('cms.node.dataSource.localItemFieldKeyPlaceholder')} fieldless />
                            <Show when={keyIssue(i)}>
                                <p class="mt-1 text-[11px] text-red-500">{t('cms.node.dataSource.localItemFieldKeyWarning')}</p>
                            </Show>
                        </div>
                        <div class="col-span-3">
                            <Select
                                value={field().control}
                                options={LOCAL_FIELD_CONTROLS.map((c) => ({ value: c.value, label: t(c.labelKey as any) }))}
                                onChange={(v: string) => update(i, { control: v as EFieldControl })}
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
