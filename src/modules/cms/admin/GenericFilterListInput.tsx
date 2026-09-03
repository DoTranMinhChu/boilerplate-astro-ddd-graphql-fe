import { For, Show } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Select } from '@core/components/control/Select';
import { Input } from '@core/components/control/Input';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';
import { EFilterOperator } from '@core/api/types';
import type { GenericDataSourceFilter } from '@/modules/cms/cms.types';
import { CMS_FILTER_OPERATOR_OPTIONS } from '@/modules/cms/cmsFilterOperator.constants';

const VALUE_SOURCE_OPTIONS = () => [
    { value: 'static', label: t('cms.sections.genericFilter.valueSourceStatic') },
    { value: 'pathParam', label: t('cms.sections.genericFilter.valueSourcePathParam') },
    { value: 'queryParam', label: t('cms.sections.genericFilter.valueSourceQueryParam') },
];
// Task 9: was a hand-typed 7-member array duplicating CMS_FILTER_OPERATOR_OPTIONS's exact
// value/order/label set 1:1 — now derives from it directly (no further filtering needed, this
// file already exposed the SAME full 7-member set the canonical list holds).
const OPERATOR_OPTIONS = CMS_FILTER_OPERATOR_OPTIONS;

const emptyFilter = (): GenericDataSourceFilter => ({ field: '', valueSource: 'static', operator: EFilterOperator.EQUALS });

/**
 * Editor cho GenericDataSourceConfig.filters (mục 3 design Phase 2b) — mỗi hàng là 1
 * điều kiện AND. Không có DragList (thứ tự không có ý nghĩa — filter AND với nhau,
 * không phải danh sách hiển thị), nhưng VẪN mutate tại chỗ trước khi bọc mảng mới
 * (giống FieldDefinitionArrayInput/ContentEntryRepeaterInput) để gõ vào 1 ô Input
 * không làm text field khác trong cùng hàng mất focus.
 */
export function GenericFilterListInput(props: { fieldOptions: { value: string; label: string }[] }) {
    const { value, onChange } = createControl<GenericDataSourceFilter[]>('object_array', {});
    const filters = () => value() || [];

    const updateFilter = (index: number, patch: Partial<GenericDataSourceFilter>) => {
        const next = [...filters()];
        Object.assign(next[index], patch);
        onChange(next);
    };
    const addFilter = () => onChange([...filters(), emptyFilter()]);
    const removeFilter = (index: number) => {
        const next = [...filters()];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div class="space-y-3">
            <For each={filters()}>
                {(filter, index) => {
                    // Đọc qua filters()[index()] (tracked signal, giống currentType() trong
                    // FieldDefinitionArrayInput) thay vì filter.valueSource (tham chiếu object
                    // thường — updateFilter() mutate tại chỗ để <For> giữ nguyên DOM/focus của
                    // hàng, nên object KHÔNG đổi reference và Solid không có cách nào biết
                    // filter.valueSource vừa đổi giá trị). Đọc thẳng filter.valueSource ở đây sẽ
                    // khiến nhãn cột cuối và việc chuyển đổi Input Cố định/Tên tham số bị "đứng
                    // hình" ở giá trị lúc hàng này mới mount, dù dropdown Nguồn giá trị đã đổi
                    // (dropdown tự hiển thị đúng vì nó tự cập nhật signal nội bộ của chính nó khi
                    // người dùng chọn — nhưng nhãn/Input bên dưới không nằm trong Select nên
                    // không tự động ăn theo).
                    const currentValueSource = () => filters()[index()]?.valueSource;
                    return (
                    <div class="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 grid grid-cols-12 gap-3 items-start">
                        <div class="col-span-3">
                            <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.sections.genericFilter.field')}</p>
                            <Select value={filter.field} onChange={(v: string) => updateFilter(index(), { field: v })} options={props.fieldOptions} fieldless />
                        </div>
                        <div class="col-span-3">
                            <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.sections.genericFilter.operator')}</p>
                            <Select value={filter.operator} onChange={(v: string) => updateFilter(index(), { operator: v as GenericDataSourceFilter['operator'] })} options={OPERATOR_OPTIONS()} fieldless />
                        </div>
                        <div class="col-span-3">
                            <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.sections.genericFilter.valueSource')}</p>
                            <Select value={filter.valueSource} onChange={(v: string) => updateFilter(index(), { valueSource: v as GenericDataSourceFilter['valueSource'] })} options={VALUE_SOURCE_OPTIONS()} fieldless />
                        </div>
                        <div class="col-span-2">
                            <p class="mb-1 text-[11px] font-medium text-neutral-400">
                                {currentValueSource() === 'static' ? t('cms.sections.genericFilter.staticValue') : t('cms.sections.genericFilter.paramName')}
                            </p>
                            <Show
                                when={currentValueSource() === 'static'}
                                fallback={<Input value={filter.paramName} onChange={(v: string) => updateFilter(index(), { paramName: v })} placeholder="tenDanhMuc" fieldless />}
                            >
                                <Input value={filter.staticValue} onChange={(v: string) => updateFilter(index(), { staticValue: v })} fieldless />
                            </Show>
                        </div>
                        <div class="col-span-1 flex items-end justify-end pb-0.5">
                            <Button sm outline interactDanger icon={<Icon name="heroicons-outline:trash" tooltip={t('cms.sections.genericFilter.removeButton')} />} onClick={() => removeFilter(index())} />
                        </div>
                    </div>
                    );
                }}
            </For>
            <Button sm outline onClick={addFilter}>{t('cms.sections.genericFilter.addButton')}</Button>
        </div>
    );
}
