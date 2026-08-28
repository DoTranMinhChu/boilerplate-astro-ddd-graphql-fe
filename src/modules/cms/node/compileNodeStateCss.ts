// src/modules/cms/node/compileNodeStateCss.ts
import type { StyleObject, HoverStyleOverride } from './node.types';
import { applyNodeStyle } from './applyNodeStyle';

export interface StatefulStyleNode {
    id?: string;
    parentId?: string;
    style?: StyleObject;
}

type PseudoClass = 'hover' | 'focus-visible' | 'active';

/** One override group (`style.hover`/`style.focus`/`style.active`) → one CSS rule string, or
 * `null` if this group is absent/empty/un-targetable (parent scope with no parentId — mirrors
 * the original hover-only compiler's behavior exactly for the hover case, now shared across all
 * 3 pseudo-classes instead of hover having its own copy). */
function compileOneState(node: StatefulStyleNode, pseudo: PseudoClass, override: HoverStyleOverride | undefined): string | null {
    if (!override || !node.id) return null;
    const scope = override.scope ?? 'self';
    if (scope === 'parent' && !node.parentId) return null;

    const { scope: _scope, ...overrideStyle } = override;
    const css = applyNodeStyle(overrideStyle as StyleObject);
    // `!important`: every primitive applies its OWN base style as inline `style=` — inline always
    // outranks a stylesheet rule regardless of selector specificity, so a state override with no
    // `!important` is silently no-op'd by the base value it's meant to replace. Same reasoning
    // the original hover-only compiler already documented for hover; unchanged for focus/active.
    const cssText = Object.entries(css).map(([prop, value]) => `${prop}: ${value} !important;`).join(' ');
    if (!cssText) return null;

    // `> *` reaches the node's own inline-styled root element (the wrapper `<div data-node-id>`
    // NodeRenderer.tsx puts around every node is never itself the styled element — its single
    // rendered child is). Same selector shape the original hover-only compiler established.
    const selector = scope === 'parent'
        ? `[data-node-id="${node.parentId}"]:${pseudo} [data-node-id="${node.id}"] > *`
        : `[data-node-id="${node.id}"]:${pseudo} > *`;
    return `${selector} { ${cssText} }`;
}

/** Compiles `style.hover`/`style.focus`/`style.active` into real scoped `:hover`/
 * `:focus-visible`/`:active` CSS rules — the unified replacement for the old single-purpose,
 * hover-only compiler module (deleted — see Task 12). Rendered by
 * `NodeRenderer.tsx` the SAME proven way hover was already rendered: a `<Show>`-gated sibling
 * `<style>` tag next to the node, SSR-safe, additive-inert (renders nothing) for the
 * overwhelming majority of nodes that set none of these 3 groups. Returns `null` (not `''`)
 * when there is nothing to render, so the caller can use it directly as a `<Show when={...}>`
 * guard, matching the original function's contract. */
export function compileNodeStateCss(node: StatefulStyleNode): string | null {
    const rules = [
        compileOneState(node, 'hover', node.style?.hover),
        compileOneState(node, 'focus-visible', node.style?.focus),
        compileOneState(node, 'active', node.style?.active),
    ].filter((r): r is string => r !== null);
    return rules.length ? rules.join(' ') : null;
}
