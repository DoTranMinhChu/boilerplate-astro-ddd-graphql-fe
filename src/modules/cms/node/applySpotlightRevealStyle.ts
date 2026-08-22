// src/modules/cms/node/applySpotlightRevealStyle.ts
export interface SpotlightRevealNode {
    id?: string;
    props?: Record<string, any>;
}

/** final-review fix (Finding 3, documentation only): coordinate-space authoring constraint.
 * `--spot-x` is computed by FrameNode.tsx's `onSpotlightEnter`/`onSpotlightMove` as the pointer's
 * X distance from the spotlight-list FRAME's own `getBoundingClientRect().left` — but the
 * mask-image gradient below (`calc(var(--spot-x) - ...px)` etc.) paints relative to EACH Text
 * element's OWN left edge (an `inset: 0` `::after`, positioned via the `position: relative`
 * companion rule above). These two coordinate spaces only coincide when the spotlight-list Frame
 * itself has zero left padding/border, so a Text child's own border-box left edge sits exactly on
 * the Frame's left edge. This was implicitly guaranteed in the original bespoke component (its
 * list container had no horizontal padding, `align-items: flex-start` — see
 * editorialEffects.css's `.ed-industry-list`) but is NOT enforced anywhere in the generic
 * Node/Frame system — an admin-composed Frame with left padding/border will silently misalign
 * the spotlight from the cursor. Not fixable as a general geometry correction here (would need
 * per-child offset compensation with no clean generic implementation); documented instead so a
 * future reader knows WHY. Same note lives at the Frame behavior site (FrameNode.tsx, near
 * onSpotlightEnter/onSpotlightMove). */

/** Compiles `props.spotlightReveal` into a real `::after`-pseudo-element CSS rule — a colored
 * duplicate of the node's own text content (`content: attr(data-label)`), revealed through a
 * horizontal mask-image gradient centered on the ANCESTOR Frame's `--spot-x` custom property
 * (set by FrameNode.tsx's `behavior.type:'spotlight-list'` — see that file). CSS custom
 * properties inherit down the DOM tree by the cascade itself, so no JS wiring is needed between
 * the Frame and this node beyond normal DOM nesting. Ported verbatim from
 * `.ed-industry-list button::after` (editorialShared/editorialEffects.css), EXCEPT `--spot-opacity`
 * gets an explicit `, 0` fallback here — the original relies on `.ed-industry-list` itself
 * declaring `--spot-opacity: 0` as its own default; this Node primitive has no such ancestor
 * class, so an unset custom property (e.g. this node rendered outside a spotlight-list Frame)
 * would otherwise resolve to `opacity`'s initial value (1, fully visible) instead of hidden.
 *
 * Also emits a companion rule setting `position: relative` on the Text node's own rendered
 * element (`[data-node-id="${node.id}"] > *`) — the same wrapper-child selector convention
 * `applyNodeHoverStyle.ts` uses. In the original CSS, `.ed-industry-list button` (the element
 * the `::after` is actually attached to) declares `position: relative` itself, which is what
 * scopes each button's absolutely-positioned `::after` to that button's own box. Neither
 * `applyNodeStyle` nor the flow-layout wrapper ever sets `position` on a plain Text node, so
 * without this companion rule the abs-positioned `::after`'s containing-block search would walk
 * past the Text node up to the nearest actually-positioned ancestor (the spotlight-list Frame's
 * own root), causing every item's `::after` overlay to stretch to fill the entire Frame instead
 * of scoping to its own line of text.
 *
 * final-review fix (Finding 1, BLOCKING): that companion rule ALSO now carries `white-space:
 * nowrap` and `overflow: hidden`, ported from the other two relevant declarations on the
 * original `.ed-industry-list button` (editorialEffects.css lines 116-119) that this port had
 * dropped. `white-space: nowrap` keeps the base text and the `::after` overlay's duplicate
 * text wrapping identically (mismatched wrapping would misalign the mask-reveal). `overflow:
 * hidden` reproduces the original section wrapper's own `overflow-hidden` at the level of THIS
 * node's own box — see SpotlightListNode.tsx lines 60-66 for the exact documented history: a
 * prior version of this effect, missing `overflow-hidden` while using `white-space: nowrap`
 * content that can render wider than its column, caused a REAL confirmed-live horizontal
 * scrollbar bug on production `/trang-chu`. Without both declarations here, a Text node opting
 * into `spotlightReveal` outside the original bespoke component's fixed layout can silently
 * re-open that exact incident. */
export function buildSpotlightRevealCss(node: SpotlightRevealNode): string | null {
    if (node.props?.spotlightReveal !== true || !node.id) return null;
    // final-review fix (Finding 2, Important): `richText`/`countUp` both make the plain-text
    // `<p data-label=...>` branch in TextNode.tsx unreachable (richText renders a `<div
    // innerHTML>`, countUp renders a `<p>` with no `data-label` at all) — see TextNode.tsx's
    // `<Show>` chain. Without this guard, `spotlightReveal:true` combined with either flag would
    // still emit this `::after` rule, but `content: attr(data-label)` would resolve to an empty
    // string forever: a silent no-op with no visible symptom and no warning. Returning `null`
    // here (no `<style>` tag emitted at all, per NodeRenderer.tsx's `<Show when={...}>`) is
    // cheaper than emitting dead CSS. NOTE: this does NOT cover the video-fill typography case
    // (`style.typography.color.type === 'video'`, also `data-label`-less in TextNode.tsx) —
    // that's driven by `style`, not `props`, and this function's signature (`{id, props}`, no
    // `style`) deliberately isn't widened for one more edge case; it's a known, narrower
    // residual gap.
    if (node.props?.richText === true || node.props?.countUp === true) return null;
    const ownSelector = `[data-node-id="${node.id}"] > *`;
    const afterSelector = `${ownSelector}::after`;
    const positionRule = `${ownSelector} { position: relative; white-space: nowrap; overflow: hidden; }`;
    const afterRule = `${afterSelector} { content: attr(data-label); position: absolute; inset: 0; color: #dc619c; pointer-events: none; white-space: nowrap; opacity: var(--spot-opacity, 0); mask-image: linear-gradient(90deg, transparent calc(var(--spot-x) - 104px), rgba(0,0,0,.16) calc(var(--spot-x) - 82px), rgba(0,0,0,.72) calc(var(--spot-x) - 42px), #000 calc(var(--spot-x) - 18px), #000 calc(var(--spot-x) + 18px), rgba(0,0,0,.72) calc(var(--spot-x) + 42px), rgba(0,0,0,.16) calc(var(--spot-x) + 82px), transparent calc(var(--spot-x) + 104px)); -webkit-mask-image: linear-gradient(90deg, transparent calc(var(--spot-x) - 104px), rgba(0,0,0,.16) calc(var(--spot-x) - 82px), rgba(0,0,0,.72) calc(var(--spot-x) - 42px), #000 calc(var(--spot-x) - 18px), #000 calc(var(--spot-x) + 18px), rgba(0,0,0,.72) calc(var(--spot-x) + 42px), rgba(0,0,0,.16) calc(var(--spot-x) + 82px), transparent calc(var(--spot-x) + 104px)); transition: opacity .28s ease; }`;
    return `${positionRule} ${afterRule}`;
}
