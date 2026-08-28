// src/modules/cms/node/primitives/FormEmbedNode.tsx
// Phase 0 M1 Task 9: viết lại độc lập, KHÔNG mượn FormSection.tsx nữa (chuẩn bị cho M3 xoá
// hẳn sections/**). Logic load/visibility/submit port 1:1 từ FormSection.tsx — chỉ đổi
// nguồn field từ `section.dataSource?.formId` sang `node.props?.formId`, và BỎ lớp bọc
// <section>/sectionCssVars/resolveTheme/animate (NodeRenderer's applyChildLayout/applyNodeStyle
// đã tự bọc style/layout cho node này, bọc thêm 1 lớp nữa sẽ double-wrap).
import { createResource, createSignal, For, Show, untrack } from 'solid-js';
import { FormService } from '@/shared/services/form/form.service';
import { renderControlledFieldControl } from '@/shared/components/fields/contentEntryFieldRenderer';
import { Button } from '@core/components/button/Button';
import { toast } from '@core/components/toast/ToastProvider';
import { t } from '@/shared/i18n/t';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import type { NodeComponentProps } from '../nodeRegistry';

interface FormFieldVisibilityRule {
    field?: string;
    operator?: string;
    value?: unknown;
}

export function FormEmbedNode(props: NodeComponentProps) {
    const formId = () => props.node.props?.formId as string | undefined;
    const [form] = createResource(formId, (id) => FormService.getOneForm({ id }));
    const [values, setValues] = createSignal<Record<string, any>>({});
    const [submitting, setSubmitting] = createSignal(false);
    const [submitted, setSubmitted] = createSignal(false);

    const visibilityRulesMap = () =>
        form()?.visibilityRules as unknown as Record<string, FormFieldVisibilityRule[]> | undefined;

    const isFieldVisible = (fieldKey: string): boolean => {
        const rules = visibilityRulesMap()?.[fieldKey];
        if (!rules?.length) return true;
        return rules.every((r) => {
            if (!r.field) return true;
            const actual = values()[r.field];
            switch (r.operator) {
                case '$eq': return actual === r.value;
                case '$ne': return actual !== r.value;
                case '$gt': return actual > (r.value as any);
                case '$gte': return actual >= (r.value as any);
                case '$lt': return actual < (r.value as any);
                case '$lte': return actual <= (r.value as any);
                case '$in': return Array.isArray(r.value) && r.value.includes(actual);
                default: return true;
            }
        });
    };

    const visibleFields = () =>
        (form()?.fields || []).filter((f): f is FieldDefinitionDTO => !!f?.key && isFieldVisible(f.key));

    /** Ghi 1 giá trị field vào `values`, BỎ QUA khi giá trị không thực sự đổi.
     *
     * Vì sao cần: `setValues(prev => ({...prev}))` LUÔN tạo object mới, kể cả khi giá trị y
     * hệt cũ — mà một số control tự phát `onChange` đúng 1 lần lúc mount với chính giá trị
     * rỗng hiện tại (rõ nhất là `InputDate`: effect "Reset khi picker đóng mà không có giá
     * trị hợp lệ" chạy ngay sau `onMount` và gọi `emitDate(null)` cho 1 ô ngày để trống).
     * Không có guard này, mỗi lần control mount lại là một lần `values` đổi identity vô ích.
     * Đây là lớp phòng thủ THỨ HAI — lớp thứ nhất là `untrack` ở chỗ render control bên dưới;
     * cả hai đều một mình đủ để cắt vòng lặp, giữ cả hai để hỏng 1 lớp không thành lỗi treo. */
    const setFieldValue = (key: string, v: any) => {
        // `untrack`: onChange có thể được gọi TỪ TRONG một effect của control (InputDate ở
        // trên là ví dụ thật), nên phép đọc `values()` ở đây phải không được track, nếu không
        // effect đó sẽ tự đăng ký thêm dependency vào `values`.
        if (untrack(values)[key] === v) return;
        setValues((prev) => ({ ...prev, [key]: v }));
    };

    const handleSubmit = async () => {
        const id = formId();
        if (!id || submitting()) return;
        setSubmitting(true);
        try {
            const visibleKeys = new Set(visibleFields().map((f) => f.key));
            const visibleData = Object.fromEntries(Object.entries(values()).filter(([key]) => visibleKeys.has(key)));
            await FormService.createPublicFormSubmission({ formId: id, data: visibleData });
            setSubmitted(true);
        } catch (err) {
            toast().danger(err instanceof Error ? err.message : t('cms.forms.public.submitError'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Show when={form()}>
            <Show when={!submitted()} fallback={<p class="text-center text-lg">{form()!.successMessage}</p>}>
                <div class="flex flex-col gap-4">
                    <For each={visibleFields()}>
                        {(field) => {
                            /* `renderControlledFieldControl` nhận value là 1 GIÁ TRỊ THƯỜNG (không
                             * phải accessor), nên nó chỉ đọc được giá trị tại đúng thời điểm được
                             * GỌI. Viết thẳng `{renderControlledFieldControl(field, values()[...],
                             * ...)}` trong JSX khiến compiler bọc cả lời gọi vào 1 render-effect có
                             * TRACK `values` — mỗi lần bất kỳ field nào đổi giá trị là TOÀN BỘ
                             * control của mọi field bị huỷ và dựng lại.
                             *
                             * Hậu quả thật (bug này): control vừa mount có thể tự phát onChange 1
                             * lần (InputDate cho ô ngày trống gọi `emitDate(null)`) → `values` đổi
                             * identity → render-effect chạy lại → dựng control MỚI → lại phát
                             * onChange → lặp vô hạn cho tới `RangeError: Maximum call stack size
                             * exceeded` (Solid runUpdates/completeUpdates đệ quy). Trang
                             * /admin/cms/node-builder sập ngay khi mở vì mọi node mount tức thì;
                             * trang public chỉ hydrate island khi `client:visible` nên bug bị che.
                             * Ngoài ra, dù không lặp thì việc dựng lại control mỗi lần gõ cũng phá
                             * focus/caret của ô đang nhập.
                             *
                             * Fix: đọc giá trị trong `untrack` để control được tạo ĐÚNG 1 LẦN cho
                             * mỗi field (đúng như `createControl.tsx` đã dùng `untrack` cho cùng
                             * lớp vấn đề). An toàn vì `values` chỉ được ghi bởi chính các control
                             * này — không có nguồn ngoài nào cần đẩy ngược giá trị vào; sau khi
                             * mount, mỗi control tự giữ state hiển thị của nó (signal nội bộ của
                             * `createControl`). Field bị ẩn/hiện lại bởi visibilityRules vẫn được
                             * `<For>` mount lại và đọc đúng giá trị hiện tại tại thời điểm đó. */
                            const control = untrack(() =>
                                renderControlledFieldControl(field, values()[field.key!], (v) => setFieldValue(field.key!, v)),
                            );
                            return (
                                <div>
                                    <label class="block text-sm font-medium mb-1">
                                        {field.label}{field.required ? ' *' : ''}
                                    </label>
                                    {/* `InputWrapper`'s chrome (border/bg-lightest) is unconditional
                                        even in `fieldless` mode, but its inner `<input>` sets no
                                        color of its own (`bg-transparent`, text color left to
                                        inherit) — assumes the admin panel's light theme. Embedded on
                                        a public page inside a Frame styled with light/white
                                        typography (for readability against a dark section
                                        background), that same inheritance makes the typed/placeholder
                                        text invisible against the wrapper's always-light background.
                                        Reset to a fixed dark tone here, scoped to the control only —
                                        the label above still inherits the section's real color, which
                                        is correct there. */}
                                    <div class="text-neutral-900">{control}</div>
                                </div>
                            );
                        }}
                    </For>
                    <Button loading={submitting()} onClick={handleSubmit} label={form()!.submitLabel} />
                </div>
            </Show>
        </Show>
    );
}
