# Phase B1: StatMetrics close-out — Design

**Status:** Proceeding under the user's standing "continue and finish everything" directive (2026-08-21). Covers B1 (count-up-on-scroll) from `docs/superpowers/specs/2026-08-20-retire-specialized-node-types-roadmap.md`, unblocking StatMetrics.

## Problem

`StatMetricsNode.tsx` is `heading` (static) + `metrics: {value, suffix, label}[]` — each metric's `value` animates from 0 to its target number when scrolled into view (`IntersectionObserver`, threshold 0.4, 1400ms, cubic ease-out — a real, already-working, self-contained `CountUpValue` sub-component, no GSAP involved), with `suffix` (e.g. `"+"`, `"%"`) appended as static text after the animated number.

This maps directly onto the local array repeater (already shipped) + one new, genuinely reusable Text primitive capability: **count-up rendering**. This is not StatMetrics-specific — any future numeric-stat design needs the same "animate this number on scroll-into-view" behavior, so it belongs on `TextNode`, not as bespoke logic.

## Design

### `TextNode` gains a count-up rendering mode

New optional field `props.node.props?.countUp === true` (the existing generic `props` catch-all — same pattern `richText` already established). When true AND the resolved bound/static value parses as a finite number, `TextNode` renders the SAME `CountUpValue` mechanism already proven in `StatMetricsNode.tsx` — ported verbatim (IntersectionObserver threshold 0.4, rAF loop, 1400ms cubic ease-out, `Math.round` integer display) — instead of the plain `{text()}` interpolation. When the value ISN'T numeric (e.g. static placeholder text, or a bound field that happens to be a string), it falls back to plain rendering — count-up is a progressive enhancement, never a hard requirement.

```tsx
// TextNode.tsx — a fourth rendering mode, checked after richText/videoFill, before the plain fallback
const isCountUp = () => props.node.props?.countUp === true;
const countUpTarget = () => { const n = Number(text()); return Number.isFinite(n) ? n : null; };
// when isCountUp() && countUpTarget() !== null: <span ref={...}>{display()}</span> (the ported CountUpValue mechanism), plain fallback otherwise
```
Ported `CountUpValue` becomes a small local helper inside `TextNode.tsx` (or a tiny sibling file `CountUpValue.tsx`, mirroring how `TextNode.tsx` already has local `maskId`/helpers — implementation's call which is cleaner) — same `IntersectionObserver`/rAF/cubic-ease mechanics, zero behavior change from the proven original.

**Accepted simplification (caught during design self-review, not left for implementation to discover):** the original renders the animated number and its `suffix` (e.g. `"+"`, `"%"`, which genuinely VARIES per metric) INLINE in one `<p>` (`<CountUpValue/>{m.suffix}` → "500+", one text run). Every `TextNode` render branch wraps in its own block element, so two SIBLING Text nodes (count-up value + a separate bound `suffix` Text) will stack as two lines instead of concatenating inline. Building a second data-binding surface on the SAME node just to keep one glyph inline (considered and rejected — see Rejected/Deferred) is disproportionate scope for a cosmetic concatenation; accepted instead as a disclosed simplification, same class as this session's other minor layout losses: the migrated stat shows the animated number and its suffix as two separate lines (value, then suffix+label grouped, or value+suffix stacked — implementation's reasonable call on exact grouping) rather than one inline "500+" string.

### Inspector

`nodeRegistry.ts`'s TEXT `fieldSchema` gains a `countUp` boolean field descriptor (identical pattern to `richText`'s addition) — automatically gets a checkbox via the existing generic `FieldRenderer.tsx`, no bespoke Inspector UI needed.

## Accepted simplifications

- **Value + suffix render as two stacked lines instead of one inline string** (e.g. "500" then "+" on its own line, instead of "500+") — see the count-up section above for the reasoning. The migrated template Frame's 3 children, in order: count-up Text (bound to `value`), static-per-item Text (bound to `suffix`), Text (bound to `label`).

## Rejected/Deferred

- **A second per-item data-binding surface on the count-up Text node** (to keep `suffix` inline within the same element) — rejected as disproportionate scope for a cosmetic concatenation. `DataBinding` already binds exactly one field per node; a "primary value + secondary inline suffix" binding would be new, narrowly-scoped machinery serving only this one visual detail. If a future design has a genuine recurring need for "two bound values rendered inline in one element," build it then, generically — not now, for this alone.

## Testing

- FE: unit tests for the new `countUp` branch (renders the count-up mechanism when `countUp:true` and the value is numeric; falls back to plain rendering when the value isn't numeric; existing rich-text/video-fill/plain branches byte-for-byte unchanged). The animation itself (IntersectionObserver firing, rAF ticking) is a live/manual check per this session's established testing convention for animation-driven features — jsdom can assert the DOM structure and initial state, not the live animation.
- BE: pure-function unit test for `buildStatMetricsSubtree`, matching the local-repeater batch's established shape.
- Live verification (deferred, per this session's standing Playwright-unavailable practice).
