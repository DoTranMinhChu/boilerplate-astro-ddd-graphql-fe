// src/modules/cms/node/applyNodeHoverStyle.ts
import type { StyleObject, HoverStyleOverride } from './node.types';
import { applyNodeStyle } from './applyNodeStyle';

export interface HoverStyleNode {
    id?: string;
    parentId?: string;
    style?: StyleObject;
}

/** Compiles `node.style.hover` into a real scoped `:hover` CSS rule — inline `style=` (how
 * every Node primitive renders) cannot express `:hover` at all, so `NodeRenderer.tsx` renders
 * this as a literal `<style>` tag next to the node (see its `data-node-id` wrapper). Reuses
 * `applyNodeStyle` for the property→CSS-text conversion so the hover subset stays in lockstep
 * with the default-state renderer — no separate property list to keep in sync by hand.
 *
 * Returns `null` when there is nothing to render (no `hover` set, no CSS properties in it, or
 * no `id`/`parentId` to build a selector from) rather than an empty string, so callers can use
 * it directly as a `<Show when={...}>` guard. */
export function buildHoverCss(node: HoverStyleNode): string | null {
    const hover = node.style?.hover;
    if (!hover || !node.id) return null;

    const scope = hover.scope ?? 'self';
    if (scope === 'parent' && !node.parentId) return null;

    const { scope: _scope, ...hoverStyle } = hover as HoverStyleOverride;
    const css = applyNodeStyle(hoverStyle as StyleObject);
    // `!important`: every primitive (FrameNode/TextNode/ImageNode/...) applies its OWN base
    // style as an inline `style=` attribute on its root element — inline always outranks a
    // stylesheet rule regardless of selector specificity, so a hover override with no
    // `!important` is silently no-op'd by the base value it's meant to replace.
    const cssText = Object.entries(css)
        .map(([prop, value]) => `${prop}: ${value} !important;`)
        .join(' ');
    if (!cssText) return null;

    // `data-node-id` lives on the generic wrapper `<div>` NodeRenderer puts around every node
    // (see NodeRenderer.tsx) — the node's OWN inline-styled element (FrameNode's div/a,
    // TextNode's p, ImageNode's img, ...) is that wrapper's single rendered child, never the
    // wrapper itself. `> *` reaches down to it so the override lands on the exact element that
    // owns the base value, instead of silently doing nothing (color/filter — not inherited
    // through descendants once a child already committed its own inline value) or stacking a
    // second, visually-adjacent box on top of the real one (border/background).
    const ownSelector = `[data-node-id="${node.id}"] > *`;
    const selector = scope === 'parent' ? `[data-node-id="${node.parentId}"]:hover ${ownSelector}` : `[data-node-id="${node.id}"]:hover > *`;
    return `${selector} { ${cssText} }`;
}
