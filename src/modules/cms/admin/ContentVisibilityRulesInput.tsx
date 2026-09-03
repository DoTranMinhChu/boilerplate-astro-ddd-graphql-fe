import { For } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { Select } from '@core/components/control/Select';
import { Input } from '@core/components/control/Input';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { t } from '@/shared/i18n/t';
import { EFilterOperator } from '@core/api/types';
import type { ContentVisibilityRuleInput } from '@shared/generated/typed-graphql';
import { CMS_FILTER_OPERATOR_OPTIONS } from '@/modules/cms/cmsFilterOperator.constants';

// Task 9: was a hand-typed 6-member array (previously using `cms.contentTypes.visibility.op*`
// keys — byte-identical vi/en text to CMS_FILTER_OPERATOR_OPTIONS's `cms.sections.genericFilter
// .op*` keys, verified in cms.i18n.ts, so this redirect changes zero visible text). This file
// never exposed LIKE ("Chứa"/"Contains") — kept excluded here, same as before.
const OPERATOR_OPTIONS = () => CMS_FILTER_OPERATOR_OPTIONS().filter((o) => o.value !== EFilterOperator.LIKE);
const emptyRule = (): ContentVisibilityRuleInput => ({ field: '', operator: EFilterOperator.EQUALS, value: '' });

/**
 * Editor Content Visibility Rules (mục 4 design Phase 2b) — LUÔN áp bắt buộc phía
 * server, không thể bị bỏ qua bởi filter trang/block nào (xem cảnh báo bên dưới danh
 * sách). Cùng khuôn add/remove-row với FieldDefinitionArrayInput; không cần DragList
 * (thứ tự rule không có ý nghĩa — mỗi rule độc lập).
 *
 * Không có <Show> nào bên trong điều kiện dựa theo state riêng của từng hàng (mọi
 * hàng luôn hiện đủ field/operator/value, không rẽ nhánh) — nên KHÔNG dính bug
 * class mà Task 12 tìm thấy ở component hàng tương tự (đọc thẳng property object
 * thường trong 1 <Show when=...> thay vì qua signal rules()[index()] có tracking).
 * Các chỗ đọc rule.field/operator/value dưới đây chỉ để bind `value` cho
 * Select/Input — cùng khuôn field.key/field.label ở FieldDefinitionArrayInput.
 */
export function ContentVisibilityRulesInput(props: { fieldOptions: { value: string; label: string }[] }) {
    const { value, onChange } = createControl<ContentVisibilityRuleInput[]>('object_array', {});
    const rules = () => value() || [];

    const updateRule = (index: number, patch: Partial<ContentVisibilityRuleInput>) => {
        const next = [...rules()];
        Object.assign(next[index], patch);
        onChange(next);
    };
    const addRule = () => onChange([...rules(), emptyRule()]);
    const removeRule = (index: number) => {
        const next = [...rules()];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div class="space-y-3">
            <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {t('cms.contentTypes.visibility.warning')}
            </div>
            <For each={rules()}>
                {(rule, index) => (
                    <div class="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
                        <div class="grid grid-cols-12 gap-3">
                            <div class="col-span-4">
                                <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.contentTypes.visibility.field')}</p>
                                <Select value={rule.field} onChange={(v: string) => updateRule(index(), { field: v })} options={props.fieldOptions} fieldless />
                            </div>
                            <div class="col-span-4">
                                <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.contentTypes.visibility.operator')}</p>
                                <Select value={rule.operator} onChange={(v: string) => updateRule(index(), { operator: v })} options={OPERATOR_OPTIONS()} fieldless />
                            </div>
                            <div class="col-span-3">
                                <p class="mb-1 text-[11px] font-medium text-neutral-400">{t('cms.contentTypes.visibility.value')}</p>
                                <Input value={rule.value} onChange={(v: string) => updateRule(index(), { value: v })} fieldless />
                            </div>
                            <div class="col-span-1 flex items-end justify-end pb-0.5">
                                <Button sm outline interactDanger icon={<Icon name="heroicons-outline:trash" tooltip={t('cms.contentTypes.visibility.removeButton')} />} onClick={() => removeRule(index())} />
                            </div>
                        </div>
                    </div>
                )}
            </For>
            <Button sm outline onClick={addRule}>{t('cms.contentTypes.visibility.addButton')}</Button>
        </div>
    );
}
