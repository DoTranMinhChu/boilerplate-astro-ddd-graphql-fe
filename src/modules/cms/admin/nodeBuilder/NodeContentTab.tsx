// src/modules/cms/admin/nodeBuilder/NodeContentTab.tsx
//
// Phase 2 (Widget Registry v2) — generic Content tab, driven by the current node
// type's `nodeTypeRegistry[type].fieldSchema` (Task 1) instead of a hand-written
// <Show> branch per type. FieldRenderer (this task) renders each field; this
// component's only remaining job is the fieldSchema loop + the props merge-and-set
// convention every Inspector tab already uses (`onChange` receives the FULL new
// props object, matching patchSelected's `n.props = p` call site).
import { For, Show } from 'solid-js';
import { nodeTypeRegistry } from '@/modules/cms/node/nodeRegistry';
import { ENodeType } from '@/modules/cms/node/node.constants';
import type { NodeTree } from '@/modules/cms/node/node.types';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { FieldRenderer } from './FieldRenderer';
import { ContentDetailLayoutTab } from './ContentDetailLayoutTab';
import type { DetailFieldLayoutEntry } from '@/modules/cms/node/primitives/ContentDetailNode';
import { t } from '@/shared/i18n/t';

export interface NodeContentTabProps {
    node: NodeTree;
    onChange: (props: Record<string, any>) => void;
    /** Canvas Editor v2, Task 12 — only ContentDetail's Inspector wiring supplies this
     * (NodeBuilder.page.tsx already computes `availableFields` for NodeDataBindingTab; the
     * same value is passed through here too, feeding ContentDetailLayoutTab's field picker). */
    availableFields?: FieldDefinitionDTO[];
}

/** Reads `path` (dot-separated, e.g. "content.heading") off `obj` — returns undefined if any
 * intermediate segment is missing, never throws. Canvas Editor v2, Task 1. */
export function getAtPath(obj: Record<string, any> | undefined, path: string): unknown {
    return path.split('.').reduce<any>((acc, segment) => (acc === undefined || acc === null ? undefined : acc[segment]), obj);
}

/** Immutably writes `value` at `path` (dot-separated) on `obj`, creating intermediate plain
 * objects as needed, preserving every sibling key at every level. Canvas Editor v2, Task 1. */
export function setAtPath(obj: Record<string, any> | undefined, path: string, value: unknown): Record<string, any> {
    const segments = path.split('.');
    const [head, ...rest] = segments;
    const base = obj ?? {};
    if (rest.length === 0) return { ...base, [head]: value };
    return { ...base, [head]: setAtPath(base[head], rest.join('.'), value) };
}

/** Content tab for a tree Node's type-specific props — see FieldRenderer.tsx for the
 * per-control-kind rendering. Consumed by NodeBuilder.page.tsx's Inspector. */
export function NodeContentTab(props: NodeContentTabProps) {
    const schema = () => nodeTypeRegistry[props.node.type ?? '']?.fieldSchema ?? [];
    const set = (key: string, value: any) => props.onChange(setAtPath(props.node.props, key, value));

    return (
        <div class="flex flex-col gap-4 p-4">
            <Show when={props.node.type === ENodeType.CUSTOM_CODE}>
                <p class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                    {t('cms.node.content.customCodeWarning')}
                </p>
            </Show>
            <Show when={props.node.type === ENodeType.CONTENT_DETAIL}>
                <ContentDetailLayoutTab
                    fieldLayout={(getAtPath(props.node.props, 'content.fieldLayout') as DetailFieldLayoutEntry[] | undefined)}
                    availableFields={props.availableFields ?? []}
                    onChange={(next) => set('content.fieldLayout', next)}
                />
            </Show>
            <Show when={props.node.type !== ENodeType.CONTENT_DETAIL}>
                <For each={schema()}>
                    {(field) => (
                        <FieldRenderer
                            field={field}
                            value={getAtPath(props.node.props, field.key) ?? field.defaultValue}
                            onChange={(v) => set(field.key, v)}
                        />
                    )}
                </For>
            </Show>
        </div>
    );
}
