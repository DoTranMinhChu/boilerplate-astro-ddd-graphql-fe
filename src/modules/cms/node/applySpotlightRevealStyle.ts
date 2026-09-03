// src/modules/cms/node/applySpotlightRevealStyle.ts
export interface SpotlightRevealNode {
    id?: string;
    props?: Record<string, any>;
}

/** Coordinate-space constraint: `--spot-x` is measured from the spotlight-list Frame's left
 * edge, but the mask gradient below paints relative to each Text's OWN left edge — these only
 * coincide if the Frame has zero left padding/border (not enforced anywhere in the generic
 * system; admin-configurable padding silently misaligns the effect from the cursor). */

/** Compiles `props.spotlightReveal` into a real `::after`-pseudo-element CSS rule — a colored
 * duplicate of the node's own text content (`content: attr(data-label)`), revealed through a
 * horizontal mask-image gradient centered on the ANCESTOR Frame's `--spot-x` custom property
 * (set by FrameNode.tsx's `behavior.type:'spotlight-list'`). `--spot-opacity` needs an explicit
 * `, 0` fallback here — the ported CSS relied on an ancestor class declaring the default, which
 * doesn't exist here; without it, an unset var resolves to fully visible.
 *
 * A companion `position: relative` rule is required on the Text's own root element, or the
 * abs-positioned `::after`'s containing-block search walks up to the Frame, stretching the
 * overlay across the whole Frame instead of one line. `white-space: nowrap` + `overflow: hidden`
 * on that companion rule are required — dropping them previously caused a confirmed production
 * horizontal-scrollbar bug on /trang-chu. */
export function buildSpotlightRevealCss(node: SpotlightRevealNode): string | null {
    if (node.props?.spotlightReveal !== true || !node.id) return null;
    // Guard on richText/countUp: both make the data-label attribute the CSS reads absent, so
    // without this guard the rule silently becomes a permanent no-op.
    if (node.props?.richText === true || node.props?.countUp === true) return null;
    const ownSelector = `[data-node-id="${node.id}"] > *`;
    const afterSelector = `${ownSelector}::after`;
    const positionRule = `${ownSelector} { position: relative; white-space: nowrap; overflow: hidden; }`;
    const afterRule = `${afterSelector} { content: attr(data-label); position: absolute; inset: 0; color: #dc619c; pointer-events: none; white-space: nowrap; opacity: var(--spot-opacity, 0); mask-image: linear-gradient(90deg, transparent calc(var(--spot-x) - 104px), rgba(0,0,0,.16) calc(var(--spot-x) - 82px), rgba(0,0,0,.72) calc(var(--spot-x) - 42px), #000 calc(var(--spot-x) - 18px), #000 calc(var(--spot-x) + 18px), rgba(0,0,0,.72) calc(var(--spot-x) + 42px), rgba(0,0,0,.16) calc(var(--spot-x) + 82px), transparent calc(var(--spot-x) + 104px)); -webkit-mask-image: linear-gradient(90deg, transparent calc(var(--spot-x) - 104px), rgba(0,0,0,.16) calc(var(--spot-x) - 82px), rgba(0,0,0,.72) calc(var(--spot-x) - 42px), #000 calc(var(--spot-x) - 18px), #000 calc(var(--spot-x) + 18px), rgba(0,0,0,.72) calc(var(--spot-x) + 42px), rgba(0,0,0,.16) calc(var(--spot-x) + 82px), transparent calc(var(--spot-x) + 104px)); transition: opacity .28s ease; }`;
    return `${positionRule} ${afterRule}`;
}
