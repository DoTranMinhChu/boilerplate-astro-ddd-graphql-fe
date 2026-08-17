// src/modules/cms/admin/nodeBuilder/RepeaterFieldEditor.tsx
//
// Generic 'repeater' FieldControl — list-of-sub-objects OR list-of-strings editor, add/remove/
// reorder rows. Canvas Editor v2, Task 2. Each object row recurses into FieldRenderer for its
// own itemFields (one level only, no nested repeaters — same constraint ContentType's REPEATER
// EFieldType already enforces via assertUniqueFieldKeys).
import { For, Show } from 'solid-js';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { Input } from '@core/components/control/Input';
import { FieldRenderer } from './FieldRenderer';
import type { FieldDescriptor } from '@/modules/cms/node/node.fieldSchema.types';
import { t, tOrLiteral } from '@/shared/i18n/t';

export interface RepeaterFieldEditorProps {
    field: FieldDescriptor;
    value: unknown;
    onChange: (value: unknown) => void;
}

function emptyObjectRow(itemFields: FieldDescriptor[]): Record<string, unknown> {
    return Object.fromEntries(itemFields.map((f) => [f.key, f.defaultValue]));
}

export function RepeaterFieldEditor(props: RepeaterFieldEditorProps) {
    const isObjectShape = () => (props.field.repeaterItemShape ?? 'object') === 'object';
    const rows = () => (Array.isArray(props.value) ? props.value : []) as unknown[];

    const add = () => {
        const next = [...rows(), isObjectShape() ? emptyObjectRow(props.field.itemFields ?? []) : ''];
        props.onChange(next);
    };
    const remove = (index: number) => props.onChange(rows().filter((_, i) => i !== index));
    const move = (index: number, dir: -1 | 1) => {
        const target = index + dir;
        const list = rows();
        if (target < 0 || target >= list.length) return;
        const next = [...list];
        [next[index], next[target]] = [next[target], next[index]];
        props.onChange(next);
    };
    const updateObjectField = (index: number, subKey: string, subValue: unknown) => {
        const next = [...rows()];
        next[index] = { ...(next[index] as Record<string, unknown>), [subKey]: subValue };
        props.onChange(next);
    };
    const updateStringRow = (index: number, value: string) => {
        const next = [...rows()];
        next[index] = value;
        props.onChange(next);
    };

    return (
        <div class="flex flex-col gap-2">
            <For each={rows()}>
                {(row, i) => (
                    <div class="flex items-start gap-2 rounded-lg border border-neutral-200 p-2">
                        <div class="flex-1">
                            <Show
                                when={isObjectShape()}
                                fallback={<Input value={row as string} onChange={(v: string) => updateStringRow(i(), v)} fieldless />}
                            >
                                <div class="flex flex-col gap-2">
                                    <For each={props.field.itemFields ?? []}>
                                        {(sub) => (
                                            <FieldRenderer
                                                field={sub}
                                                value={(row as Record<string, unknown>)[sub.key]}
                                                onChange={(v) => updateObjectField(i(), sub.key, v)}
                                            />
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>
                        <div class="flex flex-col gap-1">
                            <Button sm outline aria-label="move-down" onClick={() => move(i(), 1)} icon={<Icon name="heroicons-outline:chevron-down" />} />
                            <Button sm outline aria-label="move-up" onClick={() => move(i(), -1)} icon={<Icon name="heroicons-outline:chevron-up" />} />
                            <Button sm outline interactDanger aria-label="remove-row" onClick={() => remove(i())} icon={<Icon name="heroicons-outline:trash" />} />
                        </div>
                    </div>
                )}
            </For>
            <Button sm outline onClick={add}>
                {props.field.addButtonLabelKey ? tOrLiteral(props.field.addButtonLabelKey) : t('cms.node.content.repeaterAddButton')}
            </Button>
        </div>
    );
}
