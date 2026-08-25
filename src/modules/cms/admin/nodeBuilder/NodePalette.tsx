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
//
// Task 15 — 2-tab redesign ("Primitives" / "Components"), so an admin can insert a placed
// Component instance (Task 11's ComponentService) alongside the 9 hand-authorable
// primitives. The original flat-grid markup above is kept byte-for-byte, just wrapped in
// the new `<Show when={tab() === 'primitives'}>` with a `data-testid="palette-primitives-
// grid"` added around it (existing tests scope their button queries to that container now
// that the rendered page also has 2 tab-switcher buttons). The 2 new tab-label strings and
// the Components-tab empty state go through `tOrLiteral` (NOT `t()`) — the
// `cms.nodeBuilder.palette*` keys this task introduces aren't in the dictionary yet, same
// as `cms.component.*` in NodeBuilderToolbar.tsx's "Save as Component" button (Task 14).
import { createResource, createSignal, For, Show } from 'solid-js';
import { Icon } from '@/shared/components/icons/Icon';
import { ENodeType, MIGRATION_ONLY_NODE_TYPES, RETIRED_NODE_TYPES } from '@/modules/cms/node/node.constants';
import { NODE_TYPE_META } from '@/modules/cms/node/nodeRegistry';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { ComponentService, ComponentDefinitionDTO } from '@/shared/services/component/component.service';

export interface NodePaletteProps {
    onAdd: (type: string) => void;
    onAddComponent: (componentId: string) => void;
}

type PaletteTab = 'primitives' | 'components';

/** Click-to-add grid of primitive node types — no drag-and-drop (Phase 2, same
 * deferral as NodeTreeList.tsx). Consumed by Task 27's node builder panel.
 *
 * Phase 0 M2c fix (final whole-branch review, M2b): excludes `MIGRATION_ONLY_NODE_TYPES`
 * (the 14 M2b self-contained primitives) — none of them have an Inspector tab to configure
 * after creation, so offering them here let an admin create an unfixable empty block. They
 * still render normally wherever migration already placed them in a page's tree.
 *
 * "Retire specialized node types" roadmap (completed 2026-08-24, see RETIRED_NODE_TYPES's own
 * doc comment): also excludes the 13 bespoke types that now have an equivalent primitive
 * composition — every one of them still has a full working Inspector (unlike
 * MIGRATION_ONLY_NODE_TYPES above), this is purely "stop offering the old shortcut for NEW
 * content," not "this type is broken to edit." */
export function NodePalette(props: NodePaletteProps) {
    const types = Object.values(ENodeType).filter((type) => !MIGRATION_ONLY_NODE_TYPES.has(type) && !RETIRED_NODE_TYPES.has(type));
    const [tab, setTab] = createSignal<PaletteTab>('primitives');

    // Keyed off `tab` itself (not just re-fetched when it flips to 'components') so the
    // fetcher only actually calls the service once the admin has switched tabs at least
    // once, matching the brief's guard — the resource still "runs" on initial mount (Solid
    // always invokes a `createResource` fetcher for its initial source value) but resolves
    // to `[]` without a network call while `tab()` is still 'primitives'.
    const [components] = createResource(tab, async (currentTab): Promise<ComponentDefinitionDTO[]> => {
        if (currentTab !== 'components') return [];
        const res = await ComponentService.getAllComponent({ input: { limit: 100 } });
        return (res?.edges ?? []).map((e) => e?.node).filter((n): n is ComponentDefinitionDTO => !!n);
    });

    return (
        <div class="flex flex-col">
            <div class="flex border-b border-neutral-200">
                <button
                    type="button"
                    data-testid="palette-tab-primitives"
                    class={`flex-1 py-2 text-xs font-medium border-b-2 ${tab() === 'primitives' ? 'border-primary-500 text-primary-700' : 'border-transparent text-neutral-500'}`}
                    onClick={() => setTab('primitives')}
                >
                    {tOrLiteral('cms.nodeBuilder.paletteTabPrimitives')}
                </button>
                <button
                    type="button"
                    data-testid="palette-tab-components"
                    class={`flex-1 py-2 text-xs font-medium border-b-2 ${tab() === 'components' ? 'border-primary-500 text-primary-700' : 'border-transparent text-neutral-500'}`}
                    onClick={() => setTab('components')}
                >
                    {tOrLiteral('cms.nodeBuilder.paletteTabComponents')}
                </button>
            </div>
            <Show when={tab() === 'primitives'}>
                <div class="grid grid-cols-2 gap-2 p-4" data-testid="palette-primitives-grid">
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
            </Show>
            <Show when={tab() === 'components'}>
                <div class="grid grid-cols-2 gap-2 p-4" data-testid="palette-components-grid">
                    <Show
                        when={!components.loading}
                        fallback={<p class="col-span-2 text-center text-xs text-neutral-500">{t('common.loading')}</p>}
                    >
                        <For
                            each={components() ?? []}
                            fallback={<p class="col-span-2 text-center text-xs text-neutral-500">{tOrLiteral('cms.nodeBuilder.paletteNoComponents')}</p>}
                        >
                            {(component) => (
                                <button
                                    type="button"
                                    class="flex flex-col items-center gap-1 p-3 border border-neutral-200 rounded-lg hover:border-primary-400 hover:bg-primary-50"
                                    onClick={() => component.id && props.onAddComponent(component.id)}
                                >
                                    <Icon name={component.icon ?? 'heroicons-solid:cube'} class="w-6 h-6" />
                                    <span class="text-xs truncate w-full text-center">{component.label}</span>
                                </button>
                            )}
                        </For>
                    </Show>
                </div>
            </Show>
        </div>
    );
}
