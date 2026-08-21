import type { StyleObject } from './node.types';

export interface BackgroundAnimationNode {
    id?: string;
    style?: StyleObject;
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
 * also requires a value) when there's no image URL yet. */
export function buildBackgroundAnimationCss(node: BackgroundAnimationNode): string | null {
    const bg = node.style?.background;
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
