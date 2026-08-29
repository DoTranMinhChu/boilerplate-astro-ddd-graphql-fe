// src/modules/cms/node/primitives/ImageNode.tsx
import { Show } from 'solid-js';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle, resolveColorValue } from '../applyNodeStyle';
import { resolveBoundValue } from '../nodeDataBinding';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

// Only these 2 properties belong on the <img> itself — every other applyNodeStyle() output
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
const IMG_ONLY_KEYS = new Set(['object-fit', 'object-position']);

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

    const wrapperStyle = () => {
        const css: Record<string, string> = {};
        for (const [k, v] of Object.entries(fullStyle())) {
            if (!IMG_ONLY_KEYS.has(k)) css[k] = v;
        }
        if (hasOverlay()) css.position = 'relative';
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
        return css;
    };

    return (
        <div style={wrapperStyle()}>
            <img use:nodeAnimation={props.node.animationRef} src={src()} alt={alt()} loading="lazy" style={imgStyle()} />
            <Show when={hasOverlay()}>
                <div style={{ position: 'absolute', inset: '0', background: overlayBackground(), ...(overlayMixBlend() ? { 'mix-blend-mode': overlayMixBlend() } : {}) }} />
            </Show>
        </div>
    );
}
