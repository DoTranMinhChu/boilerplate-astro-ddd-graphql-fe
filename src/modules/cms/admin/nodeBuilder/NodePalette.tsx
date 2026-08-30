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
import { ENodeType, MIGRATION_ONLY_NODE_TYPES } from '@/modules/cms/node/node.constants';
import { SECTION_CATEGORIES, SECTION_CATEGORY_LABEL_KEYS, type SectionCategory } from '@/modules/cms/node/section.constants';
import { NODE_TYPE_META } from '@/modules/cms/node/nodeRegistry';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { ComponentService, ComponentDefinitionDTO } from '@/shared/services/component/component.service';

export interface NodePaletteProps {
    onAdd: (type: string) => void;
    onAddComponent: (componentId: string) => void;
}

type PaletteTab = 'primitives' | 'components' | 'sections';

/** Click-to-add grid of primitive node types — no drag-and-drop (Phase 2, same
 * deferral as NodeTreeList.tsx). Consumed by Task 27's node builder panel.
 *
 * Phase 0 M2c fix (final whole-branch review, M2b): excludes `MIGRATION_ONLY_NODE_TYPES`
 * (the 14 M2b self-contained primitives) — none of them have an Inspector tab to configure
 * after creation, so offering them here let an admin create an unfixable empty block. They
 * still render normally wherever migration already placed them in a page's tree.
 *
 * "Retire specialized node types" roadmap (completed 2026-08-24): the 13 bespoke types that
 * roadmap targeted (formerly excluded here via `RETIRED_NODE_TYPES`) have since been deleted
 * outright — 0 real rows referenced any of them — so `ENodeType`/`nodeTypeRegistry` no longer
 * contain them at all; nothing left to filter here for that roadmap. */
export function NodePalette(props: NodePaletteProps) {
    const types = Object.values(ENodeType).filter((type) => !MIGRATION_ONLY_NODE_TYPES.has(type));
    const [tab, setTab] = createSignal<PaletteTab>('primitives');

    // One fetch shared by BOTH data-driven tabs (Components and Sections) — they partition the
    // same `getAllComponent` result set by `category` (null vs. set), so refetching per tab
    // would be a pointless second round-trip. Limit raised from 100 to 200 (the server's real
    // ceiling — MAX_PAGINATION_LIMIT in common.types.ts silently clamps anything higher, so
    // asking for more than 200 here would be a no-op, not a bigger page): the curated library
    // alone is 23 rows and an admin's own saved components stack on top of it. If the combined
    // total ever exceeds 200, the oldest admin-saved Components (default `createdAt DESC` order)
    // silently drop off the Components tab with no error/count — real pagination would be needed
    // past that point (Phase 6 review, disclosed backlog, not reachable at today's real row count).
    const [allComponents] = createResource(tab, async (currentTab): Promise<ComponentDefinitionDTO[]> => {
        if (currentTab === 'primitives') return [];
        const res = await ComponentService.getAllComponent({ input: { limit: 200 } });
        return ((res?.edges ?? []) as Array<{ node?: ComponentDefinitionDTO | null } | null>)
            .map((e) => e?.node)
            .filter((n): n is ComponentDefinitionDTO => !!n);
    });

    /** Admin-authored ("Save as Component") rows only — `category` unset. */
    const components = () => (allComponents() ?? []).filter((c) => !c.category);
    /** Curated, dev-authored Section rows only — `category` set. */
    const sections = () => (allComponents() ?? []).filter((c) => !!c.category);
    /** Only the categories that actually have at least one seeded variant get a group heading,
     * iterated in SECTION_CATEGORIES order so the grouping is stable and spec-ordered rather
     * than dependent on row insertion order. */
    const sectionGroups = () => SECTION_CATEGORIES
        .map((category) => ({ category, items: sections().filter((s) => s.category === category) }))
        .filter((group) => group.items.length > 0);

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
                <button
                    type="button"
                    data-testid="palette-tab-sections"
                    class={`flex-1 py-2 text-xs font-medium border-b-2 ${tab() === 'sections' ? 'border-primary-500 text-primary-700' : 'border-transparent text-neutral-500'}`}
                    onClick={() => setTab('sections')}
                >
                    {tOrLiteral('cms.nodeBuilder.paletteTabSections')}
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
                        when={!allComponents.loading}
                        fallback={<p class="col-span-2 text-center text-xs text-neutral-500">{t('common.loading')}</p>}
                    >
                        <For
                            each={components()}
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
            <Show when={tab() === 'sections'}>
                <div class="flex flex-col gap-4 p-4" data-testid="palette-sections-grid">
                    <Show
                        when={!allComponents.loading}
                        fallback={<p class="text-center text-xs text-neutral-500">{t('common.loading')}</p>}
                    >
                        <For
                            each={sectionGroups()}
                            fallback={<p class="text-center text-xs text-neutral-500">{tOrLiteral('cms.nodeBuilder.paletteNoSections')}</p>}
                        >
                            {(group) => (
                                <div data-testid="palette-section-group">
                                    <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                                        {tOrLiteral(SECTION_CATEGORY_LABEL_KEYS[group.category as SectionCategory])}
                                    </p>
                                    <div class="grid grid-cols-2 gap-2">
                                        <For each={group.items}>
                                            {(section) => (
                                                <button
                                                    type="button"
                                                    class="flex flex-col items-center gap-1 p-3 border border-neutral-200 rounded-lg hover:border-primary-400 hover:bg-primary-50"
                                                    onClick={() => section.id && props.onAddComponent(section.id)}
                                                >
                                                    <Icon name={section.icon ?? 'heroicons-solid:squares-2x2'} class="w-6 h-6" />
                                                    <span class="text-xs truncate w-full text-center">{section.label}</span>
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            )}
                        </For>
                    </Show>
                </div>
            </Show>
        </div>
    );
}
