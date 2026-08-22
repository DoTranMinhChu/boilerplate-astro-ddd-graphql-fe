# Phase B2: SpotlightList close-out — Design

**Status:** Proceeding under the user's standing "continue and finish everything" directive. Covers B2 (pointer-tracking spotlight effect) from the roadmap, unblocking SpotlightList.

## Problem

`SpotlightListNode.tsx` is `railTitle`/`railText`/`railArrowHref` (aside) + `items: string[]` (a vertical list of large industry-name buttons). As the pointer moves horizontally over the list, a colored duplicate of whichever label is under the cursor "reveals" through a CSS `mask-image` gradient centered on the pointer's X position — NOT a radial glow, a horizontal text-color mask reveal, driven by a hand-rolled `pointermove`/rAF-lerp loop (factor 0.24, stop threshold 0.15) that writes a `--spot-x` CSS custom property onto the list container.

Unlike every prior close-out, this effect genuinely operates on a **shared container position**, not independently per item — a single pointer X coordinate, relative to the LIST's own bounding box, drives every item's mask simultaneously. This is why it doesn't fit the local-repeater's existing per-item capabilities (count-up, itemIndex) and needs a new Frame-level "behavior", the same category as accordion-item.

## Design

### 1. New Frame behavior: `'spotlight-list'`

`props.node.props?.behavior = { type: 'spotlight-list' }`. `FrameBehaviorConfig.type` in `FrameNode.tsx` is currently the single literal `'accordion-item'` (not yet a union, despite the Phase A2a design doc's stated intent to extend it later) — this task widens it to `'accordion-item' | 'spotlight-list'`, a small type change with no effect on the existing accordion branch. When active, `FrameNode.tsx` wires the SAME pointer/rAF mechanism `SpotlightListNode.tsx` proved (`onPointerEnter`/`onPointerMove`/`onPointerLeave`, ported verbatim: lerp factor 0.24, stop threshold 0.15, `getBoundingClientRect()`-relative X) onto the Frame's own rendered element, writing TWO CSS custom properties directly on it — `--spot-x` (the lerped pointer position) and `--spot-opacity` (`0` at rest, `1` while the pointer is over the list) — an exact 1:1 port of the original's own `--spot-x`/`--spot-opacity` pair (the original toggles `--spot-opacity` via a `.is-spotlight-active` class; the port sets it directly via inline style on enter/leave, same effect, one fewer moving part). Both custom properties cascade to all descendants automatically via normal CSS inheritance — no extra plumbing needed between the Frame and its children, and no new `data-*` attribute or selector combinator required.

This is a THIRD `props.behavior.type`, alongside `accordion-item` — added as a new top-level branch in `FrameNode.tsx`'s existing behavior dispatch, not touching the accordion branch. Unlike accordion-item, spotlight-list does NOT restructure children (no trigger/body split) — it renders `props.node.children` normally via `NodeChildrenList`, only adding the pointer handlers + custom-property/attribute side effects to the wrapping element.

### 2. New Text capability: `props.node.props?.spotlightReveal === true`

A Text node with this flag renders with `data-label={text()}` (mirroring the original's `data-label={label}` on each button) and a scoped `<style>` rule (via the SAME "inject a `<style>` tag next to the node" mechanism already established for hover-CSS/breathe-animation in `NodeRenderer.tsx`) that reproduces `.ed-industry-list button::after` verbatim: a `::after` pseudo-element duplicating the text via `content: attr(data-label)`, colored, masked by the identical 8-stop `linear-gradient` centered on `calc(var(--spot-x) ± Npx)`, `opacity: var(--spot-opacity, 0)` — reading the SAME custom property the ancestor Frame (§1) sets, inherited down the DOM tree, no attribute selector needed.

This is a NEW small pure helper (`buildSpotlightRevealCss(node): string | null`), following the exact precedent `applyNodeHoverStyle.ts`/`applyNodeBackgroundAnimation.ts` already established: guard on `props.spotlightReveal === true` + a resolved reveal color, emit the `::after` rule targeting `[data-node-id="X"] > *::after`. The mask gradient math and default color (`#dc619c`) are literal constants ported from the original CSS — not newly designed.

**Why this needs no JS wiring to the Frame at all**: `--spot-x` is a real CSS custom property; CSS custom properties inherit down the DOM tree by the CSS cascade itself. As long as a spotlight-reveal Text node is rendered somewhere inside a `spotlight-list`-behavior Frame's DOM subtree (regardless of how many primitive layers of nesting sit between them), `var(--spot-x)` in the Text's own injected CSS resolves against the nearest ancestor that SET it — the Frame. No React/Solid-level prop-drilling, no new `NodeRenderContext` field.

### 3. Migration structure

`items: string[]` (plain strings) don't fit the local repeater's `Record<string,unknown>[]` item shape — each string becomes `{label: <string>}` (a single-field record) in `repeat.localItems`, with `localItemFields: [{key:'label', control:'text'}]`.

Root Frame → aside (railTitle/railText/CTA, same pattern as IntroRail/SpotlightList's own rail) + a spotlight-list-behavior Frame containing ONE local-repeat template Frame (children: one `spotlightReveal:true` Text bound to `label`).

## Accepted simplifications

- **`LineArrowButton`'s hover choreography** — same accepted simplification already used for IntroRail's identical CTA pattern (plain Button + `StyleObject.hover`'s box-only affordances).
- **The original's `data-label={label}` duplicate-content mask trick relies on the Text node's rendered content matching `data-label` exactly** — if a future rich-text/HTML value were ever bound to a `spotlightReveal` Text, `content: attr(data-label)` would show the RAW bound string (HTML tags included, unescaped by CSS `attr()`), not sanitized HTML. Scoped to plain-text-only use (matching the original, which only ever bound plain industry-name strings) — not a real limitation for this migration, just a documented boundary of the new capability.

## Testing

- FE: unit tests for the new Frame `spotlight-list` behavior branch (pointer handlers wired, `--spot-x` written on move, `data-spotlight-active` toggled on enter/leave) — the rAF lerp itself is a live/manual check (same established convention as every other animation-driven capability this session). Unit tests for `buildSpotlightRevealCss` (mirrors `applyNodeHoverStyle.ts`'s test shape).
- BE: pure-function unit test for `buildSpotlightListSubtree`.
- Live verification (deferred, per this session's standing Playwright-unavailable practice).
