// src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx
//
// Task 27 — final Phase 1 orchestrator: wires NodeService (12), buildNodeTree (13),
// NodeRenderer (20), NodeTreeList/NodePalette (26) and the 4 inspector tabs (24–25)
// into a working admin builder for the generic Node tree. State-management mirrors
// PageBuilder.page.tsx (Task 6) exactly — `createStore` for the flat list + `produce`
// for in-place patches, `debounce` autosave sending the FULL current node (not just
// the incoming partial patch) so 2 quick edits inside the debounce window don't drop
// each other (PageBuilder's `updateSelected`/`persist(sections[idx])` pattern — the
// task brief's own guessed code called `persist(id, patch)` with only the partial,
// which would silently lose the earlier field on rapid edits; fixed here to match the
// real, already-proven pattern instead).
//
// Route is registered in AppRoutes.tsx (adminDashboard.cmsNodeBuilder) and reached via
// a row button on manageCmsPages.page.tsx, itself gated by `isNodeTreeEnabled()` (Task 22).
// That link-level gate only hides discoverability though — the route is still reachable by
// direct URL — so `NodeBuilderPage` re-checks the same flag below and renders a disabled-state
// message instead of the builder when it's off, keeping this entire slice invisible until
// CMS_NODE_TREE_ENABLED=true regardless of how the route is reached.
import { createResource, createSignal, For, Show } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { debounce } from '@solid-primitives/scheduled';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { Select } from '@core/components/control/Select';
import { Slideout } from '@core/components/dialog/Slideout';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { toast } from '@core/components/toast/ToastProvider';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { PageService } from '@/shared/services/page/page.service';
import { NodeService } from '@/shared/services/node/node.service';
import { isNodeTreeEnabled } from '@/modules/cms/node/nodeTreeFlag';
import { buildNodeTree } from '@/modules/cms/node/buildNodeTree';
import { NodeRenderer } from '@/modules/cms/node/NodeRenderer';
import { NODE_TYPE_META, nodeCapabilities } from '@/modules/cms/node/nodeRegistry';
import { NodeTreeList } from './NodeTreeList';
import { NodePalette } from './NodePalette';
import { NodeStyleTab } from './NodeStyleTab';
import { NodeContentTab } from './NodeContentTab';
import { NodeDataBindingTab } from './NodeDataBindingTab';
import { NodeVisibilityTab } from './NodeVisibilityTab';
import type { NodeDTO, NodeRenderContext } from '@/modules/cms/node/node.types';

// Admin canvas preview context — no real customer/entry/query-params exist while
// editing structure (same gap PageBuilder's mock-entry preview has for CONTENT_DETAIL).
// `device` is always 'desktop' here for the same Phase-1 reason CmsPageShell.astro's
// SSR context is: real viewport/user-agent detection is Phase 2 (responsive breakpoints).
const EMPTY_CONTEXT: NodeRenderContext = { isCustomerLoggedIn: false, device: 'desktop', queryParams: {}, now: new Date() };

/** Fields the Inspector/palette/reorder actions can write — excludes id/pageId/
 * parentId/timestamps, which the Builder itself manages (parentId via add-child/move,
 * everything else server-generated). Mirrors PageBuilder's `SavableFields`/`toSavable`. */
type SavableNodeFields = Pick<NodeDTO, 'type' | 'order' | 'layoutMode' | 'style' | 'layout' | 'props' | 'dataBinding' | 'repeat' | 'visibilityRules' | 'responsiveOverrides'>;

function toSavable(node: NodeDTO): SavableNodeFields {
    const { type, order, layoutMode, style, layout, props, dataBinding, repeat, visibilityRules, responsiveOverrides } = node;
    return { type, order, layoutMode, style, layout, props, dataBinding, repeat, visibilityRules, responsiveOverrides };
}

/** BFS down from `id` through `nodes` — needed because the BE cascades deleteNode to
 * every descendant (node.service.ts's `collectDescendantIds`/`removeSubtree`), but the
 * local flat store only knows parent→children via `parentId`; without this, deleting a
 * frame would leave its (now-orphaned, already-deleted-server-side) children rendering
 * in the canvas until the next reload. */
function collectDescendantIds(nodes: NodeDTO[], id: string): Set<string> {
    const ids = new Set<string>();
    let frontier = [id];
    while (frontier.length) {
        const children = nodes.filter((n) => n.parentId && frontier.includes(n.parentId)).map((n) => n.id).filter((cid): cid is string => !!cid);
        frontier = children.filter((cid) => !ids.has(cid));
        frontier.forEach((cid) => ids.add(cid));
    }
    return ids;
}

export function NodeBuilderPage() {
    const { searchParams, navigate } = useRoutes();

    // Task 27 review finding: manageCmsPages.page.tsx's row button only hides the
    // *link* to this route behind `isNodeTreeEnabled()` — the route itself was still
    // reachable by direct URL regardless of the flag. Re-check it here so the page
    // (not just its discoverability) stays gated, and bail out before any of the
    // resources below fire NodeService/PageService calls for a Phase-1 feature that
    // isn't supposed to be live yet.
    if (!isNodeTreeEnabled()) {
        return (
            <div class="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3 text-center text-neutral-400">
                <p>{t('cms.nodeBuilder.disabledHint')}</p>
                <Button sm outline onClick={() => navigate(-1)}>{t('cms.nodeBuilder.backButtonTooltip')}</Button>
            </div>
        );
    }

    const pageId = () => searchParams.pageId as string;

    const [page] = createResource(pageId, (id) => PageService.getOnePage({ id }));
    const [nodes, setNodes] = createStore<NodeDTO[]>([]);
    const [loading, setLoading] = createSignal(true);
    const [selectedId, setSelectedId] = createSignal<string>();
    const [paletteOpen, setPaletteOpen] = createSignal(false);
    const [paletteParentId, setPaletteParentId] = createSignal<string>();

    createResource(pageId, async (id) => {
        setLoading(true);
        const list = await NodeService.getNodesByPage({ pageId: id });
        // Mixed-scalar codegen quirk (see node.types.ts's header comment) — same single
        // cast point resolveCmsPageProps.ts's `asJsonTyped` uses for the same reason.
        setNodes(list as unknown as NodeDTO[]);
        setLoading(false);
        return true;
    });

    const tree = () => buildNodeTree(nodes);
    const selected = () => nodes.find((n) => n.id === selectedId());
    const selectedCapabilities = () => nodeCapabilities[selected()?.type ?? ''];

    const persist = debounce((node: NodeDTO) => {
        NodeService.updateNode({ id: node.id!, data: toSavable(node) as any })
            .catch(() => toast().danger(t('cms.toasts.saveFailed')));
    }, 600);

    /** Same shape as PageBuilder's `updateSelected` — mutate the store in place via
     * `produce`, then persist the resulting FULL node (not just the incoming patch). */
    const patchSelected = (patch: (n: NodeDTO) => void) => {
        const id = selectedId();
        if (!id) return;
        const idx = nodes.findIndex((n) => n.id === id);
        if (idx === -1) return;
        setNodes(produce((list) => patch(list[idx])));
        persist(nodes[idx]);
    };

    const openPalette = (parentId?: string) => {
        setPaletteParentId(parentId);
        setPaletteOpen(true);
    };

    const handleAdd = async (type: string) => {
        const parentId = paletteParentId();
        setPaletteOpen(false);
        try {
            const created = await NodeService.createNode({ data: { pageId: pageId(), parentId, type } as any });
            setNodes((list) => [...list, created as unknown as NodeDTO]);
            setSelectedId(created.id);
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirmAction().danger(() => t('cms.node.tree.deleteConfirm'));
        if (!confirmed) return;
        const toRemove = collectDescendantIds(nodes, id);
        toRemove.add(id);
        const prev = nodes.slice();
        setNodes((list) => list.filter((n) => !n.id || !toRemove.has(n.id)));
        if (selectedId() && toRemove.has(selectedId()!)) setSelectedId(undefined);
        try {
            await NodeService.deleteNode({ id });
        } catch {
            setNodes(prev);
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    const swapOrder = async (a: NodeDTO, b: NodeDTO) => {
        const aOrder = a.order ?? 0;
        const bOrder = b.order ?? 0;
        setNodes((list) => list.map((n) => (n.id === a.id ? { ...n, order: bOrder } : n.id === b.id ? { ...n, order: aOrder } : n)));
        try {
            await NodeService.reorderNodes({ items: [{ id: a.id!, order: bOrder }, { id: b.id!, order: aOrder }] });
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    const siblingsOf = (node: NodeDTO) => nodes.filter((n) => n.parentId === node.parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const handleMoveUp = (id: string) => {
        const node = nodes.find((n) => n.id === id);
        if (!node) return;
        const siblings = siblingsOf(node);
        const idx = siblings.findIndex((n) => n.id === id);
        if (idx > 0) swapOrder(node, siblings[idx - 1]);
    };

    const handleMoveDown = (id: string) => {
        const node = nodes.find((n) => n.id === id);
        if (!node) return;
        const siblings = siblingsOf(node);
        const idx = siblings.findIndex((n) => n.id === id);
        if (idx < siblings.length - 1) swapOrder(node, siblings[idx + 1]);
    };

    return (
        <div class="flex h-[calc(100vh-4rem)] flex-col -m-4 md:-m-6">
            <div class="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2.5">
                <div class="flex items-center gap-2 min-w-0">
                    <Button sm outline onClick={() => navigate(-1)} tooltip={t('cms.nodeBuilder.backButtonTooltip')}>
                        <Icon name="heroicons-solid:arrow-left" />
                    </Button>
                    <p class="truncate text-sm font-semibold text-neutral-800">{page()?.internalName}</p>
                    <code class="hidden shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-400 sm:inline">{page()?.path}</code>
                </div>
            </div>

            <div class="flex flex-1 min-h-0">
                <aside class="hidden w-72 shrink-0 flex-col border-r border-neutral-200 bg-white p-3 md:flex">
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('cms.nodeBuilder.treePanelTitle')}</p>
                    <div class="flex-1 overflow-y-auto">
                        <NodeTreeList
                            tree={tree()}
                            selectedId={selectedId()}
                            onSelect={setSelectedId}
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                            onDelete={handleDelete}
                            onAddChild={(parentId) => openPalette(parentId)}
                        />
                    </div>
                    <Button sm outline onClick={() => openPalette(undefined)} class="mt-2">
                        {t('cms.nodeBuilder.addRootButton')}
                    </Button>
                </aside>

                <main class="flex-1 overflow-auto bg-neutral-100">
                    <Show when={!loading()} fallback={<div class="flex h-full items-center justify-center text-neutral-400"><Icon spinner /></div>}>
                        <Show
                            when={tree().length > 0}
                            fallback={
                                <div class="flex h-full flex-col items-center justify-center gap-3 text-center text-neutral-400">
                                    <p>{t('cms.nodeBuilder.emptyCanvasHint')}</p>
                                    <Button onClick={() => openPalette(undefined)}>{t('cms.nodeBuilder.addRootButton')}</Button>
                                </div>
                            }
                        >
                            <div class="min-w-[1024px] bg-white">
                                <For each={tree()}>
                                    {(root) => <NodeRenderer node={root} context={EMPTY_CONTEXT} />}
                                </For>
                            </div>
                        </Show>
                    </Show>
                </main>
            </div>

            <Slideout id="node-builder-palette" isOpen={paletteOpen()} onClose={() => setPaletteOpen(false)} class="w-full max-w-[420px]">
                <Slideout.Header title={t('cms.nodeBuilder.paletteTitle')} hasClose />
                <Slideout.Body class="p-0">
                    <NodePalette onAdd={handleAdd} />
                </Slideout.Body>
            </Slideout>

            <Slideout id="node-builder-inspector" isOpen={!!selected()} onClose={() => setSelectedId(undefined)} class="w-full max-w-[480px]">
                <Slideout.Header
                    title={selected() ? tOrLiteral(NODE_TYPE_META[selected()!.type ?? '']?.labelKey ?? selected()!.type ?? '') : ''}
                    hasClose
                />
                <Slideout.Body class="p-0 divide-y divide-neutral-200">
                    <Show when={selected()}>
                        {/* layoutMode isn't covered by any of the 4 tabs (NodeStyleTab's
                            StyleObject has no layoutMode field) — wired directly here rather
                            than left as a "raw update only" gap, since containers (frames) are
                            exactly the nodes this builder needs to re-flow live. */}
                        <Show when={selectedCapabilities()?.layoutChildren}>
                            <div class="p-4">
                                <label class="mb-1 block text-xs font-medium text-neutral-500">{t('cms.nodeBuilder.layoutModeLabel')}</label>
                                <Select
                                    value={selected()!.layoutMode ?? 'flow'}
                                    options={[
                                        { value: 'flow', label: t('cms.nodeBuilder.layoutModeFlow') },
                                        { value: 'free', label: t('cms.nodeBuilder.layoutModeFree') },
                                    ]}
                                    onChange={(v) => patchSelected((n) => { n.layoutMode = v; })}
                                    fieldless
                                />
                            </div>
                        </Show>

                        <NodeContentTab
                            node={{ ...selected()!, children: [] }}
                            onChange={(p) => patchSelected((n) => { n.props = p; })}
                        />

                        <Show when={selectedCapabilities()?.style}>
                            <NodeStyleTab
                                style={selected()!.style}
                                onChange={(s) => patchSelected((n) => { n.style = s; })}
                            />
                        </Show>

                        <Show when={selectedCapabilities()?.dataBinding}>
                            <NodeDataBindingTab
                                dataBinding={selected()!.dataBinding ?? { mode: 'static' }}
                                availableFields={[]}
                                onChange={(d) => patchSelected((n) => { n.dataBinding = d; })}
                            />
                        </Show>

                        <NodeVisibilityTab
                            rules={selected()!.visibilityRules}
                            onChange={(v) => patchSelected((n) => { n.visibilityRules = v ?? undefined; })}
                        />
                    </Show>
                </Slideout.Body>
            </Slideout>
        </div>
    );
}
