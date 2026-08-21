# Close-out batch: MediaHero, LogoGrid, FeaturedEntry, InquiryForm — Design

**Status:** In progress — presenting for approval. Covers the "easy batch" (Phase C) plus InquiryForm (reclassified in Phase A2a's design doc as needing no new engine capability at all) from `docs/superpowers/specs/2026-08-20-retire-specialized-node-types-roadmap.md`.

## Problem

4 of the 13 specialized types need to be retired: rebuilt as primitive-tree templates, existing DB instances auto-migrated, then the `ENodeType` removed once zero pages reference the old shape. Research (this session) confirms all 4 are low-risk:

- **LogoGrid** and **FeaturedEntry** already consume the generic `repeat`+slot-mapping pattern internally — this session already hand-built and live-verified the EXACT visual/functional equivalent of LogoGrid (the "Khách hàng" partner grid: Frame(repeat, nameField/logoField)+Image+Text+hover-state grayscale reveal) using nothing but primitives, during the earlier color-system work. LogoGrid's migration is close to a formality.
- **InquiryForm** never actually submitted anywhere (no backend endpoint was ever wired — explicitly out of scope in the original component); the existing `FORM_EMBED` primitive (`FormEmbedNode.tsx`) already does real field/validation/submit/success-message orchestration against a genuine `Form` entity — migrating to it is a functional *upgrade*, not a like-for-like swap.
- **MediaHero** needs exactly one small new primitive capability: a looping background pan/zoom preset (everything else is static image/text/button composition).

## Per-type template design

### MediaHero → Frame + Image(background) + Text×2 + Button

Research confirmed the one non-trivial piece: `.ed-hero-image`'s `animation: edHeroBreath 11s` (continuous looping pan/zoom on the background), which is NOT a `:hover` effect (so the `StyleObject.hover` system built earlier this session doesn't cover it — that's hover-triggered, this is always-on-loop) and NOT expressible via any current `StyleObject.background` field.

**New primitive capability**: `StyleObject.background` gains `animate?: 'none' | 'breathe'`. When set to `'breathe'`, `applyNodeStyle`'s background branch — same pattern the hover-CSS system already established — injects a small scoped `<style>` keyframe rule (`@keyframes breathe-${node.id} { ... } ` + `animation: breathe-${node.id} 11s ease-in-out infinite` applied via the node's own `data-node-id` selector) instead of trying to express a looping keyframe through inline `style=`, which CSS has no syntax for at all (keyframes are a top-level at-rule, never an inline-style value). This reuses `NodeRenderer.tsx`'s already-established "sibling `<style>` tag next to the node" injection mechanism from the hover feature — same mechanism, different trigger (always-on vs `:hover`).

**Template**: root Frame (background image = the hero photo, `animate:'breathe'`, `min-height` set via `size`) containing: a gradient-overlay Frame (absolute-positioned via free layout, background = a CSS gradient) + a bottom-left Text (caption) + a Button (round arrow, `href` = the original `arrowHref`). The round arrow's own hover lift (`span` translateX on hover) IS expressible via the existing `StyleObject.hover` system (a simple translateX on hover, close enough to the original — not pixel-identical pseudo-element choreography, an accepted simplification, see Rejected/Deferred).

### LogoGrid → Frame(repeat) + Frame×N(clone) + Image + Text

Exact pattern already live-verified this session. Root Frame: rail Text (title) + rich-text Text (blurb) + grid Frame (display:grid, N columns) containing a repeat-bound Card Frame → Image (bound to `logoField`, grayscale effect + hover reveal) + Text (bound to `nameField`, hover color brighten). Slot keys carry over unchanged: `nameField`→Text binding, `logoField`→Image binding.

### FeaturedEntry → Frame(repeat cardinality:one) + Image + Text×3 + Button

Root Frame with `repeat: {cardinality:'one', ...}` (single bound entry, `linkToDetail:true` for the button's href) containing: Image (bound to `imageField`) + Text (eyebrow, static + bound to `categoryField` — two Text nodes, since the original concatenates a static label with a bound category) + Text (bound to `headingField`) + Text (bound to `descriptionField`) + Button (bound `href` via `asLink`/`contextHref`, matching the existing Frame `asLink` mechanism `node.repeat.linkToDetail` already sets up).

The original's `LineArrowButton` (multi-pseudo-element hover choreography: a line that extends into a circled arrow on hover) has no equivalent in the current Button primitive and StyleObject's hover system can't express `::before`/`::after` pseudo-elements at all (only the node's own box). **Accepted simplification** (see Rejected/Deferred): use the existing hover-state system's simpler affordances (border-color change + slight translateX) instead of reproducing the exact pseudo-element animation — a real, disclosed visual downgrade for this one detail, not a silent one.

### InquiryForm → FormEmbedNode, pointing at a real Form entity

**Manual pre-step, not automatable**: an admin (or this migration's own operator) must create a real `Form` entity (via the existing Form management UI, already in this app's nav) with fields matching the original's hardcoded set: name (text), email (text), phone (text), service (multi-select, options = the original's `content.serviceOptions` array — copied per-instance since different InquiryForm nodes could have configured different option lists), brief/message (textarea), plus the Form's own `submitLabel`/`successMessage` set from the original node's `content.submitLabel`/`content.successMessage`. The migration script cannot safely auto-create Forms with correct validation rules and a submission destination — that's a real content-modeling decision, not a mechanical transform.

**Migration then becomes purely mechanical** once the Form exists: replace the InquiryForm node's `type`/`props` in place with `{type: 'form-embed', props: {formId: <the created Form's id>}}` — no subtree needed (FormEmbedNode is a single self-contained node, not a composition), so this ONE type's migration is actually simpler than the other 3 (in-place field reshape, matching the existing `migrateGroup2DataSourceToRepeat.ts` precedent exactly, not the "insert a new subtree" pattern the other 3 need).

## Migration script architecture (shared across MediaHero/LogoGrid/FeaturedEntry)

Following `ddd-graphql-be/scripts/migrateGroup2DataSourceToRepeat.ts`'s established precedent exactly:
- A pure transform function per type under `ddd-graphql-be/src/modules/node/application/services/` — e.g. `buildMediaHeroSubtree(oldNode: NodeEntity): { updatedParent: DeepPartial<NodeEntity>; children: DeepPartial<NodeEntity>[] }` (returns descriptions of what to create/update, no DB access — testable with plain object fixtures, no TypeORM).
- A thin runner script (`scripts/migrateEasyBatchToPrimitives.ts`) that queries rows by `type IN ('media-hero','logo-grid','featured-entry')`, calls the matching pure transform, then uses `NodeService.createNode()` (NOT raw entity inserts — this already enforces `MAX_NODES_PER_PAGE`/`MAX_TREE_DEPTH`/parent-validity/cycle-checks, per this session's research) looped per new child, threading each `createNode()` call's returned `id` into the next child's `parentId`. The original bespoke node's own row is converted in place to become the new root Frame (same `id`, same `parentId`, same `order` — so nothing above it in the tree needs to change), and its former `type`/`props` are overwritten; its NEW children are freshly created rows underneath it.
- InquiryForm gets its own much simpler transform (in-place `type`/`props` reshape only, no child creation) and its own tiny script requiring a `--form-id-map` input (a JSON file mapping each InquiryForm node's id to the Form entity id an admin already created for it) since Form creation is the manual pre-step above.
- Every transform function gets pure unit tests (plain object fixtures, no DB) matching `scripts/__tests__/migrateGroup2DataSourceToRepeat.test.ts`'s established pattern exactly.

## Testing

- FE: `applyNodeStyle.test.ts`/new tests for `background.animate:'breathe'`'s keyframe-`<style>`-injection output (mirrors the existing hover-CSS test pattern). No new FE component code needed for LogoGrid/FeaturedEntry/InquiryForm — they're pure compositions, verified live in the admin (build one instance, compare screenshot against the original), not new primitive code.
- BE: pure-function unit tests per transform (no DB), following the existing precedent's exact shape.
- Live verification (manual, this project's established practice): for each type, build one instance via the new primitive composition in the admin, screenshot-compare against a real existing instance of the OLD bespoke type, confirm close visual/functional parity (with the 2 disclosed simplifications — MediaHero's arrow hover, FeaturedEntry's line-arrow hover — explicitly accepted, not silently different). Then run the migration script against a copy of real data (not production) and spot-check several converted pages render correctly before it's ever run for real.

## Rejected/Deferred

- **Pixel-exact reproduction of `LineArrowButton`'s pseudo-element hover choreography and the round-arrow's exact hover animation.** `StyleObject.hover` (built earlier this session) only expresses hover deltas on the node's OWN box (background/border/effects/transform/typography.color) — it has no mechanism for animating `::before`/`::after` pseudo-elements or multi-stage width/left transitions. Reproducing this exactly would mean either a bespoke new Button "variant" system (real new scope, arguably re-introducing a flavor of "bespoke block" for one visual flourish) or extending the hover-CSS injection to support raw pseudo-element rules (open-ended scope creep for 2 buttons). Accepted as a disclosed, real (if minor) visual simplification for both affected types.
- **Auto-creating the `Form` entity for InquiryForm.** Explicitly a human content-modeling decision (which fields, validation rules, submission handling) — not something a migration script should guess at. Requires one manual step per site before the script runs.
- **A generic `background.animate` preset library** (multiple keyframe presets beyond `'breathe'`) — YAGNI; only the one preset MediaHero actually needs is built now, more can be added later the same way `grayscale`/other effect fields were added incrementally this session.
