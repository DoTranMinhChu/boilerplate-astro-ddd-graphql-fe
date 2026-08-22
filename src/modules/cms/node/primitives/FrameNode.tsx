// src/modules/cms/node/primitives/FrameNode.tsx
import { Show, createSignal, createEffect, onCleanup } from 'solid-js';
import { gsap } from 'gsap';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { applyContainerLayout } from '../applyNodeLayout';
import { NodeChildrenList } from '../NodeRenderer';
import type { ELayoutMode } from '../node.constants';
import { nodeAnimation } from '../useNodeAnimation';
import { resolveEffectiveStyle } from '../mergeResponsiveOverride';

void nodeAnimation;

/** Phase A2a — accordion-item behavior config, read from `node.props.behavior` (the existing
 * generic props catch-all, deliberately NOT a new top-level Node field — see
 * docs/superpowers/specs/2026-08-21-frame-accordion-behavior-design.md §1 for why: a new
 * top-level field would need a backend schema change and a 4th hardcoded persistence list to
 * keep in sync, the exact bug class Phase 4's animationRef rollout hit). */
/** SpotlightList close-out (2026-08-22): `'spotlight-list'` is a SECOND behavior variant,
 * ports SpotlightListNode.tsx's pointer-tracking lerp (--spot-x CSS var, factor 0.24, stop
 * threshold 0.15) — see FrameNode's own onSpotlightEnter/onSpotlightMove/onSpotlightLeave
 * below. Unlike accordion-item, it does NOT restructure children — it wires plain pointer
 * handlers onto the Frame's existing <a>/<div> root, so no new render branch is needed. */
interface FrameBehaviorConfig {
    type: 'accordion-item' | 'spotlight-list';
    defaultOpen?: boolean; // accordion-item only
}

/** `style`/`layoutMode` là field JSON/enum nullable ở tầng codegen (mọi field NodeDTO
 * đều `T | undefined`, xem comment ở applyNodeLayout.test.ts) — `?? {}`/cast +
 * fallback `'flow'` ở đây theo đúng convention buildNodeTree.ts đã dùng, KHÔNG đổi lại
 * node.types.ts (field không phải JSONB, không thuộc phạm vi override ở đó).
 *
 * Phase 0 M2a: `props.asLink=true` biến Frame thành thẻ <a> tới `context.contextHref`
 * (URL trang Chi tiết của contextEntry hiện tại, do repeat cha có `linkToDetail:true` gắn
 * vào — xem nodeDataBinding.ts/resolveRenderableChildren.ts) — dùng cho "thẻ card" trong
 * lưới CONTENT_GRID/RELATED_ENTRIES/MIXED_FEED/BACKLINK_ENTRIES, thay hẳn <div> nếu không
 * phải context repeat-có-link (contextHref undefined) thì vẫn render <div> như trước, không
 * đổi hành vi cho MỌI Frame khác trong hệ thống.
 *
 * Phase A2a: `props.behavior.type === 'accordion-item'` is a THIRD top-level rendering branch,
 * checked before isLink()/plain-<div> — a Frame can be either an accordion item OR a link OR
 * plain, never a combination (accordion's own <button>/<div> wrapper already needs the space
 * `<a>` would otherwise occupy; no known use case needs both at once). */
export function FrameNode(props: NodeComponentProps) {
    const isLink = () => props.node.props?.asLink === true && !!props.context.contextHref;

    // final-review fix round 3 (#1): the video/breathe layers previously read raw
    // `props.node.style?.background`, ignoring `responsiveOverrides` entirely — while this
    // Frame's own root element (via `applyNodeStyle` below) DOES cascade tablet/mobile
    // overrides onto `style` before computing CSS. That meant a per-breakpoint background
    // image (or a per-breakpoint `animate:'none'`) was silently ignored by these layers: the
    // desktop image kept rendering, covering the (correctly-swapped) root background
    // underneath. final-review fix round 4: now calls the SAME shared
    // `resolveEffectiveStyle` helper `applyNodeBackgroundAnimation.ts`'s
    // `buildBackgroundAnimationCss` also uses (see mergeResponsiveOverride.ts) — this used to
    // be a locally-inlined copy of the cascade, which is exactly how the round-4 bug happened
    // (buildBackgroundAnimationCss never got the same treatment). Keeps the MERGED
    // StyleObject (not flattened CSS) so `background.type`/`animate`/`value` stay readable as
    // structured fields.
    const effectiveStyle = () => resolveEffectiveStyle(props.node.style, props.node.responsiveOverrides, props.context.device());

    const isVideoBackground = () => effectiveStyle().background?.type === 'video' && !!effectiveStyle().background?.value;
    // final-review fix round 2: the "breathe" pan/zoom animation replicates MediaHeroNode.tsx's
    // (bespoke, now-retired) own architecture — a SEPARATE, EMPTY, child-free background layer,
    // sibling to (not container of) the real children — rather than animating `transform` on
    // THIS Frame's own root element (would also scale every child) or animating
    // `background-size`/`background-position` on it (can't be animated relative to `cover`
    // without the image's real pixel dimensions, so it silently overrides the `cover` default
    // applyNodeStyle.ts sets, causing non-uniform stretch distortion). See
    // applyNodeBackgroundAnimation.ts for the CSS this layer's `data-breathe-id` targets.
    const isBreatheBackground = () =>
        effectiveStyle().background?.type === 'image' &&
        effectiveStyle().background?.animate === 'breathe' &&
        !!effectiveStyle().background?.value;
    const behavior = () => props.node.props?.behavior as FrameBehaviorConfig | undefined;
    const isAccordion = () => behavior()?.type === 'accordion-item';

    // SpotlightList close-out (2026-08-22): ported verbatim from SpotlightListNode.tsx's
    // `listRef`/`target`/`current`/`frame`/`render`/`onMove`/`onEnter`/`onLeave` — same lerp
    // factor (0.24) and stop threshold (0.15), same `--spot-x` CSS var contract, so any CSS
    // already targeting `--spot-x` (see editorialEffects.css) keeps working unchanged once a
    // Frame opts in via `props.behavior.type === 'spotlight-list'`. Renamed `spot*`-prefixed
    // here only because these locals live alongside Frame's OWN unrelated `open`/`bodyRef`
    // locals in the accordion branch above — not a behavior change from the original.
    const isSpotlightList = () => behavior()?.type === 'spotlight-list';
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

    const style = () => ({
        ...applyContainerLayout(props.node, props.context.device()),
        ...applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device()),
        // A video background layer (below) needs `position: relative` on this box so it can
        // be absolutely positioned to fill it — harmless to always set since Frame's own
        // layout props (flex/grid) are unaffected by `position`.
        position: 'relative' as const,
        // `position: relative` alone does NOT create a new CSS stacking context (z-index stays
        // `auto`), so the video layer's `-z-10` (below) could hoist past THIS box and paint
        // behind whatever the nearest actual stacking-context ancestor is (e.g. an outer Frame's
        // own background color, if this Frame is nested inside one). `isolation: isolate` forces
        // a real stacking context here so the negative z-index stays contained — only needed
        // when the video layer (or, by the same reasoning, the breathe layer) actually renders,
        // so it's conditional rather than set on every Frame.
        // final-review fix round 3 (#3): the accordion branch (below) renders NEITHER the
        // video NOR breathe layer — it returns its own button/body JSX before either layer is
        // ever mounted — so these side-effect styles must not leak onto it. `&& !isAccordion()`
        // stops an accordion Frame with an image background + `animate:'breathe'` from getting
        // `overflow:hidden` forced onto its outer wrapper for no visual benefit, which could
        // otherwise clip legitimate accordion content meant to overflow.
        ...(isVideoBackground() && !isAccordion() ? { isolation: 'isolate' as const } : {}),
        // The breathe layer's `transform: scale(...)` (see applyNodeBackgroundAnimation.ts)
        // grows past this box's own edges at the animation's peak — matching the original
        // bespoke component's own `overflow-hidden` section wrapper, this clips that overflow.
        // Deliberately scoped to breathe only, not a general-purpose toggle.
        ...(isBreatheBackground() && !isAccordion() ? { isolation: 'isolate' as const, overflow: 'hidden' as const } : {}),
    });

    const videoLayer = () => (
        <Show when={isVideoBackground()}>
            <video
                src={effectiveStyle().background!.value}
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
                style={{ 'background-image': `url(${effectiveStyle().background!.value})` }}
            />
        </Show>
    );

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
                    <NodeChildrenList children={trigger() ? [trigger()] : []} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
                </button>
                {/* final-review fix (Important #2): `inert` removes this whole subtree from both
                    the tab order AND the accessibility tree in one native mechanism while closed —
                    matching the bespoke AccordionListNode.tsx this feature replaces, which removed
                    the body from the DOM entirely via `{open() && (...)}` when closed. Without this,
                    any link/button an admin composes inside a closed accordion item stays tabbable
                    and screen-reader-visible even though it's visually collapsed. */}
                <div ref={bodyRef} inert={!open()} style={{ overflow: 'hidden', height: initialBodyHeight }}>
                    <NodeChildrenList children={body()} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
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
            <NodeChildrenList children={props.node.children} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
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
            <NodeChildrenList children={props.node.children} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
        </div>
    );
}
