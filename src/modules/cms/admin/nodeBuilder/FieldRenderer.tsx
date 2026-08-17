// src/modules/cms/admin/nodeBuilder/FieldRenderer.tsx
//
// Phase 2 (Widget Registry v2) — generic control dispatcher for a single
// FieldDescriptor, replacing NodeContentTab.tsx's old per-type <Show> chain. One
// switch on `field.control`, each branch mounting the exact same control component
// (same props/signatures) the old hand-written branches used directly.
import { Switch, Match } from 'solid-js';
import { Input } from '@core/components/control/Input';
import { Textarea } from '@core/components/control/Textarea';
import { Editor } from '@core/components/control/Editor';
import { InputImage } from '@core/components/control/InputImage';
import { InputColor } from '@core/components/control/InputColor';
import { InputNumber } from '@core/components/control/InputNumber';
import { Select } from '@core/components/control/Select';
import { Checkbox } from '@core/components/control/Checkbox';
import type { FieldDescriptor } from '@/modules/cms/node/node.fieldSchema.types';
import { tOrLiteral } from '@/shared/i18n/t';

export interface FieldRendererProps {
    field: FieldDescriptor;
    value: unknown;
    onChange: (value: unknown) => void;
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-neutral-500';
/** Task 3 will read this for the 'code' control's monospace textarea. */
export const CODE_TEXTAREA_CLASS = 'font-mono text-xs';

export function FieldRenderer(props: FieldRendererProps) {
    const label = () => tOrLiteral(props.field.labelKey);

    return (
        <div>
            <label class={LABEL_CLASS}>{label()}</label>
            <Switch>
                <Match when={props.field.control === 'text'}>
                    <Input value={(props.value as string) ?? ''} onChange={(v) => props.onChange(v)} fieldless />
                </Match>
                <Match when={props.field.control === 'textarea'}>
                    <Textarea rows={4} value={(props.value as string) ?? ''} onChange={(v) => props.onChange(v)} fieldless />
                </Match>
                <Match when={props.field.control === 'richtext'}>
                    <Editor value={(props.value as string) ?? ''} onChange={(v) => props.onChange(v)} fieldless />
                </Match>
                <Match when={props.field.control === 'image'}>
                    <InputImage value={(props.value as string) ?? ''} onChange={(v) => props.onChange(v)} fieldless />
                </Match>
                <Match when={props.field.control === 'color'}>
                    <InputColor value={(props.value as string) ?? ''} onChange={(v) => props.onChange(v)} fieldless />
                </Match>
                <Match when={props.field.control === 'number'}>
                    <InputNumber value={(props.value as number) ?? null} onChange={(v) => props.onChange(v)} fieldless />
                </Match>
                <Match when={props.field.control === 'boolean'}>
                    <Checkbox value={(props.value as boolean) ?? false} onChange={(v) => props.onChange(v)} fieldless />
                </Match>
                <Match when={props.field.control === 'select'}>
                    <Select
                        value={(props.value as string) ?? props.field.defaultValue ?? ''}
                        onChange={(v) => props.onChange(v)}
                        options={(props.field.options ?? []).map((o) => ({ value: o.value, label: tOrLiteral(o.labelKey) }))}
                        fieldless
                    />
                </Match>
                <Match when={props.field.control === 'code'}>
                    <Textarea
                        rows={8}
                        value={(props.value as string) ?? ''}
                        onChange={(v) => props.onChange(v)}
                        class={CODE_TEXTAREA_CLASS}
                        placeholder={props.field.codeLanguage ? `/* ${props.field.codeLanguage} */` : undefined}
                        fieldless
                    />
                </Match>
            </Switch>
        </div>
    );
}
