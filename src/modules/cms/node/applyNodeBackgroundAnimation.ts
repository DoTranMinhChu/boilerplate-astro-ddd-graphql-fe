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
 * wrapper div, the actual rendered element (Frame's own div/a) is that wrapper's single child. */
export function buildBackgroundAnimationCss(node: BackgroundAnimationNode): string | null {
    const animate = node.style?.background?.animate;
    if (!animate || animate === 'none' || !node.id) return null;

    if (animate === 'breathe') {
        const keyframesName = `breathe-${node.id}`;
        const keyframes = `@keyframes ${keyframesName} { 0%, 100% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.08) translate(-1%, -1%); } }`;
        const rule = `[data-node-id="${node.id}"] > * { animation: ${keyframesName} 11s ease-in-out infinite; }`;
        return `${keyframes} ${rule}`;
    }

    return null;
}
