// src/modules/cms/admin/nodeBuilder/RepeaterFieldEditor.tsx
//
// Generic 'repeater' FieldControl — list-of-sub-objects OR list-of-strings editor, add/remove/
// reorder rows. Canvas Editor v2, Task 2. Each object row recurses into FieldRenderer for its
// own itemFields (one level only, no nested repeaters — same constraint ContentType's REPEATER
// EFieldType already enforces via assertUniqueFieldKeys).
//
// Node Builder Inspector Polish, Task 3 — reorder is now drag-and-drop instead of Move-up/
// Move-down buttons. Renders via <Index> (POSITION-keyed), not <For>, and NOT the shared
// <DragList> wrapper (which is <For>-based) — see this task's own plan notes for why: rows are
// replaced by a brand-new object reference on every keystroke, and reference-keyed reconciliation
// would remount the row's DOM (and drop focus) on every keystroke. @thisbeyond/solid-dnd's
// primitives are wired directly here, keyed by POSITION, which stays stable for the duration of
// any single drag gesture (the array only reorders on drop, never mid-gesture).
import { For, Index, Show } from 'solid-js';
import {
    DragDropProvider,
    DragDropSensors,
    SortableProvider,
    createSortable,
    closestCenter,
    type DragEvent,
} from '@thisbeyond/solid-dnd';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { Input } from '@core/components/control/Input';
import { DragHandle } from '@/modules/cms/admin/DragList';
import { FieldRenderer } from './FieldRenderer';
import type { FieldDescriptor } from '@/modules/cms/node/node.fieldSchema.types';
import { t, tOrLiteral } from '@/shared/i18n/t';

// Same rationale as DragList.tsx — solid-dnd ships no JSX.Directives entry for bare `use:sortable`.
declare module 'solid-js' {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface Directives {
            sortable: boolean;
        }
    }
}

export interface RepeaterFieldEditorProps {
    field: FieldDescriptor;
    value: unknown;
    onChange: (value: unknown) => void;
}

function emptyObjectRow(itemFields: FieldDescriptor[]): Record<string, unknown> {
    return Object.fromEntries(itemFields.map((f) => [f.key, f.defaultValue]));
}

/** Pure splice-based reorder, position-to-position — exported for direct unit testing
 * (the actual drag gesture isn't reliably simulable in jsdom). */
export function reorderRows<T>(rows: T[], from: number, to: number): T[] {
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}

export function RepeaterFieldEditor(props: RepeaterFieldEditorProps) {
    const isObjectShape = () => (props.field.repeaterItemShape ?? 'object') === 'object';
    const rows = () => (Array.isArray(props.value) ? props.value : []) as unknown[];

    const add = () => {
        const next = [...rows(), isObjectShape() ? emptyObjectRow(props.field.itemFields ?? []) : ''];
        props.onChange(next);
    };
    const remove = (index: number) => props.onChange(rows().filter((_, i) => i !== index));
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

    // Position-based ids: always the literal current index sequence [0..n-1]. Stable for the
    // duration of any single drag gesture (rows() only changes on drop, via onDragEnd below).
    const ids = () => rows().map((_, i) => i);

    const onDragEnd = ({ draggable, droppable }: DragEvent) => {
        if (!draggable || !droppable) return;
        const from = draggable.id as number;
        const to = droppable.id as number;
        if (from === to) return;
        props.onChange(reorderRows(rows(), from, to));
    };

    return (
        <div class="flex flex-col gap-2">
            <DragDropProvider onDragEnd={onDragEnd} collisionDetector={closestCenter}>
                <DragDropSensors>
                    <SortableProvider ids={ids()}>
                        <Index each={rows()}>
                            {(row, i) => {
                                const sortable = createSortable(i);
                                return (
                                    <div use:sortable classList={{ 'opacity-40': sortable.isActiveDraggable }} class="flex items-start gap-2 rounded-lg border border-neutral-200 p-2">
                                        <DragHandle {...(sortable.dragActivators as any)} role="button" aria-label="drag-handle" />
                                        <div class="flex-1">
                                            <Show
                                                when={isObjectShape()}
                                                fallback={<Input value={row() as string} onChange={(v: string) => updateStringRow(i, v)} fieldless />}
                                            >
                                                <div class="flex flex-col gap-2">
                                                    <For each={props.field.itemFields ?? []}>
                                                        {(sub) => (
                                                            <FieldRenderer
                                                                field={sub}
                                                                value={(row() as Record<string, unknown>)[sub.key]}
                                                                onChange={(v) => updateObjectField(i, sub.key, v)}
                                                            />
                                                        )}
                                                    </For>
                                                </div>
                                            </Show>
                                        </div>
                                        <Button sm outline interactDanger aria-label="remove-row" onClick={() => remove(i)} icon={<Icon name="heroicons-outline:trash" class="text-red-500" />} />
                                    </div>
                                );
                            }}
                        </Index>
                    </SortableProvider>
                </DragDropSensors>
            </DragDropProvider>
            <Button sm outline onClick={add}>
                {props.field.addButtonLabelKey ? tOrLiteral(props.field.addButtonLabelKey) : t('cms.node.content.repeaterAddButton')}
            </Button>
        </div>
    );
}
