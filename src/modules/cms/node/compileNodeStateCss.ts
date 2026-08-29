// src/modules/cms/node/compileNodeStateCss.ts
import type { StyleObject, HoverStyleOverride, PseudoElementStyle, ResponsiveOverrides, Breakpoint } from './node.types';
import { applyNodeStyle } from './applyNodeStyle';
import { resolveEffectiveStyle } from './mergeResponsiveOverride';
import { IMAGE_ONLY_CSS_KEYS } from './imageOnlyStyleKeys';

export interface StatefulStyleNode {
    id?: string;
    parentId?: string;
    style?: StyleObject;
    /** Re-review fix (NEW-1): needed to know whether THIS node is the one node type
     * (`'image'`, see `ImageNode.tsx`) that actually renders its own `<img>` as a second,
     * separate element from its `[data-node-id]` wrapper `<div>`. Every real caller
     * (`NodeRenderer.tsx` passes `props.node`, a `NodeTree`) already carries this field —
     * this interface just needed to declare it so `buildStateRule` can read it. */
    type?: string | null;
}

type PseudoClass = 'hover' | 'focus-visible' | 'active';

/** `> *` reaches the node's own inline-styled root element (the wrapper `<div data-node-id>`
 * NodeRenderer.tsx puts around every node is never itself the styled element — its single
 * rendered child is). Same selector shape the original hover-only compiler established.
 *
 * `:focus-visible` is a special case: unlike `:hover`/`:active`, CSS focus pseudo-classes do
 * NOT propagate to ancestors of the focused element — only the exact focused element itself
 * matches `:focus`/`:focus-visible` (the ancestor-inclusive equivalent is `:focus-within`, a
 * different pseudo-class). The wrapper `<div data-node-id>` is never itself the focused
 * element (its child is), so `[data-node-id="ID"]:focus-visible > *` can never match — dead
 * CSS for every node. Verified live via real Tab-key navigation (see task-12-report.md):
 * the child DID match `:focus-visible`, the wrapper never did.
 *
 * final-review fix (Critical #1, "C-1"): also returns an `img` selector — the SAME target but
 * one level deeper (`> * > img`) — alongside the existing `wrapper` selector. Story: Task 7
 * (see `ImageNode.tsx`'s long comment on `IMG_ONLY_KEYS`/`filter`) moved `filter` off the
 * wrapper and onto `ImageNode`'s own `<img>` alone, to stop a wrapper-level `filter` from
 * grayscaling an already color-blended duotone overlay. But this compiler only ever targeted
 * the wrapper (`> *`) — so a compiled hover/focus/active rule that sets `filter` (e.g.
 * `hover.effects.grayscale`) landed on the wrapper, which no longer carries `filter` at all: a
 * complete no-op, while the `<img>`'s own inline `filter` sat untouched. `ImageNode`'s wrapper
 * (the node's own root render output, i.e. exactly what `> *` already matches) always renders
 * its `<img>` as a DIRECT child — never nested deeper — so `> * > img` reaches precisely that
 * `<img>` and nothing else: for every OTHER node type in this codebase, any `<img>` rendered
 * deeper in that node's own markup (LogoGridNode/ContentDetailNode/ProjectShowcaseNode/etc. —
 * checked directly, all nest their own `<img>`s at least 2 levels below their root) sits below
 * an intervening element, so `> * > img` simply never matches there; and a NESTED CHILD NODE's
 * own `<img>` (e.g. an Image node placed inside a Frame) always sits behind ITS OWN
 * `[data-node-id]` wrapper first, which the direct-child combinator `>` (not a descendant
 * combinator) cannot see through. So this second selector is additive-inert everywhere except
 * an ImageNode's own `<img>` — exactly the element `IMG_ONLY_KEYS`-routed properties actually
 * live on now. Verified live in a real browser (see the final-review fix report) — confirmed
 * that a `hover.effects.grayscale` override now actually toggles the `<img>`'s filter.
 *
 * Re-review fix (NEW-1, regression): the paragraph above used to also claim "the wrapper still
 * never gets `filter` from either the base OR the compiled override" — that was FALSE for the
 * compiled-override case: C-1 added this `img` selector but never stopped `buildStateRule` from
 * ALSO putting the same property on the `wrapper` selector, so a compiled `filter` landed on
 * BOTH the wrapper and the `<img>` and both applied — reintroducing c745e24's original
 * duotone-erasure bug (wrapper-level `filter` re-composites the ALREADY-blended img+overlay
 * subtree) and double-applying any partial grayscale/blur amount. Fixed in `buildStateRule`: the
 * wrapper rule now excludes `IMAGE_ONLY_CSS_KEYS` properties whenever BOTH (a) this is an
 * image-type node (`node.type === 'image'`) AND (b) the separate `img` rule is also being
 * emitted for those same keys — see that function's own doc comment for why the exclusion is
 * gated on node type specifically (every OTHER node type has no second `<img>` layer, so the
 * wrapper remains the only real target for these properties there, unchanged). */
function stateSelectors(node: StatefulStyleNode, pseudo: PseudoClass, scope: 'self' | 'parent'): { wrapper: string; img: string } {
    if (pseudo === 'focus-visible') {
        if (scope === 'parent') {
            // No single "child of parent" to point `:focus-visible` at here (the actually-focused
            // descendant could be anywhere under the parent, not necessarily this target node's
            // own child), so we can't mirror the self-scope fix directly. `:focus-within` is the
            // closest CSS-buildable approximation of "some descendant of the parent currently has
            // focus" — it DOES propagate to ancestors like `:hover`/`:active` do, but it fires for
            // ANY focus (including a plain mouse click), not just keyboard-visible focus. This is
            // a deliberate, disclosed trade-off (losing focus-visible's keyboard-only trigger
            // semantics for the PARENT-scope case specifically), not an oversight — CSS has no
            // selector that is simultaneously ancestor-propagating AND keyboard-only.
            const prefix = `[data-node-id="${node.parentId}"]:focus-within [data-node-id="${node.id}"]`;
            return { wrapper: `${prefix} > *`, img: `${prefix} > * > img` };
        }
        // Self-scope: target the wrapper's direct child, filtered to only when THAT element
        // itself currently has visible keyboard focus — no further descendant combinator
        // needed since the matched element IS the styled element.
        //
        // Re-review fix (NEW-3, minor): the `img` selector used to be `> * > img:focus-visible`
        // — `:focus-visible` glued directly onto `img`, meaning the `<img>` ITSELF must be the
        // focused element. An `<img>` with no `tabindex` is never focusable at all, so that shape
        // could never match anything — dead CSS, same class of mistake `stateSelectors`'s own
        // header comment already documents finding (and fixing) for the WRAPPER selector
        // (`[data-node-id]:focus-visible > *`, also dead for the same reason: the wrapper is
        // never the focused element either). The correct shape mirrors the `wrapper` selector
        // right above: `:focus-visible` stays on the `*` (the node's real focusable root child —
        // for an ImageNode this IS the `<img>` itself, since ImageNode renders no separate
        // focusable wrapper), and `> img` is the plain descendant-selection part with no pseudo-
        // class of its own, reading as "this root child currently has visible keyboard focus;
        // apply these properties to (whichever) descendant img". Functionally this still only
        // ever matches an ImageNode's own `<img>` (same reasoning as the `wrapper` selector
        // above: `> *` is a direct-child combinator, so it can't reach past an intervening
        // element or a nested child node's own `[data-node-id]` wrapper).
        return { wrapper: `[data-node-id="${node.id}"] > *:focus-visible`, img: `[data-node-id="${node.id}"] > *:focus-visible > img` };
    }
    if (scope === 'parent') {
        const prefix = `[data-node-id="${node.parentId}"]:${pseudo} [data-node-id="${node.id}"]`;
        return { wrapper: `${prefix} > *`, img: `${prefix} > * > img` };
    }
    return { wrapper: `[data-node-id="${node.id}"]:${pseudo} > *`, img: `[data-node-id="${node.id}"]:${pseudo} > * > img` };
}

/** Renders one `{ selector { props } }` rule pair (wrapper always, `img` only when at least one
 * of the compiled properties is one `IMAGE_ONLY_CSS_KEYS` actually cares about — an empty extra
 * rule is harmless but pointless CSS bloat on every single hover/focus/active override in the
 * app, the overwhelming majority of which never touch `filter`/`object-fit`/`object-position`).
 *
 * Deliberately does NOT just duplicate the WHOLE `cssText` onto the img selector: properties
 * like `opacity` or `transform` are NOT `IMAGE_ONLY_CSS_KEYS` — `ImageNode.tsx` already applies
 * those to the wrapper only. Applying the full override to BOTH the wrapper and a nested `<img>`
 * would make properties that visually compound across nested elements (opacity multiplies,
 * filter/blur stacks) apply TWICE — e.g. a `hover.effects.opacity:0.5` override would render at
 * an effective 0.25 (0.5 wrapper × 0.5 img), a new self-inflicted bug worse than the one being
 * fixed. Filtering to just the img-relevant subset keeps this strictly additive.
 *
 * Re-review fix (NEW-1, regression): for the SAME compounding reason as the paragraph above —
 * but now about `IMAGE_ONLY_CSS_KEYS` properties specifically compounding against THEMSELVES,
 * wrapper vs. img — the wrapper rule must NOT also carry a property that the img rule below
 * already carries, whenever there IS a second, physically separate `<img>` element for it to
 * land on. That's true for exactly one node type: `ImageNode.tsx` (`node.type === 'image'`) is
 * the only primitive that ever moves `filter`/`object-fit`/`object-position` off its wrapper
 * `<div>` and onto a nested `<img>` (see that file's own long comment on `IMG_ONLY_KEYS`) — for
 * every OTHER node type, the wrapper IS the only real element (any `<img>` further down its own
 * markup sits behind an intervening element or its own `[data-node-id]`, see `stateSelectors`'s
 * doc comment on why `> * > img` can't reach those), so these 3 properties have nowhere else to
 * go and MUST stay on the wrapper rule there, unchanged from before this fix. Gating the
 * exclusion on `isImageNode` (not just "is there an img rule") keeps that non-image case
 * byte-identical. */
function buildStateRule(selectors: { wrapper: string; img: string }, entries: [string, string][], isImageNode: boolean): string | null {
    if (!entries.length) return null;
    const asText = (list: [string, string][]) => list.map(([prop, value]) => `${prop}: ${value} !important;`).join(' ');
    const imgEntries = entries.filter(([prop]) => IMAGE_ONLY_CSS_KEYS.has(prop));
    const wrapperEntries = isImageNode && imgEntries.length
        ? entries.filter(([prop]) => !IMAGE_ONLY_CSS_KEYS.has(prop))
        : entries;
    const parts: string[] = [];
    if (wrapperEntries.length) parts.push(`${selectors.wrapper} { ${asText(wrapperEntries)} }`);
    if (imgEntries.length) parts.push(`${selectors.img} { ${asText(imgEntries)} }`);
    return parts.length ? parts.join(' ') : null;
}

/** One override group (`style.hover`/`style.focus`/`style.active`) → one CSS rule string, or
 * `null` if this group is absent/empty/un-targetable (parent scope with no parentId — mirrors
 * the original hover-only compiler's behavior exactly for the hover case, now shared across all
 * 3 pseudo-classes instead of hover having its own copy). */
function compileOneState(node: StatefulStyleNode, pseudo: PseudoClass, override: HoverStyleOverride | undefined): string | null {
    if (!override || !node.id) return null;
    const scope = override.scope ?? 'self';
    if (scope === 'parent' && !node.parentId) return null;
    const selectors = stateSelectors(node, pseudo, scope);
    // Re-review fix (NEW-1): only `ImageNode.tsx` (`type: 'image'`) actually splits
    // `IMAGE_ONLY_CSS_KEYS` off onto a separate `<img>` — see `buildStateRule`'s doc comment.
    const isImageNode = node.type === 'image';

    const { scope: _scope, reducedMotionOverride, ...overrideStyle } = override;
    const css = applyNodeStyle(overrideStyle as StyleObject);
    // `!important`: every primitive applies its OWN base style as inline `style=` — inline always
    // outranks a stylesheet rule regardless of selector specificity, so a state override with no
    // `!important` is silently no-op'd by the base value it's meant to replace. Same reasoning
    // the original hover-only compiler already documented for hover; unchanged for focus/active.
    const cssEntries = Object.entries(css);

    // Task 14: `reducedMotionOverride` gates the base override's rule behind
    // `@media (prefers-reduced-motion: no-preference)` (full-motion only for a user who has NOT
    // asked their OS to reduce motion) and, alongside it, renders the override's OWN properties
    // as an unconditional reduced-motion-safe fallback rule (same selector, no media wrapper) —
    // e.g. keep an opacity fade but drop a translateY lift. Absent (the default, the overwhelming
    // majority of hover/focus/active overrides) means today's behavior exactly: one unconditional
    // rule, no `@media` at all, byte-for-byte unchanged.
    const rules: string[] = [];
    const baseRule = buildStateRule(selectors, cssEntries, isImageNode);
    if (baseRule) {
        rules.push(reducedMotionOverride
            ? `@media (prefers-reduced-motion: no-preference) { ${baseRule} }`
            : baseRule);
    }
    if (reducedMotionOverride) {
        // Routed through the SAME `applyNodeStyle` color/token-resolution path as the base
        // override above — not a raw read — so a `background`/`border`/`typography.color` inside
        // `reducedMotionOverride` resolves theme tokenRefs identically to the base fields.
        const fallbackCss = applyNodeStyle(reducedMotionOverride as StyleObject);
        const fallbackRule = buildStateRule(selectors, Object.entries(fallbackCss), isImageNode);
        if (fallbackRule) rules.push(fallbackRule);
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
 * combined into the SAME returned string, so NO caller (`NodeRenderer.tsx`) needs to change.
 *
 * final-review fix (Important #1): `responsiveOverrides`/`breakpoint` are new, OPTIONAL params
 * (same 1-arg-vs-3-arg overload convention `applyNodeStyle.ts`/`buildBackgroundAnimationCss`
 * already established) — omitting them keeps byte-for-byte the same output as before. Previously
 * this function read `node.style?.hover`/`.focus`/`.active`/`.before`/`.after` directly off the
 * node's BASE style only, completely blind to `responsiveOverrides` — but the Inspector
 * (`NodeBuilder.page.tsx`) routes the ENTIRE Style tab, hover/focus/active/before/after sections
 * included, into `responsiveOverrides.<bp>.style` whenever `previewBreakpoint()` isn't desktop.
 * An admin editing hover/focus/active/before/after styling while previewing Tablet/Mobile could
 * therefore save successfully but it would render NOWHERE, on any device — the same class of bug
 * `buildBackgroundAnimationCss`'s round-4 fix already closed for `background.animate`, using the
 * same `resolveEffectiveStyle` cascade (see mergeResponsiveOverride.ts). */
export function compileNodeStateCss(node: StatefulStyleNode, responsiveOverrides?: ResponsiveOverrides, breakpoint: Breakpoint = 'desktop'): string | null {
    const effectiveStyle = resolveEffectiveStyle(node.style, responsiveOverrides, breakpoint);
    const rules = [
        compileOneState(node, 'hover', effectiveStyle.hover),
        compileOneState(node, 'focus-visible', effectiveStyle.focus),
        compileOneState(node, 'active', effectiveStyle.active),
        compilePseudoElement(node, 'before', effectiveStyle.before),
        compilePseudoElement(node, 'after', effectiveStyle.after),
    ].filter((r): r is string => r !== null);
    return rules.length ? rules.join(' ') : null;
}
