// src/modules/cms/admin/nodeBuilder/NodeTreeList.tsx
//
// Admin tree view for the generic Node tree (Task 13's buildNodeTree output) — a
// recursively-indented list with select/move-up/move-down/add-child/delete controls.
// No drag-and-drop here: the design doc's own phase table defers reordering-by-drag
// (and the separate Layers panel + snapping) to Phase 2, so reordering is up/down
// buttons only, same spirit as the brief. Consumed by Task 27.
//
// Adaptations from the brief's guessed code (mirrors the NodeStyleTab.tsx /
// NodeVisibilityTab.tsx precedent from Tasks 24/25):
// - Row labels show the translated NODE_TYPE_META name (tOrLiteral(meta.labelKey)),
//   not the raw `node.type` string — same "admin never sees a type id, only a
//   plain-language name" rule BlockPalette.tsx already follows for sections.
// - Button titles/empty-state text go through t() (new `cms.node.tree.*` keys added
//   to cms.i18n.ts) instead of the brief's hardcoded Vietnamese strings, to match
//   this codebase's translate-everything convention.
// - `Icon`'s `class` prop DOES work as the brief guessed (BaseIcon merges it with the
//   size-derived class via mergeClass), so `class="w-4 h-4"` is kept as-is.
import { For, Show } from 'solid-js';
import { Icon } from '@/shared/components/icons/Icon';
import { NODE_TYPE_META } from '@/modules/cms/node/nodeRegistry';
import type { NodeTree } from '@/modules/cms/node/node.types';
import { t, tOrLiteral } from '@/shared/i18n/t';

export interface NodeTreeListProps {
    tree: NodeTree[];
    selectedId?: string;
    onSelect: (id: string) => void;
    onMoveUp: (id: string) => void;
    onMoveDown: (id: string) => void;
    onDelete: (id: string) => void;
    onAddChild: (parentId: string) => void;
}

const ROW_BUTTON_CLASS = 'rounded p-0.5 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent';

function Row(props: NodeTreeListProps & { node: NodeTree; depth: number; siblings: NodeTree[] }) {
    // `node.id`/`node.type` are typed `string | undefined` by the typed-graphql codegen
    // (GraphQLMixed nullability — same reason other call sites in this module use
    // `e.node.id!`/`?? ''`, e.g. buildNodeTree.ts, resolveRenderableChildren.ts). A tree
    // node built by buildNodeTree() always has a real id/type, so `!` here is safe.
    const meta = () => NODE_TYPE_META[props.node.type ?? ''];
    const isFirst = () => props.siblings[0]?.id === props.node.id;
    const isLast = () => props.siblings[props.siblings.length - 1]?.id === props.node.id;
    return (
        <>
            <div
                class={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer ${props.selectedId === props.node.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-50'}`}
                style={{ 'padding-left': `${8 + props.depth * 16}px` }}
                onClick={() => props.onSelect(props.node.id!)}
            >
                <Show when={meta()}><Icon name={meta().icon} class="w-4 h-4 shrink-0" /></Show>
                <span class="flex-1 text-sm truncate">{meta() ? tOrLiteral(meta().labelKey) : props.node.type}</span>
                <button
                    type="button"
                    class={ROW_BUTTON_CLASS}
                    disabled={isFirst()}
                    onClick={(e) => { e.stopPropagation(); props.onMoveUp(props.node.id!); }}
                    title={t('cms.node.tree.moveUpButton')}
                >
                    <Icon name="heroicons-solid:chevron-up" class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    class={ROW_BUTTON_CLASS}
                    disabled={isLast()}
                    onClick={(e) => { e.stopPropagation(); props.onMoveDown(props.node.id!); }}
                    title={t('cms.node.tree.moveDownButton')}
                >
                    <Icon name="heroicons-solid:chevron-down" class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    class={ROW_BUTTON_CLASS}
                    onClick={(e) => { e.stopPropagation(); props.onAddChild(props.node.id!); }}
                    title={t('cms.node.tree.addChildButton')}
                >
                    <Icon name="heroicons-solid:plus" class="w-4 h-4" />
                </button>
                <button
                    type="button"
                    class={ROW_BUTTON_CLASS}
                    onClick={(e) => { e.stopPropagation(); props.onDelete(props.node.id!); }}
                    title={t('cms.node.tree.deleteButton')}
                >
                    <Icon name="heroicons-solid:trash" class="w-4 h-4 text-red-500" />
                </button>
            </div>
            <For each={props.node.children}>
                {(child) => <Row {...props} node={child} depth={props.depth + 1} siblings={props.node.children} />}
            </For>
        </>
    );
}

/** Recursive select/reorder/delete/add-child list for a page's Node tree — no
 * drag-and-drop (Phase 2, alongside the Layers panel/snapping per the design doc's
 * phase table). Consumed by Task 27's node builder panel. */
export function NodeTreeList(props: NodeTreeListProps) {
    return (
        <div class="flex flex-col">
            <Show when={props.tree.length > 0} fallback={<p class="p-3 text-xs text-neutral-500">{t('cms.node.tree.emptyLabel')}</p>}>
                <For each={props.tree}>
                    {(root) => <Row {...props} node={root} depth={0} siblings={props.tree} />}
                </For>
            </Show>
        </div>
    );
}
