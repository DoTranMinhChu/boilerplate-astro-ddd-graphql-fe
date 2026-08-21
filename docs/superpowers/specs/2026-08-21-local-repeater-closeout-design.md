# Phase A1 close-out: IntroRail/TimelineList/ProcessSteps/ContactColumns → primitives — Design

**Status:** Proceeding under the user's standing "continue and finish everything" directive (2026-08-21) — presenting this design inline rather than pausing for a round-trip approval, consistent with how every prior sub-project this session moved once the user signaled trust. Covers the 4 "Medium / blocking capability: Local array repeater" types from `docs/superpowers/specs/2026-08-20-retire-specialized-node-types-roadmap.md`, all 4 already unblocked by the already-merged Phase A1 (`repeat.source:'local'`) — this doc is their close-out step, which the roadmap and the A1 design doc both explicitly named as the next unstarted piece.

## Problem

`IntroRailNode.tsx`, `TimelineListNode.tsx`, `ProcessStepsNode.tsx`, `ContactColumnsNode.tsx` are bespoke components reading a fixed `content: {...}` shape with a hardcoded repeated array field (`features`/`timeline`/`steps`/`columns`). All 4 are "fully static" (no network fetch) and structurally: one non-repeated header (heading + optional extra fields) + one repeated card/row list — exactly what `repeat.source:'local'` (Phase A1, already merged) was built for.

Research (this session) confirms 2 small, genuinely reusable primitive gaps block a clean migration — building them now is a real primitive upgrade, not a workaround:

1. **Rich text.** IntroRail's `lead` and per-feature `text` are today rendered via `DOMPurify.sanitize(...)` + `innerHTML` (real HTML: bold, links, etc.). The generic `TextNode` only ever renders plain `{text()}` — no HTML mode at all. `LogoGrid`'s earlier migration (this session) hit the same gap on `railText` and accepted a plain-text downgrade as a disclosed simplification; doing that again for IntroRail's prominent `lead` block would be a real, repeated content-fidelity loss for a capability that keeps recurring. This time the fix is upgrading `TextNode` itself with a rich-text render mode, matching the user's standing instruction to upgrade primitives rather than keep downgrading content.
2. **Computed ordinal numbers.** ProcessSteps' per-step "01/02/03..." badge is a computed array index, not stored data — there is no field in `localItems` to bind to for it, and no existing `DataBinding` mode expresses "the current repeat clone's own position." A new `DataBinding.mode: 'itemIndex'` is a small, broadly reusable addition (any future numbered-list design needs the same thing), not a ProcessSteps-specific hack.

## Design

### 1. `TextNode` rich-text mode

New optional field `props.node.props?.richText === true` (the existing generic `props` catch-all — zero backend schema change, rides through the same 3 persistence lists every other `props.*` field already does, per this session's established pattern from the accordion-behavior work).

```tsx
// TextNode.tsx — third rendering mode, alongside the existing plain-<p> and video-fill modes
<Show when={props.node.props?.richText === true} fallback={/* existing plain <p>{text()}</p> */}>
    <p use:nodeAnimation={...} style={...} innerHTML={DOMPurify.sanitize(text())} />
</Show>
```
`DOMPurify` is already a dependency (used in `LogoGridNode.tsx` today) — no new package. The video-fill mode (`isVideoFill()`) and rich-text mode are mutually exclusive by construction (video-fill triggers off `style.typography.color.type==='video'`, unrelated to `props.richText`) — if BOTH are somehow set, video-fill wins (checked first in the existing `<Show>` chain), since a rich-text glyph-mask makes no sense; this is an acceptable, unreachable-in-practice edge case, not worth a guard.

Inspector: `NodeContentTab.tsx` (or wherever Text's content fields are edited — confirmed at build time) gains a "Văn bản định dạng (HTML)" checkbox next to the existing text field, writing `props.richText`.

### 2. `DataBinding.mode: 'itemIndex'`

```ts
// node.types.ts
export interface DataBinding {
    mode: 'static' | 'boundField' | 'itemIndex';
    field?: string; // unused when mode==='itemIndex'
}
```
`NodeRenderContext` gains `contextEntryIndex?: number`, set by `resolveRenderableChildren.ts` at the exact spot it already sets `contextEntry`/`contextEntryId` per clone (`entries.forEach((entry, i) => { ... contextEntryIndex: i ... })`) — zero new fetch/resolve logic, purely threading a value that's already in scope (the `forEach` index) one field further.

`resolveBoundValue` gains an optional 4th parameter:
```ts
export function resolveBoundValue(binding: DataBinding, contextEntry: Record<string, any> | undefined, staticValue: any, contextEntryIndex?: number): any {
    if (binding.mode === 'itemIndex') return String((contextEntryIndex ?? 0) + 1).padStart(2, '0');
    if (binding.mode !== 'boundField' || !binding.field) return staticValue;
    if (!contextEntry || !(binding.field in contextEntry)) return staticValue;
    return contextEntry[binding.field];
}
```
Format is fixed at "1-based, zero-padded to 2 digits" (matches ProcessSteps' exact original `String(index+1).padStart(2,'0')`) — the only format any current design needs; YAGNI on a configurable format until a second consumer actually needs one. All 4 existing call sites (`TextNode`/`ImageNode`/`ButtonNode`/`VideoNode`) get the 4th argument threaded through (`props.context.contextEntryIndex`) for consistency, even though only `TextNode` has an immediate consumer (ProcessSteps' badge) — cheap to keep uniform, avoids a 5th "some primitives support it, some don't" gap like the one this session already found and fixed for `background.animate`.

Inspector: the bound-field `<Select>` (wherever `resolveBindableLocalItemFields`'s output currently populates it) gains one fixed extra option pinned above the real field list — "Số thứ tự (STT)" — that sets `dataBinding = {mode:'itemIndex'}` instead of `{mode:'boundField', field: ...}`.

### 3. Per-type template design

All 4 follow the same shape: a static outer Frame (dark section background, matching each original's own colors/spacing as literal `style` values — this is content-preserving migration, not a redesign) containing non-repeated header fields as plain `Text`/`Button` children (`dataBinding.mode:'static'`), plus one inner **template Frame** carrying `repeat: {source:'local', cardinality:'many', localItemFields: [...], localItems: [...]}` whose own children are `Text`/`Image` bound via `dataBinding.mode:'boundField'` (or `'itemIndex'` for ProcessSteps' badge) to that item's fields.

- **IntroRail** → outer Frame (aside: `railTitle` Text + CTA Button with `href:railArrowHref`, simplified hover per below; main: `heading` Text + `lead` Text with `props.richText:true`) + a `grid` Frame containing the local-repeat template Frame (children: conditional `Image` bound to `image` + `Text` bound to `text` with `props.richText:true`, matching the original's per-feature DOMPurify use). `localItemFields`: `image` (control:`'image'`), `text` (control:`'richtext'`).
- **TimelineList** → outer Frame (`heading` Text) + a Frame styled with a left border (`style.border`, matching the original `border-l border-white/[.14]`) containing the local-repeat template Frame (children: a small circular "dot" Frame — fixed width/height, `border-radius` maxed out, background color `#ed6aa8`, absolutely positioned via the existing free-layout/position mechanism — + `Text` bound to `year` + `Text` bound to `text`). `localItemFields`: `year` (control:`'text'`), `text` (control:`'textarea'`).
- **ProcessSteps** → outer Frame (`heading` Text) + a `grid` Frame (5 columns, matching original) containing the local-repeat template Frame, each styled with a top border (matching `border-t border-white/[.14]`), children: `Text` bound via `dataBinding.mode:'itemIndex'` (the badge) + `Text` bound to `title` + `Text` bound to `text`. `localItemFields`: `title` (control:`'text'`), `text` (control:`'textarea'`).
- **ContactColumns** → outer Frame with 2 sub-sections: header band (`heading` Text + `hotlineLabel`/`hotline` Text pair + conditional `email` Button styled as a link) and a `grid` Frame (3 columns) containing the local-repeat template Frame, each styled with a bottom border under its title (matching `border-b border-white/[.18] pb-3` on the title specifically — apply as the title Text's own `style.border`, not the card Frame's), children: `Text` bound to `title` + `Text` bound to `text`. `localItemFields`: `title` (control:`'text'`), `text` (control:`'textarea'`).

### 4. Accepted simplifications (disclosed, same pattern as the close-out batch)

- **IntroRail's `OrbGlow`** (a blurred decorative radial-gradient orb, purely visual, zero content) — dropped entirely. No primitive equivalent exists for a blurred/filtered decorative layer, and building one for a single decorative flourish would be new bespoke-adjacent scope for no content value.
- **IntroRail's `LineArrowButton`** and its elaborate multi-stage hover animation — downgraded to a plain `Button` + `StyleObject.hover`'s existing (box-only) affordances, identical precedent already accepted twice this session (MediaHero's round-arrow, FeaturedEntry's line-arrow).
- **IntroRail's feature-image hover zoom** (`group-hover:scale-110`) — expressible via the existing `StyleObject.hover.transform` (scale on hover), no simplification needed, included as-is.
- **ContactColumns' `whitespace-pre-line`** (preserves literal `\n` line breaks in plain text) — `StyleObject` has no `white-space` field today; accepted as a minor, disclosed simplification (literal newlines collapse to a single space, standard HTML text-flow behavior) rather than adding a single-purpose CSS field for one type's one field. An admin who needs hard line breaks in a column's text can already express them as separate sentences; this is a content-authoring nuance, not a capability gap worth building for.

### 5. Migration script architecture

Identical shape to `scripts/migrateCloseOutBatchToPrimitives.ts` (already merged, `ddd-graphql-be`): a pure transform function per type in a new `transformLocalRepeaterBatchToPrimitives.ts` (no I/O, plain-object-fixture tested) returning `{updatedRoot, children}`, converting each bespoke row's `content.<repeatField>[]` array into `repeat.localItems` (one array, copied as-is — the item shape already matches `localItemFields` 1:1, no per-entry transformation needed) placed on the new template Frame child, consumed by a thin runner script using `NodeService.createNode()` (never raw inserts) — following the exact reordering (children created before the root row is reshaped) and per-row try/catch established in the close-out batch's own final-review fix round, applied from the start this time rather than re-discovered.

## Testing

- FE: unit tests for `TextNode`'s new rich-text branch (renders sanitized `innerHTML`, XSS payload stripped, plain mode unaffected when `richText` unset); `resolveBoundValue`'s new `itemIndex` mode (formats correctly, ignores `field`/`contextEntry`, existing `static`/`boundField` modes byte-for-byte unchanged); `resolveRenderableChildren.ts`'s new `contextEntryIndex` (set correctly per clone, absent for non-repeated children).
- BE: pure-function unit tests per transform (plain fixtures, no DB), matching the close-out batch's established shape.
- Live verification (manual, deferred per this project's standing practice given Playwright MCP's continued unavailability this session): build one instance of each of the 4 via primitives in the admin, compare against a real existing bespoke instance.

## Rejected/Deferred

- **A configurable `itemIndex` format** (e.g. roman numerals, no padding, 0-based) — YAGNI, no current design needs it; the one hardcoded format matches the one real consumer exactly.
- **Reproducing `OrbGlow`/`LineArrowButton` pixel-exactly** — see Accepted simplifications; same reasoning already applied and accepted twice this session for equivalent decorative/hover flourishes.
