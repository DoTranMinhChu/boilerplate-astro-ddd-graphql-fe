// src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx
//
// Task 27 — final Phase 1 orchestrator: wires NodeService (12), buildNodeTree (13),
// NodeRenderer (20), NodeTreeList/NodePalette (26) and the 5 inspector tabs (24–25)
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
import { mergeClass } from '@core/helpers/class';
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
import { MIN_FALLBACK_SIZE } from '@/modules/cms/node/NodeCanvasOverlay';
import { NODE_TYPE_META, nodeCapabilities } from '@/modules/cms/node/nodeRegistry';
import { NodeSelectionProvider, useNodeSelection } from '@/modules/cms/node/selection/NodeSelectionContext';
import { CommandManager } from '@/modules/cms/node/commands/CommandManager';
import { createAddNodeCommand, createDeleteNodesCommand, createDragNodesCommand, createUpdateNodePropertyCommand } from '@/modules/cms/node/commands/nodeCommands';
import { flattenVisibleTree } from '@/modules/cms/node/commands/flattenTree';
import { computeResyncedSelectionIds, hasRootIdsAfterLastOp } from '@/modules/cms/node/commands/resyncSelectionAfterHistoryOp';
import { snapToGrid, computeSiblingSnap, type Rect } from '@/modules/cms/node/commands/snapMath';
import { normalizeRotation } from '@/modules/cms/node/commands/rotationMath';
import type { Command } from '@/modules/cms/node/commands/CommandManager';
import { LayersPanel } from './LayersPanel';
import { NodePalette } from './NodePalette';
import { NodeStyleTab } from './NodeStyleTab';
import { NodeTransformTab } from './NodeTransformTab';
import { NodeContentTab } from './NodeContentTab';
import { NodeDataBindingTab } from './NodeDataBindingTab';
import { NodeDataSourceTab } from './NodeDataSourceTab';
import { NodeVisibilityTab } from './NodeVisibilityTab';
import { NodeAnimationTab } from './NodeAnimationTab';
import { MIGRATION_ONLY_NODE_TYPES } from '@/modules/cms/node/node.constants';
import { PageVersionHistoryPanel } from '@/modules/cms/admin/builder/PageVersionHistoryPanel';
import type { NodeDTO, NodeRenderContext, LayoutProps, ResizeHandle, Breakpoint } from '@/modules/cms/node/node.types';
import type { FieldDefinitionDTO } from '@/modules/cms/cms.types';

// Admin canvas preview context — no real customer/entry/query-params exist while
// editing structure (same gap PageBuilder's mock-entry preview has for CONTENT_DETAIL).
// Phase 3 (Responsive): `device` is now the admin's MANUALLY-selected preview
// breakpoint (previewBreakpoint signal, below) — deliberately NOT derived from the
// admin's own real browser window width (almost always desktop-sized, which would
// make a Desktop/Tablet/Mobile switcher pointless). The public site instead uses
// the visitor's REAL window width via useBreakpoint() (see ResponsiveNodeTree.tsx).
const EMPTY_CONTEXT: Omit<NodeRenderContext, 'device'> = { isCustomerLoggedIn: false, queryParams: {}, pathParams: {}, now: new Date() };

// Task 5 (M1c) — drag/resize gesture constants. `DRAG_THRESHOLD` mirrors the task-5-brief's
// own sketch verbatim (3px of pointer travel before a pointerdown-then-up counts as a drag
// rather than a plain click) — also reused by the marquee gesture below (M1c final-review
// fix M2) so "click" vs "drag start" is judged identically everywhere on the canvas.
// `GRID_SIZE` has no existing constant anywhere else in the codebase to reuse (checked
// node.constants.ts — only node-TYPE/tree-depth constants live there) — 8px grid matches
// this task's own manual-verification step ("confirm dragged positions do/don't round to
// 8px multiples"). `SIBLING_SNAP_THRESHOLD` final-review fix M1: was `6`, drifted from the
// spec's explicit fixed "ngưỡng cố định `4px`" (task-1-brief.md / plan Global Constraints) —
// corrected to `4`, matching snapMath.test.ts's own fixtures (already built against 4).
const DRAG_THRESHOLD = 3;
const GRID_SIZE = 8;
const SIBLING_SNAP_THRESHOLD = 4;

/** Builds a `snapMath.ts` `Rect` from plain layout-space x/y/width/height — the ONLY place
 * screen-space DOM measurement would otherwise sneak in; kept a pure helper (no DOM access)
 * so both the drag and resize handlers can share it. */
function rectFromXYWH(x: number, y: number, width: number, height: number): Rect {
    return { left: x, top: y, right: x + width, bottom: y + height, centerX: x + width / 2, centerY: y + height / 2 };
}

/** Pure per-handle resize math for the 8 `ResizeHandle`s — §4.4 of the M1c spec (task-5-brief.md).
 * Corner handles change both dimensions with the OPPOSITE corner fixed; edge handles change only
 * one dimension (+ the corresponding position field for the "near" edges `n`/`w`). Deliberately
 * written as "which side is fixed" (not "which side moved") so the min-1 clamp composes correctly
 * with the fixed-opposite-edge invariant even once a dimension clamps — clamping `width`/`height`
 * to 1 and THEN re-deriving `x`/`y` from the FIXED edge (`start.x + start.width` / `start.y +
 * start.height`) keeps that edge exactly fixed even in the clamped case, unlike the brief's own
 * literal per-handle formulas (`x = start.x + dx`), which only hold before clamping is applied.
 * Hand-traced against 2 concrete scenarios before trusting this (see task-5-report.md):
 *  - se, start {x:100,y:50,w:200,h:100}, dx=30/dy=-10 => w:230,h:90,x:100,y:50 (nw corner fixed).
 *  - nw, start {x:100,y:50,w:200,h:100}, dx=20/dy=15 => w:180,h:85,x:120,y:65 (se corner fixed);
 *    re-traced with dx=210/dy=120 (both would go negative) => w:1,h:1,x:299,y:149, and
 *    x+width=300=start.x+start.width, y+height=150=start.y+start.height — se corner (300,150)
 *    stays exactly fixed even through the clamp. */
function computeResizeRect(handle: ResizeHandle, start: { x: number; y: number; width: number; height: number }, dx: number, dy: number) {
    let width = start.width;
    let x = start.x;
    if (handle === 'nw' || handle === 'w' || handle === 'sw') {
        width = Math.max(1, start.width - dx);
        x = start.x + start.width - width; // right edge fixed
    } else if (handle === 'ne' || handle === 'e' || handle === 'se') {
        width = Math.max(1, start.width + dx); // left edge (x) fixed
    }

    let height = start.height;
    let y = start.y;
    if (handle === 'nw' || handle === 'n' || handle === 'ne') {
        height = Math.max(1, start.height - dy);
        y = start.y + start.height - height; // bottom edge fixed
    } else if (handle === 'sw' || handle === 's' || handle === 'se') {
        height = Math.max(1, start.height + dy); // top edge (y) fixed
    }

    return { x, y, width, height };
}

/** Task 5 (M1c) real-dev-server-verified bug fix — `setPointerCapture` (used by both
 * `handleDragStart` and `handleResizeStart` below) correctly keeps routing `pointermove`/
 * `pointerup` to the captured element even once the pointer has left its bounds, but it has
 * a side effect neither handler originally accounted for: once a captured pointer is
 * released AFTER real pointer movement, the browser still synthesizes a `click` event,
 * RETARGETED to the captured element, which then bubbles through that element's real DOM
 * ancestors exactly like a native click would. Two concrete, confirmed consequences:
 *   1. Resize: the resize handle (NodeCanvasOverlay.tsx) has no `onClick` of its own and
 *      sits deep inside `<main onClick={() => selection.clear()}>` (this file's whole canvas
 *      tree) — the ghost click bubbles all the way up and clears the selection immediately
 *      after every single resize.
 *   2. Multi-drag: the dragged node's own wrapper div (NodeRenderer.tsx) has an
 *      unconditional `onClick={... onSelectClick(id, e)}` — after a real 2+-node drag, the
 *      ghost click retargets to the ONE node actually grabbed, collapsing the whole
 *      multi-selection down to just that node.
 * Fixed by installing a ONE-SHOT, CAPTURING-phase `click` listener on `window` right at
 * `pointerup`, but ONLY when the gesture actually moved (`hasMoved` — a genuine plain click,
 * no movement, must keep working normally for both drag-start-as-select and resize-handle
 * clicks). Capture-phase listeners on ANY ancestor — `window` included — always run to
 * completion, top-down, before the bubble phase even starts, so this is guaranteed to
 * intercept the ghost click before it can reach either `<main>`'s or the node wrapper's
 * bubble-phase `onClick`, regardless of which one the browser retargets the click to.
 * `stopPropagation` alone is enough to stop it bubbling into either handler;
 * `preventDefault` is added too since a click that reaches nothing shouldn't invoke any
 * default action either.
 *
 * Real-dev-server re-verification finding (this fix's own manual QA pass): the ghost click is
 * NOT guaranteed to fire for every pointer-captured gesture in every environment — a Playwright/
 * CDP-driven mouse gesture on this exact handle produced zero synthetic `click` at all in one
 * verification session (confirmed via an instrumented capture-phase spy listener installed
 * before the gesture), even though the identical retargeting behavior WAS reproduced on a
 * minimal isolated element. Relying on the listener's OWN "remove myself once I fire" as the
 * only cleanup is therefore unsafe: if the browser/environment doesn't fire a ghost click for a
 * given gesture, a bare one-shot listener never fires, never removes itself, and silently sits
 * on `window` until the NEXT real, unrelated click arrives — which it then wrongly swallows
 * (verified live: exactly this happened — a plain click on empty canvas right after a drag
 * gesture failed to clear the selection because a still-armed listener from an earlier gesture
 * ate it first). Fixed by ALSO scheduling the same removal via `setTimeout(..., 0)` as a
 * guaranteed safety net: a genuine ghost click (when the browser does fire one) is always
 * dispatched synchronously, in the same task as `pointerup`, strictly before any macrotask/timer
 * runs — so a 0ms timeout reliably fires AFTER a real ghost click would have already been
 * caught and removed the listener (making the timeout's own `removeEventListener` a harmless
 * no-op), while still guaranteeing the listener is gone within a single tick even when no ghost
 * click ever arrives, long before any subsequent genuine user click could occur. */
function suppressGhostClick() {
    const onGhostClick = (clickEvent: MouseEvent) => {
        clickEvent.stopPropagation();
        clickEvent.preventDefault();
        window.removeEventListener('click', onGhostClick, true);
    };
    window.addEventListener('click', onGhostClick, true); // capturing phase — must run before any bubble-phase onClick further down the tree
    // Safety net — see header comment above: guarantees this listener can never outlive the
    // current gesture's own (possible) ghost click, even when the browser doesn't fire one.
    setTimeout(() => window.removeEventListener('click', onGhostClick, true), 0);
}

/** Fields the Inspector/palette/reorder actions can write — excludes id/pageId/
 * parentId/timestamps, which the Builder itself manages (parentId via add-child/move,
 * everything else server-generated). Mirrors PageBuilder's `SavableFields`/`toSavable`. */
type SavableNodeFields = Pick<NodeDTO, 'type' | 'order' | 'layoutMode' | 'style' | 'layout' | 'props' | 'dataBinding' | 'repeat' | 'visibilityRules' | 'responsiveOverrides' | 'animationRef'>;

function toSavable(node: NodeDTO): SavableNodeFields {
    const { type, order, layoutMode, style, layout, props, dataBinding, repeat, visibilityRules, responsiveOverrides, animationRef } = node;
    return { type, order, layoutMode, style, layout, props, dataBinding, repeat, visibilityRules, responsiveOverrides, animationRef };
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
    // Task 5 (M1c) — toggles whether `handleDragStart`/`handleResizeStart` (below) round the
    // final committed x/y/width/height to the nearest `GRID_SIZE` multiple. Defaults to on
    // (matches most visual builders' default expectation); sibling-snap (computeSiblingSnap)
    // is NOT gated by this toggle — it's a separate, always-on mechanism (see handleDragStart).
    const [gridSnapEnabled, setGridSnapEnabled] = createSignal(true);
    // Task 4 (M1c) — imperative DOM-ref cache keyed by node id, fed by NodeRenderer.tsx's
    // `registerElement` calls (every rendered node registers/deregisters its own real
    // element on mount/cleanup). Deliberately a plain mutable Map, NOT a Solid signal/store:
    // it's a side-channel for drag/resize/rotate (Task 5/6) to read live bounding boxes off
    // of, not reactive UI state — nothing should re-render when an entry here changes.
    const elementRegistry = new Map<string, HTMLElement>();
    // Task 6 (M1c) — signal driving the rubber-band marquee `<div>`'s render (see
    // `<main>`'s `onPointerDown` and the `<Show>` right below it, further down this
    // component). `null` whenever no marquee gesture is in progress.
    const [marqueeRect, setMarqueeRect] = createSignal<{ left: number; top: number; right: number; bottom: number } | null>(null);
    // Phase 3 (Responsive) — manually-controlled canvas preview breakpoint (NOT
    // derived from the admin's real browser window). Drives canvasContext().device,
    // the canvas preview width (Task 4), and which responsiveOverrides bucket the
    // Style/Transform tabs read/write (Task 4).
    const [previewBreakpoint, setPreviewBreakpoint] = createSignal<Breakpoint>('desktop');

    createResource(pageId, async (id) => {
        setLoading(true);
        const list = await NodeService.getNodesByPage({ pageId: id });
        // Mixed-scalar codegen quirk (see node.types.ts's header comment) — same single
        // cast point resolveCmsPageProps.ts's `asJsonTyped` uses for the same reason.
        setNodes(list as unknown as NodeDTO[]);
        // M1d — `commandManager` is created once per component mount (line 230) but this
        // resource re-fires on every `pageId()` change even without a remount. No current
        // in-app UI switches `pageId` while this component stays mounted, but if one ever
        // does, the old stack's Commands would reference a completely different page's node
        // ids — same staleness this milestone fixes for version-restore, so reset here too
        // for defense-in-depth (see `reloadNodes()` below for the primary case).
        commandManager.reset();
        setLoading(false);
        return true;
    });

    const tree = () => buildNodeTree(nodes);
    /** Single-target UI (Inspector's 6 tabs are single-node forms) — the FIRST selected id
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

    /** Task 5 (M1c) — live visual feedback DURING a drag/resize gesture, applied directly to the
     * DOM (registered node element + its NodeCanvasOverlay sibling) rather than through
     * `setNodes`. This is NOT a stylistic choice — real-dev-server verification of this task
     * uncovered a genuine bug in the naive "call `setNodes` on every `pointermove`" approach:
     * `buildNodeTree` (buildNodeTree.ts) allocates a BRAND NEW plain object (`{ ...node, children:
     * ... }`) for EVERY node on EVERY call, with no memoization — so `tree()` returns entirely new
     * object references on every single store write, even for nodes nothing changed about. Solid's
     * `<For each={tree()}>` (NodeBuilderPageContent's canvas render, NodeChildrenList) diffs by
     * REFERENCE identity, so it treats every node as "new" and UNMOUNTS + REMOUNTS its whole DOM
     * subtree on every store write. Confirmed via a REAL, trusted mouse-driven drag
     * (`page.locator(...).dragTo(...)`, not synthetic same-object event dispatch): the very FIRST
     * `pointermove`-triggered `setNodes` call remounts the dragged element, which per spec silently
     * RELEASES `setPointerCapture` the moment the captured element is removed from the document —
     * so the real drag's remaining `pointermove`/`pointerup` events never reach this element's
     * listeners at all. Symptom observed live: the node's LOCAL store position silently jumped to
     * the first delta and froze there (visible in the Inspector's X/Y fields), `pointerup` never
     * fired (no Command ever created — Undo stayed empty), and the position was never persisted
     * (confirmed via a direct `getNodesByPage` query showing the pre-drag value unchanged). This is
     * a pre-existing characteristic of `buildNodeTree`/`<For>` (affects every existing store
     * mutation in this file, not something Task 5 introduced) — it only became CRITICALLY visible
     * here because this is the first feature that mutates the store many times per second during a
     * single continuous browser-native pointer-capture gesture.
     *
     * Fix, scoped entirely to this task (no change to `buildNodeTree.ts`/`NodeRenderer.tsx`'s
     * render path — smaller, more correctly-scoped, and also just objectively better for a
     * 60-updates/sec interaction regardless of the remount bug): `onMove` below never calls
     * `setNodes` — it writes directly to the registered DOM element's `style.left/top/width/height`
     * (`elementRegistry`, wired in Task 4) plus the SAME 4 properties on its `NodeCanvasOverlay`
     * sibling (the selection ring + resize/rotate handles, which are positioned via Tailwind
     * classes relative to THAT wrapper's box, so patching its 4 inline-style dimensions alone
     * correctly repositions the ring and every handle too, with no further per-handle math needed).
     * The store is written to EXACTLY ONCE per gesture, at `pointerup`, via the Command's own
     * `execute()` — by which point the pointer has already been released, so a remount at that
     * point is harmless (nothing is relying on capture anymore). */
    function applyLiveNodeStyle(id: string, x: number, y: number, width?: number, height?: number) {
        const el = elementRegistry.get(id);
        if (!el) return;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        if (width !== undefined) el.style.width = `${width}px`;
        if (height !== undefined) el.style.height = `${height}px`;
        // NodeCanvasOverlay (Task 4) mounts as this exact element's immediate next DOM sibling
        // ONLY WHILE THE NODE IS SELECTED (NodeChildrenList: `<><NodeRenderer .../><Show
        // when={...selectedIds().has(id)}><NodeCanvasOverlay/></Show></>` — a Fragment, so both
        // are siblings under the same parent, but Solid renders NO placeholder for the `<Show>`
        // branch at all while it's false — there is no overlay element in the DOM whatsoever).
        // M1c final-review fix I3: a node can be legitimately UNSELECTED here — `handleDragStart`
        // fires on `pointerdown`, which happens BEFORE the `click`-driven `onSelectClick` runs,
        // so the very first drag on a not-yet-selected node reaches this function while it's
        // still unselected. In that case `el.nextElementSibling` is NOT this node's own overlay —
        // it's the NEXT SIBLING NODE's own wrapper div (confirmed live: patching it made an
        // unrelated neighboring node visibly fly along with the drag). Guarding on
        // `selection.isSelected(id)` first skips the patch entirely in that case — there is no
        // valid overlay to patch regardless, since it isn't even mounted.
        if (selection.isSelected(id)) {
            const overlayEl = el.nextElementSibling;
            if (overlayEl instanceof HTMLElement) {
                overlayEl.style.left = `${x}px`;
                overlayEl.style.top = `${y}px`;
                if (width !== undefined) overlayEl.style.width = `${width}px`;
                if (height !== undefined) overlayEl.style.height = `${height}px`;
            }
        }
    }

    /** Task 6 (M1c) — live rotate-angle preview, same DOM-direct-mutation rationale as
     * `applyLiveNodeStyle` above (writing to the store on every `pointermove` would
     * remount this element via `buildNodeTree`'s unstable object identity, silently
     * dropping `setPointerCapture` mid-gesture — see that function's header comment).
     * Only `transform` needs patching for a rotate gesture (x/y/width/height are
     * untouched) — applied to both the node's own element and its `NodeCanvasOverlay`
     * sibling, matching `applyNodeLayout.ts`'s/`NodeCanvasOverlay.tsx`'s own
     * `rotate(${deg}deg)` CSS so the live preview is pixel-identical to the eventual
     * committed render. */
    function applyLiveRotation(id: string, rotation: number) {
        const el = elementRegistry.get(id);
        if (!el) return;
        el.style.transform = rotation ? `rotate(${rotation}deg)` : '';
        // M1c final-review fix I3 — same guard as `applyLiveNodeStyle` above: the overlay
        // sibling only exists in the DOM while `id` is selected. Rotate is always single-node
        // and only reachable via the rotate HANDLE (which only renders once selected — see
        // `NodeCanvasOverlay`'s own `<Show when={!isMultiSelect}>` gate), so this guard is
        // mostly defensive here rather than a live-reproducible bug the way drag's was, but the
        // same DOM-shape assumption applies and deserves the same protection.
        if (selection.isSelected(id)) {
            const overlayEl = el.nextElementSibling;
            if (overlayEl instanceof HTMLElement) overlayEl.style.transform = rotation ? `rotate(${rotation}deg)` : '';
        }
    }

    /** Task 5 (M1c) — drag-to-reposition. `pointerdown` starts on the node's own wrapper div
     * (NodeRenderer.tsx), routed here via `builderSelection.onDragStart`. Attaches
     * `pointermove`/`pointerup` to the SAME element (not `window`) via `setPointerCapture`, per
     * the brief's explicit instruction — capture keeps routing events to `target` even once the
     * pointer leaves its bounds, so no manual `window` listener add/remove (and no leak risk) is
     * needed.
     *
     * Known gap flagged by the brief, resolved here: a single bulk `setNodes((n) =>
     * draggedIds.includes(...), 'layout', (l) => {...})` predicate-update call cannot look up
     * each matched node's OWN starting layout (the updater only receives the CURRENT layout `l`,
     * never the node's id) — every dragged node would incorrectly delta from the SAME shared
     * `start`. Checked this codebase's real store idiom (nodeCommands.ts's `applyAndPersist`/
     * `createDragNodesCommand` — `setNodes(produce((nodes) => { nodes[idx].field = ...; }))`,
     * confirmed no `setNodes(predicate, field, updater)` 3-arg overload is used anywhere real in
     * this file) — so the FINAL commit (onUp, below) loops `draggedIds` individually, looking up
     * each one's own `startLayouts.get(id)` by id — this is what actually resolves the gap (the
     * LIVE per-frame preview below reads the same per-id `startLayouts` map, for the same reason).
     * Verified against a 2-node hand-trace: A starts at (0,0), B starts at (50,50), both
     * selected+dragged by dx=10/dy=5 => A ends at (10,5), B ends at (60,55) — each uses its OWN
     * start, not a shared one; confirmed live via the real multi-select drag test too (2 nodes at
     * different starting x/y, dragged together, each snapped independently from its OWN resulting
     * position).
     */
    /** M1c final-review fix I2 — shared by `handleDragStart` below and `canvasContext()`'s own
     * `builderSelection.isDraggableParent` (further down this file): only a node whose PARENT
     * lays its children out via `layoutMode='free'` can be dragged/resized/rotated at all.
     * Extracted to one function so both call sites agree on the exact same definition. */
    const isDraggableParent = (parentId: string | undefined) => nodes.find((n) => n.id === parentId)?.layoutMode === 'free';

    const handleDragStart = (draggedId: string, e: PointerEvent) => {
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        // M1c final-review fix I2 — a marquee/Shift-click selection can contain a mix of
        // free-layout and flow-layout nodes (or an ancestor FRAME alongside its own children,
        // which marquee hit-testing naturally catches). NodeRenderer.tsx already gates the
        // ANCHOR node (`draggedId`) on `isDraggableParent` before ever calling this handler, but
        // the REST of a multi-selection isn't gated at all — filtering here, before any live DOM
        // mutation / before the `moves` array is built, keeps non-draggable nodes out of the
        // gesture entirely (not moved, not included in the resulting Command): otherwise this
        // would write bogus persisted `layout.x/y` onto a flow-layout node (invisible today since
        // `applyChildLayout`'s flow branch ignores x/y, but a real latent data-corruption risk if
        // that node's parent is ever switched to 'free' layout later).
        const rawDraggedIds = selection.isSelected(draggedId) ? [...selection.selectedIds()] : [draggedId];
        const draggedIds = rawDraggedIds.filter((id) => isDraggableParent(nodes.find((n) => n.id === id)?.parentId));
        // M1c final-review fix I1 — see `pendingPatches`/`patchSelected`'s header comment below.
        // An Inspector edit on one of these SAME nodes may still have a debounced Command
        // pending (fires up to 600ms after the last keystroke, reading `after` fresh from the
        // store AT COMMIT TIME). If that timer fires after this drag's own Command has already
        // committed, its `after` would silently absorb this drag's result, corrupting the undo
        // chain. `dropPendingPatch` flushes that pending edit into its own Command right now
        // (see its own header comment for why this changed from a bare discard) — `startLayouts`
        // (read fresh, right below) then naturally carries the now-committed value forward as
        // this gesture's own `layoutBefore`, so nothing races this Command either way.
        draggedIds.forEach((id) => dropPendingPatch(id));
        const startLayouts = new Map<string, LayoutProps>(draggedIds.map((id) => [id, { ...(nodes.find((n) => n.id === id)?.layout ?? {}) }]));
        let hasMoved = false;
        let lastDx = 0;
        let lastDy = 0;
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const onMove = (moveEvent: PointerEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            if (!hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            hasMoved = true;
            lastDx = dx;
            lastDy = dy;
            // Live preview only — NOT `setNodes` (see `applyLiveNodeStyle`'s header comment on why).
            for (const id of draggedIds) {
                const start = startLayouts.get(id)!;
                applyLiveNodeStyle(id, (start.x ?? 0) + dx, (start.y ?? 0) + dy);
            }
        };

        // M1c final-review fix M4 — shared cleanup for both the normal (`onUp`) and interrupted
        // (`onCancel`) gesture endings, so neither path can forget to remove any of the 3
        // listeners this gesture attaches.
        const cleanup = () => {
            target.removeEventListener('pointermove', onMove);
            target.removeEventListener('pointerup', onUp);
            target.removeEventListener('pointercancel', onCancel);
        };

        const onUp = (upEvent: PointerEvent) => {
            target.releasePointerCapture(upEvent.pointerId);
            cleanup();
            if (!hasMoved) return; // was a click, not a drag — selection click handler already ran
            suppressGhostClick();

            // Apply snap (grid + sibling) to each dragged node's FINAL raw (unsnapped) position,
            // then commit exactly ONE Command for the whole gesture. Sibling-snap is computed
            // against this node's OWN direct siblings (same parentId), excluding every OTHER
            // dragged node (so 2 nodes being dragged together never magnet onto each other) —
            // built from their live `layout.x/y/width/height` (layout-space), never
            // `getBoundingClientRect()` (screen-space), per snapMath.ts's whole design premise.
            const moves = draggedIds.map((id) => {
                const start = startLayouts.get(id)!;
                const rawX = (start.x ?? 0) + lastDx;
                const rawY = (start.y ?? 0) + lastDy;
                const width = start.width ?? 0;
                const height = start.height ?? 0;
                const parentId = nodes.find((n) => n.id === id)?.parentId;
                const siblingRects = nodes
                    .filter((n) => n.id !== id && !draggedIds.includes(n.id ?? '') && n.parentId === parentId)
                    .map((n) => rectFromXYWH(n.layout?.x ?? 0, n.layout?.y ?? 0, n.layout?.width ?? 0, n.layout?.height ?? 0));
                const siblingSnap = computeSiblingSnap(rectFromXYWH(rawX, rawY, width, height), siblingRects, SIBLING_SNAP_THRESHOLD);
                const x = siblingSnap.x ?? (gridSnapEnabled() ? snapToGrid(rawX, GRID_SIZE) : rawX);
                const y = siblingSnap.y ?? (gridSnapEnabled() ? snapToGrid(rawY, GRID_SIZE) : rawY);
                return { id, layoutBefore: start, layoutAfter: { ...start, x, y } };
            });

            // Exactly ONE Command per gesture (never per pointermove frame): single-node drag
            // reuses `createUpdateNodePropertyCommand` (Task 2), multi-node reuses
            // `createDragNodesCommand` (Task 2) — its `execute()` re-applies `layoutAfter` to the
            // store itself, so no separate manual `setNodes` call is needed here first (the live
            // per-frame `onMove` updates already gave instant visual feedback with the RAW,
            // unsnapped delta; this corrects the store to the final snapped value in the same
            // store write the Command's `execute()` already performs).
            const command = moves.length === 1
                ? createUpdateNodePropertyCommand(moves[0].id, { layout: moves[0].layoutBefore }, { layout: moves[0].layoutAfter }, () => nodes, setNodes)
                : createDragNodesCommand(moves, () => nodes, setNodes);
            commandManager.run(command).catch(() => toast().danger(t('cms.toasts.saveFailed')));
        };

        // M1c final-review fix M4 — if the browser cancels the pointer mid-gesture
        // (`pointercancel` — touch/pen interruption, OS-level gesture conflicts, etc.), no
        // `pointerup` ever fires, so without this the 3 listeners above would stay attached
        // forever: the NEXT unrelated gesture on this same element would then run 2 `onUp`
        // handlers, creating 2 Commands instead of 1 (violating "exactly one Command per
        // gesture") — the stale one operating on this interrupted gesture's now-stale
        // `startLayouts`. Treated as a pure abort: remove all listeners, commit nothing.
        // Later final-review fix — `onMove`'s live DOM mutation must NOT be left as-is: the
        // element's inline `left`/`top` stay at their last live-dragged value even though the
        // store was never written, visually displacing the node until an unrelated store write
        // happens to remount it. Snap the DOM straight back to each dragged node's OWN
        // pre-gesture position (`startLayouts`, already captured in this closure) using the
        // exact same `applyLiveNodeStyle` helper `onMove` writes through, so a cancelled drag
        // visually reverts instantly instead of waiting on some unrelated future remount.
        const onCancel = () => {
            cleanup();
            for (const id of draggedIds) {
                const start = startLayouts.get(id)!;
                applyLiveNodeStyle(id, start.x ?? 0, start.y ?? 0, start.width, start.height);
            }
        };

        target.addEventListener('pointermove', onMove);
        target.addEventListener('pointerup', onUp);
        target.addEventListener('pointercancel', onCancel);
    };

    /** Task 5 (M1c) — resize via 1 of the 8 handles (NodeCanvasOverlay.tsx), routed here via
     * `builderSelection.onResizeStart` (already wired by NodeChildrenList/NodeRenderer.tsx —
     * Task 4). Resize is always single-node (handles only render for single-select, per Task 3's
     * `isMultiSelect` gate on `NodeCanvasOverlay`), so this reuses `createUpdateNodePropertyCommand`
     * — no separate "resize Command" type. Same pointer-capture pattern as `handleDragStart`. */
    const handleResizeStart = (nodeId: string, handle: ResizeHandle, e: PointerEvent) => {
        e.stopPropagation();
        // M1c final-review fix I1 — see `handleDragStart`'s matching comment above: flush any
        // pending debounced Inspector-edit Command for THIS node before snapshotting
        // `startLayout`, so it can't silently absorb this gesture's result later.
        dropPendingPatch(nodeId);
        const startX = e.clientX;
        const startY = e.clientY;
        const startLayout: LayoutProps = { ...(nodes.find((n) => n.id === nodeId)?.layout ?? {}) };
        // M1c final-review fix I4 — `startLayout.width`/`height` is `undefined` for every
        // freshly-created node (no `layout` at all yet — `handleAdd`/`createAddNodeCommand`
        // sends no `layout` field). Falling back straight to `0` here made the FIRST resize
        // attempt on such a node snap from its real (content-sized, non-zero) rendered size
        // down to near-zero on the very first `pointermove`. Falling back to the ACTUAL
        // rendered element's size (`elementRegistry`, Task 4's live DOM-ref cache) instead
        // seeds the resize-start dimensions correctly.
        //
        // Residual-bug fix (post-I4) — a freshly-created, still-EMPTY node (no explicit
        // layout AND no real content yet) genuinely measures 0×0 (`el?.offsetWidth`/
        // `offsetHeight` really are 0 for an empty `<div>`), so the fallback above still
        // bottomed out at 0 in exactly that case. `NodeCanvasOverlay`'s selection box now
        // floors its OWN fallback at `MIN_FALLBACK_SIZE` (only when the measured size is
        // itself 0 — see that file's constant doc comment) so it's always visibly
        // grabbable, so this seed needs the SAME floor with the SAME zero-only condition
        // (`||`, not `Math.max` — a small-but-real size like an 8px icon must seed the
        // resize from its true 8px, not get bumped to 40) — otherwise, for the genuinely-
        // 0×0 case specifically, the visible box would show 40×40 while a resize gesture on
        // it started computing deltas from a 0×0 basis, making the node visually jump/snap
        // on the very first `pointermove` instead of resizing smoothly from the box the
        // user can actually see. `MIN_FALLBACK_SIZE` stays as the final fallback for the
        // (shouldn't-happen-but-defensive) case the element isn't registered yet (`el?.offsetWidth`/
        // `offsetHeight` is `undefined` then, so `|| MIN_FALLBACK_SIZE` applies) — NOT `0`, which
        // is stale wording from before this floor existed.
        const el = elementRegistry.get(nodeId);
        const start = {
            x: startLayout.x ?? 0,
            y: startLayout.y ?? 0,
            width: startLayout.width ?? (el?.offsetWidth || MIN_FALLBACK_SIZE),
            height: startLayout.height ?? (el?.offsetHeight || MIN_FALLBACK_SIZE),
        };
        let hasMoved = false;
        let lastRect = start;
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const onMove = (moveEvent: PointerEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            if (!hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            hasMoved = true;
            // Clamped to minimum 1 DURING the drag (not just at commit) — computeResizeRect
            // applies `Math.max(1, ...)` internally, same clamp expression NodeTransformTab.tsx's
            // width/height fields already use.
            lastRect = computeResizeRect(handle, start, dx, dy);
            // Live preview only — NOT `setNodes` (see `applyLiveNodeStyle`'s header comment, right
            // before `handleDragStart` above, on why: a per-pointermove `setNodes` call remounts
            // this element via `buildNodeTree`'s unstable object identity, which silently breaks
            // `setPointerCapture` mid-gesture for a real mouse-driven resize the exact same way it
            // does for drag).
            applyLiveNodeStyle(nodeId, lastRect.x, lastRect.y, lastRect.width, lastRect.height);
        };

        // M1c final-review fix M4 — same shared-cleanup rationale as `handleDragStart` above.
        const cleanup = () => {
            target.removeEventListener('pointermove', onMove);
            target.removeEventListener('pointerup', onUp);
            target.removeEventListener('pointercancel', onCancel);
        };

        const onUp = (upEvent: PointerEvent) => {
            target.releasePointerCapture(upEvent.pointerId);
            cleanup();
            if (!hasMoved) return;
            suppressGhostClick();

            // Grid-snap the final width/height/x/y if enabled (no sibling-snap for resize — only
            // drag gets sibling-snap, per the brief). Re-clamp to 1 AFTER snapping too:
            // `snapToGrid` rounding a width/height that's already right at the 1px clamp floor
            // down to 0 (e.g. a 3px height rounds to 0 at an 8px grid) would silently violate the
            // min-1 invariant this whole step exists to enforce.
            const finalX = gridSnapEnabled() ? snapToGrid(lastRect.x, GRID_SIZE) : lastRect.x;
            const finalY = gridSnapEnabled() ? snapToGrid(lastRect.y, GRID_SIZE) : lastRect.y;
            const finalWidth = gridSnapEnabled() ? Math.max(1, snapToGrid(lastRect.width, GRID_SIZE)) : lastRect.width;
            const finalHeight = gridSnapEnabled() ? Math.max(1, snapToGrid(lastRect.height, GRID_SIZE)) : lastRect.height;
            const layoutAfter: LayoutProps = { ...startLayout, x: finalX, y: finalY, width: finalWidth, height: finalHeight };

            // Exactly ONE Command per gesture — `createUpdateNodePropertyCommand`'s `execute()`
            // re-applies `layoutAfter` to the store itself (same reasoning as `handleDragStart`'s
            // onUp above), so no separate manual `setNodes` call is needed here.
            const command = createUpdateNodePropertyCommand(nodeId, { layout: startLayout }, { layout: layoutAfter }, () => nodes, setNodes);
            commandManager.run(command).catch(() => toast().danger(t('cms.toasts.saveFailed')));
        };

        // M1c final-review fix M4 — see `handleDragStart`'s matching `onCancel` comment above
        // (flush-then-revert, not leave-as-is). `start` is this gesture's own pre-resize
        // rect (already captured in this closure), written back via the same
        // `applyLiveNodeStyle` helper `onMove` uses.
        const onCancel = () => {
            cleanup();
            applyLiveNodeStyle(nodeId, start.x, start.y, start.width, start.height);
        };

        target.addEventListener('pointermove', onMove);
        target.addEventListener('pointerup', onUp);
        target.addEventListener('pointercancel', onCancel);
    };

    /** Task 6 (M1c) — rotate via the single rotate handle (`NodeCanvasOverlay.tsx`),
     * routed here via `builderSelection.onRotateStart`. Same `setPointerCapture`
     * gesture-tracking pattern as `handleDragStart`/`handleResizeStart` above (incl. the
     * `DRAG_THRESHOLD` hasMoved check — measured against the pointer's OWN travel from
     * gesture start, not against the node's center, so a plain click on the handle with
     * no real movement still doesn't commit a Command — and `suppressGhostClick()` on
     * release, for the identical reason those 2 handlers need it: a real mouse-driven
     * rotate gesture retargets its post-release synthetic `click` to this captured
     * handle the same way drag/resize's captured elements do).
     *
     * Unlike drag/resize (which stay entirely in layout-space), the angle math genuinely
     * needs real on-screen geometry — the node's center in VIEWPORT space (`clientX`/
     * `clientY` are viewport-relative), read ONCE at gesture start via
     * `elementRegistry.get(nodeId)?.getBoundingClientRect()` (Task 4's DOM-ref cache) —
     * this is the one place in the whole M1c feature set where screen-space measurement
     * is correct to reach for, since layout x/y wouldn't account for scroll/ancestor
     * transforms the way a live `getBoundingClientRect()` does.
     *
     * Per spec §4.5 (and the brief's own explicit instruction): the raw angle is NOT
     * normalized during the live preview (`lastAngle` can hold values outside
     * [-180, 180], e.g. up to ~270, since `atan2`'s [-180,180] result is shifted by the
     * handle's +90 offset) — `normalizeRotation` (Task 1) is applied exactly once, at
     * `pointerup`, right before the single committed Command. Always single-node (the
     * rotate handle only renders for single-select, same `isMultiSelect` gate
     * `NodeCanvasOverlay` already applies to its resize handles too) — reuses
     * `createUpdateNodePropertyCommand`, no separate Command type needed. */
    const handleRotateStart = (nodeId: string, e: PointerEvent) => {
        e.stopPropagation();
        const el = elementRegistry.get(nodeId);
        if (!el) return;
        // M1c final-review fix I1 — see `handleDragStart`'s matching comment above (flush,
        // not discard).
        dropPendingPatch(nodeId);
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const startX = e.clientX;
        const startY = e.clientY;
        const startLayout: LayoutProps = { ...(nodes.find((n) => n.id === nodeId)?.layout ?? {}) };
        let hasMoved = false;
        let lastAngle = startLayout.rotation ?? 0;
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const onMove = (moveEvent: PointerEvent) => {
            const moveDx = moveEvent.clientX - startX;
            const moveDy = moveEvent.clientY - startY;
            if (!hasMoved && Math.hypot(moveDx, moveDy) < DRAG_THRESHOLD) return;
            hasMoved = true;
            const dx = moveEvent.clientX - centerX;
            const dy = moveEvent.clientY - centerY;
            // +90 because the handle sits above center (12 o'clock = 0°) — see the
            // brief's own derivation (task-6-brief.md Step 1).
            let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
            if (moveEvent.shiftKey) angle = Math.round(angle / 15) * 15;
            lastAngle = angle;
            // Live preview only — NOT `setNodes` (see `applyLiveRotation`'s header comment on why).
            applyLiveRotation(nodeId, angle);
        };

        // M1c final-review fix M4 — same shared-cleanup rationale as `handleDragStart` above.
        const cleanup = () => {
            target.removeEventListener('pointermove', onMove);
            target.removeEventListener('pointerup', onUp);
            target.removeEventListener('pointercancel', onCancel);
        };

        const onUp = (upEvent: PointerEvent) => {
            target.releasePointerCapture(upEvent.pointerId);
            cleanup();
            if (!hasMoved) return;
            suppressGhostClick();

            const layoutAfter: LayoutProps = { ...startLayout, rotation: normalizeRotation(lastAngle) };
            const command = createUpdateNodePropertyCommand(nodeId, { layout: startLayout }, { layout: layoutAfter }, () => nodes, setNodes);
            commandManager.run(command).catch(() => toast().danger(t('cms.toasts.saveFailed')));
        };

        // M1c final-review fix M4 — see `handleDragStart`'s matching `onCancel` comment above
        // (flush-then-revert, not leave-as-is). Reverts to this gesture's own pre-rotate angle
        // (`startLayout.rotation`, already captured in this closure) via the same
        // `applyLiveRotation` helper `onMove` uses.
        const onCancel = () => {
            cleanup();
            applyLiveRotation(nodeId, startLayout.rotation ?? 0);
        };

        target.addEventListener('pointermove', onMove);
        target.addEventListener('pointerup', onUp);
        target.addEventListener('pointercancel', onCancel);
    };

    const canvasContext = (): NodeRenderContext => ({
        ...EMPTY_CONTEXT,
        device: previewBreakpoint,
        builderSelection: {
            isSelected: (id: string) => selection.isSelected(id),
            onSelectClick: (id: string, e: MouseEvent) => {
                e.stopPropagation();
                if (e.shiftKey) selection.selectRange(id, visibleOrderIds());
                else if (e.ctrlKey || e.metaKey) selection.toggle(id);
                else selection.select(id);
            },
            // Task 4 (M1c) wiring, now live as of Task 5/6: `onDragStart`/`onResizeStart`/
            // `onRotateStart` all call the real handlers defined above.
            onDragStart: handleDragStart,
            onResizeStart: handleResizeStart,
            onRotateStart: handleRotateStart,
            selectedIds: () => selection.selectedIds(),
            registerElement: (id: string, el: HTMLElement | null) => {
                if (el) elementRegistry.set(id, el);
                else elementRegistry.delete(id);
            },
            // M1c final-review fix I2 — reuses the SAME `isDraggableParent` helper `handleDragStart`
            // filters its multi-drag selection with (defined right above that handler), instead of
            // re-deriving the identical `layoutMode === 'free'` check a second time here.
            isDraggableParent,
            // M1c final-review fix I4 — see node.types.ts's `getElementSize` doc comment /
            // `NodeCanvasOverlay`'s `fallbackSize` prop: real rendered size, read straight off the
            // same `elementRegistry` `registerElement` (right above) writes into.
            getElementSize: (id: string) => {
                const el = elementRegistry.get(id);
                return el ? { width: el.offsetWidth, height: el.offsetHeight } : undefined;
            },
        },
    });

    /** Task 4 forward-looking concern #1 — see the file header comment. Keyed by node id
     * (not a single shared pending value) so switching the Inspector's target node mid-edit
     * can't corrupt/drop a still-pending window for the PREVIOUS node — each node id gets
     * its own independent debounce timer + "before" snapshot. */
    const pendingPatches = new Map<string, { before: SavableNodeFields; commit: Scheduled<[]> }>();

    /** M1c final-review fix I1, revised by a later final-review fix (see this function's own
     * former "discard" behavior below) — used by `handleDragStart`/`handleResizeStart`/
     * `handleRotateStart` (all defined above, but this is a closure captured lazily at call
     * time — see those handlers' own comments) to settle a still-pending debounced
     * Inspector-edit Command for a node a gesture is about to start manipulating.
     *
     * Originally this just cleared the timer and deleted the map entry, relying on the
     * gesture's own `startLayout`/`before` snapshot (read fresh right after this call) to
     * naturally carry the already-applied store mutation forward as part of its own Command.
     * That works when the gesture goes on to COMMIT something — but 3 paths call this and then
     * commit NOTHING: a plain click (`hasMoved` stays `false` in each of `handleDragStart`/
     * `handleResizeStart`/`handleRotateStart`'s own `onUp`) and all 3 `onCancel` paths. In those
     * cases the discarded patch was never turned into a Command at all: the edit stayed visible
     * in the local store (nothing looked wrong) but was never persisted to the server and had no
     * undo entry — silently lost on reload, and untouchable by Undo.
     *
     * Fixed to flush-then-clear instead of discard-then-clear: build+run the SAME Command the
     * debounced timer would have built once it fired (identical shape to `patchSelected`'s own
     * `commit` callback below — `pending.before` as the Command's `before`, and a snapshot of
     * the CURRENT store state as its `after`), then clear the timer/map entry. The `after`
     * snapshot is taken HERE, synchronously, strictly before the gesture that called this reads
     * its own `startLayout` — so it still can't absorb the gesture's later result — while
     * guaranteeing the pending edit is never silently dropped, no matter how the gesture ends. */
    const dropPendingPatch = (id: string) => {
        const pending = pendingPatches.get(id);
        if (!pending) return;
        pending.commit.clear();
        pendingPatches.delete(id);
        const curIdx = nodes.findIndex((n) => n.id === id);
        if (curIdx === -1) return;
        commandManager
            .run(createUpdateNodePropertyCommand(id, pending.before, toSavable(nodes[curIdx]), () => nodes, setNodes))
            .catch(() => toast().danger(t('cms.toasts.saveFailed')));
    };

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
            // Phase 1d — the whole tree just got replaced with fresh server data (all-new
            // node ids); every Command still on either stack now references ids that no
            // longer exist. The `idx === -1` guards in the Command factories keep this from
            // crashing, but leaving the stacks populated shows a stale "available" Undo/Redo
            // state whose buttons silently do nothing when clicked. Reset regardless of why
            // reloadNodes() was called (not just Version History restore).
            commandManager.reset();
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
                    {/* Task 5 (M1c) — grid-snap toggle. Same `sm outline` props as the Undo/Redo
                        buttons above (per the task brief); the pressed/unpressed state is conveyed
                        by swapping the icon's solid/outline variant and its color, since `Button`'s
                        own `selected` prop (checked: declared in ButtonProps but never actually read
                        anywhere inside Button.tsx) has no visual effect to lean on — same
                        `solid={...}`-style state-driven prop pattern ButtonGroup.tsx's `isStrong()`
                        toggle already uses elsewhere in this codebase. */}
                    <Button
                        sm
                        outline
                        color={gridSnapEnabled() ? 'brand' : 'neutral'}
                        tooltip={t('cms.nodeBuilder.gridSnapToggleTooltip')}
                        onClick={() => setGridSnapEnabled((v) => !v)}
                    >
                        <Icon name={gridSnapEnabled() ? 'heroicons-solid:squares-2x2' : 'heroicons-outline:squares-2x2'} />
                    </Button>
                    <Button sm outline onClick={() => setHistoryOpen(true)}>
                        <Icon name="heroicons-outline:clock" /> {t('cms.builder.historyButton')}
                    </Button>
                </div>
            </div>

            <div class="relative flex flex-1 min-h-0 overflow-hidden">
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

                <main
                    class="flex-1 overflow-auto bg-neutral-100"
                    // Task 6 (M1c) — replaces the old plain `onClick={() => selection.clear()}`.
                    // Reuses `window`-level listeners (NOT `setPointerCapture`) since this
                    // gesture starts on `<main>` itself, a large area the pointer is expected
                    // to stay within, but `window` is more robust if the user drags fast enough
                    // to momentarily exit its bounds — see task-6-brief.md Step 2.
                    onPointerDown={(e) => {
                        if (e.target !== e.currentTarget) return; // clicked on a node, not empty canvas — let its own handler run
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const additive = e.shiftKey;
                        // M1c final-review fix M2 — the plan's Global Constraints mandate the SAME
                        // 3px click-vs-drag threshold (`DRAG_THRESHOLD`, already used by node
                        // drag/resize/rotate above) for the marquee gesture too. Without this, ANY
                        // pointer jitter on a plain click on empty canvas (however tiny) started
                        // rendering the rubber-band `<div>` and ran the hit-test branch below instead
                        // of the plain-click "clear selection" branch. `hasMoved` gates BOTH: `rect`
                        // only starts getting set (so the marquee div only starts rendering, and the
                        // gesture only starts counting as a real marquee) once the pointer has
                        // actually travelled past the threshold — below that, `rect` stays `null`,
                        // so `onUp` naturally falls back to the existing plain-click behavior.
                        let hasMoved = false;
                        let rect: { left: number; top: number; right: number; bottom: number } | null = null;
                        const onMove = (moveEvent: PointerEvent) => {
                            if (!hasMoved) {
                                if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < DRAG_THRESHOLD) return;
                                hasMoved = true;
                            }
                            rect = {
                                left: Math.min(startX, moveEvent.clientX),
                                top: Math.min(startY, moveEvent.clientY),
                                right: Math.max(startX, moveEvent.clientX),
                                bottom: Math.max(startY, moveEvent.clientY),
                            };
                            setMarqueeRect(rect);
                        };
                        const onUp = () => {
                            window.removeEventListener('pointermove', onMove);
                            window.removeEventListener('pointerup', onUp);
                            if (!rect) {
                                if (!additive) selection.clear(); // no movement = plain click on empty canvas
                            } else {
                                const hitIds: string[] = [];
                                for (const [id, el] of elementRegistry) {
                                    const r = el.getBoundingClientRect();
                                    const intersects = r.left < rect!.right && r.right > rect!.left && r.top < rect!.bottom && r.bottom > rect!.top;
                                    if (intersects) hitIds.push(id);
                                }
                                if (!additive) selection.clear();
                                // NodeSelectionContext (Phase 1a) has no bulk-set/"add all" method —
                                // `select(id)` REPLACES the whole selection (clears + sets a fresh
                                // anchor) and `toggle(id)` flips a single id, so blindly `toggle`-ing
                                // every hit id would incorrectly DESELECT any hit that was already
                                // selected (e.g. re-dragging a marquee over an already-selected node
                                // in additive mode). Only toggling ids NOT already selected correctly
                                // adds new hits while leaving the rest of the selection (existing
                                // selected ids, additive or not) untouched.
                                hitIds.forEach((id) => { if (!selection.isSelected(id)) selection.toggle(id); });
                            }
                            setMarqueeRect(null);
                        };
                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp);
                    }}
                >
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
                            <div
                                class={mergeClass(
                                    'bg-white mx-auto transition-[max-width]',
                                    previewBreakpoint() === 'mobile' ? 'max-w-[375px]' : previewBreakpoint() === 'tablet' ? 'max-w-[768px]' : 'min-w-[1024px]',
                                )}
                            >
                                <For each={tree()}>
                                    {(root) => <NodeRenderer node={root} context={canvasContext()} />}
                                </For>
                            </div>
                        </Show>
                    </Show>
                </main>

                {/* Task 6 (M1c) — rubber-band marquee visual, driven by `marqueeRect` above.
                    `position: fixed` (not `absolute`) since `clientX`/`clientY` (and therefore
                    `marqueeRect`'s coordinates) are VIEWPORT-relative, not `<main>`-relative.
                    `pointer-events-none` so it never itself becomes an event target (the drag
                    is tracked via `window` listeners regardless of what's under the cursor). */}
                <Show when={marqueeRect()}>
                    {(r) => (
                        <div
                            class="pointer-events-none fixed z-[100000] border border-dashed border-sky-500 bg-sky-500/10"
                            style={{ left: `${r().left}px`, top: `${r().top}px`, width: `${r().right - r().left}px`, height: `${r().bottom - r().top}px` }}
                        />
                    )}
                </Show>

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
                    simultaneous Layers-panel interaction, and outside-click-to-close is expected there.

                    Real-verification fix (Phase 1b Task 3) — this panel used to be a SIBLING of this
                    content row, positioned `fixed inset-y-0 ... h-screen`, i.e. anchored to the entire
                    viewport starting at y=0. That made its full-height bounding box physically cover the
                    toolbar row above (Undo/Redo/History buttons), since the toolbar is not itself fixed
                    or elevated — clicking those buttons while any node was selected actually hit this
                    panel's own content div (confirmed live via document.elementFromPoint()), not the
                    button underneath. Moved into this row (`<div class="relative flex flex-1 min-h-0">`)
                    and switched `fixed`/`h-screen` to `absolute` (dropping `h-screen` — `inset-y-0` on an
                    `absolute` element inside a `relative` parent already spans exactly that parent's
                    height, which starts below the toolbar in normal flow). This is now structurally
                    impossible to regress back onto the toolbar without also moving it out of this row. */}
                <div
                    class={`absolute inset-y-0 right-0 z-30 flex w-full max-w-[480px] flex-col border-l border-neutral-200 bg-white shadow-2xl transition-transform duration-300 ${
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
                        {/* Multi-select + Inspector: the 6 tabs below are single-node forms (no
                            multi-edit support in this milestone) — rather than silently editing an
                            arbitrary one of several selected nodes, the Inspector is replaced by a
                            clear hint whenever more than 1 node is selected. */}
                        <Show
                            when={!isMultiSelected()}
                            fallback={<div class="p-6 text-center text-sm text-neutral-500">{t('cms.nodeBuilder.multiSelectionHint')}</div>}
                        >
                            <Show when={selected()}>
                                {/* Phase 3 (Responsive) Task 4 — Desktop/Tablet/Mobile preview
                                    switcher. Drives `previewBreakpoint` (passed as `device` into
                                    `canvasContext()`, wired since Task 1) so the canvas re-renders
                                    under the selected breakpoint's cascade, and gates which
                                    `responsiveOverrides` bucket the Style/Transform tabs below
                                    read/write (see the two mounts further down). */}
                                <div class="flex items-center gap-1 border-b border-neutral-200 p-2">
                                    <span class="mr-2 text-xs font-medium text-neutral-500">{t('cms.node.responsive.switcherLabel')}</span>
                                    <For each={(['desktop', 'tablet', 'mobile'] as const)}>
                                        {(bp) => (
                                            <button
                                                type="button"
                                                class={mergeClass(
                                                    'rounded px-2 py-1 text-xs',
                                                    previewBreakpoint() === bp ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                                                )}
                                                onClick={() => setPreviewBreakpoint(bp)}
                                            >
                                                {t(`cms.node.responsive.${bp}` as any)}
                                            </button>
                                        )}
                                    </For>
                                </div>
                                <Show when={previewBreakpoint() !== 'desktop'}>
                                    <p class="border-b border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                                        {t('cms.node.responsive.overrideHint').replace('{breakpoint}', t(`cms.node.responsive.${previewBreakpoint()}` as any))}
                                    </p>
                                </Show>

                                {/* layoutMode isn't covered by any of the 6 tabs (NodeStyleTab's
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
                                        layout={
                                            previewBreakpoint() === 'desktop' ? selected()?.layout
                                            : previewBreakpoint() === 'tablet' ? selected()?.responsiveOverrides?.tablet?.layout
                                            : selected()?.responsiveOverrides?.mobile?.layout
                                        }
                                        onChange={(next) => patchSelected((n) => {
                                            if (previewBreakpoint() === 'desktop') { n.layout = next; return; }
                                            n.responsiveOverrides = {
                                                ...n.responsiveOverrides,
                                                [previewBreakpoint()]: { ...n.responsiveOverrides?.[previewBreakpoint() as 'tablet' | 'mobile'], layout: next },
                                            };
                                        })}
                                    />
                                </Show>

                                <NodeContentTab
                                    node={{ ...selected()!, children: [] }}
                                    onChange={(p) => patchSelected((n) => { n.props = p; })}
                                />

                                <Show when={selectedCapabilities()?.style}>
                                    <NodeStyleTab
                                        style={
                                            previewBreakpoint() === 'desktop' ? selected()?.style
                                            : previewBreakpoint() === 'tablet' ? selected()?.responsiveOverrides?.tablet?.style
                                            : selected()?.responsiveOverrides?.mobile?.style
                                        }
                                        onChange={(s) => patchSelected((n) => {
                                            if (previewBreakpoint() === 'desktop') { n.style = s; return; }
                                            n.responsiveOverrides = {
                                                ...n.responsiveOverrides,
                                                [previewBreakpoint()]: { ...n.responsiveOverrides?.[previewBreakpoint() as 'tablet' | 'mobile'], style: s },
                                            };
                                        })}
                                    />
                                </Show>

                                <Show when={selectedCapabilities()?.repeat}>
                                    <NodeDataSourceTab
                                        repeat={selected()!.repeat}
                                        nodeType={selected()!.type ?? ''}
                                        onChange={(next) => patchSelected((n) => { n.repeat = next ?? undefined; })}
                                        columnsOrSlots={selected()!.props}
                                        onColumnsOrSlotsChange={(next) => patchSelected((n) => { n.props = { ...n.props, ...next }; })}
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

                                <Show when={selectedCapabilities()?.animation && !MIGRATION_ONLY_NODE_TYPES.has(selected()!.type ?? '')}>
                                    <NodeAnimationTab
                                        timeline={selected()!.animationRef}
                                        onChange={(next) => patchSelected((n) => { n.animationRef = next; })}
                                    />
                                </Show>
                            </Show>
                        </Show>
                    </div>
                </div>
            </div>

            <Slideout id="node-builder-palette" isOpen={paletteOpen()} onClose={() => setPaletteOpen(false)} class="w-full max-w-[420px]">
                <Slideout.Header title={t('cms.nodeBuilder.paletteTitle')} hasClose />
                <Slideout.Body class="p-0">
                    <NodePalette onAdd={handleAdd} />
                </Slideout.Body>
            </Slideout>

            <Slideout id="node-builder-history" isOpen={historyOpen()} onClose={() => setHistoryOpen(false)} class="w-full max-w-[420px]">
                <Slideout.Header title={t('cms.builder.history.title')} hasClose />
                <Slideout.Body class="p-5">
                    <PageVersionHistoryPanel pageId={pageId()} onRestored={reloadNodes} />
                </Slideout.Body>
            </Slideout>
        </div>
    );
}
