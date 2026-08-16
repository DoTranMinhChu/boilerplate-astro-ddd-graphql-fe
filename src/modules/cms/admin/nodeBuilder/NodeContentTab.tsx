// src/modules/cms/admin/nodeBuilder/NodeContentTab.tsx
//
// Phase 2 (Widget Registry v2) — generic Content tab, driven by the current node
// type's `nodeTypeRegistry[type].fieldSchema` (Task 1) instead of a hand-written
// <Show> branch per type. FieldRenderer (this task) renders each field; this
// component's only remaining job is the fieldSchema loop + the props merge-and-set
// convention every Inspector tab already uses (`onChange` receives the FULL new
// props object, matching patchSelected's `n.props = p` call site).
import { For } from 'solid-js';
import { nodeTypeRegistry } from '@/modules/cms/node/nodeRegistry';
import type { NodeTree } from '@/modules/cms/node/node.types';
import { FieldRenderer } from './FieldRenderer';

export interface NodeContentTabProps {
    node: NodeTree;
    onChange: (props: Record<string, any>) => void;
}

/** Content tab for a tree Node's type-specific props — see FieldRenderer.tsx for the
 * per-control-kind rendering. Consumed by NodeBuilder.page.tsx's Inspector. */
export function NodeContentTab(props: NodeContentTabProps) {
    const schema = () => nodeTypeRegistry[props.node.type ?? '']?.fieldSchema ?? [];
    const set = (key: string, value: any) => props.onChange({ ...props.node.props, [key]: value });

    return (
        <div class="flex flex-col gap-4 p-4">
            <For each={schema()}>
                {(field) => (
                    <FieldRenderer
                        field={field}
                        value={props.node.props?.[field.key] ?? field.defaultValue}
                        onChange={(v) => set(field.key, v)}
                    />
                )}
            </For>
        </div>
    );
}
