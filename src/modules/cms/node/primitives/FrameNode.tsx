// src/modules/cms/node/primitives/FrameNode.tsx
import { Show, createSignal, createEffect, createMemo, createResource, onCleanup, onMount, For } from 'solid-js';
import { gsap } from 'gsap';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle, resolveColorValue } from '../applyNodeStyle';
import { applyContainerLayout, resolveEffectiveLayout } from '../applyNodeLayout';
import { NodeChildrenList } from '../NodeRenderer';
import type { NodeTree } from '../node.types';
import { ERepeatSource, EBackgroundFillType } from '../node.types';
import type { ELayoutMode } from '../node.constants';
import { EFrameBehaviorType } from '../node.constants';
import { nodeAnimation } from '../useNodeAnimation';
import { resolveEffectiveStyle } from '../mergeResponsiveOverride';
import { fetchRepeatEntries } from '../nodeDataBinding';

void nodeAnimation;

/** Frame supports 3 optional behavior variants (accordion-item / spotlight-list / carousel)
 * via node.props.behavior — see FrameBehaviorConfig. Deliberately a generic-props field, not
 * a new top-level Node field: a new field needs a backend schema change plus another
 * hardcoded persistence list to keep in sync (the bug class the animationRef rollout hit). */
export interface FrameBehaviorConfig {
    type: EFrameBehaviorType;
    defaultOpen?: boolean; // accordion-item only
    autoplayMs?: number;   // carousel only, default 2300
    pagination?: 'dots' | 'arrows-counter' | 'none'; // carousel only, default 'dots'
}

/** `style`/`layoutMode` are nullable JSON/enum fields at the codegen layer (every NodeDTO
 * field is `T | undefined`) — the `?? {}`/cast + `'flow'` fallback here follows the same
 * convention buildNodeTree.ts uses; do not "fix" this in node.types.ts (not a JSONB field,
 * out of scope for that layer's override).
 *
 * `props.asLink=true` renders this Frame as an `<a>` to `context.contextHref` (the current
 * contextEntry's detail-page URL, set by a repeat-parent with `linkToDetail:true` — see
 * nodeDataBinding.ts/resolveRenderableChildren.ts), used for card-style Frames inside
 * CONTENT_GRID/RELATED_ENTRIES/MIXED_FEED/BACKLINK_ENTRIES grids; falls back to `<div>`
 * otherwise. `props.behavior.type === 'accordion-item'` is checked before isLink() — a Frame
 * is accordion OR link OR plain, never combined (the accordion wrapper already needs the
 * space an `<a>` would otherwise occupy). */
/** Any new render branch using NodeChildrenList directly must also wrap
 * innerContainerStyle() (the containerWidth full-bleed/centered split) — missed twice
 * already, silently breaks that layout. Extracted into this one FrameChildren helper, used
 * at every call site that renders a real slice of this Frame's own children (carousel's
 * active-entry list; accordion's trigger and body — trigger()/body() partition the same
 * children array the default branches render whole), so the wrapper can't be forgotten
 * again. */
function FrameChildren(props: {
    innerStyle: Record<string, string> | undefined;
    children: NodeTree[];
    context: NodeComponentProps['context'];
    layoutMode: ELayoutMode;
    parentDisplay: 'flex' | 'grid';
}) {
    return (
        <Show when={props.innerStyle} fallback={
            <NodeChildrenList children={props.children} context={props.context} parentLayoutMode={props.layoutMode} parentDisplay={props.parentDisplay} />
        }>
            <div style={props.innerStyle}>
                <NodeChildrenList children={props.children} context={props.context} parentLayoutMode={props.layoutMode} parentDisplay={props.parentDisplay} />
            </div>
        </Show>
    );
}

export function FrameNode(props: NodeComponentProps) {
    const isLink = () => props.node.props?.asLink === true && !!props.context.contextHref;

    // The video/breathe layers must read through `resolveEffectiveStyle` (the SAME shared
    // helper `buildBackgroundAnimationCss` uses), not raw `props.node.style?.background` —
    // this Frame's own root element already cascades responsiveOverrides via applyNodeStyle,
    // so a locally-inlined copy of that cascade here would silently ignore a per-breakpoint
    // background image/animate override while the root background correctly swaps. Keeps the
    // MERGED StyleObject (not flattened CSS) so `background.type`/`animate`/`value` stay
    // readable as structured fields.
    const effectiveStyle = () => resolveEffectiveStyle(props.node.style, props.node.responsiveOverrides, props.context.device());

    const isVideoBackground = () => effectiveStyle().background?.type === EBackgroundFillType.VIDEO && !!effectiveStyle().background?.value;
    // final-review fix round 2: the "breathe" pan/zoom animation replicates MediaHeroNode.tsx's
    // (bespoke, now-retired) own architecture — a SEPARATE, EMPTY, child-free background layer,
    // sibling to (not container of) the real children — rather than animating `transform` on
    // THIS Frame's own root element (would also scale every child) or animating
    // `background-size`/`background-position` on it (can't be animated relative to `cover`
    // without the image's real pixel dimensions, so it silently overrides the `cover` default
    // applyNodeStyle.ts sets, causing non-uniform stretch distortion). See
    // applyNodeBackgroundAnimation.ts for the CSS this layer's `data-breathe-id` targets.
    const isBreatheBackground = () =>
        effectiveStyle().background?.type === EBackgroundFillType.IMAGE &&
        effectiveStyle().background?.animate === 'breathe' &&
        !!effectiveStyle().background?.value;
    const behavior = () => props.node.props?.behavior as FrameBehaviorConfig | undefined;
    const isAccordion = () => behavior()?.type === EFrameBehaviorType.ACCORDION_ITEM;
    const isCarousel = () => behavior()?.type === EFrameBehaviorType.CAROUSEL;

    // Same lerp/threshold approach and `--spot-x` CSS var contract as SpotlightListNode.tsx,
    // so any CSS already targeting `--spot-x` (editorialEffects.css) keeps working. `spot*`
    // locals are named to avoid colliding with the accordion branch's own `open`/`bodyRef`.
    //
    // `--spot-x` is measured as the pointer's X distance from THIS Frame's own
    // getBoundingClientRect().left, but applySpotlightRevealStyle.ts's mask-image gradient
    // paints relative to EACH Text child's OWN left edge — those coordinate spaces only
    // coincide when this Frame has zero left padding/border. Giving this Frame left
    // padding/border makes the spotlight silently render offset from the cursor; see
    // applySpotlightRevealStyle.ts for the matching note on the CSS-emitting side.
    const isSpotlightList = () => behavior()?.type === EFrameBehaviorType.SPOTLIGHT_LIST;
    let spotlightRef: HTMLElement | undefined;
    let spotlightTarget = 0;
    let spotlightCurrent = 0;
    let spotlightFrame = 0;
    const spotlightRenderLoop = () => {
        spotlightCurrent += (spotlightTarget - spotlightCurrent) * 0.24;
        spotlightRef?.style.setProperty('--spot-x', `${spotlightCurrent}px`);
        if (Math.abs(spotlightTarget - spotlightCurrent) > 0.15) {
            spotlightFrame = window.requestAnimationFrame(spotlightRenderLoop);
        } else {
            spotlightCurrent = spotlightTarget;
            spotlightRef?.style.setProperty('--spot-x', `${spotlightCurrent}px`);
            spotlightFrame = 0;
        }
    };
    const onSpotlightMove = (e: PointerEvent) => {
        if (!spotlightRef) return;
        const bounds = spotlightRef.getBoundingClientRect();
        spotlightTarget = Math.max(0, Math.min(bounds.width, e.clientX - bounds.left));
        if (!spotlightFrame) spotlightFrame = window.requestAnimationFrame(spotlightRenderLoop);
    };
    const onSpotlightEnter = (e: PointerEvent) => {
        if (!spotlightRef) return;
        const bounds = spotlightRef.getBoundingClientRect();
        spotlightTarget = e.clientX - bounds.left;
        spotlightCurrent = spotlightTarget;
        spotlightRef.style.setProperty('--spot-x', `${spotlightCurrent}px`);
        spotlightRef.style.setProperty('--spot-opacity', '1');
    };
    const onSpotlightLeave = () => spotlightRef?.style.setProperty('--spot-opacity', '0');
    onCleanup(() => { if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(spotlightFrame); });

    // Phase 2 (Layout & Grid) — resolved layout.display for THIS Frame, threaded down to its
    // children (via NodeChildrenList -> NodeRenderer) so applyChildLayout knows whether a
    // child's colSpan/colStart should actually emit a grid-column shorthand (only meaningful
    // when the parent itself is 'grid' — see applyNodeLayout.ts's `parentDisplay` param).
    // I2 final-review fix: was reading the raw desktop `props.node.layout?.display`, ignoring
    // `responsiveOverrides` entirely — a Frame set to `display:'grid'` only via a tablet/mobile
    // override rendered its children with colSpan/colStart silently inert at that breakpoint
    // (parentDisplay stayed 'flex' regardless of device()). `resolveEffectiveLayout` resolves the
    // same breakpoint-merged cascade every other layout read in this file already uses.
    const parentDisplay = () => (resolveEffectiveLayout(props.node, props.context.device()).display === 'grid' ? 'grid' as const : 'flex' as const);

    // applyContainerLayout returns an `outer` CSS map (this Frame's own root) plus an OPTIONAL
    // `inner` map for a wrapper <div> around its children, used only when layout.containerWidth
    // isn't 'full' — e.g. containerWidth:'content' needs the OWN box full-width (full-bleed
    // background) while children are constrained to var(--container-content) and centered,
    // which one flat style object can't express (width:100% and max-width:var(...) would
    // conflict on the same box). Wrapped in one createMemo so the computation runs once per
    // render pass and both `style()` and `innerContainerStyle()` derive from the same result.
    const containerLayout = createMemo(() => applyContainerLayout(props.node, props.context.device()));
    const innerContainerStyle = () => containerLayout().inner;

    const style = () => ({
        ...containerLayout().outer,
        ...applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device()),
        // A video background layer (below) needs `position: relative` on this box so it can
        // be absolutely positioned to fill it — harmless to always set since Frame's own
        // layout props (flex/grid) are unaffected by `position`.
        position: 'relative' as const,
        // `position: relative` alone does NOT create a new CSS stacking context (z-index stays
        // `auto`), so the video layer's `-z-10` could hoist past this box and paint behind the
        // nearest actual stacking-context ancestor (e.g. an outer Frame's background, if
        // nested). `isolation: isolate` forces a real stacking context, only when the video or
        // breathe layer actually renders. `!isAccordion()`/`!isCarousel()` guard both — those
        // branches return their own JSX before videoLayer()/breatheLayer() are ever mounted, so
        // these side-effect styles must not leak onto them (would force pointless
        // overflow:hidden onto an accordion's own content).
        ...(isVideoBackground() && !isAccordion() && !isCarousel() ? { isolation: 'isolate' as const } : {}),
        // The breathe layer's `transform: scale(...)` (see applyNodeBackgroundAnimation.ts)
        // grows past this box's own edges at the animation's peak — matching the original
        // bespoke component's own `overflow-hidden` section wrapper, this clips that overflow.
        // Deliberately scoped to breathe only, not a general-purpose toggle.
        ...(isBreatheBackground() && !isAccordion() && !isCarousel() ? { isolation: 'isolate' as const, overflow: 'hidden' as const } : {}),
    });

    const videoLayer = () => (
        <Show when={isVideoBackground()}>
            <video
                // NodeStyleTab.tsx's background `type` <Select> SPREADS `value` across a type
                // switch (doesn't reset it), so a color-token value set while `type==='color'`
                // (Task 13's picker) can survive into `type==='video'` — same reachability this
                // file's own `breatheLayer()` (below) and `applyNodeStyle.ts`'s gradient/image
                // branches already had to account for. Routed through `resolveColorValue` for the
                // same reason: a raw token-ref object would otherwise stringify to
                // `src="[object Object]"`. Note this doesn't make a token ref a MEANINGFUL video
                // source either way (`var(--color-primary)` isn't a playable URL) — this is
                // defense-in-depth/comment-correctness, matching this task's established pattern,
                // not a claim that theming a video background is a supported feature.
                src={resolveColorValue(effectiveStyle().background!.value)}
                autoplay
                muted
                loop
                playsinline
                class="absolute inset-0 -z-10 h-full w-full object-cover"
            />
        </Show>
    );

    const breatheLayer = () => (
        <Show when={isBreatheBackground()}>
            <div
                data-breathe-id={props.node.id}
                class="absolute inset-0 -z-10 h-full w-full bg-cover bg-center"
                // 3rd-round final-review fix: unlike `videoLayer()` above (gated on
                // `type === 'video'`, which per the theme-layer design can never carry a
                // `ThemeColorTokenRef`), this branch is gated on `type === 'image'` — the SAME
                // branch `applyNodeStyle.ts`'s own `background.image` handling already routes
                // through `resolveColorValue()` as latent-unsound defense (see the comment there).
                // This site reads the identical raw `background.value` field, so it needs the
                // identical treatment rather than a `videoLayer()`-style "provably unreachable" cast.
                style={{ 'background-image': `url(${resolveColorValue(effectiveStyle().background!.value)})` }}
            />
        </Show>
    );

    // Carousel (ProjectShowcase close-out, 2026-08-23): ports ProjectShowcaseNode.tsx's own
    // showProject/resetTimer/active state machine verbatim (same 430ms fade-out / 700ms
    // re-arm-guard / 2300ms default autoplay interval, same clamped-modulo index wrapping,
    // same onCleanup interval teardown) — this Frame owns its OWN `createResource` fetch
    // (Task 1 of this feature excludes carousel-behavior Frames from the generic
    // sibling-cloning repeat pre-fetch specifically so this branch can self-resolve instead).
    // Unlike ProjectShowcaseNode's bespoke JSX (image/heading/description slots), this renders
    // its CHILDREN once per active entry via NodeChildrenList, re-scoping `context.contextEntry`
    // to the active entry's data on every tick/click — the generic Node-tree equivalent of
    // "swap which entry's fields the same composed children are bound to".
    if (isCarousel()) {
        // Final whole-branch review fix (Important #2): thread `contextEntryId` through, same as
        // every other self-resolving repeat consumer (see CardListNode.tsx's `ctx` object above).
        // `fetchRepeatEntries` early-returns `[]` for `repeat.source:'related'|'backlink'` when
        // `ctx.contextEntryId` is absent — without this, a "related projects" carousel on a
        // detail page silently rendered zero entries.
        const [entriesResource] = createResource(
            () => ({ repeat: props.node.repeat, locale: props.context.locale, pathParams: props.context.pathParams, queryParams: props.context.queryParams, contextEntryId: props.context.contextEntryId }),
            (args) => (args.repeat ? fetchRepeatEntries(args.repeat, { locale: args.locale, pathParams: args.pathParams, queryParams: args.queryParams, contextEntryId: args.contextEntryId }) : Promise.resolve([])),
        );
        const [active, setActive] = createSignal(0);
        let animating = false;
        let timer: number | undefined;
        let reenableTimeout: number | undefined;
        let contentRef: HTMLDivElement | undefined;

        const list = () => entriesResource() ?? [];

        const showProject = (targetIndex: number) => {
            const items = list();
            if (!items.length || animating || targetIndex === active()) return;
            animating = true;
            const commit = () => {
                setActive(((targetIndex % items.length) + items.length) % items.length);
                if (contentRef) gsap.to(contentRef, { opacity: 1, duration: 0.3 });
                reenableTimeout = window.setTimeout(() => { animating = false; }, 700);
            };
            if (contentRef) {
                gsap.to(contentRef, { opacity: 0, duration: 0.43, onComplete: commit });
            } else {
                commit();
            }
        };

        const resetTimer = () => {
            if (typeof window === 'undefined') return;
            window.clearInterval(timer);
            const items = list();
            if (items.length < 2) return;
            timer = window.setInterval(() => showProject(active() + 1), behavior()?.autoplayMs ?? 2300);
        };
        onMount(resetTimer);
        // Same reasoning as ProjectShowcaseNode.tsx's own fix (Important #2, final whole-branch
        // review): entries arrive asynchronously via createResource, so onMount(resetTimer)
        // alone fires while list() is still empty and the `< 2` guard trips with nothing to
        // re-arm it later. Re-arm whenever the resource actually resolves with usable data.
        createEffect(() => {
            if (entriesResource()) resetTimer();
        });
        // Final whole-branch review fix (Minor #6): on a real page navigation mid-transition,
        // the in-flight GSAP tween and the 700ms re-enable timeout were never cancelled —
        // harmless in practice (GSAP writes to a detached node, the timeout mutates a dead
        // closure variable) but tidied up for defense-in-depth, same pattern as `timer`.
        onCleanup(() => {
            if (typeof window !== 'undefined') { window.clearInterval(timer); window.clearTimeout(reenableTimeout); }
            if (contentRef) gsap.killTweensOf(contentRef);
        });

        const activeContext = () => {
            const entry = list()[active()];
            return {
                ...props.context,
                contextEntry: entry?.data,
                contextEntryId: entry?.id,
                contextEntryContentTypeId: entry?.contentTypeId,
                contextHref: entry?.__detailHref,
                // final-review fix: this is a SECOND context-construction site for the same
                // "per-entry context" purpose resolveRenderableChildren.ts's sibling-cloning
                // path already serves — that path sets contextEntryIndex (consumed by
                // dataBinding.mode:'itemIndex', e.g. a numbered-list "01/02/03..." badge), which
                // this parallel site had missed. Without it, an itemIndex-bound child inside a
                // carousel stayed permanently stuck at "01" regardless of which entry was active.
                contextEntryIndex: active(),
                // Final whole-branch review fix (Important #3): resolveRenderableChildren.ts is
                // the only other producer of `contextMixedSources` — without setting it here too,
                // a carousel with `repeat.source:'mixed'` couldn't resolve any `mixedField`-bound
                // child (falls back to the static default), AND spreading `...props.context`
                // without overriding this field let a STALE value leak through from an ancestor
                // that itself set `contextMixedSources` (e.g. a mixed repeat further up the tree),
                // resolving this carousel's children against the wrong sources array.
                contextMixedSources: props.node.repeat?.source === ERepeatSource.MIXED ? props.node.repeat.sources : undefined,
            };
        };

        const paginationStyle = () => behavior()?.pagination ?? 'dots';

        return (
            <div use:nodeAnimation={props.node.animationRef} style={style()}>
                <div ref={contentRef}>
                    <FrameChildren innerStyle={innerContainerStyle()} children={props.node.children} context={activeContext()} layoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} parentDisplay={parentDisplay()} />
                </div>
                <Show when={list().length > 1 && paginationStyle() === 'dots'}>
                    <div style={{ display: 'flex', gap: '8px', 'justify-content': 'center', 'margin-top': '16px' }}>
                        <For each={list()}>
                            {(_entry, i) => (
                                <button
                                    type="button"
                                    aria-label={`Đi tới mục ${i() + 1}`}
                                    aria-current={i() === active()}
                                    onClick={() => { showProject(i()); resetTimer(); }}
                                    style={{ width: '8px', height: '8px', 'border-radius': '9999px', border: 'none', padding: '0', cursor: 'pointer', background: i() === active() ? '#f2f2f2' : 'rgba(242,242,242,.3)' }}
                                />
                            )}
                        </For>
                    </div>
                </Show>
                <Show when={list().length > 1 && paginationStyle() === 'arrows-counter'}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '16px', 'justify-content': 'center', 'margin-top': '16px' }}>
                        <button type="button" aria-label="Mục trước" onClick={() => { showProject(active() - 1); resetTimer(); }}>‹</button>
                        <span><strong>{active() + 1}</strong> / {list().length}</span>
                        <button type="button" aria-label="Mục tiếp theo" onClick={() => { showProject(active() + 1); resetTimer(); }}>›</button>
                    </div>
                </Show>
            </div>
        );
    }

    if (isAccordion()) {
        const [open, setOpen] = createSignal(behavior()?.defaultOpen ?? false);
        const trigger = () => props.node.children[0];
        const body = () => props.node.children.slice(1);
        let bodyRef: HTMLDivElement | undefined;

        // final-review fix (Critical #1): this MUST be a plain, non-reactive string computed once
        // — NOT `open() ? 'auto' : '0px'` inline in the JSX style object below. Any signal read
        // inside a JSX style prop makes Solid track it and reactively re-apply it on every change,
        // which runs as part of Solid's own render-effect pass — BEFORE user `createEffect`s in
        // the same reactive flush. That meant Solid was writing the DESTINATION height straight to
        // the DOM the instant `open()` changed, so by the time the `createEffect` below called
        // `gsap.to()`, GSAP read a "current" value that already equalled its target: start === end,
        // nothing animated (an instant jump instead of the intended smooth expand/collapse). This
        // initial value only needs to get SSR/first-paint output right (matching `defaultOpen` with
        // zero JS, no flash) — every toggle AFTER mount is owned exclusively by the `createEffect`'s
        // `gsap.to()` calls below.
        const initialBodyHeight = (behavior()?.defaultOpen ?? false) ? 'auto' : '0px';

        createEffect((prevOpen: boolean | undefined) => {
            const isOpen = open();
            // Skip animating on the FIRST run — SSR/mount output already matches defaultOpen
            // with zero JS (initialBodyHeight above), so animating on mount would be a spurious
            // "expand" flash for a defaultOpen:true item.
            if (bodyRef && prevOpen !== undefined) {
                gsap.to(bodyRef, { height: isOpen ? 'auto' : 0, duration: 0.3, ease: 'power2.inOut' });
            }
            return isOpen;
        }, undefined);

        return (
            <div use:nodeAnimation={props.node.animationRef} style={style()}>
                <button
                    type="button"
                    onClick={() => setOpen(!open())}
                    aria-expanded={open()}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0',
                        margin: '0',
                        font: 'inherit',
                        'text-align': 'inherit',
                        color: 'inherit',
                        display: 'block',
                        width: '100%',
                        cursor: 'pointer',
                    }}
                >
                    <FrameChildren innerStyle={innerContainerStyle()} children={trigger() ? [trigger()] : []} context={props.context} layoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} parentDisplay={parentDisplay()} />
                </button>
                {/* final-review fix (Important #2): `inert` removes this whole subtree from both
                    the tab order AND the accessibility tree in one native mechanism while closed —
                    matching the bespoke AccordionListNode.tsx this feature replaces, which removed
                    the body from the DOM entirely via `{open() && (...)}` when closed. Without this,
                    any link/button an admin composes inside a closed accordion item stays tabbable
                    and screen-reader-visible even though it's visually collapsed. */}
                <div ref={bodyRef} inert={!open()} style={{ overflow: 'hidden', height: initialBodyHeight }}>
                    <FrameChildren innerStyle={innerContainerStyle()} children={body()} context={props.context} layoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} parentDisplay={parentDisplay()} />
                </div>
            </div>
        );
    }

    // SpotlightList close-out: `ref`/pointer handlers are wired onto BOTH branches below (the
    // <a> and the plain <div>) — a `ref` unconditionally assigned is harmless when
    // isSpotlightList() is false (handlers are `undefined`, so no listeners attach, so
    // `spotlightRef` is simply never read).
    return isLink() ? (
        <a
            use:nodeAnimation={props.node.animationRef}
            ref={(el) => { spotlightRef = el; }}
            href={props.context.contextHref}
            style={style()}
            onPointerEnter={isSpotlightList() ? onSpotlightEnter : undefined}
            onPointerMove={isSpotlightList() ? onSpotlightMove : undefined}
            onPointerLeave={isSpotlightList() ? onSpotlightLeave : undefined}
        >
            {videoLayer()}
            {breatheLayer()}
            <FrameChildren innerStyle={innerContainerStyle()} children={props.node.children} context={props.context} layoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} parentDisplay={parentDisplay()} />
        </a>
    ) : (
        <div
            use:nodeAnimation={props.node.animationRef}
            ref={(el) => { spotlightRef = el; }}
            style={style()}
            onPointerEnter={isSpotlightList() ? onSpotlightEnter : undefined}
            onPointerMove={isSpotlightList() ? onSpotlightMove : undefined}
            onPointerLeave={isSpotlightList() ? onSpotlightLeave : undefined}
        >
            {videoLayer()}
            {breatheLayer()}
            <FrameChildren innerStyle={innerContainerStyle()} children={props.node.children} context={props.context} layoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} parentDisplay={parentDisplay()} />
        </div>
    );
}
