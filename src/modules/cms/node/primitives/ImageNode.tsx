// src/modules/cms/node/primitives/ImageNode.tsx
import { Show, createSignal, createMemo, onMount, onCleanup } from 'solid-js';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle, resolveColorValue } from '../applyNodeStyle';
import { resolveEffectiveStyle } from '../mergeResponsiveOverride';
import { resolveEffectiveLayout } from '../applyNodeLayout';
import { resolveBoundValue } from '../nodeDataBinding';
import { EDataBindingMode } from '../node.types';
import { nodeAnimation } from '../useNodeAnimation';
import { IMAGE_ONLY_CSS_KEYS as IMG_ONLY_KEYS } from '../imageOnlyStyleKeys';

void nodeAnimation;

// Only object-fit/object-position/filter belong on the <img> itself; everything else
// applyNodeStyle() produces belongs on the wrapper.
//
// When no explicit size is set, wrapper height stays auto so object-fit is a genuine no-op
// (byte-identical old behavior); but a pre-existing node with explicit height and no explicit
// objectFit now defaults to `cover` instead of the browser's implicit stretch — a deliberate,
// disclosed visual change, not a regression.
//
// filter must stay on the <img> alone: CSS filter composites the wrapper's entire subtree
// (image + duotone overlay) AFTER blending, so a wrapper-level filter strips the color tint back
// out — confirmed only via real headless-Chromium rendering (jsdom can't composite
// mix-blend-mode, so unit tests passed while production was visibly broken). An
// `isolation: isolate` alternative was evaluated and confirmed NOT to work (isolation only scopes
// blend-mode, not filter compositing).

export function ImageNode(props: NodeComponentProps) {
    const src = () => resolveBoundValue(props.node.dataBinding ?? { mode: EDataBindingMode.STATIC }, props.context.contextEntry, props.node.props?.src ?? '', props.context.contextEntryIndex, props.context.contextEntryContentTypeId, props.context.contextMixedSources);
    const alt = () => resolveBoundValue(props.node.dataBinding ?? { mode: EDataBindingMode.STATIC }, props.context.contextEntry, props.node.props?.alt ?? '', props.context.contextEntryIndex, props.context.contextEntryContentTypeId, props.context.contextMixedSources);

    // final-review fix (Critical #2, "C-2"): compute the responsive-merged STRUCTURED style
    // exactly ONCE per render, via the same `resolveEffectiveStyle` helper `compileNodeStateCss.ts`
    // and `buildBackgroundAnimationCss` already use for this exact bug class. Previously
    // `overlayBackground()`/`overlayMixBlend()`/`hasOverlay()`/`shouldReveal()` all read
    // `props.node.style?.image` directly, bypassing `responsiveOverrides` entirely — so a
    // `treatment:'duotone'` set only inside `responsiveOverrides.mobile.style.image` got its
    // `filter:grayscale(1)` correctly merged (via `fullStyle()` below, which DOES merge) but NO
    // overlay div at all on real phones (flat grayscale, no color tint). `fullStyle()` (the FLAT
    // CSS map) is now derived FROM this same merged object, so both stay perfectly in sync.
    // Re-review fix (NEW-5, minor): this used to be a plain arrow function despite the comment
    // above already claiming "computed exactly ONCE per render" — an arrow function recomputes
    // its body on EVERY call, and this one is called ~6×/render (by `fullStyle`,
    // `overlayBackground`, `overlayMixBlend`, `hasOverlay`, `shouldReveal`, `hasDefinedSize`), so
    // the claim was false. `createMemo` is what actually makes the comment true: Solid caches the
    // computed value and only re-runs the callback when one of its own reactive dependencies
    // (`props.node.style`/`.responsiveOverrides`, `props.context.device()`) actually changes,
    // regardless of how many times `effectiveStyle()` itself is called in between. Pure
    // perf/accuracy fix — same return value on every call as before, so no test behavior changes.
    const effectiveStyle = createMemo(() => resolveEffectiveStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device()));
    const fullStyle = () => applyNodeStyle(effectiveStyle());

    const overlayBackground = () => {
        const img = effectiveStyle().image;
        if (img?.treatment === 'duotone' && img.duotone) {
            const from = resolveColorValue(img.duotone.from);
            const to = resolveColorValue(img.duotone.to);
            return `linear-gradient(135deg, ${from}, ${to})`;
        }
        if (img?.overlayGradient) return img.overlayGradient;
        return undefined;
    };
    const overlayMixBlend = () => (effectiveStyle().image?.treatment === 'duotone' ? 'color' : undefined);
    const hasOverlay = () => overlayBackground() !== undefined;

    const shouldReveal = () => effectiveStyle().image?.revealOnScroll ?? false;
    // final-review fix (Important #4, "I-4"): ALWAYS start revealed/visible, regardless of
    // `shouldReveal()` — the design spec's own SSR-safe guarantee is "the initial (pre-JS) render
    // is the FINAL revealed state ... the reveal-out effect only applies once client JS mounts",
    // so a no-JS/slow-JS visitor never sees a permanently-invisible image. The previous code
    // initialized this signal to `false` whenever `shouldReveal()` was true (unless
    // reduced-motion), which means the server-rendered HTML itself shipped `opacity:0` — genuinely
    // invisible without JS. The transition to the pre-reveal HIDDEN state now happens only inside
    // `onMount` below (client-only — `onMount` never runs during SSR at all), immediately before
    // the IntersectionObserver is set up.
    const [revealed, setRevealed] = createSignal(true);
    let wrapperEl: HTMLDivElement | undefined;

    onMount(() => {
        if (!shouldReveal()) return; // feature off — stay revealed, no observer
        const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) return; // stay revealed, no observer (unchanged behavior)
        setRevealed(false); // client-only: NOW enter the pre-reveal hidden state, right before observing
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                setRevealed(true);
                observer.disconnect();
            }
        });
        if (wrapperEl) observer.observe(wrapperEl);
        onCleanup(() => observer.disconnect());
    });

    // final-review fix (Important #1, "I-1"): only force the <img> to fill its wrapper
    // (width/height:100%) when the wrapper actually HAS a defined size for it to fill — i.e.
    // `image.aspectRatio` is set, or `style.size.width`/`.height` is explicitly set. Previously
    // this was unconditional: a node with NEITHER set (any freshly-added Image node, or a
    // pre-existing small icon/logo) got `width:100%` on the <img> anyway, and since the wrapper
    // `<div>` is a block box that fills its container's width, this stretched the image to full
    // section width instead of its natural intrinsic size (the browser preflight's
    // `max-width:100%; height:auto` behavior it used to render at, pre-this-whole-plan).
    // Re-review fix (NEW-2, regression): also treat a canvas RESIZE gesture as a defined size.
    // `layout.width`/`layout.height` (`FreeLayoutProps`, node.types.ts) is a DIFFERENT field from
    // `style.size.width`/`.height` checked above — it's what the Node Builder canvas's drag-resize
    // handle writes (see `NodeCanvasOverlay`/`applyChildLayout` in `applyNodeLayout.ts`, which
    // already turns it into explicit `width`/`height` px on the `[data-node-id]` wrapper div).
    // Without this, resizing an Image node LARGER than its own source image's natural size left
    // `hasDefinedSize()` false, so the <img> rendered at its unscaled natural (tiny) size inside
    // the now-big wrapper box instead of filling it — resizing SMALLER still visually "worked" only
    // because Tailwind's own preflight `max-width:100%` caps an oversized natural image, so the bug
    // was asymmetric and only visible when enlarging.
    // Post-round-3 fix (Issue #1, breakpoint-blind regression): the NEW-2 fix above read
    // `props.node.layout?.width`/`.height` RAW — that field is only ever the DESKTOP layout.
    // The canvas resize gesture, while the admin is previewing Tablet/Mobile, writes into
    // `props.node.responsiveOverrides.<bp>.layout` instead (see `buildLayoutPatch.ts` and
    // `NodeBuilder.page.tsx`'s resize handler), never into `props.node.layout` directly — so
    // resizing an Image node while previewing Tablet/Mobile still left this false, the exact
    // "resized-but-not-filling" bug NEW-2 was supposed to fix, just breakpoint-blind. Now
    // routed through `resolveEffectiveLayout` — the SAME breakpoint-merge helper
    // `applyChildLayout`/`FrameNode.tsx` already use to compute a node's actual rendered
    // layout — so a tablet/mobile-only override is seen too, while the desktop case (no
    // `breakpoint` arg needed beyond `context.device()` itself resolving to 'desktop') is
    // unaffected.
    const hasDefinedSize = () => {
        const es = effectiveStyle();
        const effectiveLayout = resolveEffectiveLayout(props.node, props.context.device());
        return !!es.image?.aspectRatio
            || es.size?.width !== undefined || es.size?.height !== undefined
            || effectiveLayout.width !== undefined || effectiveLayout.height !== undefined;
    };

    const wrapperStyle = () => {
        const css: Record<string, string> = {};
        for (const [k, v] of Object.entries(fullStyle())) {
            if (!IMG_ONLY_KEYS.has(k)) css[k] = v;
        }
        if (hasOverlay()) css.position = 'relative';

        // final-review fix (Important #2, "I-2"): `border-radius` only clips an element's OWN
        // background/border painting, not descendant content, unless `overflow` isn't `visible`
        // on that element. Since Task 3 moved `border-radius` onto the wrapper but the <img>
        // isn't clipped by it, a node with `border.radius` set rendered a SQUARE image with
        // rounded wrapper corners hidden behind it. Default to `overflow:hidden` whenever a
        // radius is present AND the admin hasn't explicitly chosen an `overflow` of their own
        // (an explicit `visible`/`auto`/`scroll` choice — already present in `css.overflow` from
        // the loop above — is always respected, never overridden).
        if (css['border-radius'] && css.overflow === undefined) css.overflow = 'hidden';

        if (shouldReveal()) {
            // final-review fix (Important #3, "I-3"): COMPOSE with whatever `transform`/`opacity`/
            // `transition` `applyNodeStyle()` already computed from `transform.*`/`effects.opacity`
            // — both independently-authorable style fields a node can ALSO have — instead of
            // unconditionally overwriting them (which silently destroyed both).
            const revealScale = revealed() ? 'scale(1)' : 'scale(1.05)';
            css.transform = css.transform ? `${css.transform} ${revealScale}` : revealScale;

            // Multiply rather than replace: a base `effects.opacity` (e.g. 0.5) must still be 0.5
            // once revealed, and (0.5 * 0) pre-reveal, not clobbered to a flat 0/1.
            const baseOpacity = css.opacity !== undefined ? Number(css.opacity) : 1;
            css.opacity = String(baseOpacity * (revealed() ? 1 : 0));

            // Nothing else in `applyNodeStyle()` sets `transition` today (verified — no other
            // branch in that file emits it), so this append is currently a no-op beyond the
            // reveal's own value, but composes correctly the moment something else ever does.
            const revealTransition = 'opacity var(--motion-reveal, 700ms), transform var(--motion-reveal, 700ms)';
            css.transition = css.transition ? `${css.transition}, ${revealTransition}` : revealTransition;
        }
        return css;
    };

    const imgStyle = () => {
        const full = fullStyle();
        const css: Record<string, string> = {
            display: 'block',
            'object-fit': full['object-fit'] ?? 'cover',
        };
        if (hasDefinedSize()) {
            css.width = '100%';
            css.height = '100%';
        }
        if (full['object-position']) css['object-position'] = full['object-position'];
        if (full.filter) css.filter = full.filter;
        return css;
    };

    return (
        <div ref={(el) => { wrapperEl = el; }} style={wrapperStyle()}>
            <img use:nodeAnimation={props.node.animationRef} src={src()} alt={alt()} loading="lazy" style={imgStyle()} />
            <Show when={hasOverlay()}>
                <div style={{ position: 'absolute', inset: '0', background: overlayBackground(), ...(overlayMixBlend() ? { 'mix-blend-mode': overlayMixBlend() } : {}) }} />
            </Show>
        </div>
    );
}
