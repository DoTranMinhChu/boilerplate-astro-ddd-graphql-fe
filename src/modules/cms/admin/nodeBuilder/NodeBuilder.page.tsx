// src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx
//
// Admin CMS Node-tree builder: NodeService + buildNodeTreeMemo + NodeRenderer +
// LayersPanel/NodePalette + Inspector tabs, with Undo/Redo via CommandManager.
// Two invariants not to regress:
// (1) autosave persists the FULL current node per debounce window, never just the
//     partial patch (patch-only silently drops concurrent edits within the same window);
// (2) undo/redo selection resync needs a command-specific escape hatch for delete-undo —
//     it recreates ALL descendants under new ids, not just the deleted roots (see
//     resyncSelectionAfterHistoryOp.ts).
import { createMemo, createResource, createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { debounce, type Scheduled } from '@solid-primitives/scheduled';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
import { ContentTypeService } from '@/shared/services/contentType/contentType.service';
import { ContentEntryService } from '@/shared/services/contentEntry/contentEntry.service';
import { ComponentService } from '@/shared/services/component/component.service';
import { ThemeService } from '@/shared/services/theme/theme.service';
import { resolveThemeCssVars } from '@/modules/theme/resolveThemeCssVars';
import { EFieldType, EPageType } from '@shared/generated/typed-graphql';
import { buildNodeTreeMemo } from '@/modules/cms/node/buildNodeTree';
import { NodeRenderer } from '@/modules/cms/node/NodeRenderer';
import { MIN_FALLBACK_SIZE } from '@/modules/cms/node/NodeCanvasOverlay';
import { NODE_TYPE_META, nodeCapabilities, nodeTypeRegistry } from '@/modules/cms/node/nodeRegistry';
import type { FrameBehaviorConfig } from '@/modules/cms/node/primitives/FrameNode';
import { NodeSelectionProvider, useNodeSelection } from '@/modules/cms/node/selection/NodeSelectionContext';
import { CommandManager } from '@/modules/cms/node/commands/CommandManager';
import { createAddNodeCommand, createDeleteNodesCommand, createDragNodesCommand, createDuplicateNodeCommand, createUpdateNodePropertyCommand } from '@/modules/cms/node/commands/nodeCommands';
import { buildLayoutPatch } from '@/modules/cms/node/buildLayoutPatch';
import { resolveEffectiveLayout } from '@/modules/cms/node/applyNodeLayout';
import { flattenVisibleTree } from '@/modules/cms/node/commands/flattenTree';
import { computeResyncedSelectionIds, hasRootIdsAfterLastOp } from '@/modules/cms/node/commands/resyncSelectionAfterHistoryOp';
import { snapToGrid, computeSiblingSnap, type Rect } from '@/modules/cms/node/commands/snapMath';
import { normalizeRotation } from '@/modules/cms/node/commands/rotationMath';
import type { Command } from '@/modules/cms/node/commands/CommandManager';
import { shouldShowBackToTop, scrollProgress, scrollThumbTopStyle } from './canvasScrollIndicator';
import { LayersPanel } from './LayersPanel';
import { NodePalette } from './NodePalette';
import { NodeStyleTab } from './NodeStyleTab';
import { NodeStyleEffectsTab } from './NodeStyleEffectsTab';
import { NodeContentSpacingSize } from './NodeContentSpacingSize';
import { NodeTransformTab } from './NodeTransformTab';
import { NodeGridItemTab } from './NodeGridItemTab';
import { NodeAdvancedTab } from './NodeAdvancedTab';
import { NodeContainerLayoutTab } from './NodeContainerLayoutTab';
import { NodeContentTab, getAtPath, setAtPath } from './NodeContentTab';
import { FieldRenderer } from './FieldRenderer';
import { NodeDataBindingTab } from './NodeDataBindingTab';
import { NodeDataSourceTab } from './NodeDataSourceTab';
import { NodeVisibilityTab } from './NodeVisibilityTab';
import { NodeAnimationTab } from './NodeAnimationTab';
import { PropertyPanel } from './PropertyPanel';
import { NodeBuilderToolbar } from './NodeBuilderToolbar';
import { ENodeType, MIGRATION_ONLY_NODE_TYPES } from '@/modules/cms/node/node.constants';
import { PageVersionHistoryPanel } from '@/modules/cms/admin/builder/PageVersionHistoryPanel';
import { BREAKPOINT_WIDTHS } from '@core/hooks/useBreakpoint';
import type { NodeDTO, NodeTree, NodeRenderContext, LayoutProps, ResizeHandle, Breakpoint, PropDescriptor, SavableNodeFields } from '@/modules/cms/node/node.types';
import { pickSavableNodeFields, ERepeatCardinality, EDataBindingMode } from '@/modules/cms/node/node.types';
import { EFieldControl } from '@/modules/cms/node/node.fieldSchema.types';
import { resolveBindableContentType } from '@/modules/cms/node/resolveBindableContentType';
import { resolveBindableLocalItemFields } from '@/modules/cms/node/resolveBindableLocalItemFields';
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

/** `setPointerCapture` causes the browser to synthesize a `click` event on release (after
 * real movement), retargeted to the captured element, bubbling normally — this clears
 * selection after every resize and collapses multi-selection after every drag.
 * Fix: a one-shot, capturing-phase `click` listener on `window`, armed only when
 * `hasMoved` is true (a plain click must still work normally). The ghost click is not
 * guaranteed in every environment (a Playwright/CDP-driven gesture produced zero ghost
 * click in one verified session) — a bare self-removing listener can wrongly swallow the
 * next unrelated click, so there's also a `setTimeout(..., 0)` safety-net removal (a
 * genuine ghost click, when it fires, is always dispatched synchronously before any timer
 * runs). */
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

export function NodeBuilderPage() {
    return (
        <NodeSelectionProvider>
            <NodeBuilderPageContent />
        </NodeSelectionProvider>
    );
}

function NodeBuilderPageContent() {
    const { searchParams, navigate, navigateToPage } = useRoutes();
    const selection = useNodeSelection();
    const commandManager = new CommandManager();

    const pageId = () => searchParams.pageId as string;

    const [page] = createResource(pageId, (id) => PageService.getOnePage({ id }));
    // Task 12 — this Node Builder session may be editing a Component's hidden
    // "definition page" (a real Page with pageType === COMPONENT_DEFINITION, per
    // Task 1's schema addition) rather than an ordinary content page. `componentDefinition()`
    // resolves once `page()` has loaded and reports which mode we're in; `null` (both the
    // resource's source-id and its resolved value) for every ordinary page keeps the rest of
    // this file byte-for-byte unaffected. Refetch is exposed for Task 13's prop-exposure UI.
    const [componentDefinition, { refetch: refetchComponentDefinition }] = createResource(
        () => (page()?.pageType === EPageType.COMPONENT_DEFINITION ? page()!.id : null),
        async (pid) => ComponentService.getComponentByDefinitionPageId({ pageId: pid }),
    );
    // Theme layer / style pipeline (Task 16) — the page's active Theme (Page.themeId wins,
    // falls back to whichever Theme has isDefault=true), resolved once `page()` has loaded and
    // threaded down to NodeStyleTab.tsx's Typography/Background/Border color controls so they
    // can offer a real theme color-token picker. Source returns `null` (Solid's createResource
    // "don't fetch yet" sentinel, same convention as `componentDefinition` above) until `page()`
    // has loaded, then either the real themeId or the literal string 'default' when the page has
    // none set — the fetcher branches on that sentinel rather than a boolean/undefined, since
    // 'default' itself needs to survive as the SOURCE value for createResource to refetch
    // correctly if the page's themeId later changes away from unset.
    const [activeTheme] = createResource(
        () => (page() ? (page()!.themeId || 'default') : null),
        async (themeIdOrDefault: string) => {
            if (themeIdOrDefault === 'default') {
                const themes = await ThemeService.getAllThemes();
                return themes.find((th) => th.isDefault);
            }
            return ThemeService.getOneTheme({ id: themeIdOrDefault });
        },
    );
    const [nodes, setNodes] = createStore<NodeDTO[]>([]);
    // Task 13 (Group 3, item 3.11) — component-scoped (NOT module-level) cache backing
    // `buildNodeTreeMemo` below: a module-level Map would leak stale entries between component
    // instances (e.g. across tests, or if the Node Builder is ever mounted twice). See
    // buildNodeTree.ts's `buildNodeTreeMemo` doc comment for why this deep-value-memoized
    // variant exists instead of the plain `buildNodeTree` every other consumer uses.
    const nodeTreeCache = new Map<string, NodeTree>();
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
    // Canvas Editor v2 (Task 19) — canvas orientation chrome: back-to-top button
    // visibility + scroll-position indicator fill, driven by `<main>`'s own `onScroll`
    // handler further down. Pure logic lives in canvasScrollIndicator.ts so it's
    // unit-testable without a DOM scroll container.
    const [scrollTop, setScrollTop] = createSignal(0);
    const [scrollMetrics, setScrollMetrics] = createSignal({ scrollHeight: 0, clientHeight: 0 });
    let canvasScrollRef: HTMLElement | undefined;

    /** "Xem tất cả hiệu ứng" toolbar toggle (2026-08-19) — every animated node's ScrollTrigger
     * (useAnimate.ts/presetRegistry.ts, the pre-existing "legacy preset" GSAP system — untouched
     * otherwise) is `start: 'top 85%'`, so on a freshly-loaded canvas EVERY animated element sits
     * at its pre-animation state (commonly `opacity: 0`) until the admin scrolls it into view one
     * at a time — confirmed live: a page whose every top-level section has an entrance effect
     * renders almost entirely blank on load, with no way to see the finished look without
     * scrolling through the whole page section by section. `ScrollTrigger.getAll()` returns every
     * currently-mounted trigger regardless of which node created it (useAnimate.ts's
     * `gsap.context()` per node, cleaned up on unmount) — jumping each one's own animation to
     * `progress(1)` reveals the page's fully-animated end state instantly, and `progress(0)`
     * restores the pre-animation state so the toggle can be flipped back and forth. A node
     * mounted AFTER a toggle click still starts hidden as normal (this is a one-shot snapshot
     * action, not a persistent "animations off" mode) — acceptable: the point is to let the admin
     * SEE the page, not to change how it behaves for real visitors. */
    const [effectsRevealed, setEffectsRevealed] = createSignal(false);
    const handleToggleEffects = () => {
        const next = !effectsRevealed();
        ScrollTrigger.getAll().forEach((st) => st.animation?.progress(next ? 1 : 0));
        setEffectsRevealed(next);
    };

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

    // Task 13 (Group 3, item 3.11) — was a plain (unmemoized) function; every store write of
    // ANY kind (including every single Inspector keystroke) transitively read every node's every
    // field, producing brand-new object identities for the ENTIRE tree, which made `<For>`
    // (reference-diffing) unmount/remount the whole canvas DOM subtree every time. `createMemo`
    // alone would NOT fix this (see buildNodeTreeMemo's doc comment) — the deep-value comparison
    // has to live inside `buildNodeTreeMemo` itself; `createMemo` here only guards against
    // needless RE-INVOCATION when neither `nodes` nor this component re-runs for unrelated
    // reasons, which `buildNodeTreeMemo` on its own can't do (it has no idea when `nodes` is
    // read outside of this call).
    const tree = createMemo(() => buildNodeTreeMemo(nodes, nodeTreeCache));
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

    /** Task 16 (instance banner) — walks from the selected node UP through `parentId`
     * (inclusive of the selected node itself), same shape as `boundContentTypeId` below,
     * looking for the nearest ancestor tagged as a placed Component instance's ROOT.
     * `componentDefinitionId` is set on EXACTLY the one root node per instance (never on its
     * descendants — see ddd-graphql-be's component.service.ts's own "ĐÚNG 1 node gắn
     * componentDefinitionId" invariant), so this walk is what lets the banner appear no
     * matter which node INSIDE the instance is selected (the root Frame or a nested child),
     * while `ComponentService.detachComponentInstance` below is still called with the ROOT's
     * own id, not whichever descendant happens to be selected. */
    const instanceRootNode = () => {
        let current = selected();
        while (current) {
            if (current.componentDefinitionId) return current;
            current = nodes.find((n) => n.id === current!.parentId);
        }
        return undefined;
    };
    const [selectedComponentInstance] = createResource(
        () => instanceRootNode()?.componentDefinitionId ?? null,
        async (componentId) => ComponentService.getOneComponent({ id: componentId }),
    );

    /** Node-level data binding (2026-08-17) — walks from the selected node UP through
     * `parentId` (inclusive of the selected node itself) looking for the nearest
     * `repeat.cardinality==='one'` Data Source. This is the direct replacement for the old
     * `page()?.dataBinding?.contentTypeId` source (Page.dataBinding/"Cấu hình trang Chi tiết"
     * were removed entirely — see manageCmsPages.page.tsx/resolveCmsPageProps.ts): a node's
     * available bound fields must come from whichever ancestor Frame actually supplies its
     * `contextEntry` at render time (the sibling-cloning mechanism in
     * resolveRenderableChildren.ts propagates `contextEntry` down through EVERY descendant
     * level below the clone point, not just direct children), not a page-wide setting. */
    const boundContentTypeId = () => {
        let current = selected();
        while (current) {
            if (current.repeat?.cardinality === ERepeatCardinality.ONE && current.repeat.contentTypeKey) {
                return current.repeat.contentTypeKey;
            }
            current = nodes.find((n) => n.id === current!.parentId);
        }
        return undefined;
    };
    const [boundContentType] = createResource(boundContentTypeId, (id) => ContentTypeService.getOneContentType({ id }));
    const availableFields = (): FieldDefinitionDTO[] => (boundContentType()?.fields || []).filter((f): f is FieldDefinitionDTO => !!f);

    /** Repeat-list item data binding (2026-08-19) — SEPARATE from `boundContentTypeId()` above
     * (which stays cardinality:'one'-only, feeding `canvasContext.contextEntryContentTypeId`
     * for root-level ContentDetailNode preview — untouched). This one feeds ONLY
     * `NodeDataBindingTab`'s field list and, via `resolveBindableContentType`, also resolves
     * through `cardinality:'many'` list-template ancestors (own/backlink/related sources) —
     * see resolveBindableContentType.ts and docs/superpowers/specs/
     * 2026-08-19-repeat-item-data-binding-design.md. Rebuilding the id→node Map on every call
     * is fine here (Inspector-only, not the render hot path — same cost class as
     * `boundContentTypeId()`'s own per-level `nodes.find()` above). */
    const bindableContentTypeId = () => resolveBindableContentType(selected()?.id, new Map(nodes.map((n) => [n.id ?? '', n])));
    const [bindableContentType] = createResource(bindableContentTypeId, (id) => ContentTypeService.getOneContentType({ id }));
    // Phase A1 (local array repeater): a local-repeat ancestor has no real Content Type to
    // fetch at all — `localItemFields` already IS the field list, synchronously, on the node
    // itself. Checked FIRST and short-circuits the resource-based content-type path entirely
    // when it applies; falls through to the existing behavior otherwise (zero change for any
    // node whose nearest repeat ancestor is content-type-bound, exactly as today).
    const bindableLocalItemFields = () => resolveBindableLocalItemFields(selected()?.id, new Map(nodes.map((n) => [n.id ?? '', n])));
    const bindableFields = (): FieldDefinitionDTO[] => {
        const local = bindableLocalItemFields();
        if (local) return local.map((f) => ({ key: f.key, label: f.labelKey })) as FieldDefinitionDTO[];
        return (bindableContentType()?.fields || []).filter((f): f is FieldDefinitionDTO => !!f);
    };

    /** Preview-data picker (2026-08-19) — the admin canvas renders with `EMPTY_CONTEXT` (no
     * `contextEntry`/`pathParams`/`locale`), so a root-level `cardinality:'one'` binding (a
     * Chi tiết page's slug filter, most commonly) always resolves to nothing while editing —
     * matches EMPTY_CONTEXT's own comment above. `resolveCmsPageProps.ts`/CmsPageShell.astro
     * resolve this SAME root binding server-side (via the real page's URL param) before ever
     * rendering; here there is no real URL, so instead let the admin pick a REAL entry and
     * feed it straight in as `contextEntry`/`contextEntryId`/`locale` — same fields
     * CmsPageShell.astro threads for its own `pageEntry` — so ContentDetailNode and every
     * descendant repeat/binding renders with genuine data through the exact same read path
     * production uses, no separate mock-data renderer to keep in sync.
     * Independent of node SELECTION (unlike `boundContentTypeId()` above, which walks up from
     * the selected node) — this is page-wide, so the picker stays visible/stable regardless of
     * which node is currently selected. Only the FIRST root-level `cardinality:'one'` binding
     * is supported (matches `resolveCmsPageProps.ts`'s own `pageEntry` — a page has at most one
     * "which entry is this page about" binding in practice). */
    const rootBindingNode = () => nodes.find((n) => n.repeat?.cardinality === ERepeatCardinality.ONE && n.repeat.contentTypeKey);
    const [previewContentType] = createResource(
        () => rootBindingNode()?.repeat?.contentTypeKey,
        (id) => ContentTypeService.getOneContentType({ id }),
    );
    const [previewEntries] = createResource(
        () => rootBindingNode()?.repeat?.contentTypeKey,
        (contentTypeId) => ContentEntryService.getPublicContentEntries({ contentTypeId, limit: 50 }),
    );
    const [previewEntryId, setPreviewEntryId] = createSignal('');
    const previewEntry = () => previewEntries()?.find((e): e is NonNullable<typeof e> => !!e && e.id === previewEntryId());
    /** Same "first TEXT field = display title" convention CmsPageShell.astro and
     * manageContentEntries.page.tsx already use — the schema has no per-content-type "title
     * field" flag to read instead. */
    const previewEntryLabel = (entry: Record<string, any>): string => {
        const titleField = previewContentType()?.fields?.find((f) => f?.type === EFieldType.TEXT);
        const value = titleField?.key ? entry.data?.[titleField.key] : undefined;
        return (typeof value === 'string' && value) || entry.id;
    };
    /** Also re-derives the exact `pathParams` the picked entry would produce on the real site
     * (e.g. `{slug: 'nuoc-hoa-moc-lan-dem'}`) — CmsPageShell.astro threads BOTH `contextEntry`
     * (for the root binding itself) AND `pathParams` (for any OTHER descendant node whose OWN
     * filter also reads the same pathParam) down together; mirrored here for the same reason. */
    const previewPathParams = (): Record<string, string> => {
        const entry = previewEntry();
        if (!entry) return {};
        const filters = rootBindingNode()?.repeat?.filter;
        const result: Record<string, string> = {};
        for (const f of Array.isArray(filters) ? filters : []) {
            if (f.valueSource === 'pathParam' && f.paramName) {
                const value = (entry.data as Record<string, any> | undefined)?.[f.field];
                if (value != null) result[f.paramName] = String(value);
            }
        }
        return result;
    };

    /** DFS visible order across the WHOLE tree (no collapsing — unlike LayersPanel's own
     * `flatRows`, the canvas always shows every node, so `collapsedIds` is always empty
     * here) — used for canvas Shift+click range-select, reusing Task 5's flattenVisibleTree
     * rather than re-deriving a second "visible order" concept from scratch. */
    const visibleOrderIds = () => flattenVisibleTree(
        nodes.map((n) => ({ id: n.id!, parentId: n.parentId ?? null, order: n.order ?? 0 })),
        new Set<string>(),
    ).map((r) => r.id);

    /** `buildNodeTree` allocates brand-new object references on every call (no memoization),
     * so Solid's `<For>` (reference-diffing) unmounts/remounts the whole DOM subtree on every
     * store write; a remount releases `setPointerCapture`, so the very first pointermove-
     * triggered `setNodes` during a drag kills the gesture (position freezes, no Command
     * created, nothing persisted — confirmed live). Fix: never call `setNodes` mid-gesture —
     * patch the registered DOM element's inline style directly, write the store exactly once,
     * at pointerup. */
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

    /** A single bulk setNodes(predicate, field, updater) can't look up each node's own
     * starting layout during multi-drag (updater never receives the id) — must loop
     * draggedIds individually against a per-id startLayouts map, or all dragged nodes
     * delta from one shared start. */
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
        // Residual-gap fix (post-Task 15) — seed each dragged node's gesture-start
        // snapshot from the CURRENT breakpoint's effective (merged) layout via
        // `resolveEffectiveLayout`, not always the raw desktop `layout` field. Without
        // this, a second gesture on the same node within one non-desktop preview
        // session would re-seed from stale desktop values and silently clobber
        // whatever an earlier gesture in that session already wrote into that
        // breakpoint's `responsiveOverrides` bucket — see resolveEffectiveLayout's doc
        // comment (applyNodeLayout.ts) for the full rationale.
        const dragBp = previewBreakpoint();
        const startLayouts = new Map<string, LayoutProps>(draggedIds.map((id) => [id, { ...resolveEffectiveLayout(nodes.find((n) => n.id === id) ?? {}, dragBp) }]));
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
            // Task 15 fix — "breakpoint-blind" bug: this used to unconditionally patch the
            // node's DESKTOP `layout` field even while previewing Tablet/Mobile, silently
            // discarding the whole point of switching breakpoints. `buildLayoutPatch` routes
            // the write to `responsiveOverrides.<bp>.layout` instead when `previewBreakpoint()`
            // isn't 'desktop' — same branch the Inspector's own Layout/Style tabs already use.
            const bp = previewBreakpoint();
            const command = moves.length === 1
                ? createUpdateNodePropertyCommand(
                      moves[0].id,
                      buildLayoutPatch(nodes.find((n) => n.id === moves[0].id) ?? {}, bp, moves[0].layoutBefore),
                      buildLayoutPatch(nodes.find((n) => n.id === moves[0].id) ?? {}, bp, moves[0].layoutAfter),
                      () => nodes,
                      setNodes,
                  )
                : createDragNodesCommand(moves, bp, () => nodes, setNodes);
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
        // Residual-gap fix (post-Task 15) — see handleDragStart's matching comment
        // above: seed from the CURRENT breakpoint's effective (merged) layout, not
        // always desktop.
        const startLayout: LayoutProps = { ...resolveEffectiveLayout(nodes.find((n) => n.id === nodeId) ?? {}, previewBreakpoint()) };
        // Resize-start must seed dimensions from the real DOM element's measured size (not 0),
        // floored at MIN_FALLBACK_SIZE only when the measured size is itself exactly 0 (use
        // `||`, not Math.max) — a genuinely small 8px element must seed from 8px, not get
        // bumped to 40, or the first resize snaps/jumps.
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
            //
            // Task 15 fix — same "breakpoint-blind" bug as `handleDragStart`: route the write
            // through `buildLayoutPatch`/`previewBreakpoint()` instead of always the desktop
            // `layout` field.
            const bp = previewBreakpoint();
            const command = createUpdateNodePropertyCommand(
                nodeId,
                buildLayoutPatch(nodes.find((n) => n.id === nodeId) ?? {}, bp, startLayout),
                buildLayoutPatch(nodes.find((n) => n.id === nodeId) ?? {}, bp, layoutAfter),
                () => nodes,
                setNodes,
            );
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

    /** Angle math needs viewport-space geometry (getBoundingClientRect(), read once at
     * gesture start) unlike drag/resize which stay in layout-space — stored layout x/y
     * wouldn't account for scroll/ancestor transforms the way a live rect does. Raw angle
     * is intentionally left unnormalized during live preview and normalized exactly once,
     * at commit. */
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
        // Residual-gap fix (post-Task 15) — see handleDragStart's matching comment
        // above: seed from the CURRENT breakpoint's effective (merged) layout, not
        // always desktop.
        const startLayout: LayoutProps = { ...resolveEffectiveLayout(nodes.find((n) => n.id === nodeId) ?? {}, previewBreakpoint()) };
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
            // Task 15 fix — same "breakpoint-blind" bug as `handleDragStart`/`handleResizeStart`:
            // route the write through `buildLayoutPatch`/`previewBreakpoint()` instead of always
            // the desktop `layout` field.
            const bp = previewBreakpoint();
            const command = createUpdateNodePropertyCommand(
                nodeId,
                buildLayoutPatch(nodes.find((n) => n.id === nodeId) ?? {}, bp, startLayout),
                buildLayoutPatch(nodes.find((n) => n.id === nodeId) ?? {}, bp, layoutAfter),
                () => nodes,
                setNodes,
            );
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

    const canvasContext = createMemo<NodeRenderContext>(() => ({
        ...EMPTY_CONTEXT,
        device: previewBreakpoint,
        // Canvas Editor v2, Task 12 — reuses the SAME ancestor-walk `boundContentTypeId()`
        // NodeDataBindingTab's `availableFields` already consumes, so ContentDetailNode
        // resolves the bound content type in the admin canvas the same way public SSR does
        // (via CmsPageShell.astro's contextEntryContentTypeId).
        contextEntryContentTypeId: boundContentTypeId(),
        // Preview-data picker (see `previewEntry` above) — mirrors exactly what
        // CmsPageShell.astro threads for its own `pageEntry` once an admin picks a real entry;
        // stays `{}`/undefined (EMPTY_CONTEXT's original blank canvas) until they do.
        contextEntry: previewEntry()?.data as Record<string, any> | undefined,
        contextEntryId: previewEntry()?.id,
        pathParams: previewPathParams(),
        locale: previewEntry()?.locale ?? undefined,
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
    }));

    /** Task 4 forward-looking concern #1 — see the file header comment. Keyed by node id
     * (not a single shared pending value) so switching the Inspector's target node mid-edit
     * can't corrupt/drop a still-pending window for the PREVIOUS node — each node id gets
     * its own independent debounce timer + "before" snapshot. */
    const pendingPatches = new Map<string, { before: SavableNodeFields; commit: Scheduled<[]> }>();

    /** Pending Inspector-edit patches must be flushed (built into a real Command), not
     * discarded, before a drag/resize/rotate gesture starts — a plain click or a gesture's
     * cancel previously discarded the timer with nothing to replace it, silently losing an
     * edit with no undo entry. The "after" snapshot is taken synchronously here, strictly
     * before the gesture that triggered this flush reads its own startLayout — that's what
     * stops the flush from accidentally absorbing that gesture's own later result. */
    const dropPendingPatch = (id: string) => {
        const pending = pendingPatches.get(id);
        if (!pending) return;
        pending.commit.clear();
        pendingPatches.delete(id);
        const curIdx = nodes.findIndex((n) => n.id === id);
        if (curIdx === -1) return;
        commandManager
            .run(createUpdateNodePropertyCommand(id, pending.before, pickSavableNodeFields(nodes[curIdx]), () => nodes, setNodes))
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
            const before = pickSavableNodeFields(nodes[idx]);
            const commit = debounce(() => {
                pendingPatches.delete(id);
                const curIdx = nodes.findIndex((n) => n.id === id);
                if (curIdx === -1) return;
                commandManager
                    .run(createUpdateNodePropertyCommand(id, before, pickSavableNodeFields(nodes[curIdx]), () => nodes, setNodes))
                    .catch(() => toast().danger(t('cms.toasts.saveFailed')));
            }, 600);
            pending = { before, commit };
            pendingPatches.set(id, pending);
        }
        setNodes(produce((list) => patch(list[idx])));
        pending.commit();
    };

    /** Reset-tab handlers must branch on previewBreakpoint() and write into
     * responsiveOverrides.<bp> — else "reset" silently clears the invisible desktop base
     * while previewing Tablet/Mobile. props.behavior, visibilityRules and advanced have no
     * responsiveOverrides slot, so those stay unconditional base-object resets. */
    const handleResetContentTab = () => patchSelected((n) => {
        const bp = previewBreakpoint();
        if (bp === 'desktop') {
            if (n.style) {
                n.style = { ...n.style, spacing: undefined, size: undefined };
                if (n.style.image) n.style.image = { ...n.style.image, focalPoint: undefined };
            }
            if (n.layout) n.layout = { ...n.layout, display: undefined, gridTemplate: undefined, containerWidth: undefined, gap: undefined, direction: undefined, wrap: undefined };
        } else {
            const bucket = n.responsiveOverrides?.[bp];
            const style = bucket?.style ? { ...bucket.style, spacing: undefined, size: undefined } : bucket?.style;
            if (style?.image) style.image = { ...style.image, focalPoint: undefined };
            const layout = bucket?.layout
                ? { ...bucket.layout, display: undefined, gridTemplate: undefined, containerWidth: undefined, gap: undefined, direction: undefined, wrap: undefined }
                : bucket?.layout;
            n.responsiveOverrides = {
                ...n.responsiveOverrides,
                [bp]: { ...bucket, style, layout },
            };
        }
        n.props = { ...n.props, behavior: undefined };
        n.visibilityRules = null;
    });
    /** Typography/Background/Border/Shadow reset, same previewBreakpoint() branching as above.
     * Effects (opacity/grayscale/blur/backdropBlur/blendMode) has no isModified/onReset of its
     * own and is deliberately excluded from this batching — not a gap to fix. */
    const handleResetStyleTab = () => patchSelected((n) => {
        const bp = previewBreakpoint();
        if (bp === 'desktop') {
            if (n.style) n.style = { ...n.style, typography: undefined, background: undefined, border: undefined, shadow: undefined };
        } else {
            const bucket = n.responsiveOverrides?.[bp];
            const style = bucket?.style ? { ...bucket.style, typography: undefined, background: undefined, border: undefined, shadow: undefined } : bucket?.style;
            n.responsiveOverrides = {
                ...n.responsiveOverrides,
                [bp]: { ...bucket, style },
            };
        }
    });
    /** Transform/Hover/Image reset, same previewBreakpoint() branching as above. NodeAnimationTab
     * is excluded (a keyframe list has no "reset to undefined" semantic). style.image is gated
     * to ENodeType.IMAGE — NodeStyleEffectsTab only renders that section for image nodes. */
    const handleResetEffectsTab = () => patchSelected((n) => {
        const bp = previewBreakpoint();
        const isImage = n.type === ENodeType.IMAGE;
        if (bp === 'desktop') {
            if (n.style) n.style = { ...n.style, transform: undefined, hover: undefined, ...(isImage ? { image: undefined } : {}) };
        } else {
            const bucket = n.responsiveOverrides?.[bp];
            const style = bucket?.style ? { ...bucket.style, transform: undefined, hover: undefined, ...(isImage ? { image: undefined } : {}) } : bucket?.style;
            n.responsiveOverrides = {
                ...n.responsiveOverrides,
                [bp]: { ...bucket, style },
            };
        }
    });
    /** Element/Accessibility/Developer (whole n.advanced object, no responsiveOverrides slot) +
     * Transform/GridItem layout fields (x/y/width/height/rotation/zIndex/colSpan/colStart, same
     * previewBreakpoint() branching as above). NodeDataSourceTab/NodeDataBindingTab are not
     * batched here (repeat/binding config objects, no per-section reset to reuse). */
    const handleResetAdvancedTab = () => patchSelected((n) => {
        n.advanced = undefined;
        const bp = previewBreakpoint();
        if (bp === 'desktop') {
            if (n.layout) n.layout = { ...n.layout, x: undefined, y: undefined, width: undefined, height: undefined, rotation: undefined, zIndex: undefined, colSpan: undefined, colStart: undefined };
        } else {
            const bucket = n.responsiveOverrides?.[bp];
            const layout = bucket?.layout
                ? { ...bucket.layout, x: undefined, y: undefined, width: undefined, height: undefined, rotation: undefined, zIndex: undefined, colSpan: undefined, colStart: undefined }
                : bucket?.layout;
            n.responsiveOverrides = {
                ...n.responsiveOverrides,
                [bp]: { ...bucket, layout },
            };
        }
    });
    /** "Reset this tab" link visibility — the union of each already-wired section's own
     * `isModified` check, OR'd together, with the same previewBreakpoint()-aware
     * responsiveOverrides.<bp> reads the handlers above use, so visibility always matches what
     * a click would actually reset. */
    const contentTabModified = () => {
        const bp = previewBreakpoint();
        const style = bp === 'desktop' ? selected()?.style : selected()?.responsiveOverrides?.[bp]?.style;
        const layout = bp === 'desktop' ? selected()?.layout : selected()?.responsiveOverrides?.[bp]?.layout;
        return !!(
            style?.spacing?.margin || style?.spacing?.padding || style?.spacing?.gap
            || style?.size || (selected()?.type === ENodeType.IMAGE && style?.image?.focalPoint)
            || layout?.display || layout?.gridTemplate || layout?.containerWidth
            || layout?.gap || layout?.direction || layout?.wrap
            || (selected()?.props as any)?.behavior
            || selected()?.visibilityRules
        );
    };
    const styleTabModified = () => {
        const bp = previewBreakpoint();
        const style = bp === 'desktop' ? selected()?.style : selected()?.responsiveOverrides?.[bp]?.style;
        return !!(style?.typography || style?.background || style?.border || style?.shadow?.length);
    };
    const effectsTabModified = () => {
        const bp = previewBreakpoint();
        const style = bp === 'desktop' ? selected()?.style : selected()?.responsiveOverrides?.[bp]?.style;
        return !!(style?.transform || style?.hover || (selected()?.type === ENodeType.IMAGE && style?.image));
    };
    const advancedTabModified = () => {
        const bp = previewBreakpoint();
        const layout = bp === 'desktop' ? selected()?.layout : selected()?.responsiveOverrides?.[bp]?.layout;
        return !!(
            selected()?.advanced?.htmlId || selected()?.advanced?.cssClass || selected()?.advanced?.ariaLabel
            || selected()?.advanced?.ariaHidden || selected()?.advanced?.role || selected()?.advanced?.customCss
            || layout?.x != null || layout?.y != null || layout?.width != null
            || layout?.height != null || layout?.rotation != null || layout?.zIndex != null
            || layout?.colSpan != null || layout?.colStart != null
        );
    };

    /** componentOverrides bookkeeping must be persisted even though nothing in the FE render
     * path reads it — the backend's publishComponent re-clone depends on it to reapply prop
     * overrides after republish. Must NOT bake the typed value in synchronously at call time —
     * record only which target node/field a propKey maps to, and re-read the LIVE value only
     * when the debounce actually fires; otherwise commandManager.undo() (which only reverts the
     * paired visible-field Command) can't stop a stale, already-undone value from being
     * persisted 600ms later. Known gap: an undo/redo landing after this debounce already fired
     * is not retroactively re-synced. */
    const pendingOverridePatch = new Map<string, Scheduled<[]>>();
    const pendingOverrideSources = new Map<string, Map<string, { targetNodeId: string; targetField: string }>>();
    const persistRootOverride = (rootId: string, propKey: string, targetNodeId: string, targetField: string) => {
        let sources = pendingOverrideSources.get(rootId);
        if (!sources) {
            sources = new Map();
            pendingOverrideSources.set(rootId, sources);
        }
        sources.set(propKey, { targetNodeId, targetField });

        let commit = pendingOverridePatch.get(rootId);
        if (!commit) {
            commit = debounce(() => {
                pendingOverridePatch.delete(rootId);
                const dueSources = pendingOverrideSources.get(rootId);
                pendingOverrideSources.delete(rootId);
                if (!dueSources) return;
                setNodes(produce((list) => {
                    const idx = list.findIndex((n) => n.id === rootId);
                    if (idx === -1) return;
                    const overrides = { ...(list[idx].props as any)?.componentOverrides };
                    dueSources.forEach(({ targetNodeId: tId, targetField: tField }, pKey) => {
                        const targetNode = list.find((n) => n.id === tId);
                        overrides[pKey] = targetNode ? getAtPath(targetNode as unknown as Record<string, any>, tField) : undefined;
                    });
                    list[idx].props = { ...list[idx].props, componentOverrides: overrides };
                }));
                const node = nodes.find((n) => n.id === rootId);
                if (!node) return;
                NodeService.updateNode({ id: rootId, data: pickSavableNodeFields(node) as any }).catch(() => toast().danger(t('cms.toasts.saveFailed')));
            }, 600);
            pendingOverridePatch.set(rootId, commit);
        }
        commit();
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

    // Task 15 — "Insert Component" (NodePalette's new Components tab). Mirrors `handleAdd`
    // above: same `paletteParentId()`/`setPaletteOpen(false)` trigger source (both tabs share
    // this one Slideout-mounted `<NodePalette>`), same `catch -> toast().danger(...)` shape.
    // Unlike `handleAdd`, no id-diffing against `nodes` is needed to find the newly-created
    // node(s) to auto-select — `insertComponentInstance` already returns the new root id(s)
    // directly (`ComponentService.insertComponentInstance` : `Promise<string[]>`). Deliberately
    // NOT routed through `commandManager`/a Command (no Undo/Redo for this action), matching
    // `handleSaveAsComponent` below — inserting a component instance is a structural,
    // multi-node server-side expansion, the same "no clean client-side undo" reasoning that
    // comment gives for Save-as-Component.
    const handleAddComponent = async (componentId: string) => {
        const parentId = paletteParentId();
        setPaletteOpen(false);
        try {
            const newRootIds = await ComponentService.insertComponentInstance({
                data: { componentId, pageId: pageId(), parentId },
            });
            await reloadNodes();
            if (newRootIds?.length) selection.select(newRootIds[0]);
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

    // Property Inspector redesign, Task 4 — first UI caller of `createDuplicateNodeCommand`
    // (Task 2). Single-node only: `PropertyPanelHeader` hides the Duplicate button entirely while
    // more than one node is selected (`showNodeActions`), and the `isMultiSelected()` guard below
    // makes that a hard invariant rather than a UI-only one — `selectedId()` is just "the first id
    // in the set", so without the guard a multi-selection would silently duplicate an arbitrary
    // one of the selected nodes.
    //
    // The catch deliberately does NOT reuse the generic `cms.toasts.saveFailed` every other
    // handler in this file uses. `createDuplicateNodeCommand.execute()` calls the BE's
    // `duplicateNode` mutation FIRST and only then refetches the page's nodes, with no
    // compensation if the refetch is what failed — so a thrown error here can mean the duplicate
    // DOES exist server-side even though the canvas never showed it. A generic "save failed"
    // would invite the admin to click Duplicate again and end up with two copies; the dedicated
    // message tells them to reload and check first. The original error is also logged so the
    // failing step is recoverable from the console.
    const handleDuplicateSelected = async () => {
        if (isMultiSelected()) return;
        const id = selectedId();
        if (!id) return;
        try {
            const command = createDuplicateNodeCommand(id, pageId(), () => nodes, setNodes);
            await commandManager.run(command);
            const newId = command.getCreatedRootId();
            if (newId) selection.select(newId);
        } catch (err) {
            console.error('[NodeBuilder] Duplicate failed; a server-side copy may already exist.', err);
            toast().danger(t('cms.nodeBuilder.duplicateFailed'));
        }
    };

    // Task 14 — "Save as Component". Deliberately does NOT go through CommandManager/
    // Undo-Redo the way handleDeleteSelected above does: creating a ComponentDefinition +
    // converting the current selection into its first instance is a structural,
    // cross-page operation with no clean client-side undo the way an in-tree edit has.
    // Name entry uses a plain `window.prompt` — this codebase has no dedicated "quick
    // name" modal component; the closest analogues (manageCmsPages.page.tsx's
    // create-Page form, manageContentTypes.page.tsx's create-Content-Type form) are full
    // generateDatatable CRUD modals meant for a dedicated list page, not a single
    // toolbar-triggered action. `window.prompt` IS the established pattern for this exact
    // shape of interaction elsewhere in the codebase (Toolbar.tsx's image alt-text/link-
    // URL prompts triggered from toolbar buttons), so it's used here too rather than
    // introducing a new one-off pattern for a single call site. `reloadNodes()` below —
    // the same function Version History restore already calls — refetches the current
    // page's tree from the server after the mutation, and per Task 1d's existing
    // behavior this already calls `commandManager.reset()`, correctly clearing undo
    // history rather than leaving stale Commands referencing now-deleted node ids.
    const handleSaveAsComponent = async () => {
        const ids = [...selection.selectedIds()];
        if (ids.length === 0) return;
        const label = window.prompt(tOrLiteral('cms.component.saveAsComponentPrompt'));
        if (!label) return;
        try {
            const component = await ComponentService.createComponentFromSelection({
                data: { key: label, label, pageId: page()!.id, nodeIds: ids },
            });
            toast().success(tOrLiteral('cms.component.saveAsComponentSuccess', { label: component.label ?? '' }));
            await reloadNodes();
        } catch {
            toast().danger(tOrLiteral('cms.component.saveAsComponentFailed'));
        }
    };

    // Task 12's Publish action, lifted out of the banner's inline `onClick`.
    //
    // Final-review fix (Important): the inline version had NO try/catch at all, unlike every
    // other mutation handler in this file (handleAdd / handleAddComponent /
    // handleSaveAsComponent / handleDeleteSelected / the detach handler), so a failed publish
    // was an unhandled rejection with no error toast — and no success toast either, since the
    // line after the `await` never ran. Publish re-clones this definition into EVERY placed
    // instance site-wide, so a silent failure is the worst possible outcome for this button
    // specifically. `isPublishing` additionally guards against a double-click firing two
    // concurrent site-wide re-clones: Button already sets `pointer-events-none` while an
    // async onClick is in flight, but that's a CSS-only guard, so the signal both disables the
    // button explicitly and short-circuits a re-entrant call.
    const [isPublishing, setIsPublishing] = createSignal(false);
    const handlePublishComponent = async () => {
        if (isPublishing()) return;
        const id = componentDefinition()?.id;
        if (!id) return;
        setIsPublishing(true);
        try {
            await ComponentService.publishComponent({ id });
            toast().success(tOrLiteral('cms.component.publishSuccess'));
        } catch {
            toast().danger(tOrLiteral('cms.component.publishFailed'));
        } finally {
            setIsPublishing(false);
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
                <Show when={rootBindingNode()}>
                    <div class="flex w-64 shrink-0 items-center gap-1.5">
                        <span class="shrink-0 text-xs font-medium text-neutral-500">{t('cms.nodeBuilder.previewDataLabel')}</span>
                        <Select
                            value={previewEntryId()}
                            options={[
                                { value: '', label: t('cms.nodeBuilder.previewDataPlaceholder') },
                                ...(previewEntries() ?? [])
                                    .filter((e): e is NonNullable<typeof e> => !!e?.id)
                                    .map((e) => ({ value: e.id!, label: previewEntryLabel(e) })),
                            ]}
                            onChange={(v) => setPreviewEntryId((v as string) ?? '')}
                            fieldless
                        />
                    </div>
                </Show>
                <NodeBuilderToolbar
                    canUndo={commandManager.canUndo()}
                    canRedo={commandManager.canRedo()}
                    onUndo={() => void handleUndo()}
                    onRedo={() => void handleRedo()}
                    historyLabel={
                        commandManager.canUndo() || commandManager.canRedo()
                            ? (commandManager.canUndo() ? commandManager.peekUndoLabel() : commandManager.peekRedoLabel())
                            : undefined
                    }
                    gridSnapEnabled={gridSnapEnabled()}
                    onToggleGridSnap={() => setGridSnapEnabled((v) => !v)}
                    onOpenHistory={() => setHistoryOpen(true)}
                    breakpoint={previewBreakpoint()}
                    onBreakpointChange={setPreviewBreakpoint}
                    effectsRevealed={effectsRevealed()}
                    onToggleEffects={handleToggleEffects}
                    canSaveAsComponent={selection.selectedIds().size > 0}
                    onSaveAsComponent={() => void handleSaveAsComponent()}
                />
            </div>

            {/* Task 12 — component-definition-editing banner. Only ever visible when this
                page's pageType is COMPONENT_DEFINITION (the `componentDefinition` resource
                above resolves to `null`/undefined for every ordinary page, so `<Show>` never
                renders this for the normal Node Builder flow). Publish pushes this
                ComponentDefinition's current schema/nodes out to every existing instance —
                `publishComponent`'s real resolver (Task 6) returns just the updated
                ComponentDefinitionDTO, not an instance count, so the toast below reports
                success without a count rather than fabricating one. */}
            <Show when={componentDefinition()}>
                <div class="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    <span>{tOrLiteral('cms.component.editingDefinitionBanner', { label: componentDefinition()!.label ?? '' })}</span>
                    <Button
                        sm
                        disabled={isPublishing()}
                        loading={isPublishing()}
                        onClick={() => void handlePublishComponent()}
                    >
                        {tOrLiteral('cms.component.publishButton')}
                    </Button>
                </div>
            </Show>

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
                    <Button sm outline onClick={() => openPalette(undefined)} class="mt-2 sticky bottom-0 rounded-nb-sm border-nb-border bg-nb-bg text-nb-text hover:bg-nb-bg-subtle">
                        {t('cms.nodeBuilder.addRootButton')}
                    </Button>
                </aside>

                <main
                    ref={canvasScrollRef}
                    class="relative flex-1 overflow-auto bg-neutral-100"
                    // Canvas Editor v2 (Task 19) — `relative` added so the scroll-position
                    // indicator/back-to-top button (rendered as siblings of `<main>`, further
                    // down) anchor against this element rather than the page; the outer
                    // wrapping `<div class="relative flex flex-1 ...">` above was already
                    // `relative` but `<main>` itself was not.
                    onScroll={(e) => {
                        setScrollTop(e.currentTarget.scrollTop);
                        setScrollMetrics({ scrollHeight: e.currentTarget.scrollHeight, clientHeight: e.currentTarget.clientHeight });
                    }}
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
                    {/* Canvas Editor v2 (Task 19) — breakpoint badge, sticky inside the scroll
                        container so it travels with scroll rather than staying pinned to the
                        viewport. */}
                    <div class="sticky top-2 z-[90] mb-2 ml-2 inline-block rounded-full bg-neutral-900/80 px-3 py-1 text-xs font-medium text-white">
                        {previewBreakpoint() === 'mobile' ? t('cms.nodeBuilder.breakpointBadgeMobile') : previewBreakpoint() === 'tablet' ? t('cms.nodeBuilder.breakpointBadgeTablet') : t('cms.nodeBuilder.breakpointBadgeDesktop')}
                    </div>

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
                            {/* Canvas Editor v2 (Task 19) — page-bounds framing: border + shadow
                                added to the existing white canvas div so it visually reads as a
                                page rather than a floating block. */}
                            {/* Canvas Editor v2, Task 20 (spec §3) — a REAL fixed pixel width (not a
                                max-width cap on a fluid parent), matching useBreakpoint()'s own
                                thresholds, so %-based CSS (StyleObject.size widths) resolves
                                identically to a real device at this breakpoint. KNOWN LIMITATION,
                                disclosed and accepted (not fixed by this task): the 14 ported legacy
                                node primitives (Tasks 3-17) use raw `vw`-unit CSS (e.g.
                                `clamp(32px, 3.5vw, 56px)`) inherited verbatim from the pre-Node-tree
                                Section system — `vw` always resolves against the REAL admin browser
                                viewport, not this preview box's width, so their typography won't
                                scale precisely inside a narrow preview even though the breakpoint
                                BUCKET (responsiveOverrides resolution — the part Phase 3 actually
                                built and admins actually configure) is now 100% correct. Fixing the
                                vw case fully would require either an iframe-isolated preview (which
                                breaks this canvas's existing same-document direct-manipulation
                                system — drag/resize/rotate/marquee all assume same-document DOM,
                                explicitly out of scope per spec §0) or converting every legacy
                                primitive's vw usage to container-query units (cqw) with
                                container-type set on this div — a real, larger, separately-scoped
                                follow-up, not silently pretended-away here. */}
                            <div
                                class="bg-white mx-auto my-6 rounded-lg border border-neutral-300 shadow-md transition-[width]"
                                style={{
                                    width: previewBreakpoint() === 'mobile' ? `${BREAKPOINT_WIDTHS.mobile - 1}px`
                                        : previewBreakpoint() === 'tablet' ? `${BREAKPOINT_WIDTHS.tablet - 1}px`
                                        : '100%',
                                    // Task 16: reuses the SAME `resolveThemeCssVars` helper CmsPageShell.astro
                                    // already spreads onto `<body>` for the real public page — without this,
                                    // a node styled with a color TOKEN (`applyNodeStyle.ts`'s `resolveColorValue`
                                    // emits `color: var(--color-primary)`) would compile correct CSS that has
                                    // nothing to resolve against inside this admin canvas, so the new color-token
                                    // picker would silently show no visible effect here even though the
                                    // underlying data is 100% correct. `'light'` only — this canvas has no
                                    // dark-mode preview toggle today (mirrors every other admin-only surface in
                                    // this file, none of which react to `prefers-color-scheme`).
                                    ...resolveThemeCssVars(activeTheme(), 'light'),
                                }}
                            >
                                <For each={tree()}>
                                    {(root) => <NodeRenderer node={root} context={canvasContext()} />}
                                </For>
                            </div>
                        </Show>
                    </Show>
                </main>

                {/* Canvas Editor v2 (Task 19) — scroll-position indicator: thin bar on the
                    canvas's right edge, showing thumb position via `scrollProgress`. Sibling of
                    `<main>` (not a child) so it's positioned against the outer already-`relative`
                    wrapping `<div>`, matching how the marquee `<Show>` below and the Inspector
                    panel further down are already positioned.
                    Live-review fix (Task 19) — the Inspector panel (further down this file) is
                    ALSO `absolute`/`right-0` against this same outer wrapping `<div>`, up to 480px
                    wide, and both this bar and the back-to-top button below sit well inside that
                    band (`right-1`/`right-4`) at a higher z-index (`z-[95]` vs the Inspector's
                    `z-30`) — without this guard they'd render on top of the Inspector's own right
                    edge whenever a node is selected AND the canvas is scrolled. Both elements are
                    only useful for canvas orientation anyway, which isn't the point once the
                    Inspector has the user's attention, so gating on "no node selected" (the exact
                    condition the Inspector itself uses to decide open/closed) is the correct fix,
                    not just a workaround. */}
                <Show when={selection.selectedIds().size === 0}>
                    <div class="pointer-events-none absolute right-1 top-0 z-[95] h-full w-1 bg-neutral-200/50">
                        {/* Final-review fix (Important #2): `transform: translateY(<percent>)`
                            resolves against THIS element's own 40px height, not the `h-full` track
                            above, so the thumb only ever traveled 40px total regardless of scroll
                            position. `top` percentages resolve against the containing block (the
                            track div above, which is itself `absolute` and so a valid containing
                            block for this `absolute` child) — `scrollThumbTopStyle` turns that into
                            a `calc()` that keeps the thumb fully inside the track at both ends. */}
                        <div
                            class="absolute w-full rounded-full bg-neutral-500"
                            style={{ height: '40px', top: scrollThumbTopStyle(scrollProgress(scrollTop(), scrollMetrics().scrollHeight, scrollMetrics().clientHeight), 40) }}
                        />
                    </div>

                    {/* Canvas Editor v2 (Task 19) — back-to-top button, appears once scrolled past
                        the threshold in `shouldShowBackToTop`; scrolls the canvas (not the page)
                        back to top via `canvasScrollRef`. Nested under the same "no selection"
                        guard as the scroll-indicator above, for the identical Inspector-overlap
                        reason. */}
                    <Show when={shouldShowBackToTop(scrollTop())}>
                        <button
                            type="button"
                            class="absolute bottom-4 right-4 z-[95] rounded-full bg-neutral-900/80 p-2 text-white shadow-lg"
                            onClick={() => canvasScrollRef?.scrollTo({ top: 0, behavior: 'smooth' })}
                            aria-label={t('cms.nodeBuilder.backToTopButton')}
                        >
                            <Icon name="heroicons-outline:arrow-up" />
                        </button>
                    </Show>
                </Show>

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
                <PropertyPanel
                    open={selection.selectedIds().size > 0}
                    title={
                        isMultiSelected()
                            ? t('cms.nodeBuilder.multiSelectionTitle', { count: selection.selectedIds().size })
                            : (selected() ? tOrLiteral(NODE_TYPE_META[selected()!.type ?? '']?.labelKey ?? selected()!.type ?? '') : '')
                    }
                    typeBadge={!isMultiSelected() ? selected()?.type : undefined}
                    icon={!isMultiSelected() ? NODE_TYPE_META[selected()?.type ?? '']?.icon : undefined}
                    showNodeActions={!isMultiSelected() && !!selected()}
                    /* Falls back to the raw first selected id rather than `selected()?.id`: the
                        old Inspector rendered its multi-selection hint purely off `isMultiSelected()`,
                        so it stayed visible even in the (narrow) window where the first selected id
                        isn't resolvable in `nodes` yet. `PropertyPanel` only mounts its tabs when this
                        prop is truthy, so keying off `selected()` alone would blank the panel body in
                        exactly that window. The inner `<Show when={selected()}>` below still handles
                        the unresolved case the same way it always did. */
                    selectedNodeId={selected()?.id ?? selectedId()}
                    onDuplicate={() => void handleDuplicateSelected()}
                    onDelete={() => void handleDeleteSelected()}
                    onSaveAsComponent={() => void handleSaveAsComponent()}
                    onClose={() => selection.clear()}
                    /* STAGING (Property Inspector redesign, Task 4): every existing section still
                       renders in this ONE tab, byte-for-byte as it did inside the old
                       `InspectorPanel` body — the block below is the previous Inspector children
                       moved across unchanged. Later tasks in the plan redistribute these into the
                       Style/Effects/Advanced tabs one at a time; keeping them together here means
                       this commit can only break the shell/header/Duplicate wiring, never a field
                       mapping. */
                    /* Property Inspector Phase 4, Task 4: the 4 tab props are now FUNCTIONS of the
                       panel's (debounced) property-search query rather than bare JSX. `searchQuery`
                       is an ACCESSOR — read it as `searchQuery()` inside a component prop
                       (`searchQuery={searchQuery()}`) so only that prop re-evaluates; calling it
                       here at the top of the builder instead would make Solid re-run this whole
                       builder — and rebuild the entire tab body, losing every collapsed-section /
                       open-picker / in-progress-edit state inside it — on every keystroke. See
                       PropertyPanel.tsx's `contentTab` doc comment.
                       Task 5 did that threading: every `searchQuery={searchQuery()}` below sits
                       in a JSX PROP POSITION and nowhere else — there is deliberately no
                       `const q = searchQuery()` (or `.filter(... searchQuery() ...)`) anywhere in
                       any of the 4 builder bodies, because a read in statement position would be
                       tracked by the `<Show>` memo `Tabs.Tab` wraps these builders in and would
                       re-introduce exactly the whole-tab-remount bug Task 4 fixed. */
                    contentTab={(searchQuery) => (
                    <div class="min-h-0 flex-1">
                        {/* Multi-select + Inspector: the 6 tabs below are single-node forms (no
                            multi-edit support in this milestone) — rather than silently editing an
                            arbitrary one of several selected nodes, the Inspector is replaced by a
                            clear hint whenever more than 1 node is selected. */}
                        <Show
                            when={!isMultiSelected()}
                            fallback={<div class="p-6 text-center text-sm text-neutral-500">{t('cms.nodeBuilder.multiSelectionHint')}</div>}
                        >
                            <Show when={selected()}>
                                {/* Property Inspector Phase 4, Task 7 — "reset this tab" batching,
                                    visible only when at least one of this tab's already-wired
                                    sections (Spacing/Size, Layout/Behavior, Visibility) currently
                                    shows isModified. See handleResetContentTab's own doc comment. */}
                                <Show when={contentTabModified()}>
                                    <button type="button" class="mx-4 mt-2 self-start text-xs font-medium text-nb-accent hover:underline" onClick={handleResetContentTab}>
                                        {t('cms.nodeBuilder.resetTabButton')}
                                    </button>
                                </Show>
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

                                {/* Repeat-list responsive grid (2026-08-19) — applyContainerLayout.ts's
                                    `display`/`gridTemplate`/`direction`/`wrap` were already fully
                                    supported by the render engine (breakpoint-aware via the same
                                    responsiveOverrides.layout merge NodeTransformTab below uses) but had
                                    no Inspector control at all — this is what lets an admin set a
                                    different column count per breakpoint (e.g. 4 desktop / 3 tablet / 1
                                    mobile) for a Frame containing a repeat:'many' template. Gated on the
                                    SELECTED node's own layoutMode (unlike NodeTransformTab below, gated
                                    on the PARENT's) — 'free' means this node's children are absolutely
                                    positioned, so none of these fields apply (see
                                    applyContainerLayout.ts). */}
                                {/* Property Inspector redesign, Task 5: per the design doc's
                                    corrected §2 this container-Layout section is a PERMANENT
                                    resident of the "Nội dung" tab (not a leftover of Task 4's
                                    staging) — later tasks that redistribute the other sections
                                    into Kiểu dáng/Hiệu ứng/Nâng cao must leave it here. */}
                                <Show when={selectedCapabilities()?.layoutChildren && selected()!.layoutMode !== 'free'}>
                                    <NodeContainerLayoutTab
                                        searchQuery={searchQuery()}
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
                                        behavior={selected()?.type === ENodeType.FRAME ? (selected()?.props?.behavior as FrameBehaviorConfig | undefined) : undefined}
                                        onBehaviorChange={(next) => patchSelected((n) => { n.props = { ...n.props, behavior: next }; })}
                                    />
                                </Show>

                                {/* Task 16 — placed Component instance banner. `selectedComponentInstance`
                                    resolves regardless of which node INSIDE the instance is selected (see
                                    `instanceRootNode` above), but the override form below only ever shows
                                    fields for props exposed on the CURRENTLY SELECTED node
                                    (`propDef.targetNodeId === selected()!.componentSourceNodeId`) — v1
                                    scope, per the design note: to override a prop on a different node
                                    inside the same instance (e.g. a nested Text node inside a Frame
                                    instance), the admin selects THAT node instead of relying on one
                                    all-props-at-once form here.

                                    Final-review fix Critical — `propDef.targetNodeId` (Task 13's "expose
                                    as prop" toggle) is a DEFINITION-space node id: the id of the node
                                    INSIDE the component's hidden definition page tree that was exposed.
                                    A placed instance's nodes are CLONES with brand-new instance-space
                                    ids — `selected()!.id` can never equal it, so comparing against `.id`
                                    (the original sketch) rendered zero fields on every real instance,
                                    ever. `componentSourceNodeId` is the BE's own recorded mapping from
                                    an instance node back to its definition-space counterpart (see
                                    node.service.ts's fragment comment) — that's the correct comparison,
                                    one level deeper than the `componentDefinitionId`-based instance
                                    DETECTION fix already applied above for `instanceRootNode`. */}
                                <Show when={selectedComponentInstance()}>
                                    <div class="flex flex-col gap-2 border-b border-nb-border bg-nb-bg-subtle p-3">
                                        <div class="flex items-center justify-between">
                                            <span class="text-xs text-nb-text-muted">
                                                {tOrLiteral('cms.component.instanceBanner', { label: selectedComponentInstance()!.label ?? '' })}
                                            </span>
                                            <div class="flex gap-2">
                                                <Button
                                                    sm
                                                    outline
                                                    onClick={() => navigateToPage({
                                                        route: 'adminDashboard.cmsNodeBuilder',
                                                        context: { searchParams: { pageId: selectedComponentInstance()!.definitionPageId ?? '' } },
                                                    })}
                                                >
                                                    {tOrLiteral('cms.component.editSourceButton')}
                                                </Button>
                                                <Button
                                                    sm
                                                    outline
                                                    onClick={async () => {
                                                        // Task 21 live-verification fix: `ConfirmDialog` used to default a "strong"
                                                        // (danger/caution/question) dialog's SUBMIT BUTTON label to its `title`,
                                                        // and that button is `whitespace-nowrap`. Passing the full two-sentence
                                                        // explanation as `title` therefore rendered it a second time as a ~100-char
                                                        // button that overflowed the modal. That default is now fixed at the source
                                                        // (Confirm.tsx falls back to `baseConfig().confirmSubmitLabel` for strong
                                                        // dialogs too), but this call site keeps the codebase's own short-title +
                                                        // `content` + explicit `submitLabel` shape (MenuTreeEditor/TermTreeEditor)
                                                        // because "Detach" names the action better than a generic "Confirm".
                                                        const confirmed = await confirmAction().danger(() => tOrLiteral('cms.component.detachConfirmTitle'), {
                                                            content: () => tOrLiteral('cms.component.detachConfirmContent'),
                                                            submitLabel: tOrLiteral('cms.component.detachConfirmSubmitLabel'),
                                                        });
                                                        if (!confirmed) return;
                                                        try {
                                                            await ComponentService.detachComponentInstance({ instanceRootId: instanceRootNode()!.id! });
                                                            await reloadNodes();
                                                        } catch {
                                                            toast().danger(t('cms.toasts.saveFailed'));
                                                        }
                                                    }}
                                                >
                                                    {tOrLiteral('cms.component.detachButton')}
                                                </Button>
                                            </div>
                                        </div>
                                        <For each={(selectedComponentInstance()!.propSchema as unknown as PropDescriptor[] | undefined) ?? []}>
                                            {(propDef) => (
                                                <Show when={propDef.targetNodeId === selected()!.componentSourceNodeId}>
                                                    <FieldRenderer
                                                        field={{ key: propDef.propKey, labelKey: propDef.label, control: propDef.control }}
                                                        value={getAtPath(selected() as unknown as Record<string, any>, propDef.targetField)}
                                                        onChange={(v) => {
                                                            // Writes the target field DIRECTLY onto the selected node itself
                                                            // (propDef.targetNodeId === selected()!.componentSourceNodeId,
                                                            // guaranteed by the <Show> above) — same live-canvas-update +
                                                            // Undo/Redo-backed persistence path every other Content-tab field
                                                            // already uses. `targetField` is a dot-path rooted at the NODE
                                                            // itself (e.g. "props.text", "style.color" — see PropDescriptor's
                                                            // doc comment / ddd-graphql-be's `buildFieldPatch`), one level
                                                            // shallower than NodeContentTab's own `set()` (which is always
                                                            // scoped under `props`).
                                                            patchSelected((n) => {
                                                                const [topKey, ...rest] = propDef.targetField.split('.');
                                                                (n as any)[topKey] = rest.length
                                                                    ? setAtPath((n as any)[topKey], rest.join('.'), v)
                                                                    : v;
                                                            });
                                                            // Final-review fix Important #1 (propKey collisions) — Task 13's
                                                            // "expose as prop" toggle sets `propKey: fieldKey` with no
                                                            // uniqueness check across the WHOLE component: if 2 different
                                                            // nodes in the same component both expose e.g. a `text` field,
                                                            // both entries end up with `propKey: 'text'`, differing only in
                                                            // `targetNodeId`. `componentOverrides` is a flat object keyed
                                                            // ONLY by `propKey` (component.service.ts's `cloneDefinitionIntoPage`
                                                            // applies every propSchema entry whose `propKey` is present in
                                                            // `overrides`), so persisting under an ambiguous `propKey` here
                                                            // would silently apply THIS node's override value to the OTHER
                                                            // node too at the next Publish. Detect the ambiguity (cheap: scan
                                                            // this component's own propSchema for a duplicate propKey) and
                                                            // refuse to write rather than corrupt a sibling's override — the
                                                            // visible field edit above still works fine either way, only the
                                                            // Publish-time persistence is withheld. Not attempting the fuller
                                                            // fix (re-keying overrides by `targetNodeId + propKey`, which
                                                            // would also need a BE change to component.service.ts's override-
                                                            // application loop) here — out of scope for this task, see report.
                                                            const propSchemaList = (selectedComponentInstance()!.propSchema as unknown as PropDescriptor[] | undefined) ?? [];
                                                            const hasAmbiguousPropKey = propSchemaList.filter((p) => p.propKey === propDef.propKey).length > 1;
                                                            if (hasAmbiguousPropKey) {
                                                                console.error(
                                                                    `[NodeBuilder] Refusing to persist componentOverrides for propKey "${propDef.propKey}": ` +
                                                                    `multiple exposed props on this component share this key (component ${selectedComponentInstance()!.id}), ` +
                                                                    `so persisting would silently apply this value to a different node's field too. ` +
                                                                    `Rename one of the exposed props to a unique key (NodeContentTab's "Expose as prop" toggle) before overriding either.`,
                                                                );
                                                            } else {
                                                                // Also persists the SAME live value onto the instance ROOT's
                                                                // `props.componentOverrides` bookkeeping (see persistRootOverride's
                                                                // header comment) so a later Publish reapplies it instead of
                                                                // silently reverting this override back to the definition's value.
                                                                persistRootOverride(instanceRootNode()!.id!, propDef.propKey, selected()!.id!, propDef.targetField);
                                                            }
                                                        }}
                                                    />
                                                </Show>
                                            )}
                                        </For>
                                    </div>
                                </Show>

                                <NodeContentTab
                                    node={{ ...selected()!, children: [] }}
                                    onChange={(p) => patchSelected((n) => { n.props = p; })}
                                    availableFields={availableFields()}
                                    componentContext={componentDefinition() ? {
                                        componentId: componentDefinition()!.id ?? '',
                                        propSchema: (componentDefinition()!.propSchema as unknown as PropDescriptor[] | undefined) ?? [],
                                        // Live bug fix (post-Task 13) — `propKey` used to always be the raw
                                        // field key, so two nodes of the same type (e.g. two Text nodes)
                                        // collided on the backend's real propKey-uniqueness check
                                        // (component.service.ts's `setPropSchema`) and the second save was
                                        // silently lost — nothing here caught the rejection. NodeContentTab
                                        // now prompts for/validates the propKey client-side BEFORE calling
                                        // this, and awaits + reverts on a thrown error, so this function must
                                        // keep letting a failed `setComponentPropSchema` call propagate
                                        // (no try/catch here) rather than swallow it.
                                        onTogglePropForField: async (fieldKey, expose, propKey) => {
                                            const targetField = `props.${fieldKey}`;
                                            const current = (componentDefinition()!.propSchema as unknown as PropDescriptor[] | undefined) ?? [];
                                            const next: PropDescriptor[] = expose
                                                ? [...current, {
                                                    propKey: propKey ?? fieldKey,
                                                    label: propKey ?? fieldKey,
                                                    control: nodeTypeRegistry[selected()!.type ?? '']?.fieldSchema.find((f) => f.key === fieldKey)?.control ?? EFieldControl.TEXT,
                                                    targetNodeId: selected()!.id ?? '',
                                                    targetField,
                                                }]
                                                : current.filter((p) => !(p.targetNodeId === selected()!.id && p.targetField === targetField));
                                            await ComponentService.setComponentPropSchema({ data: { componentId: componentDefinition()!.id ?? '', propSchema: next } });
                                            refetchComponentDefinition();
                                        },
                                    } : undefined}
                                />

                                {/* Property Inspector redesign, Task 5 — Spacing (margin/padding/
                                    gap), Size (width/height/objectFit) and the image focal point
                                    are content-shaping fields, so they render here in the "Nội
                                    dung" tab (alongside NodeContentTab above and the container
                                    Layout / Visibility sections already in this tab) instead of
                                    inside NodeStyleTab below. Reads/writes exactly the same
                                    `style` / `responsiveOverrides.<bp>.style` slot as
                                    NodeStyleTab's own call right after it, via the identical
                                    `previewBreakpoint()`-aware pattern — the two components own
                                    DISJOINT sub-keys of StyleObject and each spreads the rest, so
                                    neither can clobber the other's fields. */}
                                <Show when={selectedCapabilities()?.style}>
                                    <NodeContentSpacingSize
                                        searchQuery={searchQuery()}
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
                                        isImage={selected()?.type === ENodeType.IMAGE}
                                    />
                                </Show>

                                {/* Property Inspector redesign, Task 5: like the container-Layout
                                    section above, Visibility is a PERMANENT resident of the "Nội
                                    dung" tab per the design doc's corrected §2 — later tasks must
                                    not sweep it into Nâng cao with the rest of Task 4's staging. */}
                                <NodeVisibilityTab
                                    searchQuery={searchQuery()}
                                    rules={selected()!.visibilityRules}
                                    onChange={(v) => patchSelected((n) => { n.visibilityRules = v ?? undefined; })}
                                />

                                {/* Property Inspector redesign, Task 7: NodeAnimationTab was the
                                    last of Task 4's staged sections still sitting in "Nội dung" —
                                    it now renders in the "Hiệu ứng" tab (`effectsTab` below),
                                    with byte-for-byte identical props/capability gating. */}
                            </Show>
                        </Show>
                    </div>
                    )}
                    styleTab={(searchQuery) => (
                    /* Property Inspector redesign, Task 6: first section to move OUT of Task 4/5's
                       staging `contentTab` into its real "Kiểu dáng" tab destination. Same
                       multi-select guard as `contentTab` above (`isMultiSelected()` fallback hint,
                       then `selected()`) — without it, switching to this tab while multiple nodes
                       are selected would silently edit whichever node `selected()`/`selectedId()`
                       happens to resolve to (the primary/last-selected one), which is exactly the
                       confusing-edit scenario `contentTab`'s own guard exists to prevent. Same
                       `NodeStyleTab` props/wiring as before (byte-for-byte), just relocated. */
                    <div class="min-h-0 flex-1">
                        <Show
                            when={!isMultiSelected()}
                            fallback={<div class="p-6 text-center text-sm text-neutral-500">{t('cms.nodeBuilder.multiSelectionHint')}</div>}
                        >
                            <Show when={selected()}>
                                {/* Property Inspector Phase 4, Task 7 — "reset this tab" batching,
                                    visible only when at least one of Typography/Background/Border/
                                    Shadow currently shows isModified. */}
                                <Show when={styleTabModified()}>
                                    <button type="button" class="mx-4 mt-2 self-start text-xs font-medium text-nb-accent hover:underline" onClick={handleResetStyleTab}>
                                        {t('cms.nodeBuilder.resetTabButton')}
                                    </button>
                                </Show>
                                {/* Property Inspector redesign, Task 10 closeout: the same
                                    responsive-override hint `contentTab` shows above — this tab
                                    also writes into `responsiveOverrides.<bp>.style` (see
                                    `NodeStyleTab`'s onChange below), so it needs the same warning.
                                    Carried-forward gap from Tasks 6/7's own review: both left this
                                    banner out since it wasn't in their scope. */}
                                <Show when={previewBreakpoint() !== 'desktop'}>
                                    <p class="border-b border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                                        {t('cms.node.responsive.overrideHint').replace('{breakpoint}', t(`cms.node.responsive.${previewBreakpoint()}` as any))}
                                    </p>
                                </Show>
                                <Show when={selectedCapabilities()?.style}>
                                    <NodeStyleTab
                                        searchQuery={searchQuery()}
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
                                        isFrame={selected()?.type === ENodeType.FRAME}
                                        activeTheme={activeTheme()}
                                    />
                                </Show>
                            </Show>
                        </Show>
                    </div>
                    )}
                    effectsTab={(searchQuery) => (
                    /* Property Inspector redesign, Task 7: the "Hiệu ứng" tab. Two components,
                       both relocated rather than rewritten:
                         - NodeStyleEffectsTab — the CSS-Transform/Hover/Image-art-direction
                           sections extracted out of NodeStyleTab.tsx (Task 6 had moved that whole
                           file into "Kiểu dáng", but per the design doc's §2 these three belong
                           here). It reads/writes the SAME `previewBreakpoint()`-aware
                           `style`/`responsiveOverrides.<bp>.style` slot as the NodeStyleTab call
                           above — the two own disjoint StyleObject sub-keys and each spreads the
                           rest, so neither can clobber the other (same rationale as the
                           NodeContentSpacingSize/NodeStyleTab pairing in `contentTab`).
                         - NodeAnimationTab — moved here from Task 4's staging in `contentTab`,
                           props and capability gating unchanged.
                       Same multi-select guard as `contentTab`/`styleTab`: without it, switching
                       to this tab with several nodes selected would silently edit whichever node
                       `selected()` resolves to. */
                    <div class="min-h-0 flex-1">
                        <Show
                            when={!isMultiSelected()}
                            fallback={<div class="p-6 text-center text-sm text-neutral-500">{t('cms.nodeBuilder.multiSelectionHint')}</div>}
                        >
                            <Show when={selected()}>
                                {/* Property Inspector Phase 4, Task 7 — "reset this tab" batching,
                                    visible only when at least one of Transform/Hover/Image
                                    currently shows isModified. NodeAnimationTab (also in this tab)
                                    is deliberately excluded — see handleResetEffectsTab's comment. */}
                                <Show when={effectsTabModified()}>
                                    <button type="button" class="mx-4 mt-2 self-start text-xs font-medium text-nb-accent hover:underline" onClick={handleResetEffectsTab}>
                                        {t('cms.nodeBuilder.resetTabButton')}
                                    </button>
                                </Show>
                                {/* Property Inspector redesign, Task 10 closeout: same rationale
                                    as the identical banner added to `styleTab` above — this tab's
                                    NodeStyleEffectsTab also writes `responsiveOverrides.<bp>.style`. */}
                                <Show when={previewBreakpoint() !== 'desktop'}>
                                    <p class="border-b border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                                        {t('cms.node.responsive.overrideHint').replace('{breakpoint}', t(`cms.node.responsive.${previewBreakpoint()}` as any))}
                                    </p>
                                </Show>
                                <Show when={selectedCapabilities()?.animation && !MIGRATION_ONLY_NODE_TYPES.has(selected()!.type ?? '')}>
                                    <NodeAnimationTab
                                        searchQuery={searchQuery()}
                                        timeline={selected()!.animationRef}
                                        onChange={(next) => patchSelected((n) => { n.animationRef = next; })}
                                    />
                                </Show>
                                <Show when={selectedCapabilities()?.style}>
                                    <NodeStyleEffectsTab
                                        searchQuery={searchQuery()}
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
                                        isImage={selected()?.type === ENodeType.IMAGE}
                                        activeTheme={activeTheme()}
                                    />
                                </Show>
                            </Show>
                        </Show>
                    </div>
                    )}
                    advancedTab={(searchQuery) => (
                    /* Property Inspector redesign, Task 8: the "Nâng cao" tab — Positioning
                       (Transform/GridItem) + Data (Source/Binding), moved here unchanged from
                       Task 4's staging in `contentTab` (byte-for-byte identical props/gating).
                       Same multi-select guard as `contentTab`/`styleTab`/`effectsTab`.
                       Phase 3 regroup: NodeAdvancedTab (Phần tử / Khả năng tiếp cận / Nhà phát
                       triển) is now mounted FIRST below, ungated; the 4 pre-existing components
                       keep their exact props and <Show> gating. */
                    <div class="min-h-0 flex-1">
                        <Show
                            when={!isMultiSelected()}
                            fallback={<div class="p-6 text-center text-sm text-neutral-500">{t('cms.nodeBuilder.multiSelectionHint')}</div>}
                        >
                            <Show when={selected()}>
                                {/* Property Inspector Phase 4, Task 7 — "reset this tab" batching,
                                    visible only when at least one of Element/Accessibility/
                                    Developer (NodeAdvancedTab) or Transform (NodeTransformTab) or
                                    GridItem (NodeGridItemTab) currently shows isModified.
                                    NodeDataSourceTab/NodeDataBindingTab (also in this tab) are
                                    deliberately excluded — see handleResetAdvancedTab's comment. */}
                                <Show when={advancedTabModified()}>
                                    <button type="button" class="mx-4 mt-2 self-start text-xs font-medium text-nb-accent hover:underline" onClick={handleResetAdvancedTab}>
                                        {t('cms.nodeBuilder.resetTabButton')}
                                    </button>
                                </Show>
                                {/* Property Inspector redesign, Task 10 closeout: same rationale as
                                    `styleTab`/`effectsTab` — NodeTransformTab below writes
                                    `responsiveOverrides.<bp>.layout` (not `.style`, but the hint
                                    copy is generic to "overrides", so it applies here too). */}
                                <Show when={previewBreakpoint() !== 'desktop'}>
                                    <p class="border-b border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                                        {t('cms.node.responsive.overrideHint').replace('{breakpoint}', t(`cms.node.responsive.${previewBreakpoint()}` as any))}
                                    </p>
                                </Show>
                                {/* Property Inspector redesign, Phase 3 — the "Nâng cao" regroup.
                                    NodeAdvancedTab renders the 3 genuinely new groups (Phần tử /
                                    Khả năng tiếp cận / Nhà phát triển) added this phase; the 4
                                    components below it (Positioning + Data) are UNCHANGED, only
                                    now preceded by it.
                                    Mounted UNGATED on purpose: unlike the 4 below (parent-layout /
                                    repeat / dataBinding dependent) an HTML id, extra class,
                                    aria-label or raw CSS is meaningful on EVERY node type — same
                                    "no capability check" treatment NodeVisibilityTab already gets.
                                    Also NOT breakpoint-aware: `advanced` has no
                                    `responsiveOverrides` slot (see NodeAdvancedConfig in
                                    node.types.ts), so it deliberately ignores previewBreakpoint()
                                    — exactly like NodeDataSourceTab/NodeDataBindingTab below,
                                    which sit under the same tab-level override banner. */}
                                <NodeAdvancedTab
                                    searchQuery={searchQuery()}
                                    advanced={selected()?.advanced}
                                    onChange={(next) => patchSelected((n) => { n.advanced = next; })}
                                />

                                {/* Task 2 (Phase 1b) — positioning fields only apply when the PARENT
                                    lays this node out via layoutMode='free' (see selectedParent above);
                                    gated on the parent, not the selected node's own layoutMode. */}
                                <Show when={selectedParent()?.layoutMode === 'free'}>
                                    <NodeTransformTab
                                        searchQuery={searchQuery()}
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

                                {/* Task 7 (Phase 2, Layout & Grid) — colSpan/colStart only apply when the
                                    PARENT lays this node out via layout.display==='grid' (see
                                    selectedParent above); gated on the parent, same pattern as
                                    NodeTransformTab above but on `layout?.display` instead of
                                    `layoutMode`.
                                    I2 final-review fix: was reading the parent's raw desktop
                                    `layout?.display`, ignoring `responsiveOverrides` — so a parent
                                    Frame set to grid ONLY via a tablet/mobile override never showed
                                    this tab while previewing that breakpoint (the exact device where
                                    the admin most needs to set that child's colSpan/colStart).
                                    `resolveEffectiveLayout` resolves the same breakpoint-merged
                                    cascade `previewBreakpoint()`-aware reads elsewhere in this file
                                    already use (see handleDragStart/handleResizeStart/
                                    handleRotateStart above). */}
                                <Show when={resolveEffectiveLayout(selectedParent() ?? {}, previewBreakpoint()).display === 'grid'}>
                                    <NodeGridItemTab
                                        searchQuery={searchQuery()}
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
                                        dataBinding={selected()!.dataBinding ?? { mode: EDataBindingMode.STATIC }}
                                        availableFields={bindableFields()}
                                        onChange={(d) => patchSelected((n) => { n.dataBinding = d; })}
                                    />
                                </Show>
                            </Show>
                        </Show>
                    </div>
                    )}
                />
            </div>

            <Slideout id="node-builder-palette" isOpen={paletteOpen()} onClose={() => setPaletteOpen(false)} class="w-full max-w-[420px]">
                <Slideout.Header title={t('cms.nodeBuilder.paletteTitle')} hasClose />
                <Slideout.Body class="p-0">
                    <NodePalette onAdd={handleAdd} onAddComponent={handleAddComponent} />
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
