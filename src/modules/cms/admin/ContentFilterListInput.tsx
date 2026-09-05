import { For } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Select } from '@core/components/control/Select';
import { Input } from '@core/components/control/Input';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { generateId } from '@core/helpers/util';
import { t } from '@/shared/i18n/t';
import { EFilterOperator } from '@core/api/types';
import type { ContentFilterConfig } from '@/modules/cms/cms.types';
import { CMS_FILTER_OPERATOR_OPTIONS } from '@/modules/cms/cmsFilterOperator.constants';

const emptyFilter = (): ContentFilterConfig => ({ key: generateId(), label: '', field: '', operator: EFilterOperator.EQUALS });

/** Editor cho ContentType.filters (mục F design) — mỗi hàng là 1 quick-filter sẽ xuất hiện
 * trên trang Content Entry list. KHÁC GenericFilterListInput: không có valueSource/staticValue/
 * paramName — giá trị lọc do NGƯỜI XEM chọn lúc runtime, không phải admin fix cứng lúc đây. */
export function ContentFilterListInput(props: { fieldOptions: { value: string; label: string }[] }) {
    const { value, onChange } = createControl<ContentFilterConfig[]>('object_array', {});
    const filters = () => value() || [];

    const updateFilter = (index: number, patch: Partial<ContentFilterConfig>) => {
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
                {(filter, index) => (
                    <div class="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 grid grid-cols-12 gap-3 items-start">
                        <div class="col-span-4">
                            <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.contentFilters.label')}</p>
                            <Input value={filter.label} onChange={(v: string) => updateFilter(index(), { label: v })} fieldless />
                        </div>
                        <div class="col-span-4">
                            <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.contentFilters.field')}</p>
                            <Select value={filter.field} onChange={(v: string) => updateFilter(index(), { field: v })} options={props.fieldOptions} fieldless />
                        </div>
                        <div class="col-span-3">
                            <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.contentFilters.operator')}</p>
                            <Select value={filter.operator} onChange={(v: string) => updateFilter(index(), { operator: v as EFilterOperator })} options={CMS_FILTER_OPERATOR_OPTIONS()} fieldless />
                        </div>
                        <div class="col-span-1 flex items-end justify-end pb-0.5">
                            <Button sm outline interactDanger icon={<Icon name="heroicons-outline:trash" tooltip={t('cms.contentFilters.removeButton')} />} onClick={() => removeFilter(index())} />
                        </div>
                    </div>
                )}
            </For>
            <Button sm outline onClick={addFilter}>{t('cms.contentFilters.addButton')}</Button>
        </div>
    );
}
