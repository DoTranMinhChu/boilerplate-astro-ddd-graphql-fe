import { createControl } from '@core/components/control/createControl';
import { Button } from '@core/components/button/Button';
import { DragList, DragHandle } from './DragList';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { t } from '@/shared/i18n/t';

export interface ContentEntryRepeaterInputProps {
    itemFields: FieldDefinitionDTO[];
    /** Render 1 field con — nhận vào field definition + value hiện tại + hàm cập nhật giá trị đó.
     * Truyền vào dạng prop (không import trực tiếp registry) để tránh phụ thuộc vòng giữa file
     * này và manageContentEntries.page.tsx (nơi định nghĩa registry, và registry đó cũng cần
     * import chính component này cho case REPEATER). */
    renderField: (field: FieldDefinitionDTO, value: any, onChange: (v: any) => void) => any;
    value?: Record<string, any>[];
    onChange?: (v: Record<string, any>[]) => void;
    fieldless?: boolean;
}

/** Danh sách lặp lại cho field kiểu REPEATER của Content Type — cùng khuôn với
 * Phase 1's RepeaterFieldInput (mutate item TẠI CHỖ trước khi bọc mảng mới cho
 * onChange, giữ nguyên object reference để DragList không remount hàng đang gõ
 * dở — xem TwoFieldListInput.tsx cho lý do đầy đủ), nhưng render field con qua
 * `props.renderField` (content-entry registry) thay vì block registry. */
export function ContentEntryRepeaterInput(props: ContentEntryRepeaterInputProps) {
    const { value, onChange } = createControl<Record<string, any>[]>('object_array', {
        value: props.value,
        onChange: props.onChange,
        fieldless: props.fieldless,
    });
    const items = () => value() || [];

    const add = () => onChange([...items(), {}]);
    const updateItem = (index: number, key: string, val: any) => {
        const next = [...items()];
        Object.assign(next[index], { [key]: val });
        onChange(next);
    };
    const remove = (index: number) => {
        const next = [...items()];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div class="space-y-3">
            <DragList items={items()} onReorder={onChange} class="space-y-3">
                {(item, index, dragHandle) => (
                    <div class="flex gap-3 rounded-lg border border-neutral-200 bg-white p-4">
                        <DragHandle {...dragHandle} />
                        <div class="flex-1 space-y-3">
                            {props.itemFields.map((field) => (
                                <div>
                                    <p class="mb-1 text-xs font-medium text-neutral-500">
                                        {field.label}{field.required ? ' *' : ''}
                                    </p>
                                    {props.renderField(field, item[field.key!], (v) => updateItem(index(), field.key!, v))}
                                </div>
                            ))}
                        </div>
                        <Button sm outline interactDanger onClick={() => remove(index())}>
                            {t('cms.contentEntries.repeaterRemoveButton')}
                        </Button>
                    </div>
                )}
            </DragList>
            <Button sm outline onClick={add}>{t('cms.contentEntries.repeaterAddButton')}</Button>
        </div>
    );
}
