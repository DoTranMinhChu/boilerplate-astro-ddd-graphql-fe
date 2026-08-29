// src/modules/cms/node/primitives/ImageNode.tsx
import { Show, createSignal, onMount, onCleanup } from 'solid-js';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle, resolveColorValue } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

// Only these 3 properties belong on the <img> itself — every other applyNodeStyle() output
// (size/spacing/border/shadow/effects/transform/aspect-ratio/clip-path) belongs on the wrapper,
// which the <img> then fills completely via the unconditional width/height/display below.
//
// Behavior-preservation caveat (found in Task 3's review, not fully "byte-identical" as an
// earlier version of this comment claimed): when NO explicit size/aspect-ratio is set, the
// wrapper's height stays CSS `auto`, so the img's `height:100%` itself resolves to `auto` and the
// rendered box always matches the image's own intrinsic ratio — `object-fit` is a true no-op
// there, so that case genuinely is unchanged. But for a PRE-EXISTING node that already had an
// explicit `size.height` (or now `image.aspectRatio`) and no explicit `objectFit`, the wrapper's
// height becomes definite — before this file existed such a node stretched/distorted to fill its
// box (the browser's implicit `object-fit: fill` default); now it defaults to `cover` (crop,
// preserve aspect ratio) instead. This is a deliberate, disclosed choice (this whole task exists
// to fix exactly this "generic/distorted image" class of problem from feedback.md) — a real,
// intentional visual change for that one case, not a regression, but not byte-identical either.
//
// `filter` (Task 7, live-browser finding): MUST also be img-only, not wrapper-level. CSS `filter`
// on an element applies to the composited rendering of that element's ENTIRE subtree as one unit
// — the wrapper also contains the duotone/overlayGradient <div> (mix-blend-mode:color/normal).
// Putting `filter: grayscale(1)` on the wrapper therefore grayscales the img+overlay AFTER they've
// already blended, which strips the color tint right back out — confirmed live: a real headless
// Chromium render of `treatment:'duotone'` produced a flat black-and-white image with zero color,
// despite every unit test (jsdom, which cannot composite mix-blend-mode) passing. Keeping `filter`
// on the <img> alone lets the overlay blend against an already-grayscaled-but-still-composited-
// separately image, producing the intended tint — verified live after this fix (duotone-light/dark
// both render genuinely purple-to-orange tinted, `blur(6px) grayscale(1)` combo unaffected).
const IMG_ONLY_KEYS = new Set(['object-fit', 'object-position', 'filter']);

export function ImageNode(props: NodeComponentProps) {
    const src = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.src ?? '', props.context.contextEntryIndex, props.context.contextEntryContentTypeId, props.context.contextMixedSources);
    const alt = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.alt ?? '', props.context.contextEntryIndex, props.context.contextEntryContentTypeId, props.context.contextMixedSources);

    const fullStyle = () => applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device());

    const overlayBackground = () => {
        const img = props.node.style?.image;
        if (img?.treatment === 'duotone' && img.duotone) {
            const from = resolveColorValue(img.duotone.from);
            const to = resolveColorValue(img.duotone.to);
            return `linear-gradient(135deg, ${from}, ${to})`;
        }
        if (img?.overlayGradient) return img.overlayGradient;
        return undefined;
    };
    const overlayMixBlend = () => (props.node.style?.image?.treatment === 'duotone' ? 'color' : undefined);
    const hasOverlay = () => overlayBackground() !== undefined;

    const shouldReveal = () => props.node.style?.image?.revealOnScroll ?? false;
    const [revealed, setRevealed] = createSignal(
        !shouldReveal() || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    );
    let wrapperEl: HTMLDivElement | undefined;

    onMount(() => {
        if (!shouldReveal() || revealed()) return; // already revealed (reduced-motion) or feature off
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                setRevealed(true);
                observer.disconnect();
            }
        });
        if (wrapperEl) observer.observe(wrapperEl);
        onCleanup(() => observer.disconnect());
    });

    const wrapperStyle = () => {
        const css: Record<string, string> = {};
        for (const [k, v] of Object.entries(fullStyle())) {
            if (!IMG_ONLY_KEYS.has(k)) css[k] = v;
        }
        if (hasOverlay()) css.position = 'relative';
        if (shouldReveal()) {
            css.opacity = revealed() ? '1' : '0';
            css.transform = revealed() ? 'scale(1)' : 'scale(1.05)';
            css.transition = 'opacity var(--motion-reveal, 700ms), transform var(--motion-reveal, 700ms)';
        }
        return css;
    };

    const imgStyle = () => {
        const full = fullStyle();
        const css: Record<string, string> = {
            width: '100%',
            height: '100%',
            display: 'block',
            'object-fit': full['object-fit'] ?? 'cover',
        };
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
