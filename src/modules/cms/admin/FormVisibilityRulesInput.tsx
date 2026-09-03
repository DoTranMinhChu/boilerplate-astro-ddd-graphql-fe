import { For, Show } from 'solid-js';
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

/** 1 luật "hiện field X khi field NGUỒN thoả điều kiện" — tái dùng nguyên shape
 * `ContentVisibilityRuleInput` (field/operator/value) của ContentVisibilityRulesInput.tsx dù ý
 * nghĩa ĐẢO NGƯỢC hoàn toàn: CVR (Content Type) LUÔN ẨN các bản ghi khớp điều kiện khỏi khách
 * xem công khai (bắt buộc phía server, không thể tắt) — luật ở đây quyết định HIỆN 1 field cụ
 * thể của Form trên trang công khai khi field NGUỒN (`rule.field`) do khách đang điền khớp giá
 * trị mong đợi (áp phía client lúc khách điền form, xem FormSection.tsx — Task 5), KHÔNG có
 * nghĩa bảo mật/server-enforced nào cả. */
export type FormFieldVisibilityRule = ContentVisibilityRuleInput;

/** Value của control: field key (field ĐANG được điều kiện hoá) -> danh sách luật. 1 field
 * không có key trong map này (hoặc map rỗng) = luôn hiện, không điều kiện gì. */
export type FormVisibilityRulesValue = Record<string, FormFieldVisibilityRule[]>;

const emptyRule = (): FormFieldVisibilityRule => ({ field: '', operator: EFilterOperator.EQUALS, value: '' });

/**
 * Mini editor điều kiện hiển thị PER-FIELD cho Form (mục 1 kế hoạch Phase 4, Task 4) — tái dùng
 * đúng khuôn add/remove-row + operator/value control của ContentVisibilityRulesInput.tsx (Content
 * Type), nhưng lưu vào `Record<string, Rule[]>` theo field key thay vì 1 mảng phẳng: mỗi field
 * của Form tự có 1 danh sách luật riêng (rule field ở ĐÂY luôn là 1 field KHÁC trong CÙNG Form —
 * field đang xét điều kiện hiển thị không thể tự tham chiếu chính nó).
 *
 * `fieldOptions` lấy từ `item?.fields` (bản đã lưu, KHÔNG reactive theo <FieldDefinitionArrayInput>
 * đang sửa live trong cùng modal) — CHỦ Ý mirror đúng hạn chế đã có của ContentVisibilityRulesInput
 * (xem manageContentTypes.page.tsx): admin thêm field mới trong `fields`, lưu, mở lại mới thấy
 * field đó xuất hiện ở đây để chọn làm nguồn/đích — nhất quán với hành vi đã tồn tại thay vì tự
 * chế 1 cơ chế reactive-live riêng cho Form.
 */
export function FormVisibilityRulesInput(props: { fieldOptions: { value: string; label: string }[] }) {
    const { value, onChange } = createControl<FormVisibilityRulesValue>('object', {});
    const rulesMap = () => value() || {};

    const rulesOf = (fieldKey: string) => rulesMap()[fieldKey] || [];
    const setRulesOf = (fieldKey: string, rules: FormFieldVisibilityRule[]) => {
        onChange({ ...rulesMap(), [fieldKey]: rules });
    };
    const addRule = (fieldKey: string) => setRulesOf(fieldKey, [...rulesOf(fieldKey), emptyRule()]);
    const updateRule = (fieldKey: string, index: number, patch: Partial<FormFieldVisibilityRule>) => {
        const next = [...rulesOf(fieldKey)];
        Object.assign(next[index], patch);
        setRulesOf(fieldKey, next);
    };
    const removeRule = (fieldKey: string, index: number) => {
        const next = [...rulesOf(fieldKey)];
        next.splice(index, 1);
        setRulesOf(fieldKey, next);
    };

    return (
        <div class="space-y-3">
            <For each={props.fieldOptions}>
                {(targetField) => {
                    // Field KHÁC field đang xét — không cho 1 field tự tham chiếu chính nó làm nguồn
                    // điều kiện (vô nghĩa: hiện field X khi X = ... trong khi X chính là field đang ẩn/hiện).
                    const sourceOptions = () => props.fieldOptions.filter((o) => o.value !== targetField.value);
                    const rules = () => rulesOf(targetField.value);
                    return (
                        <div class="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
                            <div class="flex items-center justify-between gap-3 mb-2">
                                <p class="text-sm font-semibold text-neutral-800">
                                    {t('cms.forms.visibility.fieldRowTitle', { label: targetField.label })}
                                </p>
                                <Button sm outline onClick={() => addRule(targetField.value)}>
                                    {t('cms.forms.visibility.addButton')}
                                </Button>
                            </div>
                            <Show when={rules().length === 0}>
                                <p class="text-xs text-neutral-400">{t('cms.forms.visibility.emptyHint')}</p>
                            </Show>
                            <div class="space-y-2">
                                <For each={rules()}>
                                    {(rule, index) => (
                                        <div class="grid grid-cols-12 gap-3">
                                            <div class="col-span-4">
                                                <Select
                                                    value={rule.field}
                                                    onChange={(v: string) => updateRule(targetField.value, index(), { field: v })}
                                                    options={sourceOptions()}
                                                    emptyPlaceholder={t('cms.forms.visibility.sourceFieldPlaceholder')}
                                                    fieldless
                                                />
                                            </div>
                                            <div class="col-span-4">
                                                <Select
                                                    value={rule.operator}
                                                    onChange={(v: string) => updateRule(targetField.value, index(), { operator: v })}
                                                    options={OPERATOR_OPTIONS()}
                                                    fieldless
                                                />
                                            </div>
                                            <div class="col-span-3">
                                                <Input
                                                    value={rule.value}
                                                    onChange={(v: string) => updateRule(targetField.value, index(), { value: v })}
                                                    fieldless
                                                />
                                            </div>
                                            <div class="col-span-1 flex items-center justify-end">
                                                <Button
                                                    sm
                                                    outline
                                                    interactDanger
                                                    icon={<Icon name="heroicons-outline:trash" tooltip={t('cms.forms.visibility.removeButton')} />}
                                                    onClick={() => removeRule(targetField.value, index())}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </div>
                    );
                }}
            </For>
        </div>
    );
}
