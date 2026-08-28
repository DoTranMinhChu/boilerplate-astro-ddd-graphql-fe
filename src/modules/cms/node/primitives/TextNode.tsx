// src/modules/cms/node/primitives/TextNode.tsx
import { Show, createUniqueId, createSignal, onCleanup, onMount } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import DOMPurify from 'isomorphic-dompurify';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';
import { nodeAnimation } from '../useNodeAnimation';
import type { TypographyRole } from '@/modules/theme/theme.types';

// Referenced so bundlers/TS don't tree-shake/flag the import as unused — Solid
// directives are invoked by the compiler via the `use:` JSX attribute, not a normal
// function call, so a bare import can look "unused" to some tooling.
void nodeAnimation;

/** Ported verbatim from `StatMetricsNode.tsx`'s `CountUpValue` (IntersectionObserver
 * threshold 0.4, rAF loop, cubic ease-out, default 1400ms) — do not redesign, this is the
 * proven mechanism StatMetrics used before the Text primitive absorbed it. */
function CountUpValue(props: { target: number; durationMs?: number }) {
    const [display, setDisplay] = createSignal(0);
    let ref: HTMLSpanElement | undefined;
    let observer: IntersectionObserver | undefined;
    // final-review fix: the original never needed this (StatMetrics cards were static once
    // mounted), but count-up now lives on the generic Text primitive, whose repeat clones are
    // rebuilt on any tracked change (refetch, breakpoint crossing, an Inspector edit anywhere in
    // the tree) — without cancelling the in-flight rAF, an orphaned tick from a disposed clone
    // keeps calling setDisplay() on a dead signal for up to `durationMs` after unmount.
    let rafId: number | undefined;

    onMount(() => {
        if (!ref) return;
        observer = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting) return;
            observer?.disconnect();
            const duration = props.durationMs ?? 1400;
            const start = performance.now();
            const tick = (now: number) => {
                const progress = Math.min(1, (now - start) / duration);
                setDisplay(Math.round(props.target * (1 - Math.pow(1 - progress, 3))));
                if (progress < 1) rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
        }, { threshold: 0.4 });
        observer.observe(ref);
    });
    onCleanup(() => {
        observer?.disconnect();
        if (rafId !== undefined) cancelAnimationFrame(rafId);
    });

    return <span ref={ref}>{display()}</span>;
}

/** `display`/`h1` both render an actual `<h1>` (a page's single Display heading and its H1 are
 * semantically the same "this is the page's main heading" role — 2 admin-facing SIZE choices,
 * 1 DOM tag), h2-h4 render their matching tag, everything else (bodyLg/body/small/caption, or no
 * role at all) keeps today's unconditional `<p>` — zero behavior change for any node that
 * doesn't set a role. */
function tagForRole(role: TypographyRole | undefined): 'h1' | 'h2' | 'h3' | 'h4' | 'p' {
    switch (role) {
        case 'display': case 'h1': return 'h1';
        case 'h2': return 'h2';
        case 'h3': return 'h3';
        case 'h4': return 'h4';
        default: return 'p';
    }
}

export function TextNode(props: NodeComponentProps) {
    const text = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.text ?? '', props.context.contextEntryIndex, props.context.contextEntryContentTypeId, props.context.contextMixedSources);
    const isRichText = () => props.node.props?.richText === true;
    const style = () => props.node.style ?? {};
    const isVideoFill = () => style().typography?.color?.type === 'video' && !!style().typography?.color?.value;
    const maskId = createUniqueId();
    // final-review fix: exclude itemIndex bindings — resolveBoundValue already zero-pads that
    // mode's output ('01', '02', ...) for a reason (it's an ordinal display string, not a
    // quantity to animate); Number('01') is finite, so without this guard count-up would
    // silently strip the padding by animating 0 -> 1 instead of showing '01'.
    const isCountUp = () => props.node.props?.countUp === true && props.node.dataBinding?.mode !== 'itemIndex';
    const countUpTarget = () => {
        const raw = text();
        // final-review fix: Number('') / Number(null) / Number(' ') are all 0 and finite, so an
        // EMPTY or MISSING bound value would otherwise render a confident animated "0" instead
        // of falling through to the plain branch's (also empty, but honestly empty) output.
        if (typeof raw !== 'number' && (typeof raw !== 'string' || raw.trim() === '')) return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    };

    return (
        <Show
            when={isCountUp() && countUpTarget() !== null}
            fallback={
                <Show
                    when={isRichText()}
                    fallback={
                        <Show
                            when={isVideoFill()}
                            fallback={<Dynamic component={tagForRole(style().typography?.role)} use:nodeAnimation={props.node.animationRef} style={applyNodeStyle(style(), props.node.responsiveOverrides, props.context.device())} data-label={props.node.props?.spotlightReveal === true ? text() : undefined}>{text()}</Dynamic>}
                        >
                            {/* Video-as-text-fill (scoped to short/single-line headline text — see
                                docs/superpowers/specs/2026-08-20-nocode-color-alpha-media-text-fill-design.md
                                §4): no CSS property lets a <video> fill text directly, so the video plays as a
                                normal element and an SVG <mask> containing matching <text> clips it to the
                                glyph shapes. `t.color.value` is only read for `video` here — every other mode
                                is fully handled by `applyNodeStyle`'s inline style, unchanged from before. */}
                            <span class="relative inline-block" style={applyNodeStyle({ ...style(), typography: { ...style().typography, color: undefined } }, props.node.responsiveOverrides, props.context.device())}>
                                <span class="sr-only" aria-label={text()}>{text()}</span>
                                <svg width="0" height="0" aria-hidden="true" class="absolute">
                                    <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                                        <text
                                            x="0"
                                            y="1em"
                                            fill="#fff"
                                            font-family={style().typography?.fontFamily ?? 'inherit'}
                                            font-size={style().typography?.size ? `${style().typography!.size}px` : '1em'}
                                            font-weight={style().typography?.weight ?? 400}
                                        >
                                            {text()}
                                        </text>
                                    </mask>
                                </svg>
                                <video
                                    // Token refs (Task 10) are only ever set for `typography.color.type
                                    // === 'color'`-equivalent solid values, never 'video', per the theme-layer
                                    // design (docs/superpowers/plans/2026-08-28-theme-layer-style-pipeline.md,
                                    // Task 10's `resolveColorValue` doc comment) — this <video> only renders
                                    // inside the `isVideoFill()` branch above, so `.value` is always a
                                    // plain URL string at runtime.
                                    src={style().typography!.color!.value as string}
                                    autoplay
                                    muted
                                    loop
                                    playsinline
                                    class="absolute inset-0 h-full w-full object-cover"
                                    style={{ mask: `url(#${maskId})`, '-webkit-mask': `url(#${maskId})` }}
                                />
                                {/* Reserves layout space matching the text's own metrics — the video is
                                    absolutely positioned over this invisible copy, same box either way. */}
                                <span class="invisible" aria-hidden="true">{text()}</span>
                            </span>
                        </Show>
                    }
                >
                    {/* final-review fix: MUST be a <div>, not <p> — rich text is typically authored as
                        <p>...</p> block content (every richtext-control field in this codebase produces
                        that), and a <p> cannot legally contain another <p>. Setting innerHTML on a <p>
                        with block content builds a valid tree client-side, but this tree is SSR'd
                        (CmsPageShell.astro's <ResponsiveNodeTree client:visible>) — the browser re-parses
                        the served HTML text and auto-closes the outer <p> at the first nested block tag,
                        hoisting the real content out as SIBLINGS of an now-EMPTY styled <p>. That silently
                        detaches every inline style (font/color/spacing), the hover/focus/active-CSS system
                        (which targets "this wrapper's single child" — see compileNodeStateCss.ts), and
                        use:nodeAnimation from the actual visible content. Matches every other
                        DOMPurify+innerHTML site in this codebase (ContentDetailNode/LogoGridNode/
                        SpotlightListNode/InquiryFormNode/AccordionListNode), which all use <div>. */}
                    <div use:nodeAnimation={props.node.animationRef} style={applyNodeStyle(style(), props.node.responsiveOverrides, props.context.device())} innerHTML={DOMPurify.sanitize(text())} />
                </Show>
            }
        >
            {/* Count-up mode (ported from StatMetricsNode's CountUpValue): same <p> wrapper/style
                application as the plain-text branch above, with the animated value inside
                instead of the raw text. Non-numeric values never reach here — the outer
                <Show>'s own `when` (isCountUp() && countUpTarget() !== null) falls through to
                the richText/videoFill/plain chain above for those. */}
            <p use:nodeAnimation={props.node.animationRef} style={applyNodeStyle(style(), props.node.responsiveOverrides, props.context.device())}>
                <CountUpValue target={countUpTarget()!} />
            </p>
        </Show>
    );
}
