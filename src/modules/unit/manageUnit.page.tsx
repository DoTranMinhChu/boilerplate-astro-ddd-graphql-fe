import { Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { generateDatatable, PagingArgsInput } from '@core/components/table/GeneratedDatatable';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { Textarea } from '@core/components/control/Textarea';
import { UnitDTO, UnitService } from '@/shared/services/unit/unit.service';
import { t } from '@/shared/i18n/t';

// ─────────────────────────────────────────────────────────────────────────────
// Nhãn tự nhiên
// ─────────────────────────────────────────────────────────────────────────────

const UNIT_GROUP_OPTIONS = [
    { value: 'WEIGHT', label: t('unit.groupOptions.weight') },
    { value: 'VOLUME', label: t('unit.groupOptions.volume') },
    { value: 'COUNT', label: t('unit.groupOptions.count') },
    { value: 'LENGTH', label: t('unit.groupOptions.length') },
    { value: 'AREA', label: t('unit.groupOptions.area') },
    { value: 'OTHER', label: t('unit.groupOptions.other') },
];

const GROUP_LABEL: Record<string, string> = Object.fromEntries(
    UNIT_GROUP_OPTIONS.map(o => [o.value, o.label])
);

// ─────────────────────────────────────────────────────────────────────────────
// Datatable
// ─────────────────────────────────────────────────────────────────────────────

const { Datatable } = generateDatatable<PagingArgsInput, UnitDTO, UnitDTO, UnitDTO, any, any>({
    service: UnitService,
    paginatedQuery: (input) => UnitService.getAllUnit(input),
    itemQuery: (item) => UnitService.getOneUnit({ id: item.id! }),
    createMutation: (data) => UnitService.createUnit({ data }),
    updateMutation: (id, data) => UnitService.updateUnit({ id, data }),
    deleteMutation: (item) => UnitService.deleteUnit({ id: item.id! }),
    queryInput: { sort: { name: 'ASC' } },
});

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function ManageUnitPage() {
    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm">
                <Datatable id="UnitTable">
                    <Datatable.Header>
                        <Datatable.Title
                            title={t('unit.title')}
                            description={t('unit.description')}
                        />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('unit.buttonCreate')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                        <Datatable.Filter>
                          <Datatable.TenantFilter />
                        </Datatable.Filter>
                    </Datatable.Toolbar>

                    <Datatable.Table>
                      <Datatable.TenantColumn />
                        <Datatable.Column title={t('unit.column.name')} sortable="name">
                            {(item) => (
                                <div>
                                    <p class="font-semibold text-gray-900">{item.name}</p>
                                    <Show when={item.description}>
                                        <p class="text-xs text-gray-400 truncate">{item.description}</p>
                                    </Show>
                                </div>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title={t('unit.column.code')}>
                            {(item) => (
                                <code class="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono font-bold text-gray-700">
                                    {item.code}
                                </code>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title={t('unit.column.group')}>
                            {(item) => (
                                <Show when={item.group} fallback={<span class="text-gray-300">—</span>}>
                                    <span class="text-sm text-gray-600">{GROUP_LABEL[item.group!] ?? item.group}</span>
                                </Show>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title={t('unit.column.status')}>
                            {(item) => (
                                <span class={`text-xs font-semibold px-2 py-0.5 rounded-full
                                    ${item.isActivated
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {item.isActivated ? t('unit.status.active') : t('unit.status.inactive')}
                                </span>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title="">
                            {(item) => (
                                <Datatable.CellButtons>
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Datatable.CellButtonDelete item={item} itemName={item.name!} />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>
                    </Datatable.Table>

                    <Datatable.CardView>
                        {(item) => (
                            <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
                                <div class="p-4 space-y-1.5">
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="flex-1 min-w-0">
                                            <p class="font-bold text-gray-900">{item.name}</p>
                                            <p class="text-xs text-gray-500">
                                                <code class="font-mono">{item.code}</code> &middot; {GROUP_LABEL[item.group!] ?? item.group}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div class="border-t border-neutral-100 px-4 py-2.5 bg-neutral-50 flex justify-end gap-1">
                                    <Datatable.CellButtonUpdate item={item} />
                                    <Datatable.CellButtonDelete item={item} itemName={item.name!} />
                                </div>
                            </div>
                        )}
                    </Datatable.CardView>

                    <Datatable.Pagination />

                    <Datatable.Formlog
                        viewMode="modal"
                        class="w-full max-w-[480px]"
                        createTitle={t('unit.form.createTitle')}
                        updateTitle={t('unit.form.updateTitle')}
                    >
                        {() => (
                            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                                <div class="col-span-8">
                                    <Datatable.Field name="name" label={t('unit.form.nameLabel')} required>
                                        <Input placeholder={t('unit.form.namePlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-4">
                                    <Datatable.Field name="code" label={t('unit.form.codeLabel')} required>
                                        <Input placeholder={t('unit.form.codePlaceholder')} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-12">
                                    <Datatable.Field name="group" label={t('unit.form.groupLabel')}>
                                        <Select options={UNIT_GROUP_OPTIONS} placeholder={t('unit.form.groupPlaceholder')} clearable />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-full">
                                    <Datatable.Field name="description" label={t('unit.form.descriptionLabel')}>
                                        <Textarea placeholder={t('unit.form.descriptionPlaceholder')} rows={2} />
                                    </Datatable.Field>
                                </div>
                                <div class="col-span-full">
                                    <Datatable.Field name="isActivated" label={t('unit.form.statusLabel')}>
                                        <Select
                                            options={[
                                                { value: true, label: t('unit.form.statusActive') },
                                                { value: false, label: t('unit.form.statusInactive') },
                                            ]}
                                        />
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
