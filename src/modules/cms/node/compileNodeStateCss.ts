// src/modules/cms/node/compileNodeStateCss.ts
import type { StyleObject, HoverStyleOverride, PseudoElementStyle } from './node.types';
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

    const { scope: _scope, reducedMotionOverride, ...overrideStyle } = override;
    const css = applyNodeStyle(overrideStyle as StyleObject);
    // `!important`: every primitive applies its OWN base style as inline `style=` — inline always
    // outranks a stylesheet rule regardless of selector specificity, so a state override with no
    // `!important` is silently no-op'd by the base value it's meant to replace. Same reasoning
    // the original hover-only compiler already documented for hover; unchanged for focus/active.
    const cssText = Object.entries(css).map(([prop, value]) => `${prop}: ${value} !important;`).join(' ');

    // `> *` reaches the node's own inline-styled root element (the wrapper `<div data-node-id>`
    // NodeRenderer.tsx puts around every node is never itself the styled element — its single
    // rendered child is). Same selector shape the original hover-only compiler established.
    //
    // `:focus-visible` is a special case: unlike `:hover`/`:active`, CSS focus pseudo-classes do
    // NOT propagate to ancestors of the focused element — only the exact focused element itself
    // matches `:focus`/`:focus-visible` (the ancestor-inclusive equivalent is `:focus-within`, a
    // different pseudo-class). The wrapper `<div data-node-id>` is never itself the focused
    // element (its child is), so `[data-node-id="ID"]:focus-visible > *` can never match — dead
    // CSS for every node. Verified live via real Tab-key navigation (see task-12-report.md):
    // the child DID match `:focus-visible`, the wrapper never did.
    let selector: string;
    if (pseudo === 'focus-visible') {
        selector = scope === 'parent'
            // No single "child of parent" to point `:focus-visible` at here (the actually-focused
            // descendant could be anywhere under the parent, not necessarily this target node's
            // own child), so we can't mirror the self-scope fix directly. `:focus-within` is the
            // closest CSS-buildable approximation of "some descendant of the parent currently has
            // focus" — it DOES propagate to ancestors like `:hover`/`:active` do, but it fires for
            // ANY focus (including a plain mouse click), not just keyboard-visible focus. This is
            // a deliberate, disclosed trade-off (losing focus-visible's keyboard-only trigger
            // semantics for the PARENT-scope case specifically), not an oversight — CSS has no
            // selector that is simultaneously ancestor-propagating AND keyboard-only.
            ? `[data-node-id="${node.parentId}"]:focus-within [data-node-id="${node.id}"] > *`
            // Self-scope: target the wrapper's direct child, filtered to only when THAT element
            // itself currently has visible keyboard focus — no further descendant combinator
            // needed since the matched element IS the styled element.
            : `[data-node-id="${node.id}"] > *:focus-visible`;
    } else {
        selector = scope === 'parent'
            ? `[data-node-id="${node.parentId}"]:${pseudo} [data-node-id="${node.id}"] > *`
            : `[data-node-id="${node.id}"]:${pseudo} > *`;
    }

    // Task 14: `reducedMotionOverride` gates the base override's rule behind
    // `@media (prefers-reduced-motion: no-preference)` (full-motion only for a user who has NOT
    // asked their OS to reduce motion) and, alongside it, renders the override's OWN properties
    // as an unconditional reduced-motion-safe fallback rule (same selector, no media wrapper) —
    // e.g. keep an opacity fade but drop a translateY lift. Absent (the default, the overwhelming
    // majority of hover/focus/active overrides) means today's behavior exactly: one unconditional
    // rule, no `@media` at all, byte-for-byte unchanged.
    const rules: string[] = [];
    if (cssText) {
        rules.push(reducedMotionOverride
            ? `@media (prefers-reduced-motion: no-preference) { ${selector} { ${cssText} } }`
            : `${selector} { ${cssText} }`);
    }
    if (reducedMotionOverride) {
        // Routed through the SAME `applyNodeStyle` color/token-resolution path as the base
        // override above — not a raw read — so a `background`/`border`/`typography.color` inside
        // `reducedMotionOverride` resolves theme tokenRefs identically to the base fields.
        const fallbackCss = applyNodeStyle(reducedMotionOverride as StyleObject);
        const fallbackText = Object.entries(fallbackCss).map(([prop, value]) => `${prop}: ${value} !important;`).join(' ');
        if (fallbackText) rules.push(`${selector} { ${fallbackText} }`);
    }
    return rules.length ? rules.join(' ') : null;
}

/** One `::before`/`::after` decorative layer (`style.before`/`style.after`) → one CSS rule
 * string, or `null` if unset/no `content`/no node id. Unlike `compileOneState` above, this is
 * NOT pseudo-class-gated — a decorative layer is base-state, always active once `content` is
 * set, same as any other base style, just targeting a pseudo-element selector instead of the
 * node's own root. `content` is REQUIRED for a real reason: a `::before`/`::after` with no
 * `content` property never renders in real CSS at all, so guarding on it here (rather than
 * emitting `content: ;`, which WOULD still create an invisible-but-present pseudo-element) means
 * an admin who fills in background/size but forgets `content` correctly gets no CSS, matching
 * real CSS semantics instead of silently guessing a value for them. */
function compilePseudoElement(node: StatefulStyleNode, pseudo: 'before' | 'after', style: PseudoElementStyle | undefined): string | null {
    if (!style?.content || !node.id) return null;
    const { content, ...rest } = style;
    const css = applyNodeStyle(rest as StyleObject);
    const cssText = Object.entries(css).map(([prop, value]) => `${prop}: ${value};`).join(' ');
    // `content` needs its own literal quoting exactly as the admin typed it (a real CSS `content`
    // value must itself already be a quoted string or a keyword like `none`/`counter(...)` — this
    // does NOT add quotes for the admin, matching the test's `'""'`/`"'→'"` literal inputs).
    //
    // `> *` mirrors `compileOneState`'s own selector convention (the wrapper `<div
    // data-node-id>` is never itself the styled element — its rendered child is), so a
    // `::before`/`::after` attaches to the same element hover/focus/active target.
    return `[data-node-id="${node.id}"] > *::${pseudo} { content: ${content}; ${cssText} }`;
}

/** Compiles `style.hover`/`style.focus`/`style.active` into real scoped `:hover`/
 * `:focus-visible`/`:active` CSS rules — the unified replacement for the old single-purpose,
 * hover-only compiler module (deleted — see Task 12). Rendered by
 * `NodeRenderer.tsx` the SAME proven way hover was already rendered: a `<Show>`-gated sibling
 * `<style>` tag next to the node, SSR-safe, additive-inert (renders nothing) for the
 * overwhelming majority of nodes that set none of these 3 groups. Returns `null` (not `''`)
 * when there is nothing to render, so the caller can use it directly as a `<Show when={...}>`
 * guard, matching the original function's contract.
 *
 * Task 13 extends this same compiler + same sibling-`<style>` rendering mechanism to also cover
 * `style.before`/`style.after` decorative pseudo-elements (`compilePseudoElement` above) —
 * unlike the 3 pseudo-CLASS groups, these are base-state (not gated on a `:hover`-style
 * interaction), but share the exact same `[data-node-id="ID"] > *` selector convention and are
 * combined into the SAME returned string, so NO caller (`NodeRenderer.tsx`) needs to change. */
export function compileNodeStateCss(node: StatefulStyleNode): string | null {
    const rules = [
        compileOneState(node, 'hover', node.style?.hover),
        compileOneState(node, 'focus-visible', node.style?.focus),
        compileOneState(node, 'active', node.style?.active),
        compilePseudoElement(node, 'before', node.style?.before),
        compilePseudoElement(node, 'after', node.style?.after),
    ].filter((r): r is string => r !== null);
    return rules.length ? rules.join(' ') : null;
}
