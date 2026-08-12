// src/modules/cms/node/primitives/FormEmbedNode.tsx
// Phase 0 M1 Task 9: viết lại độc lập, KHÔNG mượn FormSection.tsx nữa (chuẩn bị cho M3 xoá
// hẳn sections/**). Logic load/visibility/submit port 1:1 từ FormSection.tsx — chỉ đổi
// nguồn field từ `section.dataSource?.formId` sang `node.props?.formId`, và BỎ lớp bọc
// <section>/sectionCssVars/resolveTheme/animate (NodeRenderer's applyChildLayout/applyNodeStyle
// đã tự bọc style/layout cho node này, bọc thêm 1 lớp nữa sẽ double-wrap).
import { createResource, createSignal, For, Show } from 'solid-js';
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
        </Show>
    );
}
