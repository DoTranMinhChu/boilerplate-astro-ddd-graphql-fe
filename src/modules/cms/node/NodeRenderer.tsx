// src/modules/cms/node/NodeRenderer.tsx
import { createComponent, createResource, For, Show, ErrorBoundary, onCleanup, type JSX } from 'solid-js';
import type { NodeTree, NodeRenderContext } from './node.types';
import type { ELayoutMode } from './node.constants';
import { SELF_RESOLVING_REPEAT_NODE_TYPES } from './node.constants';
import { nodeRegistry } from './nodeRegistry';
import { resolveRenderableChildren } from './resolveRenderableChildren';
import { evaluateVisibilityRules } from './evaluateVisibilityRules';
import { fetchRepeatEntries } from './nodeDataBinding';
import { applyChildLayout } from './applyNodeLayout';
import { NodeCanvasOverlay } from './NodeCanvasOverlay';
import { compileNodeStateCss } from './compileNodeStateCss';
import { buildBackgroundAnimationCss } from './applyNodeBackgroundAnimation';
import { buildSpotlightRevealCss } from './applySpotlightRevealStyle';

export interface NodeRendererProps {
    node: NodeTree;
    context: NodeRenderContext;
    /** layoutMode của node CHA — quyết định node này được đặt theo flow item-props
     * hay free absolute-position. Root call (từ CmsPageShell) không truyền — coi
     * như 'flow' (root luôn là 1 flow frame, xem spec §2). */
    parentLayoutMode?: ELayoutMode;
    /** Phase 2 (Layout & Grid) — the parent FRAME's resolved layout.display ('flex' | 'grid'),
     * threaded down alongside parentLayoutMode so applyChildLayout can decide whether
     * colSpan/colStart apply. undefined = today's behavior (no grid-column emitted from
     * colSpan/colStart, only the raw gridColumn escape hatch still works). */
    parentDisplay?: 'flex' | 'grid';
}

/** Đơn vị render đệ quy DUY NHẤT cho toàn cây Node — admin canvas và trang public
 * dùng CHUNG component này (what-you-see-is-what-you-get, xem spec §7). 1 node lỗi
 * không sập cả cây (ErrorBoundary riêng từng node, cùng nguyên lý SectionRenderer). */
export function NodeRenderer(props: NodeRendererProps) {
    // `props.node.type` là `string | undefined` ở tầng codegen (mọi field NodeDTO đều vậy) —
    // `?? ''` để index vào Record<string, Component> (index signature yêu cầu key: string).
    const Comp = () => nodeRegistry[props.node.type ?? ''];
    const itemStyle = () => applyChildLayout(props.node, props.parentLayoutMode ?? 'flow', props.context.device(), props.parentDisplay);
    // Final-review fix Important #1: `resolveRenderableChildren.ts` evaluates visibilityRules
    // ONLY for a node's children (called from `NodeChildrenList` below) — a ROOT node (mounted
    // directly from CmsPageShell.astro/NodeBuilder.page.tsx) never passes through that path, so
    // a visibility rule set on a root node was silently never evaluated. Checking it again here,
    // right at the top of NodeRenderer itself, closes that gap for both roots AND recursive
    // calls — for children it's a harmless, idempotent second check (already true by the time
    // NodeRenderer is invoked for them), not a regression.
    const visible = () => evaluateVisibilityRules(props.node.visibilityRules, props.context);
    // Phase 0 M2c fix (final whole-branch review Important #3): `migrateSectionsToNodes.ts`
    // (BE) now writes `props.enabled = section.enabled` for every migrated node (root wrapper
    // Frame of the 8 M2a generic types, and the node itself for the 3 M2b self-contained
    // branches) — this is the one place that reads it, mirroring `resolveCmsPageProps.ts`'s
    // `.filter(s => s.enabled)` for Section. `undefined` (hand-authored nodes from Node Builder,
    // which never set this prop) means visible — only an explicit `false` hides. Checked at the
    // SAME level as `visible()` above (not folded into it) because `props.enabled` lives in
    // `node.props`, not `node.visibilityRules` — a different mechanism, not a variant of it.
    const enabled = () => props.node.props?.enabled !== false;
    // Task 7: click-to-select wiring for the Node Builder's admin canvas — `builderSelection`
    // is `undefined` everywhere except NodeBuilder.page.tsx's own canvas context, so every
    // other consumer of NodeRenderer (public site via CmsPageShell.astro, mock-entry preview...)
    // gets `onClick: undefined`/`classList: undefined` here, i.e. zero behavior change.
    const isBuilderSelected = () => props.context.builderSelection?.isSelected(props.node.id ?? '') ?? false;

    // Task 4 (M1c): register this node's real DOM element with the canvas's imperative
    // ref registry (NodeBuilder.page.tsx's `elementRegistry`) so drag/resize/rotate (Task
    // 5/6) can read live bounding boxes — `registerElement` is `undefined` everywhere
    // except the builder's own `canvasContext()`, so this is a no-op call on the public
    // site/mock-entry preview, same additive-inert pattern as `isBuilderSelected` above.
    // Review fix: registration + cleanup MUST be paired inside the `ref` callback itself,
    // NOT hoisted to a top-level `onCleanup` in this component's own setup body. A
    // top-level `onCleanup` only fires when NodeRenderer itself is torn down by its
    // parent (e.g. <For> removing the item on delete) — it does NOT fire when the wrapper
    // div is unmounted by the INNER <Show when={visible() && enabled()}> flipping false
    // while this component instance stays mounted (e.g. a live visibility-rule/`enabled`
    // toggle hiding a currently-SELECTED node). That left a stale HTMLElement in the
    // registry. Creating the `onCleanup` inside `ref` ties it to the same (innermost)
    // reactive scope as the element it registers, so it fires whenever the div actually
    // leaves the DOM — whether by this <Show> branch closing or by the whole component
    // unmounting.

    return (
        <Show when={visible() && enabled()}>
            <Show when={Comp()} fallback={<UnknownNodeWarning type={props.node.type ?? ''} />}>
                {/* Hover/focus/active state styling (see node.types.ts's `StyleObject.hover`/
                    `focus`/`active` doc comments) compiles to real `:hover`/`:focus-visible`/
                    `:active` CSS rules here rather than inline `style=` (which cannot express
                    these pseudo-classes at all) — rendered as a sibling `<style>` right next to
                    the node it targets, scoped by the `data-node-id` attribute below. `<Show>`
                    keeps this a true no-op (no extra DOM node) for the overwhelming majority of
                    nodes that never set any of `style.hover`/`style.focus`/`style.active`
                    (Task 12 — unified replacement for the old hover-only compiler). Task 13
                    extends the SAME `compileNodeStateCss` call (no separate `<Show>` needed) to
                    also cover `style.before`/`style.after` decorative `::before`/`::after`
                    layers — base-state, not pseudo-class-gated, but sharing the identical
                    sibling-`<style>` + `data-node-id` selector mechanism.
                    final-review fix (Important #1): passing `responsiveOverrides`/`device()` here
                    mirrors the `buildBackgroundAnimationCss` call directly below it — without
                    this, a hover/focus/active/before/after style edited while previewing Tablet/
                    Mobile (the Inspector routes the WHOLE Style tab, these sections included,
                    into `responsiveOverrides.<bp>.style` at those breakpoints) saved successfully
                    but rendered nowhere, on any device. */}
                <Show when={compileNodeStateCss(props.node, props.node.responsiveOverrides, props.context.device())}>{(css) => <style>{css()}</style>}</Show>
                {/* final-review fix round 4: `buildBackgroundAnimationCss` used to only ever see the
                    DESKTOP base style (raw `props.node.style`), so a per-breakpoint
                    `background.animate:'breathe'` configured entirely inside
                    `responsiveOverrides.mobile.style` (the Inspector allows this) rendered
                    FrameNode.tsx's `data-breathe-id` DOM layer on mobile — that component DOES
                    cascade overrides via `resolveEffectiveStyle` — but emitted no matching
                    `@keyframes`/`animation` CSS at all, a frozen background. Passing
                    `props.node.responsiveOverrides`/`props.context.device()` here lets it run
                    the SAME cascade, mirroring FrameNode.tsx's own `effectiveStyle()`. */}
                <Show when={buildBackgroundAnimationCss(props.node, props.node.responsiveOverrides, props.context.device())}>{(css) => <style>{css()}</style>}</Show>
                {/* SpotlightList close-out (2026-08-22): `props.spotlightReveal` compiles to a
                    `::after` mask-reveal rule the same way — a sibling `<style>` tag, no-op'd by
                    `<Show>` for the overwhelming majority of Text nodes that never set it. Reads
                    the ANCESTOR Frame's `--spot-x`/`--spot-opacity` custom properties, which the
                    Frame writes via its own `behavior.type:'spotlight-list'` pointer handlers
                    (see applySpotlightRevealStyle.ts's doc comment). */}
                <Show when={buildSpotlightRevealCss(props.node)}>{(css) => <style>{css()}</style>}</Show>
                <div
                    ref={(el) => {
                        props.context.builderSelection?.registerElement?.(props.node.id ?? '', el);
                        onCleanup(() => props.context.builderSelection?.registerElement?.(props.node.id ?? '', null));
                    }}
                    // Property Inspector Phase 3 — `advanced.htmlId` becomes the real HTML `id`
                    // attribute (anchor targets, hand-written global CSS, third-party scripts).
                    // `undefined` for every node that doesn't set `advanced` (i.e. essentially all
                    // of them today), and Solid omits the attribute entirely for `undefined` — so
                    // this is additive-inert in exactly the same way as `isBuilderSelected`/
                    // `registerElement` above. NOT defaulted to `props.node.id`: silently stamping
                    // every node in the app with an `id` would be a real, global DOM change (CSS
                    // `#id` specificity, `:target`, duplicate-id collisions with hand-written
                    // markup), not an inert one.
                    id={props.node.advanced?.htmlId}
                    // `data-node-id` is the hover/focus/active/before/after-CSS selector hook (see
                    // `compileNodeStateCss.ts`) — every node gets it unconditionally (cheap, harmless
                    // when unused) so a `style.hover`/`style.before`/etc. can be added to ANY node
                    // later without a separate opt-in. Phase 3 adds a 6th rule kind to that same
                    // compiler (`advanced.customCss`) hanging off this identical attribute, so
                    // nothing here needed to change for it.
                    data-node-id={props.node.id}
                    style={itemStyle()}
                    classList={{
                        'ring-2 ring-inset ring-primary-500': !!props.context.builderSelection && isBuilderSelected(),
                        // Property Inspector Phase 3 — MERGES the admin's custom class onto this
                        // root element without replacing the selection ring above: Solid's
                        // `classList` composes every truthy key additively (and splits a
                        // space-separated key into individual class names), so both can be present
                        // at once. Guarded on a non-empty string so an unset `cssClass` contributes
                        // nothing — a computed `['']` key is skipped by Solid's own `if (!key)
                        // continue` in both the client `classList` helper and the SSR one, and the
                        // `false` value would skip it regardless.
                        [props.node.advanced?.cssClass ?? '']: !!props.node.advanced?.cssClass,
                    }}
                    // Property Inspector Phase 3 — a11y overrides, all three `undefined` (attribute
                    // omitted entirely) for any node without `advanced`. `ariaHidden` is coerced
                    // with `|| undefined` on purpose: an explicit `false` must render NO attribute
                    // at all rather than `aria-hidden="false"`, since the latter is a meaningful,
                    // different a11y statement (it force-UNhides a node inside an
                    // `aria-hidden="true"` ancestor) that no admin who merely left the checkbox
                    // unticked intended.
                    aria-label={props.node.advanced?.ariaLabel}
                    aria-hidden={props.node.advanced?.ariaHidden || undefined}
                    // Cast: `NodeAdvancedConfig.role` is deliberately free-text `string` (see its
                    // doc comment — the valid ARIA role list is large and node-type-dependent, so
                    // Task 2 chose not to enum it), while Solid's JSX types narrow `role` to a
                    // fixed union of known roles. The DOM itself accepts any string here and simply
                    // ignores an unrecognized one, so the cast loses no real safety — it just
                    // reconciles the two type systems at the single point they meet.
                    role={props.node.advanced?.role as JSX.HTMLAttributes<HTMLDivElement>['role']}
                    onClick={props.context.builderSelection ? (e: MouseEvent) => props.context.builderSelection!.onSelectClick(props.node.id ?? '', e) : undefined}
                    // Task 5 (M1c) — the doc comment on `builderSelection.onDragStart` (node.types.ts)
                    // already predicted this: "NodeRenderer.tsx chỉ gắn pointerdown handler này khi
                    // nó tồn tại". `onDragStart` itself has no caller anywhere else — this node's own
                    // wrapper div IS the drag-initiation surface (as opposed to resize/rotate, which
                    // are the separate handle elements NodeCanvasOverlay already wires via
                    // NodeChildrenList below). Only actually starts a drag when BOTH the handler is
                    // provided AND this node's PARENT is free-layout (`isDraggableParent`) — a no-op
                    // pointerdown on every other node (flow children, or when `builderSelection` is
                    // `undefined` on the public site), so this is additive-inert exactly like
                    // `isBuilderSelected`/`registerElement` above. `handleDragStart`
                    // (NodeBuilder.page.tsx) calls `e.stopPropagation()` itself once a real drag
                    // starts, same convention as `onSelectClick`'s own internal stopPropagation — not
                    // done here, so a non-draggable node's pointerdown still bubbles normally.
                    onPointerDown={
                        props.context.builderSelection
                            ? (e: PointerEvent) => {
                                  const bs = props.context.builderSelection!;
                                  if (bs.onDragStart && bs.isDraggableParent?.(props.node.parentId)) bs.onDragStart(props.node.id ?? '', e);
                              }
                            : undefined
                    }
                >
                    <ErrorBoundary fallback={(err) => <NodeErrorFallback error={err} type={props.node.type ?? ''} />}>
                        {/* Node-level data binding (2026-08-17) fix — found live (production build,
                            not static review): calling the resolved component as a raw function
                            (`Comp()!({...})`) instead of through Solid's real component-creation
                            path never gave TABLE/CARD_LIST (the first node types whose OWN render
                            body needs a `createResource` AND real client interactivity — Prev/Next
                            clicks) a proper reactive owner/hydration boundary. Client-side hydration
                            silently never invoked the primitive's function body at all (confirmed:
                            an unconditional console.log placed as the very first line never fired
                            in the browser, while the identical log fired 3× server-side during
                            SSR's normal multi-pass resource resolution) — the ErrorBoundary caught
                            a bare pending-resource signal instead and rendered its (production-null)
                            fallback, leaving the SSR'd DOM inert with no event listeners attached.
                            `createComponent` is the same primitive Solid's own JSX compiler expands
                            `<Comp {...props}/>` into — using it here (needed because the concrete
                            component isn't known until runtime, so JSX tag syntax can't be used)
                            gives every node type, not just these two, a real component instance
                            hydration can resume correctly. Existing read-only resource primitives
                            (MixedFeedNode.tsx et al.) never surfaced this because they have no
                            interactive follow-up depending on the same resource re-firing. */}
                        {createComponent(Comp()!, { node: props.node, context: props.context })}
                    </ErrorBoundary>
                </div>
            </Show>
        </Show>
    );
}

/** Dùng trong FrameNode để render 1 danh sách children đã resolve visibility+repeat.
 * Tách riêng khỏi FrameNode để mọi container tương lai (widget dev tự viết, có
 * `acceptsChildren: true`) đều gọi lại được, không phải viết lại logic. */
export function NodeChildrenList(props: { children: NodeTree[]; context: NodeRenderContext; parentLayoutMode: ELayoutMode; parentDisplay?: 'flex' | 'grid' }) {
    // Node-level data binding (2026-08-17): TABLE/CARD_LIST resolve their OWN `repeat`
    // internally (see resolveRenderableChildren.ts's matching comment) — excluded here too so
    // this map doesn't waste a fetch for a node whose result it will never be read for.
    // Task 1 (carousel Frame foundation, 2026-08-23): identical added clause to
    // resolveRenderableChildren.ts's matching exclusion — a carousel-behavior Frame self-resolves
    // its own repeat via its own createResource, so pre-fetching it here too would be a wasted
    // duplicate fetch whose result is never read (mirrors the reasoning already documented above
    // for SELF_RESOLVING_REPEAT_NODE_TYPES).
    const repeatNodes = () => props.children.filter((c) => c.repeat && !SELF_RESOLVING_REPEAT_NODE_TYPES.has(c.type ?? '') && (c.props as any)?.behavior?.type !== 'carousel');
    const [entriesByNodeId] = createResource(repeatNodes, async (nodes) => {
        const map = new Map<string, Record<string, any>[]>();
        await Promise.all(nodes.map(async (n) => {
            // Final-review fix Important #2: `locale` PHẢI truyền xuống mọi query công khai đọc
            // ContentEntry (cùng lớp bug đã fix cho Section's data pipeline — xem "Critical #1
            // fix" comment ở resolveCmsPageProps.ts) — thiếu nó thì entry của MỌI locale trong 1
            // nhóm dịch sẽ trộn lẫn vào cùng 1 khối repeat.
            // Phase 0 M1 Task 8: fetchRepeatEntries giờ cần cả pathParams/queryParams (filter
            // 'own' dynamic qua resolveGenericDataSource) và contextEntryId (source 'related'/
            // 'backlink' cần id riêng — xem "Final-review fix Critical #1" ngay dưới, KHÔNG còn
            // đọc contextEntry.id) — truyền nguyên object context, không chỉ locale.
            map.set(n.id ?? '', await fetchRepeatEntries(n.repeat!, {
                locale: props.context.locale,
                pathParams: props.context.pathParams,
                queryParams: props.context.queryParams,
                // Final-review fix Critical #1: only the id-only field is threaded through —
                // `FetchRepeatCtx` deliberately has no `contextEntry` (flat field-data) slot at
                // all, since fetchRepeatEntries never reads field VALUES, only this id.
                contextEntryId: props.context.contextEntryId,
            }));
        }));
        return map;
    });

    const renderable = () => resolveRenderableChildren(props.children, props.context, entriesByNodeId() ?? new Map());
    // Task 4 (M1c): the selection overlay only makes sense for a FREE-layout parent — its
    // children carry real x/y/width/height/rotation (FreeLayoutProps), which is exactly what
    // `NodeCanvasOverlay` renders as a sibling "shadow" box (see that file's header comment
    // on why layout-space, not screen-space, positioning is used). A `flow`-layout child has
    // no such coordinates (only order/grow/basis — FlowLayoutProps), so there is nothing
    // meaningful to draw a resize/rotate box around; flow children keep the plain click-to-
    // select ring from NodeRenderer's own wrapper div (Task 7) and nothing else.
    const isFreeLayoutParent = () => props.parentLayoutMode === 'free';

    return (
        <For each={renderable()}>
            {(item) => (
                <>
                    <NodeRenderer node={item.node} context={item.context} parentLayoutMode={props.parentLayoutMode} parentDisplay={props.parentDisplay} />
                    <Show when={isFreeLayoutParent() && props.context.builderSelection?.selectedIds?.().has(item.node.id ?? '')}>
                        <NodeCanvasOverlay
                            layout={item.node.layout ?? {}}
                            isMultiSelect={(props.context.builderSelection?.selectedIds?.().size ?? 0) > 1}
                            isDraggableParent={props.context.builderSelection?.isDraggableParent?.(item.node.parentId) ?? false}
                            // M1c final-review fix I4 — see NodeCanvasOverlay's `getFallbackSize`
                            // doc comment on why this is passed as a THUNK (read post-mount, not
                            // eagerly here) — fallback only kicks in when layout.width/height is
                            // unset.
                            getFallbackSize={() => props.context.builderSelection?.getElementSize?.(item.node.id ?? '')}
                            onResizeHandlePointerDown={(handle, e) => props.context.builderSelection?.onResizeStart?.(item.node.id ?? '', handle, e)}
                            onRotateHandlePointerDown={(e) => props.context.builderSelection?.onRotateStart?.(item.node.id ?? '', e)}
                        />
                    </Show>
                </>
            )}
        </For>
    );
}

function UnknownNodeWarning(props: { type: string }) {
    // Final-review fix Important #4: `scripts/migrateSectionsToNodes.ts` (BE) writes
    // `type: legacy:${section.type}` for every migrated block — nodeRegistry correctly has no
    // entry for any `legacy:*` type by design (full legacy-block rendering is Phase 6 scope, not
    // Phase 1). Without this check, a deliberately-deferred legacy type hit the exact same
    // `console.error`/"chưa được đăng ký" path as a genuinely broken/mistyped node, with no way
    // to tell the two apart. Cosmetic/diagnostic only — no new rendering logic for legacy types.
    const isLegacy = props.type.startsWith('legacy:');
    if (isLegacy) {
        console.info(`[CMS] Legacy migrated block "${props.type}" — rendering deferred to Phase 6.`);
    } else {
        console.error(`[CMS] Node type không tồn tại trong nodeRegistry: "${props.type}"`);
    }
    if (import.meta.env.DEV) {
        if (isLegacy) {
            return <div class="mx-auto max-w-4xl px-6 py-4 text-sm text-neutral-500 border border-neutral-200 bg-neutral-50 rounded-lg my-2">
                ℹ Khối cũ (di trú từ Section) — chưa hỗ trợ render ở Phase 1: "{props.type}".
            </div>;
        }
        return <div class="mx-auto max-w-4xl px-6 py-4 text-sm text-amber-600 border border-amber-200 bg-amber-50 rounded-lg my-2">
            ⚠ Node type "{props.type}" chưa được đăng ký trong nodeRegistry (chỉ hiện ở dev/preview).
        </div>;
    }
    return null;
}

function NodeErrorFallback(props: { error: unknown; type: string }) {
    console.error(`[CMS] Lỗi khi render node "${props.type}":`, props.error);
    if (import.meta.env.DEV) {
        const message = props.error instanceof Error ? props.error.message : String(props.error);
        return <div class="mx-auto max-w-4xl px-6 py-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg my-2">
            ⚠ Lỗi render node "{props.type}": {message}
        </div>;
    }
    return null;
}
