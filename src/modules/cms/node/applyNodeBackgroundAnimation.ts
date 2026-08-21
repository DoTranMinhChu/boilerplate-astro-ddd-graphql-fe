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
 * `:hover`). Scoped to the node's OWN `data-node-id` (not `:hover`), targeting `> *` for the
 * same reason `applyNodeHoverStyle.ts` does: `data-node-id` lives on NodeRenderer's generic
 * wrapper div, the actual rendered element (Frame's own div/a) is that wrapper's single child.
 *
 * Deliberately animates `background-size`/`background-position`, NOT `transform`: the target
 * element (`> *`) is the Frame's own root div, which also contains every child (via
 * `NodeChildrenList`) — a `transform: scale(...)` there would pan/zoom the whole subtree
 * (captions, buttons, etc.), not just the background image. `transform` is also already
 * claimed by three other systems writing to that same element (`applyNodeStyle.ts`'s inline
 * `style.transform`, the Phase-4 GSAP animation timeline, and `buildHoverCss`'s `!important`
 * hover rules), any of which would silently collide with a CSS `animation` writing `transform`.
 * `background-size`/`background-position` are pure background-paint properties: they affect
 * only the element's own background rendering, never its box, its children, or `transform`.
 * Gated on `background.type === 'image'` — `animate` can persist on the data after switching
 * `type` away from `'image'` (the Inspector's type-Select spreads the existing background
 * object), but the Inspector's `animate` control only renders when `type === 'image'`, so a
 * non-image background must never emit animation CSS or the flag becomes un-clearable. */
export function buildBackgroundAnimationCss(node: BackgroundAnimationNode): string | null {
    const bg = node.style?.background;
    const animate = bg?.animate;
    if (!animate || animate === 'none' || !node.id || bg?.type !== 'image') return null;

    if (animate === 'breathe') {
        const keyframesName = `breathe-${node.id}`;
        const keyframes = `@keyframes ${keyframesName} { 0%, 100% { background-size: 100% 100%; background-position: 50% 50%; } 50% { background-size: 110% 110%; background-position: 48% 48%; } }`;
        const rule = `[data-node-id="${node.id}"] > * { animation: ${keyframesName} 11s ease-in-out infinite; }`;
        return `${keyframes} ${rule}`;
    }

    return null;
}
