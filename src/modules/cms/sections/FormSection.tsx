// src/modules/cms/sections/FormSection.tsx
//
// Block công khai FORM (Phase 4 mục 1 kế hoạch, Task 5) — render 1 Form THẬT (đã tạo ở trang admin
// Forms, Task 4) theo `dataSource.formId`. Dùng LẠI `renderControlledFieldControl` (Task 4's
// contentEntryFieldRenderer.tsx — hệ field FieldDefinitionDTO/EFieldType, KHÁC hẳn
// BlockFieldDefinition dùng cho content thường của Section, xem Global Constraints của kế hoạch
// Phase 4). Đánh giá `visibilityRules` CLIENT-SIDE (không có ý nghĩa bảo mật/server-enforced, chỉ
// ẩn/hiện UI lúc khách điền — xem comment gốc ở FormVisibilityRulesInput.tsx, Task 4), rồi gọi
// `createPublicFormSubmission` thật (public mutation, Task 3's resolver) khi khách bấm nút gửi.
import { createResource, createSignal, For, Show } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer, spacingClass, sectionCssVars, resolveTheme, themeBackgroundClass, hiddenOnMobileClass } from './sectionHelpers';
import { FormService } from '@/shared/services/form/form.service';
import { renderControlledFieldControl } from '@/shared/components/fields/contentEntryFieldRenderer';
import { Button } from '@core/components/button/Button';
import { toast } from '@core/components/toast/ToastProvider';
import { t } from '@/shared/i18n/t';
import type { ResolvedSection, FieldDefinitionDTO } from '@/modules/cms/cms.types';

const _ = animate;

/** 1 luật hiển thị per-field — cùng shape `ContentVisibilityRuleInput` (field/operator/value) mà
 * admin soạn ở `FormVisibilityRulesInput.tsx` (Task 4). `Form.visibilityRules` là scalar
 * GraphQLMixed nên `FormDTO.visibilityRules` bị codegen suy ra kiểu `string` (xem comment đầu
 * cms.types.ts — hạn chế của tool codegen, không phải data thật) — giá trị THẬT lúc runtime vẫn
 * là object, cast 1 LẦN ở `visibilityRulesMap()` dưới đây thay vì rải cast khắp file. */
interface FormFieldVisibilityRule {
    field?: string;
    operator?: string;
    value?: unknown;
}

export function FormSection(props: { section: ResolvedSection }) {
    const formId = () => props.section.dataSource?.formId;
    const [form] = createResource(formId, (id) => FormService.getOneForm({ id }));
    const [values, setValues] = createSignal<Record<string, any>>({});
    const [submitting, setSubmitting] = createSignal(false);
    const [submitted, setSubmitted] = createSignal(false);

    const visibilityRulesMap = () =>
        form()?.visibilityRules as unknown as Record<string, FormFieldVisibilityRule[]> | undefined;

    // HIỆN field nếu khớp MỌI rule (AND) — đảo ngược ý nghĩa Content Visibility Rules (nơi rule
    // khớp = ẨN khỏi khách xem công khai). Rule rỗng/không có = LUÔN hiện.
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

    const handleSubmit = async () => {
        const id = formId();
        if (!id || submitting()) return;
        setSubmitting(true);
        try {
            // Field bị ẩn KHÔNG gửi giá trị của nó lên -- không coi là "chưa điền" khi BE
            // validate required (xem FormSubmissionService.validateAndCreate, Task 2).
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

    const theme = () => resolveTheme(props.section);

    // `form()` undefined (chưa cấu hình formId, hoặc Form đã bị xoá) -- không render gì, giống
    // hành vi các block tự-tìm-dữ-liệu khác (vd ContentDetailSection) khi chưa/không thể resolve.
    return (
        <Show when={form()}>
            <section
                class={`${spacingClass(props.section.responsiveSettings?.spacing)} ${hiddenOnMobileClass(props.section)} px-6 ${themeBackgroundClass(theme())}`}
                style={sectionCssVars(props.section)}
            >
                <div use:animate={getLayer(props.section, 'form')} class="mx-auto max-w-xl w-full">
                    <Show when={!submitted()} fallback={<p class="text-center text-lg">{form()!.successMessage}</p>}>
                        <div class="flex flex-col gap-4">
                            <For each={visibleFields()}>
                                {(field) => (
                                    <div>
                                        <label class="block text-sm font-medium mb-1">
                                            {field.label}{field.required ? ' *' : ''}
                                        </label>
                                        {renderControlledFieldControl(field, values()[field.key!], (v) => setValues((prev) => ({ ...prev, [field.key!]: v })))}
                                    </div>
                                )}
                            </For>
                            <Button loading={submitting()} onClick={handleSubmit} label={form()!.submitLabel} />
                        </div>
                    </Show>
                </div>
            </section>
        </Show>
    );
}
