import type { StyleObject, ResponsiveOverrides, Breakpoint } from './node.types';
import { EBackgroundFillType } from './node.types';
import { resolveEffectiveStyle } from './mergeResponsiveOverride';
import { ENodeType } from './node.constants';

export interface BackgroundAnimationNode {
    id?: string;
    type?: string;
    style?: StyleObject;
    responsiveOverrides?: ResponsiveOverrides;
}

/** Compiles `style.background.animate` into a real `@keyframes` rule.
 *
 * `transform` can't be reused on the Frame's own wrapper for this breathing animation — it's
 * already claimed by 3 other writers (inline `style.transform`, the GSAP timeline,
 * `compileNodeStateCss.ts`'s `!important` hover/focus/active rules) — hence a separate,
 * child-free `data-breathe-id` layer (`FrameNode.tsx`'s `breatheLayer()`) is required.
 * Animating `background-size`/`background-position` instead was rejected: the keyframes' own
 * base value silently overrides the `cover` default, causing stretch distortion (can't compute
 * the equivalent % without the image's real pixel size).
 *
 * Gating on `background.type === 'image' && !!bg.value` is needed because `animate` can persist
 * in data after switching type away from image (Inspector spreads the old object), and to avoid
 * emitting dead CSS targeting an unrendered `data-breathe-id` layer.
 *
 * Reads through `resolveEffectiveStyle` (shared with `FrameNode.tsx`) so mobile/tablet-only
 * `animate` overrides aren't silently ignored. */
export function buildBackgroundAnimationCss(node: BackgroundAnimationNode, responsiveOverrides?: ResponsiveOverrides, breakpoint: Breakpoint = 'desktop'): string | null {
    if (node.type !== ENodeType.FRAME) return null;

    const effectiveStyle = resolveEffectiveStyle(node.style, responsiveOverrides ?? node.responsiveOverrides, breakpoint);
    const bg = effectiveStyle.background;
    const animate = bg?.animate;
    if (!animate || animate === 'none' || !node.id || bg?.type !== EBackgroundFillType.IMAGE || !bg?.value) return null;

    if (animate === 'breathe') {
        const keyframesName = `breathe-${node.id}`;
        const keyframes = `@keyframes ${keyframesName} { 0%, 100% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.08) translate(-1%, -1%); } }`;
        const rule = `[data-breathe-id="${node.id}"] { animation: ${keyframesName} 11s ease-in-out infinite; }`;
        return `${keyframes} ${rule}`;
    }

    return null;
}
