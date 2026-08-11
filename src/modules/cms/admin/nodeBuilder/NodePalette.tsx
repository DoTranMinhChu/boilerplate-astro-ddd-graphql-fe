// src/modules/cms/admin/nodeBuilder/NodePalette.tsx
//
// Grid of clickable primitive-type buttons — the "click-to-add" counterpart to
// NodeTreeList.tsx, same idea as BlockPalette.tsx's section-type grid but for Node
// primitives (Task 18's ENodeType/NODE_TYPE_META). Consumed by Task 27.
//
// Adaptation from the brief's guessed code: labels go through `tOrLiteral(meta.labelKey)`
// rather than `t(meta.labelKey)` — `NODE_TYPE_META`'s `labelKey` field is typed as plain
// `string` (not the literal-keyed `TranslationKey` union `t()` requires), so `t()` would
// fail to compile on a dynamic value; `tOrLiteral` is exactly this codebase's existing
// answer to that (see BlockPalette.tsx's identical `tOrLiteral(meta.labelKey)` for
// SECTION_TYPE_META). `Icon`'s `class` prop works as guessed (BaseIcon merges it in).
import { For } from 'solid-js';
import { Icon } from '@/shared/components/icons/Icon';
import { ENodeType } from '@/modules/cms/node/node.constants';
import { NODE_TYPE_META } from '@/modules/cms/node/nodeRegistry';
import { tOrLiteral } from '@/shared/i18n/t';

export interface NodePaletteProps {
    onAdd: (type: string) => void;
}

/** Click-to-add grid of primitive node types — no drag-and-drop (Phase 2, same
 * deferral as NodeTreeList.tsx). Consumed by Task 27's node builder panel. */
export function NodePalette(props: NodePaletteProps) {
    const types = Object.values(ENodeType);
    return (
        <div class="grid grid-cols-2 gap-2 p-4">
            <For each={types}>
                {(type) => {
                    const meta = NODE_TYPE_META[type];
                    return (
                        <button
                            type="button"
                            class="flex flex-col items-center gap-1 p-3 border border-neutral-200 rounded-lg hover:border-primary-400 hover:bg-primary-50"
                            onClick={() => props.onAdd(type)}
                        >
                            <Icon name={meta.icon} class="w-6 h-6" />
                            <span class="text-xs">{tOrLiteral(meta.labelKey)}</span>
                        </button>
                    );
                }}
            </For>
        </div>
    );
}
