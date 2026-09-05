import { For } from 'solid-js';
import { createControl } from '@core/components/control/createControl';
import { baseConfig } from '@core/components/config/BaseConfig';

export interface ModeMultiSelectFieldProps {
    options: { value: string; label: string }[];
}

/** Multi-select thay cho pattern "1 Datatable.Field dot-path GIẢ-mảng per mode" (Bug B, Task 14
 * live-verify fix) — chỉ 1 Datatable.Field DUY NHẤT (`listViewConfig.enabledModes` /
 * `formConfig.enabledModes`) bọc control này, binding NGUYÊN mảng qua
 * `createControl<string[]>('array', {})` ambient — cùng convention `FieldGridLayoutDesigner`/
 * `ContentFilterListInput`: không truyền value/onChange, tự đọc field bao ngoài qua `useField()`.
 * Trước đây mỗi mode có 1 `Datatable.Field name="...enabledModes.${mode}"` riêng (dùng tên mode
 * làm fake object key) — `generateForm.tsx`'s `submitValues()` build từ `{}` rỗng, và
 * `Util.set()` (radashi) luôn tạo OBJECT (không phải array) cho key không phải chuỗi-số, nên
 * `enabledModes` sau khi lưu biến thành `{dialog: false, ...}` thay vì mảng thật — hỏng mỗi lần
 * lưu, bất kể ô nào được bấm.
 *
 * KHÔNG dùng pattern `<label><input hidden/></label>` (Bug A: `Toggle`'s outer div có
 * `onClick={toggle}`, native input ẩn bên trong bị trình duyệt tự động forward click từ label
 * bao ngoài, bắn `toggle()` 2 lần/click, huỷ lẫn nhau) — mỗi hàng ở đây là 1 `div` click thẳng,
 * không có input native nào để label forward tới, nên không có đường nào double-fire.
 */
export function ModeMultiSelectField(props: ModeMultiSelectFieldProps) {
    const { value, onChange } = createControl<string[]>('array', {});
    const selected = () => value() ?? [];
    const isChecked = (val: string) => selected().includes(val);
    const toggle = (val: string) => {
        const current = selected();
        const next = current.includes(val)
            ? current.filter((v) => v !== val)
            : [...current, val];
        onChange(next);
    };

    return (
        <div class="flex flex-wrap gap-3">
            <For each={props.options}>
                {(option) => (
                    <div
                        role="checkbox"
                        aria-checked={isChecked(option.value)}
                        tabIndex={0}
                        class="flex items-center gap-2 text-sm py-1 cursor-pointer select-none text-neutral-700 hover:text-neutral-900"
                        onClick={() => toggle(option.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggle(option.value);
                            }
                        }}
                    >
                        <span
                            class={`flex-center w-4 h-4 text-base ${isChecked(option.value) ? 'text-main' : 'text-neutral-300'
                                }`}
                        >
                            {isChecked(option.value)
                                ? baseConfig().iconCheckboxChecked()
                                : baseConfig().iconCheckboxUnchecked()}
                        </span>
                        {option.label}
                    </div>
                )}
            </For>
        </div>
    );
}
