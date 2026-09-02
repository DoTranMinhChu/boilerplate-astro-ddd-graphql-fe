# FE-2 Audit — `src/modules/cms/**` (Node Builder visual editor)

Repo: `ddd-graphql-fe` (Astro + **SolidJS**, not React — reactivity findings below are framed
in Solid terms: fine-grained signals/`createMemo`, not React re-render/useMemo). Read-only,
no files edited.

## Summary

- **Structure is unusually well-factored for its size** (~200 files, 8 shipped phases): node
  type dispatch, style/layout application, and Inspector field rendering were each already
  consolidated into ONE shared implementation during earlier phases (Phase 2's Widget Registry
  v2, `applyNodeStyle.ts`/`applyNodeLayout.ts`/`mergeResponsiveOverride.ts`, `FieldRenderer.tsx`).
  Very little of the internal duplication a module this size usually accumulates was found.
- **Admin CRUD pages and Inspector controls correctly reuse `core/`** (`core/components/table/
  GeneratedDatatable`, `core/components/control/*`, `core/components/dialog/*`) — no reinvented
  buttons/modals/tables/inputs found anywhere in `cms/`.
- **Critical performance finding**: the Node Builder canvas's root render (`NodeBuilder.page.tsx`)
  calls `buildNodeTree(nodes)` — which allocates a brand-new object for every single node on
  every call, by the code's own documentation — through a **plain, unmemoized** `tree()`
  accessor read directly in `<For each={tree()}>`. Since every Inspector field edit
  (`patchSelected`) mutates the store **immediately** (by design, for instant feedback), typing
  in *any* Inspector field remounts the **entire canvas DOM subtree** on every keystroke — not
  just during drag (which the code already special-cased with direct DOM mutation to work around
  this exact defect).
- **GSAP + ScrollTrigger are statically imported** by `applyAnimationTimeline.ts`, which
  `useNodeAnimation.ts`'s `use:nodeAnimation` directive pulls into essentially every node
  primitive (Text/Image/Button/Icon/Shape/Video/Frame/CustomCode/ContentDetail/Chart). Because
  this directive is used unconditionally (not gated on whether the node actually has an
  `animationRef`), the full GSAP + ScrollTrigger bundle ships in the public site's `client:visible`
  island JS for every CMS page, even pages with zero animated content.
  `FrameNode.tsx` additionally imports `gsap` directly for its accordion/carousel behaviors.
- **A real, previously-undetected admin-facing bug**: `FormEmbedNode` declares
  `capabilities.style: true` in the node registry (so the Style/Effects/Shadow Inspector tabs are
  shown and editable for it) but its render function never reads `node.style`/calls
  `applyNodeStyle` at all — any background/border/padding/typography an admin configures on a
  Form node is silently persisted but never rendered.
- **One small but widespread duplication**: an identical `LABEL_CLASS` string constant is
  hand-copied into 15 separate Inspector-tab files instead of one shared export, and 4 of the 15
  copies use a different color token (`text-neutral-500`) than the other 11
  (`text-nb-text-muted`) — a likely unintentional visual drift, not just duplicated code.
- Drag/resize/rotate/marquee gesture handlers are, by contrast, **already well-optimized**:
  live preview during a gesture bypasses the store entirely (direct DOM mutation on the
  registered element), store writes happen exactly once per gesture at `pointerup`, and all 3
  gesture handlers correctly clean up their `pointermove`/`pointerup`/`pointercancel` listeners
  on every exit path (including cancellation) — this was clearly hardened through several rounds
  of live-verified bug fixes (documented in-code).
- `LayersPanel.tsx` (the one other place that flattens/re-derives the tree for a large list)
  correctly uses `createMemo` — confirming the `tree()` unmemoization in `NodeBuilder.page.tsx`
  is a **local defect**, not a systemic pattern across the module.
- Dead code from earlier phases is essentially fully cleaned up: the Phase 5 "Motion System
  Unification" removed the old `useAnimate.ts`/`presetRegistry.ts`/`AnimationLayer` system
  completely — only historical comments remain (no dead imports/files). The one loose end is
  cosmetic: `DragList.tsx` and `PageVersionHistoryPanel.tsx` still reference a `BlockList.tsx`
  file by name in comments; that file no longer exists (deleted with the old Section system in
  Phase 0 M3b) — matches the already-disclosed "~40 stale Section-era comments" backlog.

## Findings

### 1. Canvas remounts its entire DOM subtree on every Inspector field edit (not just drag)

- **File:line**: `src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx:352` (`const tree = () => buildNodeTree(nodes);`), `NodeBuilder.page.tsx:1833` (`<For each={tree()}>`), `NodeBuilder.page.tsx:1100` (`setNodes(produce((list) => patch(list[idx])));` inside `patchSelected`), and `src/modules/cms/node/buildNodeTree.ts:22-24` (`attach()` spreads `{ ...node, children: ... }` for every node, every call).
- **Category**: performance
- **Severity**: Critical
- **Problem**: `tree()` is a plain Solid accessor (not `createMemo`), so every reactive read re-runs `buildNodeTree(nodes)`, which allocates a brand-new plain object for *every node in the whole tree* (the function itself has no memoization — confirmed by the extensive in-code comment on `NodeBuilder.page.tsx:494-527` documenting this exact characteristic, added while fixing a *different*, drag-specific symptom of it). `tree()` is read directly inside `<For each={tree()}>` (the canvas's root render), and Solid's `<For>` diffs by **reference identity** of the items — with brand-new object references on every call, `<For>` cannot tell "unchanged" nodes from new ones, so it unmounts and remounts the *entire* rendered subtree. Separately, `patchSelected` (used by essentially every Inspector control's `onChange`, e.g. `NodeStyleTab.tsx`, `NodeTransformTab.tsx`, `NodeContentTab.tsx`) mutates the store via `setNodes(produce(...))` **immediately**, by explicit design ("mutate the store in place... immediately (instant UI feedback)" — its own doc comment), for every single keystroke/slider-drag, independent of the 600ms debounce that only gates when the persisted Command is built.
- **Impact**: Typing a single character into any Style/Content/Transform/Advanced field, or dragging any slider, causes the whole canvas — every rendered node, on every level — to unmount and remount on that keystroke. For a page with more than a handful of nodes this is visibly wasteful (unnecessary layout/reflow, GSAP-animated elements re-triggering their entrance state, `ChartNode`'s SVG rebuilding, `CustomCodeNode`'s iframe/shadow-DOM fully reloading and re-executing its embedded JS, `VideoNode`'s `<video>` restarting playback) on *every keystroke of every edit*, not just drag gestures. The team already special-cased drag/resize/rotate with a direct-DOM-mutation workaround specifically because this defect broke `setPointerCapture` mid-gesture — but that workaround was scoped only to those 3 gesture handlers, leaving the much more common "type in an Inspector field" path unfixed.
- **Suggested direction**: Wrap `tree()` in `createMemo`, and give `buildNodeTree` a way to preserve node object identity for unchanged nodes across calls (e.g. memoize `attach()` per node id, only reallocating a node's object when that node's own fields or child list actually changed) — the same problem the doc comment already fully diagnoses for the drag case applies unconditionally to `patchSelected`/`handleAdd`/`handleDelete`/undo/redo. Even without touching `buildNodeTree`'s allocation strategy, giving `<For>` a stable `keyFn` (`node.id ?? ''`) would let it correctly diff-and-patch existing rows instead of remount-on-every-write, which is likely the highest-leverage single fix here.

### 2. GSAP + ScrollTrigger are eagerly bundled into every public CMS page, animated or not

- **File:line**: `src/modules/cms/node/applyAnimationTimeline.ts:20-21` (`import { gsap } from 'gsap'; import { ScrollTrigger } from 'gsap/ScrollTrigger';`, top-level, unconditional plugin registration at line 24-26), pulled in transitively by `src/modules/cms/node/useNodeAnimation.ts:14`, which every node primitive uses unconditionally via `use:nodeAnimation={props.node.animationRef}` (e.g. `TextNode.tsx:170`, `ImageNode.tsx`, `ButtonNode.tsx:13/15`, `IconNode.tsx:11`, `ShapeNode.tsx`, `VideoNode.tsx:19`, `CustomCodeNode.tsx:153`, `ContentDetailNode.tsx:313`, `ChartNode.tsx:135`). `FrameNode.tsx:3` additionally imports `gsap` directly for its accordion/carousel/breathe behaviors.
- **Category**: performance (bundle size)
- **Severity**: Important
- **Problem**: The `use:nodeAnimation` directive is wired onto every node's root element regardless of whether that node actually has an `animationRef` set (the directive itself no-ops at runtime via `if (!timeline) return;` inside `onMount` in `useNodeAnimation.ts:19-20`, but that's a *runtime* no-op — the `import { gsap } from 'gsap'` at the top of `applyAnimationTimeline.ts` is a *module-graph* dependency, resolved at bundle time regardless of whether the code path is ever exercised). Because `ResponsiveNodeTree.tsx` (the public site's `client:visible` hydration root) renders through `NodeRenderer` → every primitive → this directive, GSAP + `gsap/ScrollTrigger` end up in the client JS chunk for the CMS page island on every single public page, including pages that use zero `animationRef`s and no Frame accordion/carousel/breathe behavior.
- **Impact**: Non-trivial parse/download cost added to the client JS for the common case (a static marketing page with no animation), paid by every visitor, not just pages that use the feature.
- **Suggested direction**: Make the GSAP dependency lazy — e.g. have `applyAnimationTimeline`'s actual GSAP-touching code live behind a dynamic `import('gsap')`/`import('gsap/ScrollTrigger')` inside `useNodeAnimation`'s `onMount`, gated on `value()` actually being a non-null timeline, so pages with no animated nodes never pull GSAP into their JS graph at all. `FrameNode.tsx`'s direct `gsap` usage (accordion/carousel) would need the same treatment, or could funnel through the same lazy-loaded module instead of its own static import.

### 3. `FormEmbedNode` advertises `style: true` capability but never applies node style

- **File:line**: `src/modules/cms/node/nodeRegistry.ts:125-133` (`[ENodeType.FORM_EMBED]: { ..., capabilities: { style: true, ... }, ... }`), gated into the Inspector via `NodeBuilder.page.tsx:2230/2301/2370` (`<Show when={selectedCapabilities()?.style}>`); vs. `src/modules/cms/node/primitives/FormEmbedNode.tsx` (whole file) which never imports or calls `applyNodeStyle`, and never reads `props.node.style` — every other `style:true` node type (`ButtonNode.tsx:13/15`, `IconNode.tsx:11`, `ImageNode.tsx:78`, `ShapeNode.tsx:11`, `TextNode.tsx:170`, `VideoNode.tsx:19`, `ChartNode.tsx:135`, `FrameNode.tsx:205`, `CustomCodeNode.tsx:153`, `ContentDetailNode.tsx:313`) does call it.
- **Category**: duplication-reuse (contract not honored — the flip side of "shared style application," a node type silently opting out of the shared contract the registry claims it implements)
- **Severity**: Important
- **Problem**: `FormEmbedNode.tsx`'s own header comment explains it was deliberately rewritten to drop its own `<section>` wrapper on the assumption that "`NodeRenderer`'s `applyChildLayout`/`applyNodeStyle` already wrap style/layout for this node" — but that's only half true: `NodeRenderer.tsx`'s wrapper `<div>` applies `itemStyle()` (`applyChildLayout` — position/flow layout only), not `applyNodeStyle` (the `StyleObject` — background/border/typography/spacing/effects). `applyNodeStyle` is applied by each primitive itself on its *own* root render output, and `FormEmbedNode` is the one node type in the registry that both claims `style: true` and never does this.
- **Impact**: An admin can open the Style tab for a Form Embed node (it's shown, since `capabilities.style` is `true`), set a background color, border, padding, or typography, save it, and see the change persist to `node.style` in the database — but nothing ever renders differently on the page. Silent, hard-to-diagnose feature gap (no error, no visual difference at all).
- **Suggested direction**: Either wrap `FormEmbedNode`'s root `<div>` with `applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device())` like every other styled primitive, or — if a form embed is deliberately meant to be unstyleable directly (styled only via its containing Frame) — set `capabilities.style: false` in the registry so the Inspector stops offering controls that do nothing.

### 4. `LABEL_CLASS` duplicated verbatim across 15 Inspector files, with a silent color-token split

- **File:line**: `src/modules/cms/admin/nodeBuilder/{ColorTokenOrCustom.tsx:24, NodeAnimationTab.tsx:32, NodeAdvancedTab.tsx:21, NodeContainerLayoutTab.tsx:21, NodeContentSpacingSize.tsx:24, NodeGridItemTab.tsx:12, NodeTransformTab.tsx:9, NodeStyleEffectsTab.tsx:87, NodeStyleTab.tsx:63, NodeVisibilityTab.tsx:34, TypographyColorControl.tsx:30}` all declare `const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';`, while `{FieldRenderer.tsx:26, ContentDetailLayoutTab.tsx:26, NodeDataBindingTab.tsx:27, NodeDataSourceTab.tsx:48}` declare the same constant name with a *different* value: `'mb-1 block text-xs font-medium text-neutral-500'`.
- **Category**: duplication-reuse / organization
- **Severity**: Minor
- **Problem**: The exact same field-label CSS string is copy-pasted into 15 separate files rather than being one export from a shared module (`core/components/control` has `InspectorSection`/`InputWrapper` but no small `FieldLabel` primitive for this). Worse, 4 of the 15 copies drifted to a plain Tailwind gray (`text-neutral-500`) instead of the apparent design-system token (`text-nb-text-muted`) the other 11 use — plausibly unintentional, since nothing else distinguishes those 4 tabs' purpose from the other 11.
- **Impact**: Low runtime impact, but real maintenance risk (any future adjustment to the Inspector's label styling needs 15 edits, easy to miss one, as already happened here) and a small but real visual inconsistency risk (those 4 tabs' labels may render a visibly different gray than the rest of the Inspector, especially likely to matter if `text-nb-text-muted` is dark-mode-aware and `text-neutral-500` isn't).
- **Suggested direction**: Export one `LABEL_CLASS`/`<FieldLabel>` from a shared `nodeBuilder` util (or promote it to `core/components/control` as a tiny `<FieldLabel>` component, given the identical `mb-1 block text-xs font-medium ...` shape appears in every Inspector control), and resolve the `text-nb-text-muted` vs `text-neutral-500` split as one deliberate choice.

### 5. `compileNodeStateCss`/background-animation/spotlight CSS builders re-run unmemoized per node, per render

- **File:line**: `src/modules/cms/node/NodeRenderer.tsx:99` (`<Show when={compileNodeStateCss(props.node, props.node.responsiveOverrides, props.context.device())}>`), `NodeRenderer.tsx:109` (`buildBackgroundAnimationCss(...)`), `NodeRenderer.tsx:116` (`buildSpotlightRevealCss(props.node)`).
- **Category**: performance
- **Severity**: Minor
- **Problem**: All three CSS-string builders are called directly inline in JSX `when=` expressions rather than through a `createMemo`, so each re-runs its full responsive-cascade merge (`resolveEffectiveStyle`) and string-building work on every reactive re-evaluation of that `<Show>`, for every node in the tree, not just when the inputs it actually reads have changed relative to the last render.
- **Impact**: Individually cheap (small objects, no DOM access), but this runs once per builder per node on every render pass — and given Finding #1 (the whole canvas remounting on every keystroke), this cost is currently being paid far more often than necessary. Once #1 is fixed, this becomes proportionally more noticeable since these 3 calls would then dominate the remaining per-node render cost.
- **Suggested direction**: Wrap each in `createMemo` scoped per `NodeRenderer` instance, mirroring the pattern `FrameNode.tsx:200` already uses for `containerLayout` (`createMemo(() => applyContainerLayout(...))`, explicitly added there "Minor 3 (perf, final-review fix)" to avoid the identical double-computation problem) and `ImageNode.tsx:77` uses for `effectiveStyle`.

### 6. Stale `BlockList.tsx` references — dead documentation from the deleted Section system

- **File:line**: `src/modules/cms/admin/DragList.tsx:13,30` ("Same rationale as `BlockList.tsx`", "the same property `BlockList` gets for free"), `src/modules/cms/admin/builder/PageVersionHistoryPanel.tsx:15` ("`BlockList.tsx` uses for its single-block delete").
- **Category**: organization (dead code / stale docs from an earlier phase)
- **Severity**: Minor
- **Problem**: `BlockList.tsx` no longer exists anywhere in the repo (confirmed via full-repo search) — it was the old Section-system's drag-reorder component, removed when Phase 0 M3b deleted the Section module entirely. The comments in `DragList.tsx` (its Node-tree-era generic replacement) and `PageVersionHistoryPanel.tsx` still refer to it by name as a live file.
- **Impact**: None functionally — purely a documentation-accuracy issue for future readers/maintainers trying to "go read `BlockList.tsx` for comparison" and finding it doesn't exist. This is the same class of issue already logged as accepted backlog after Phase 0 M3b ("~40 stale 'Section' comments, Minor, accepted as backlog") — flagged here for completeness since it's a concrete, findable instance of it, not a new problem.
- **Suggested direction**: Low priority; fold into the same disclosed comment-cleanup backlog rather than a standalone fix.

### 7. Repeated `nodes.find(...)` linear scans on every reactive read in `NodeBuilder.page.tsx`

- **File:line**: e.g. `NodeBuilder.page.tsx:357` (`selected`), `:362` (`selectedParent`), `:379` (`instanceRootNode`'s ancestor walk), `:397-410` (`boundContentTypeId`'s ancestor walk), `:611` (`isDraggableParent`), `:696` (siblings filter inside `handleDragStart`'s `onUp`).
- **Category**: performance
- **Severity**: Minor
- **Problem**: The flat `nodes` store is a plain array, and numerous plain (non-memoized) accessors do an `O(n)` `.find`/`.filter` scan over it, some walking `parentId` chains (`O(depth × n)`), each re-run on every reactive read (which — per Finding #1 — currently happens very often, on every keystroke).
- **Impact**: Negligible for typical page sizes (tens of nodes); would start to matter on pages with several hundred nodes, particularly the ancestor-walk accessors (`instanceRootNode`, `boundContentTypeId`) which are read from the Inspector's render path on every store change.
- **Suggested direction**: Not urgent on its own; if Finding #1 is fixed (so these are no longer re-run on every keystroke), this is likely fine as-is. If it remains a concern, a memoized `Map<id, NodeDTO>`/`Map<id, parentId>` rebuilt once per store write (similar to `LayersPanel.tsx:191`'s existing `nodesById = createMemo(...)`) would flatten every one of these to O(1)/O(depth).

## What's already good (no finding needed)

- `nodeRegistry.ts` (Phase 2, Widget Registry v2) is the single source of truth for
  renderer/icon/label/capabilities/fieldSchema per node type — the 3 old parallel maps are now
  derived from it, and `FieldRenderer.tsx` is the single generic Content-tab control dispatcher
  (replacing a former per-type `<Show>` chain).
- `applyNodeStyle.ts`/`applyNodeLayout.ts`/`mergeResponsiveOverride.ts`
  (`resolveEffectiveStyle`/`resolveEffectiveLayout`) are each called from every primitive that
  needs them (bar Finding #3) — no per-node-type reimplementation of the responsive-cascade or
  CSS-property-mapping logic found.
- `node.types.ts`'s `SAVABLE_NODE_FIELD_KEYS`/`pickSavableNodeFields` already closed a
  previously-real 3-copies-hand-listed-fields duplication risk (documented in its own comment).
- Admin CRUD list pages (`manageCmsPages.page.tsx`, `manageContentTypes.page.tsx`,
  `manageThemes.page.tsx`, etc.) correctly reuse `core/components/table/GeneratedDatatable` +
  `core/components/control/*` + `core/components/dialog/*` — no bespoke table/pagination/modal
  code found in `cms/admin/`.
- Gesture handling (`handleDragStart`/`handleResizeStart`/`handleRotateStart` in
  `NodeBuilder.page.tsx`) is genuinely well-optimized: live preview writes directly to the DOM
  (`applyLiveNodeStyle`/`applyLiveRotation`) rather than the reactive store, exactly one Command
  is committed per gesture at `pointerup`, and every gesture correctly removes its 3 listeners on
  every exit path including `pointercancel` — the in-code comments show this was hardened through
  several real, live-verified bug-fix rounds (ghost-click suppression, listener leaks,
  `setPointerCapture` interaction with store-triggered remounts).
- `LayersPanel.tsx` correctly memoizes its own tree-flattening (`createMemo` for both `nodesById`
  and `flatRows`), confirming the unmemoized `tree()` in `NodeBuilder.page.tsx` (Finding #1) is a
  local defect rather than a systemic pattern.
- Motion System Unification (Phase 5) fully deleted the old parallel animation system
  (`useAnimate.ts`/`presetRegistry.ts`/`AnimationLayer`) — only historical comments reference it,
  no dead imports or files remain; `useNodeAnimation.ts` is confirmed the sole animation directive
  in the module.
