// src/modules/cms/node/applySpotlightRevealStyle.ts
export interface SpotlightRevealNode {
    id?: string;
    props?: Record<string, any>;
}

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
 * would otherwise resolve to `opacity`'s initial value (1, fully visible) instead of hidden. */
export function buildSpotlightRevealCss(node: SpotlightRevealNode): string | null {
    if (node.props?.spotlightReveal !== true || !node.id) return null;
    const selector = `[data-node-id="${node.id}"] > *::after`;
    return `${selector} { content: attr(data-label); position: absolute; inset: 0; color: #dc619c; pointer-events: none; white-space: nowrap; opacity: var(--spot-opacity, 0); mask-image: linear-gradient(90deg, transparent calc(var(--spot-x) - 104px), rgba(0,0,0,.16) calc(var(--spot-x) - 82px), rgba(0,0,0,.72) calc(var(--spot-x) - 42px), #000 calc(var(--spot-x) - 18px), #000 calc(var(--spot-x) + 18px), rgba(0,0,0,.72) calc(var(--spot-x) + 42px), rgba(0,0,0,.16) calc(var(--spot-x) + 82px), transparent calc(var(--spot-x) + 104px)); -webkit-mask-image: linear-gradient(90deg, transparent calc(var(--spot-x) - 104px), rgba(0,0,0,.16) calc(var(--spot-x) - 82px), rgba(0,0,0,.72) calc(var(--spot-x) - 42px), #000 calc(var(--spot-x) - 18px), #000 calc(var(--spot-x) + 18px), rgba(0,0,0,.72) calc(var(--spot-x) + 42px), rgba(0,0,0,.16) calc(var(--spot-x) + 82px), transparent calc(var(--spot-x) + 104px)); transition: opacity .28s ease; }`;
}
