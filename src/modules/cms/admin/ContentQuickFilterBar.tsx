import { For, Show, createSignal } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { Toggle } from '@core/components/control/Toggle';
import { InputNumber } from '@core/components/control/InputNumber';
import { Input } from '@core/components/control/Input';
import { EFilterOperator } from '@core/api/types';
import type { ContentFilterConfig, FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { resolveQuickFilterWidget } from './resolveQuickFilterWidget';

export interface QuickFilterValue { field: string; operator: EFilterOperator; value: any }

export interface ContentQuickFilterBarProps {
    filters: ContentFilterConfig[];
    fields: FieldDefinitionDTO[];
    onChange: (active: QuickFilterValue[]) => void;
}

/** Trang Content Entry list render mỗi filter đã cấu hình (mục F design) thành 1 control, gửi
 * kết quả lên cha dưới dạng FieldCondition[] khớp đúng shape BE's applyFieldCondition mong đợi
 * (field/operator/value) — cha ghép vào input.filter.quickFilters (xem Task 16). */
export function ContentQuickFilterBar(props: ContentQuickFilterBarProps) {
    const [values, setValues] = createSignal<Record<string, any>>({});

    const targetField = (filterField: string) => props.fields.find((f) => f?.key === filterField);

    const emitChange = (next: Record<string, any>) => {
        setValues(next);
        const active: QuickFilterValue[] = props.filters
            .filter((f) => next[f.key] !== undefined && next[f.key] !== '' && next[f.key] !== null)
            .map((f) => ({ field: f.field, operator: f.operator, value: next[f.key] }));
        props.onChange(active);
    };

    return (
        <div class="flex flex-wrap gap-3 items-end">
            <For each={props.filters}>
                {(filter) => {
                    const field = targetField(filter.field);
                    if (!field) return null;
                    const widget = resolveQuickFilterWidget(field.type!, filter.operator);
                    return (
                        <div class="min-w-[160px]">
                            <p class="mb-1 text-[11px] font-medium text-neutral-400">{filter.label}</p>
                            <Show when={widget === 'select'}>
                                <Select
                                    value={values()[filter.key]}
                                    onChange={(v: string) => emitChange({ ...values(), [filter.key]: v })}
                                    options={(field.options || []).filter((o): o is string => !!o).map((o) => ({ value: o, label: o }))}
                                    clearable
                                    fieldless
                                />
                            </Show>
                            <Show when={widget === 'boolean'}>
                                <Toggle value={values()[filter.key]} onChange={(v: boolean) => emitChange({ ...values(), [filter.key]: v })} fieldless />
                            </Show>
                            <Show when={widget === 'range'}>
                                <div class="flex gap-1">
                                    <InputNumber
                                        value={values()[`${filter.key}Min`]}
                                        onChange={(v: number | null) => emitChange({ ...values(), [`${filter.key}Min`]: v, [filter.key]: [v, values()[`${filter.key}Max`]] })}
                                        fieldless
                                    />
                                    <InputNumber
                                        value={values()[`${filter.key}Max`]}
                                        onChange={(v: number | null) => emitChange({ ...values(), [`${filter.key}Max`]: v, [filter.key]: [values()[`${filter.key}Min`], v] })}
                                        fieldless
                                    />
                                </div>
                            </Show>
                            <Show when={widget === 'text'}>
                                <Input value={values()[filter.key]} onChange={(v: string) => emitChange({ ...values(), [filter.key]: v })} fieldless />
                            </Show>
                        </div>
                    );
                }}
            </For>
        </div>
    );
}
