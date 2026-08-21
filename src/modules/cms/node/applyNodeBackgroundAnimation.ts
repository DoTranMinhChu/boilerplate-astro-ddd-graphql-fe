import type { StyleObject, ResponsiveOverrides, Breakpoint } from './node.types';
import { resolveEffectiveStyle } from './mergeResponsiveOverride';
import { ENodeType } from './node.constants';

export interface BackgroundAnimationNode {
    id?: string;
    type?: string;
    style?: StyleObject;
    responsiveOverrides?: ResponsiveOverrides;
}

/** Compiles `style.background.animate` into a real `@keyframes` rule — a continuously-looping
 * animation (unlike `applyNodeHoverStyle.ts`'s `:hover`-triggered rules) has no inline-`style=`
 * equivalent at all (keyframes are a top-level CSS at-rule, never an inline-style value), so
 * this reuses the SAME "compile to a literal <style> tag rendered next to the node" mechanism
 * `NodeRenderer.tsx` already established for hover — just a different trigger (always-on vs
 * `:hover`).
 *
 * final-review fix round 2: this used to target `[data-node-id="X"] > *` (the Frame's own
 * rendered root element) and animate `background-size`/`background-position` instead of
 * `transform`, to avoid two problems: (a) `transform: scale()` on the Frame's root would pan/
 * zoom the ENTIRE subtree (captions, buttons, etc.), not just the background, and (b) that same
 * root element already has `transform` claimed by three other systems (`applyNodeStyle.ts`'s
 * inline `style.transform`, the Phase-4 GSAP animation timeline, and `buildHoverCss`'s
 * `!important` hover rules). But `background-size`/`background-position` can't be animated
 * relative to `applyNodeStyle.ts`'s `cover` default (computing the equivalent percentage needs
 * the image's real pixel dimensions, unavailable at CSS-authoring time) — the keyframes' own
 * base value (`100% 100%`) silently overrode `cover` for the whole animation loop, causing
 * non-uniform stretch distortion on any image whose aspect ratio doesn't match its box.
 *
 * The real fix (matching MediaHeroNode.tsx's own original architecture) is a SEPARATE, EMPTY,
 * child-free background layer — see `FrameNode.tsx`'s `breatheLayer()`, rendered with a stable
 * `data-breathe-id={node.id}` attribute (deliberately NOT reusing `data-node-id`, to avoid any
 * ambiguity with the hover-CSS/other systems that already key off it). Because that layer has
 * zero children and isn't touched by any of the three other `transform` writers (all of which
 * target the Frame's OUTER element via `data-node-id`, a different DOM node entirely),
 * `transform` is safe to animate here again, and `bg-cover`/`bg-center` (Tailwind classes on
 * the layer itself) permanently preserve the aspect-correct fill this whole bug is about.
 *
 * Gated on `background.type === 'image'` and `!!bg.value` — `animate` can persist on the data
 * after switching `type` away from `'image'` (the Inspector's type-Select spreads the existing
 * background object), but the Inspector's `animate` control only renders when `type ===
 * 'image'`, so a non-image background must never emit animation CSS or the flag becomes
 * un-clearable. `!!bg.value` avoids emitting a dead `<style>` tag (targeting a
 * `data-breathe-id` that `FrameNode.tsx` never renders, since `isBreatheBackground()` there
 * also requires a value) when there's no image URL yet.
 *
 * final-review fix round 4: `responsiveOverrides`/`breakpoint` are new, OPTIONAL params (same
 * 1-arg-vs-3-arg overload convention `applyNodeStyle.ts` established) — `breakpoint` defaults
 * to `'desktop'` when omitted, so any existing caller that doesn't pass them keeps getting
 * byte-for-byte the same output as before. Previously this function read raw
 * `node.style?.background` only, completely blind to `responsiveOverrides` — an admin could
 * configure `animate:'breathe'` entirely inside `responsiveOverrides.mobile.style` (the
 * Inspector allows this whenever the preview breakpoint is Mobile), and `FrameNode.tsx`'s own
 * `effectiveStyle()` (round 3) correctly merged that in and rendered the `data-breathe-id` DOM
 * layer — but this function still only ever saw the desktop base style, found no `animate` set
 * there, and returned `null`: a frozen, non-animating background layer on mobile. Now shares
 * the SAME `resolveEffectiveStyle` cascade `FrameNode.tsx` calls (see
 * mergeResponsiveOverride.ts) so exactly one implementation of the cascade exists, instead of
 * two that happened to agree only until one of them changed.
 *
 * Also newly guards on `node.type === ENodeType.FRAME` (round-4 review Minor finding): the
 * Inspector already gates the `animate` control to Frame nodes only (round 3), so a non-Frame
 * node with `animate:'breathe'` in its data is reachable only via direct GraphQL/DB writes, not
 * through the UI — but without this guard such a node still emitted a dead `<style>` tag
 * (targeting a `data-breathe-id` layer no non-Frame primitive renders). */
export function buildBackgroundAnimationCss(node: BackgroundAnimationNode, responsiveOverrides?: ResponsiveOverrides, breakpoint: Breakpoint = 'desktop'): string | null {
    if (node.type !== ENodeType.FRAME) return null;

    const effectiveStyle = resolveEffectiveStyle(node.style, responsiveOverrides ?? node.responsiveOverrides, breakpoint);
    const bg = effectiveStyle.background;
    const animate = bg?.animate;
    if (!animate || animate === 'none' || !node.id || bg?.type !== 'image' || !bg?.value) return null;

    if (animate === 'breathe') {
        const keyframesName = `breathe-${node.id}`;
        const keyframes = `@keyframes ${keyframesName} { 0%, 100% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.08) translate(-1%, -1%); } }`;
        const rule = `[data-breathe-id="${node.id}"] { animation: ${keyframesName} 11s ease-in-out infinite; }`;
        return `${keyframes} ${rule}`;
    }

    return null;
}
