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
// a row button on manageCmsPages.page.tsx. The route is now unconditionally accessible
// (admin UI gating removed in Phase 0 M1 Task 10); staff can always use the Node Builder
// regardless of the CMS_NODE_TREE_ENABLED flag setting.
//
// Task 7 (Phase 1a) — rewired onto the selection/command/Layers-panel stack built by
// Tasks 1-6:
// - `selectedId` signal replaced by `NodeSelectionContext` (multi-select-capable);
//   the component is split into an outer `NodeBuilderPage` that mounts
//   `<NodeSelectionProvider>` and an inner `NodeBuilderPageContent` that calls
//   `useNodeSelection()` — the hook requires being rendered UNDER the Provider, so it
//   can't be called in the same function that returns the Provider itself.
// - `handleAdd`/`handleDelete`/`patchSelected` (previously raw store+NodeService calls)
//   now go through `CommandManager` + Task 4's Command factories, giving Undo/Redo for
//   free. `NodeTreeList` (up/down-button reordering) is replaced by `LayersPanel`
//   (Task 6 — multi-select, drag reorder/reparent, its own Undo/Redo-backed delete).
// - Canvas click-to-select is wired additively via the new optional
//   `NodeRenderContext.builderSelection` field (node.types.ts) — see NodeRenderer.tsx's
//   matching change; `undefined` everywhere except this file's own canvas context, so
//   the public site's rendering is byte-for-byte unchanged.
// - 2 forward-looking concerns from Task 4's report, resolved here:
//   1. Debounce-to-1-command coalescing: `patchSelected` mutates the store immediately
//      (instant UI feedback) but only constructs+runs 1 `createUpdateNodePropertyCommand`
//      per node PER SETTLED 600ms debounce window (`pendingPatches`, keyed by node id) —
//      the "before" snapshot is taken once, at the start of that window, not per keystroke.
//   2. Delete-undo selection resync: `createDeleteNodesCommand.undo()` recreates deleted
//      nodes under BRAND NEW server-generated ids. `handleUndo`/`handleRedo` below resolve
//      this generically by diffing the store's node ids immediately before and after ANY
//      undo()/redo() call: any id that's newly present gets selected (covers redo-of-an-
//      add's freshly-created id); any previously-selected id that's gone missing gets
//      dropped from selection (covers undo-of-an-add, and redo-of-a-delete).
//      Review-finding fix: that generic diff is WRONG for delete-undo specifically — it
//      recreates the root(s) AND every descendant under new ids, so the generic diff
//      selected ALL of them instead of just the originally-selected root(s). Fixed via a
//      command-type-specific escape hatch (`getRootIdsAfterLastOp`, nodeCommands.ts +
//      resyncSelectionAfterHistoryOp.ts) that `resyncSelectionAfterHistoryOp` below checks
//      for on the command that was just undone/redone (via `CommandManager.peekRedoCommand()`
//      / `peekUndoCommand()`) BEFORE falling back to the generic diff.
import { createResource, createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { debounce, type Scheduled } from '@solid-primitives/scheduled';
import { Button } from '@core/components/button/Button';
import { Icon } from '@shared/components/icons/Icon';
import { Select } from '@core/components/control/Select';
import { Slideout } from '@core/components/dialog/Slideout';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { baseConfig } from '@core/components/config/BaseConfig';
import { toast } from '@core/components/toast/ToastProvider';
import { t, tOrLiteral } from '@/shared/i18n/t';
import { useRoutes } from '@/shared/contexts/routes/RoutesContext';
import { PageService } from '@/shared/services/page/page.service';
import { NodeService } from '@/shared/services/node/node.service';
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { buildNodeTree } from '@/modules/cms/node/buildNodeTree';
import { NodeRenderer } from '@/modules/cms/node/NodeRenderer';
import { NODE_TYPE_META, nodeCapabilities } from '@/modules/cms/node/nodeRegistry';
import { NodeSelectionProvider, useNodeSelection } from '@/modules/cms/node/selection/NodeSelectionContext';
import { CommandManager } from '@/modules/cms/node/commands/CommandManager';
import { createAddNodeCommand, createDeleteNodesCommand, createUpdateNodePropertyCommand } from '@/modules/cms/node/commands/nodeCommands';
import { flattenVisibleTree } from '@/modules/cms/node/commands/flattenTree';
import { computeResyncedSelectionIds, hasRootIdsAfterLastOp } from '@/modules/cms/node/commands/resyncSelectionAfterHistoryOp';
import type { Command } from '@/modules/cms/node/commands/CommandManager';
import { LayersPanel } from './LayersPanel';
import { NodePalette } from './NodePalette';
import { NodeStyleTab } from './NodeStyleTab';
import { NodeTransformTab } from './NodeTransformTab';
import { NodeContentTab } from './NodeContentTab';
import { NodeDataBindingTab } from './NodeDataBindingTab';
import { NodeVisibilityTab } from './NodeVisibilityTab';
import { PageVersionHistoryPanel } from '@/modules/cms/admin/builder/PageVersionHistoryPanel';
import type { NodeDTO, NodeRenderContext } from '@/modules/cms/node/node.types';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

// Admin canvas preview context — no real customer/entry/query-params exist while
// editing structure (same gap PageBuilder's mock-entry preview has for CONTENT_DETAIL).
// `device` is always 'desktop' here for the same Phase-1 reason CmsPageShell.astro's
// SSR context is: real viewport/user-agent detection is Phase 2 (responsive breakpoints).
const EMPTY_CONTEXT: NodeRenderContext = { isCustomerLoggedIn: false, device: 'desktop', queryParams: {}, pathParams: {}, now: new Date() };

/** Fields the Inspector/palette/reorder actions can write — excludes id/pageId/
 * parentId/timestamps, which the Builder itself manages (parentId via add-child/move,
 * everything else server-generated). Mirrors PageBuilder's `SavableFields`/`toSavable`. */
type SavableNodeFields = Pick<NodeDTO, 'type' | 'order' | 'layoutMode' | 'style' | 'layout' | 'props' | 'dataBinding' | 'repeat' | 'visibilityRules' | 'responsiveOverrides'>;

function toSavable(node: NodeDTO): SavableNodeFields {
    const { type, order, layoutMode, style, layout, props, dataBinding, repeat, visibilityRules, responsiveOverrides } = node;
    return { type, order, layoutMode, style, layout, props, dataBinding, repeat, visibilityRules, responsiveOverrides };
}

export function NodeBuilderPage() {
    return (
        <NodeSelectionProvider>
            <NodeBuilderPageContent />
        </NodeSelectionProvider>
    );
}

function NodeBuilderPageContent() {
    const { searchParams, navigate } = useRoutes();
    const selection = useNodeSelection();
    const commandManager = new CommandManager();

    const pageId = () => searchParams.pageId as string;

    const [page] = createResource(pageId, (id) => PageService.getOnePage({ id }));
    // Final-review fix Important #3 (was Important #6's "stays hardcoded []" — that finding is
    // now stale: Task 11 shipped a real writer for `Page.dataBinding`, see PageDataBindingModal.tsx
    // + PageService.updatePage; the field IS on UpdatePageInput now). Same pattern
    // PageBuilder.page.tsx uses for `detailContentTypeId`/`detailContentType`.
    const boundContentTypeId = () => page()?.dataBinding?.contentTypeId;
    const [boundContentType] = createResource(boundContentTypeId, (id) => ContentTypeService.getOneContentType({ id }));
    const availableFields = (): FieldDefinitionDTO[] => (boundContentType()?.fields || []).filter((f): f is FieldDefinitionDTO => !!f);
    const [nodes, setNodes] = createStore<NodeDTO[]>([]);
    const [loading, setLoading] = createSignal(true);
    const [paletteOpen, setPaletteOpen] = createSignal(false);
    const [paletteParentId, setPaletteParentId] = createSignal<string>();
    const [historyOpen, setHistoryOpen] = createSignal(false);

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
    /** Single-target UI (Inspector's 4 tabs are single-node forms) — the FIRST selected id
     * when multiple are selected; the Inspector itself is hidden (not silently editing an
     * arbitrary one of several) whenever more than 1 is selected, see the Inspector panel below. */
    const selectedId = () => [...selection.selectedIds()][0];
    const selected = () => nodes.find((n) => n.id === selectedId());
    /** Selected node's PARENT — used only to gate the Transform tab (below): the free-vs-flow
     * positioning fields only mean anything when the PARENT lays its children out via
     * layoutMode='free' (applyChildLayout reads x/y/width/height/rotation/zIndex off the
     * CHILD but the mode switch itself lives on the parent, not the child). */
    const selectedParent = () => nodes.find((n) => n.id === selected()?.parentId);
    const selectedCapabilities = () => nodeCapabilities[selected()?.type ?? ''];
    const isMultiSelected = () => selection.selectedIds().size > 1;

    /** DFS visible order across the WHOLE tree (no collapsing — unlike LayersPanel's own
     * `flatRows`, the canvas always shows every node, so `collapsedIds` is always empty
     * here) — used for canvas Shift+click range-select, reusing Task 5's flattenVisibleTree
     * rather than re-deriving a second "visible order" concept from scratch. */
    const visibleOrderIds = () => flattenVisibleTree(
        nodes.map((n) => ({ id: n.id!, parentId: n.parentId ?? null, order: n.order ?? 0 })),
        new Set<string>(),
    ).map((r) => r.id);

    const canvasContext = (): NodeRenderContext => ({
        ...EMPTY_CONTEXT,
        builderSelection: {
            isSelected: (id: string) => selection.isSelected(id),
            onSelectClick: (id: string, e: MouseEvent) => {
                e.stopPropagation();
                if (e.shiftKey) selection.selectRange(id, visibleOrderIds());
                else if (e.ctrlKey || e.metaKey) selection.toggle(id);
                else selection.select(id);
            },
        },
    });

    /** Task 4 forward-looking concern #1 — see the file header comment. Keyed by node id
     * (not a single shared pending value) so switching the Inspector's target node mid-edit
     * can't corrupt/drop a still-pending window for the PREVIOUS node — each node id gets
     * its own independent debounce timer + "before" snapshot. */
    const pendingPatches = new Map<string, { before: SavableNodeFields; commit: Scheduled<[]> }>();

    /** Same trigger shape as the pre-Task-7 `patchSelected` — mutate the store in place via
     * `produce` immediately (instant UI feedback), but only construct+run 1
     * `createUpdateNodePropertyCommand` per SETTLED 600ms debounce window per node id. */
    const patchSelected = (patch: (n: NodeDTO) => void) => {
        const id = selectedId();
        if (!id) return;
        const idx = nodes.findIndex((n) => n.id === id);
        if (idx === -1) return;

        let pending = pendingPatches.get(id);
        if (!pending) {
            const before = toSavable(nodes[idx]);
            const commit = debounce(() => {
                pendingPatches.delete(id);
                const curIdx = nodes.findIndex((n) => n.id === id);
                if (curIdx === -1) return;
                commandManager
                    .run(createUpdateNodePropertyCommand(id, before, toSavable(nodes[curIdx]), () => nodes, setNodes))
                    .catch(() => toast().danger(t('cms.toasts.saveFailed')));
            }, 600);
            pending = { before, commit };
            pendingPatches.set(id, pending);
        }
        setNodes(produce((list) => patch(list[idx])));
        pending.commit();
    };

    const openPalette = (parentId?: string) => {
        setPaletteParentId(parentId);
        setPaletteOpen(true);
    };

    const handleAdd = async (type: string) => {
        const parentId = paletteParentId();
        setPaletteOpen(false);
        const beforeIds = new Set(nodes.map((n) => n.id));
        // Final-review fix Critical #1 — this used to compute `order` itself via
        // `nodes.filter((n) => n.parentId === parentId).length`. For ROOT-level adds,
        // `parentId` here is `undefined` (from `paletteParentId()`'s signal), but stored
        // root nodes have `parentId: null`/`undefined`-normalized elsewhere (never a value
        // that strictly `===`-matches this `undefined` the way the filter needs) — so that
        // filter never matched any existing root sibling, and `order` was always computed
        // as 0, writing duplicate `order: 0` across every root sibling and corrupting
        // persisted sort order. Fixed by NOT computing/passing `order` at all: omitting the
        // field lets the BE's `createNode` auto-assign it (`data.order === undefined` branch,
        // node.service.ts) inside a `pessimistic_write`-locked transaction — race-safe, and
        // matches this builder's pre-milestone behavior before this regression was introduced.
        try {
            await commandManager.run(createAddNodeCommand({ pageId: pageId(), parentId, type }, () => nodes, setNodes));
            // createAddNodeCommand doesn't expose the created id to the caller — find it by
            // diffing the store's ids before/after, same generic approach as handleUndo/
            // handleRedo below, so the newly-added node is auto-selected (previous behavior).
            const createdNode = nodes.find((n) => n.id && !beforeIds.has(n.id));
            if (createdNode?.id) selection.select(createdNode.id);
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    const handleDeleteSelected = async () => {
        const ids = [...selection.selectedIds()];
        if (ids.length === 0) return;
        const confirmed = await confirmAction().danger(() =>
            ids.length > 1 ? t('cms.node.tree.deleteConfirmCount', { count: ids.length }) : t('cms.node.tree.deleteConfirm'),
        );
        if (!confirmed) return;
        try {
            await commandManager.run(createDeleteNodesCommand(ids, () => nodes, setNodes));
            ids.forEach((id) => selection.remove(id));
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    /** Task 4 forward-looking concern #2 — see the file header comment.
     * `command` is the one that was just executed/undone (undo() leaves it on top of the
     * redo stack; redo() leaves it on top of the undo stack — see `handleUndo`/`handleRedo`
     * below) — checked for the `getRootIdsAfterLastOp` escape hatch (delete-undo/redo)
     * BEFORE falling back to the generic all-new-ids diff (every other command type). */
    const resyncSelectionAfterHistoryOp = (beforeIds: Set<string>, command: Command | undefined) => {
        const afterIds = nodes.map((n) => n.id).filter((id): id is string => !!id);
        const overrideIds = command && hasRootIdsAfterLastOp(command) ? command.getRootIdsAfterLastOp() : undefined;
        const nextSelectedIds = computeResyncedSelectionIds(beforeIds, afterIds, selection.selectedIds(), overrideIds);

        [...selection.selectedIds()].forEach((id) => { if (!nextSelectedIds.has(id)) selection.remove(id); });
        const toAdd = [...nextSelectedIds].filter((id) => !selection.isSelected(id));
        if (toAdd.length > 0) {
            // No pre-existing selection left standing (the common case — a fresh undo/redo
            // target, or delete-undo's recreated root(s)) => `select()` sets a clean anchor
            // for the first id; every other case (id already partially selected pre-op) just
            // needs the remaining new ids toggled in.
            if (selection.selectedIds().size === 0) selection.select(toAdd[0]);
            else selection.toggle(toAdd[0]);
            toAdd.slice(1).forEach((id) => selection.toggle(id));
        }
    };

    // Final-review fix Important #3 — these used to call commandManager.undo()/redo() bare
    // (fire-and-forget from both the keyboard handler and the header buttons below), unlike
    // every other mutating action in this file (handleAdd/handleDeleteSelected/patchSelected),
    // which all catch -> toast().danger(...). A rejected undo()/redo() (e.g. the network call
    // inside a Command's execute()/undo() fails) would otherwise surface as an unhandled
    // promise rejection with no user-visible feedback at all.
    const handleUndo = async () => {
        if (!commandManager.canUndo()) return;
        const beforeIds = new Set(nodes.map((n) => n.id).filter((id): id is string => !!id));
        try {
            await commandManager.undo();
            resyncSelectionAfterHistoryOp(beforeIds, commandManager.peekRedoCommand());
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    const handleRedo = async () => {
        if (!commandManager.canRedo()) return;
        const beforeIds = new Set(nodes.map((n) => n.id).filter((id): id is string => !!id));
        try {
            await commandManager.redo();
            resyncSelectionAfterHistoryOp(beforeIds, commandManager.peekUndoCommand());
        } catch {
            toast().danger(t('cms.toasts.saveFailed'));
        }
    };

    // Phase 0 M3a: called right after PageVersionHistoryPanel's restore -- same
    // network-only-refetch reasoning as PageBuilder.page.tsx's reloadSections.
    const reloadNodes = async () => {
        setLoading(true);
        try {
            const list = await NodeService.getNodesByPage({ pageId: pageId() }, { requestPolicy: 'network-only' });
            // Any debounce window still pending against the PRE-restore node ids is now moot
            // (those ids may no longer exist) — drop them rather than let them fire later
            // against stale indices/ids.
            pendingPatches.forEach((p) => p.commit.clear());
            pendingPatches.clear();
            setNodes(list as unknown as NodeDTO[]);
            selection.clear();
        } finally {
            setLoading(false);
        }
    };

    // Task 7 Step 6 — keyboard shortcuts, following MediaLightbox.tsx:55-65's exact pattern.
    onMount(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName;
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return; // đừng chặn gõ trong ô nhập liệu
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selection.selectedIds().size === 0) return;
                e.preventDefault();
                void handleDeleteSelected();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                void handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                void handleRedo();
            } else if (e.key === 'Escape') {
                selection.clear();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        onCleanup(() => document.removeEventListener('keydown', onKeyDown));
    });

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
                <div class="flex items-center gap-2">
                    {/* Final-review fix Important #2 — `Button`'s `tooltip` prop is resolved to a
                        plain string once inside a one-time `onMount` (`createTooltip(ref, props.tooltip,
                        ...)`), so passing `commandManager.peekUndoLabel() ?? ...` here used to freeze
                        the tooltip forever on whichever label was current AT MOUNT (both stacks empty
                        => the generic fallback, never updating again). Rather than changing the shared
                        Button's tooltip plumbing (risk of affecting every other tooltip consumer in the
                        app), `tooltip` below is now the static generic fallback text ONLY, and the
                        actual current command label is shown as ordinary reactive JSX text next to the
                        buttons instead — updates immediately on every undo/redo/run() like any other
                        signal-backed text in this file. */}
                    <Button sm outline disabled={!commandManager.canUndo()} tooltip={t('cms.nodeBuilder.undoButtonTooltip')} onClick={() => void handleUndo()}>
                        <Icon name="heroicons-solid:arrow-uturn-left" />
                    </Button>
                    <Button sm outline disabled={!commandManager.canRedo()} tooltip={t('cms.nodeBuilder.redoButtonTooltip')} onClick={() => void handleRedo()}>
                        <Icon name="heroicons-solid:arrow-uturn-right" />
                    </Button>
                    <Show when={commandManager.canUndo() || commandManager.canRedo()}>
                        <span class="max-w-[220px] truncate text-xs text-neutral-400" title={commandManager.canUndo() ? commandManager.peekUndoLabel() : commandManager.peekRedoLabel()}>
                            {commandManager.canUndo() ? commandManager.peekUndoLabel() : commandManager.peekRedoLabel()}
                        </span>
                    </Show>
                    <Button sm outline onClick={() => setHistoryOpen(true)}>
                        <Icon name="heroicons-outline:clock" /> {t('cms.builder.historyButton')}
                    </Button>
                </div>
            </div>

            <div class="flex flex-1 min-h-0">
                <aside class="hidden w-72 shrink-0 flex-col border-r border-neutral-200 bg-white p-3 md:flex">
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('cms.nodeBuilder.treePanelTitle')}</p>
                    <div class="flex-1 overflow-y-auto">
                        <LayersPanel
                            nodes={nodes}
                            getNodes={() => nodes}
                            setNodes={setNodes}
                            commandManager={commandManager}
                            onAddChild={(parentId) => openPalette(parentId)}
                        />
                    </div>
                    <Button sm outline onClick={() => openPalette(undefined)} class="mt-2">
                        {t('cms.nodeBuilder.addRootButton')}
                    </Button>
                </aside>

                <main class="flex-1 overflow-auto bg-neutral-100" onClick={() => selection.clear()}>
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
                                    {(root) => <NodeRenderer node={root} context={canvasContext()} />}
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

            {/* Task 8 (Phase 1a) fix — the Inspector used to be a <Slideout> (Modal/Dialog-
                backed), which renders a full-viewport backdrop that intercepts ALL pointer
                events outside the panel. That made it physically impossible to Ctrl/Shift-click
                a SECOND row in the LayersPanel underneath it once the Inspector auto-opened on
                the first selection — defeating the whole multi-select feature (Tasks 2/6/7).
                Replaced with a plain, non-modal, absolutely-positioned panel: same visual slot
                (right edge, 480px, full-height, scrollable body) and same open/close semantics
                (open whenever >=1 node is selected, close clears the selection), but NO backdrop
                element at all — nothing sits above the Layers panel/canvas while it's open.
                Kept mounted at all times (rather than removed via <Show>) and slid off-screen via
                `translate-x-full` when closed, purely so the open/close transition still animates
                (matching the Slideout's own slide/opacity transition) without needing a portal or
                the shared Modal system. The Palette and Version History panels below are
                deliberately left as <Slideout> — they're opened via explicit buttons, don't need
                simultaneous Layers-panel interaction, and outside-click-to-close is expected there. */}
            <div
                class={`fixed inset-y-0 right-0 z-30 flex h-screen w-full max-w-[480px] flex-col border-l border-neutral-200 bg-white shadow-2xl transition-transform duration-300 ${
                    selection.selectedIds().size > 0 ? 'translate-x-0' : 'translate-x-full pointer-events-none'
                }`}
            >
                <div class="relative flex shrink-0 items-center border-b border-neutral-50 px-3 py-2">
                    <div class="flex-1 pl-1 text-base font-medium text-neutral">
                        {isMultiSelected()
                            ? t('cms.nodeBuilder.multiSelectionTitle', { count: selection.selectedIds().size })
                            : (selected() ? tOrLiteral(NODE_TYPE_META[selected()!.type ?? '']?.labelKey ?? selected()!.type ?? '') : '')}
                    </div>
                    <Button sm flat iconClass="text-xl" icon={baseConfig().iconClose()} onClick={() => selection.clear()} />
                </div>
                <div class="min-h-0 flex-1 divide-y divide-neutral-200 overflow-y-auto">
                    {/* Multi-select + Inspector: the 4 tabs below are single-node forms (no
                        multi-edit support in this milestone) — rather than silently editing an
                        arbitrary one of several selected nodes, the Inspector is replaced by a
                        clear hint whenever more than 1 node is selected. */}
                    <Show
                        when={!isMultiSelected()}
                        fallback={<div class="p-6 text-center text-sm text-neutral-500">{t('cms.nodeBuilder.multiSelectionHint')}</div>}
                    >
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

                            {/* Task 2 (Phase 1b) — positioning fields only apply when the PARENT
                                lays this node out via layoutMode='free' (see selectedParent above);
                                gated on the parent, not the selected node's own layoutMode. */}
                            <Show when={selectedParent()?.layoutMode === 'free'}>
                                <NodeTransformTab
                                    layout={selected()!.layout}
                                    onChange={(next) => patchSelected((n) => { n.layout = next; })}
                                />
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
                                {/* Final-review fix Important #3: the previous comment here (Important #6 from
                                    an earlier review) claimed `Page.dataBinding` had "NO writer at all: neither
                                    `CreatePageInput` nor `UpdatePageInput` declares a `dataBinding` field" — that
                                    is now FALSE. Task 11 (this same milestone) shipped a real writer:
                                    PageDataBindingModal.tsx calls `PageService.updatePage({ data: { dataBinding }
                                    })`, and `PageDataBinding` (cms.types.ts) has a real `contentTypeId` field.
                                    Wired below: if the current Page has a `dataBinding.contentTypeId` set, fetch
                                    that content type's fields via `ContentTypeService.getOneContentType` (same
                                    call PageBuilder.page.tsx's `detailContentType`/resolveCmsPageProps.ts already
                                    make) and pass them as `availableFields` — no page-loading change needed since
                                    `page` (createResource above) already has the Page object in scope. */}
                                <NodeDataBindingTab
                                    dataBinding={selected()!.dataBinding ?? { mode: 'static' }}
                                    availableFields={availableFields()}
                                    onChange={(d) => patchSelected((n) => { n.dataBinding = d; })}
                                />
                            </Show>

                            <NodeVisibilityTab
                                rules={selected()!.visibilityRules}
                                onChange={(v) => patchSelected((n) => { n.visibilityRules = v ?? undefined; })}
                            />
                        </Show>
                    </Show>
                </div>
            </div>

            <Slideout id="node-builder-history" isOpen={historyOpen()} onClose={() => setHistoryOpen(false)} class="w-full max-w-[420px]">
                <Slideout.Header title={t('cms.builder.history.title')} hasClose />
                <Slideout.Body class="p-5">
                    <PageVersionHistoryPanel pageId={pageId()} onRestored={reloadNodes} />
                </Slideout.Body>
            </Slideout>
        </div>
    );
}
