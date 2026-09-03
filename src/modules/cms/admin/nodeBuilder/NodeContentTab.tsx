// src/modules/cms/admin/nodeBuilder/NodeContentTab.tsx
//
// Phase 2 (Widget Registry v2) — generic Content tab, driven by the current node
// type's `nodeTypeRegistry[type].fieldSchema` (Task 1) instead of a hand-written
// <Show> branch per type. FieldRenderer (this task) renders each field; this
// component's only remaining job is the fieldSchema loop + the props merge-and-set
// convention every Inspector tab already uses (`onChange` receives the FULL new
// props object, matching patchSelected's `n.props = p` call site).
import { For, Show, createSignal } from 'solid-js';
import { nodeTypeRegistry } from '@/modules/cms/node/nodeRegistry';
import { ENodeType } from '@/modules/cms/node/node.constants';
import type { NodeTree, PropDescriptor } from '@/modules/cms/node/node.types';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { FieldRenderer } from './FieldRenderer';
import { ContentDetailLayoutTab } from './ContentDetailLayoutTab';
import type { DetailFieldLayoutEntry } from '@/modules/cms/node/primitives/ContentDetailNode';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { toast } from '@core/components/toast/ToastProvider';

export interface NodeContentTabProps {
    node: NodeTree;
    onChange: (props: Record<string, any>) => void;
    /** Canvas Editor v2, Task 12 — only ContentDetail's Inspector wiring supplies this
     * (NodeBuilder.page.tsx already computes `availableFields` for NodeDataBindingTab; the
     * same value is passed through here too, feeding ContentDetailLayoutTab's field picker). */
    availableFields?: FieldDefinitionDTO[];
    /** Component System, Task 13 — only supplied when the page currently open in the Node
     * Builder IS a component's hidden definition page (see NodeBuilder.page.tsx's
     * `componentDefinition()` resource). Lets each field row expose an "Expose as prop"
     * toggle, so a field on this node can be marked as a customizable prop for every
     * placed instance of the component. */
    componentContext?: {
        componentId: string;
        propSchema: PropDescriptor[];
        /** Live bug fix (post-Task 13): caller performs the actual `setComponentPropSchema`
         * mutation + refetch and MUST let a rejected save propagate as a thrown/rejected error
         * (not swallow it) — this component awaits the call, toasts on failure, and reverts its
         * optimistic "exposed" state back to whatever the real `propSchema` says. `propKey` is
         * only passed when `expose` is true (the admin just confirmed/typed it via the prompt
         * below); omitted when toggling a field back off. */
        onTogglePropForField: (fieldKey: string, expose: boolean, propKey?: string) => void | Promise<void>;
    };
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

    // propKey must be prompted/confirmed and validated client-side for uniqueness (server
    // validation is the authoritative backstop only). Pending state is keyed by
    // `${node.id}:${fieldKey}`, not just fieldKey, because the panel isn't remounted per node
    // selection — a bare fieldKey key would leak one node's override display onto every other
    // node sharing that field key.
    const [pendingOverrides, setPendingOverrides] = createSignal<Record<string, boolean>>({});
    const overrideKey = (fieldKey: string) => `${props.node.id}:${fieldKey}`;
    const isRealFieldExposed = (fieldKey: string) => props.componentContext!.propSchema.some(
        (p) => p.targetNodeId === props.node.id && p.targetField === `props.${fieldKey}`,
    );
    const isFieldExposed = (fieldKey: string) => {
        const key = overrideKey(fieldKey);
        const overrides = pendingOverrides();
        return key in overrides ? overrides[key] : isRealFieldExposed(fieldKey);
    };
    /** Suggests `fieldKey` itself, or `fieldKey` + an incrementing numeric suffix if that key is
     * already used elsewhere in this component's propSchema (e.g. a second Text node's "text"
     * field suggests "text2"). Admin can still override the suggestion in the prompt. */
    const suggestPropKey = (fieldKey: string) => {
        const propSchema = props.componentContext!.propSchema;
        if (!propSchema.some((p) => p.propKey === fieldKey)) return fieldKey;
        let i = 2;
        while (propSchema.some((p) => p.propKey === `${fieldKey}${i}`)) i += 1;
        return `${fieldKey}${i}`;
    };
    const handleTogglePropForField = async (fieldKey: string) => {
        const ctx = props.componentContext!;
        const currentlyExposed = isFieldExposed(fieldKey);
        const key = overrideKey(fieldKey);
        let propKey: string | undefined;
        if (!currentlyExposed) {
            const suggested = suggestPropKey(fieldKey);
            const input = window.prompt(tOrLiteral('cms.component.exposePropKeyPrompt'), suggested);
            if (input === null) return; // Admin cancelled — leave the field untouched.
            propKey = input.trim() || suggested;
            if (ctx.propSchema.some((p) => p.propKey === propKey)) {
                // Client-side uniqueness check — never even attempt the mutation with an
                // obviously-colliding key. The backend still re-validates this on save
                // (defense-in-depth backstop), but catching it here means the admin sees the
                // problem immediately instead of a generic save failure.
                toast().danger(tOrLiteral('cms.component.exposePropKeyDuplicate', { propKey }));
                return;
            }
        }
        setPendingOverrides((prev) => ({ ...prev, [key]: !currentlyExposed }));
        try {
            // Only pass `propKey` when exposing (it's `undefined` when toggling off) — keeps the
            // call shape identical to the pre-fix signature for the "turn off" direction.
            if (propKey !== undefined) {
                await ctx.onTogglePropForField(fieldKey, true, propKey);
            } else {
                await ctx.onTogglePropForField(fieldKey, false);
            }
        } catch {
            toast().danger(tOrLiteral('cms.component.exposeAsPropFailed'));
            // Revert to whatever the REAL persisted propSchema says — never leave the toggle
            // showing the optimistic (failed) state.
            setPendingOverrides((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

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
                        <div class="flex items-start gap-2">
                            <div class="flex-1">
                                <FieldRenderer
                                    field={field}
                                    value={getAtPath(props.node.props, field.key) ?? field.defaultValue}
                                    onChange={(v) => set(field.key, v)}
                                />
                            </div>
                            <Show when={props.componentContext}>
                                <button
                                    type="button"
                                    class={`mt-6 rounded-nb-sm border px-1.5 py-0.5 text-[10px] ${
                                        isFieldExposed(field.key)
                                            ? 'border-primary-400 bg-primary-50 text-primary-700'
                                            : 'border-nb-border text-nb-text-muted'
                                    }`}
                                    onClick={() => handleTogglePropForField(field.key)}
                                >
                                    {tOrLiteral('cms.component.exposeAsPropToggle')}
                                </button>
                            </Show>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    );
}
