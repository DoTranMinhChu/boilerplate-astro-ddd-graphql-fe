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
import { For, Show, createResource, createMemo } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { Input } from '@core/components/control/Input';
import { InputNumber } from '@core/components/control/InputNumber';
import { Checkbox } from '@core/components/control/Checkbox';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { ContentTypeService, ContentTypeDTO } from '@/shared/services/contentType/contentType.service';
import { t } from '@/shared/i18n/t';
import type { CollectionRepeat, TableColumnCfg, CardSlotsCfg } from '@/modules/cms/node/node.types';
import type { GenericDataSourceFilter } from '@/modules/cms/cms.types';
import type { Edge } from '@core/api/types';

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
                <Show when={props.nodeType === 'table'}>
                    <TableColumnsEditor fieldOptions={fieldOptions()} value={props.columnsOrSlots as { columns?: TableColumnCfg[] } | undefined} onChange={props.onColumnsOrSlotsChange!} />
                </Show>
                <Show when={props.nodeType === 'card-list'}>
                    <CardSlotsEditor fieldOptions={fieldOptions()} value={props.columnsOrSlots as { slots?: CardSlotsCfg; columns?: number } | undefined} onChange={props.onColumnsOrSlotsChange!} />
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
                        <div class="col-span-1"><Button sm outline interactDanger icon={<Icon name="heroicons-outline:trash" />} onClick={() => remove(i())} /></div>
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
                        <div class="col-span-1"><Button sm outline interactDanger icon={<Icon name="heroicons-outline:trash" />} onClick={() => remove(i())} /></div>
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
