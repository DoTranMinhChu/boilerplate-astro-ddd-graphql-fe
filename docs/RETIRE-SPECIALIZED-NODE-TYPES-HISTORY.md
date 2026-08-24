# "Retire specialized node types" roadmap — project history

Consolidated record of a multi-week effort (2026-08-20 → 2026-08-24) that replaced 13 bespoke,
one-off CMS Node components with generic, composable primitives (Frame `behavior` variants, new
`DataBinding` modes, `repeat.source:'local'`) so the visual Node Builder's "Add Element" catalog
funnels all *new* content through a small, reusable primitive vocabulary instead of growing a new
bespoke component per content shape. This file replaces the individual per-sub-project design
docs, implementation plans, and process ledgers that accumulated under `docs/superpowers/` and
`.superpowers/sdd/` during the work — those are gone; this is what's kept.

## Why

The Node Builder's picker kept growing a new hardcoded, single-purpose component (its own React/
Solid file, its own field schema, its own styling) for every new page-section shape a designer
asked for — IntroRail, ProjectShowcase, LogoGrid, MixedFeed, and 9 others. None of them composed
with each other or with anything else; each was a dead end. The goal: build a small set of true
primitives (Frame/Text/Image/Button + a repeat/data-binding system) expressive enough that an
admin can compose any of those same 13 results — and anything in between — without a developer
writing a new component every time.

## What got built (new primitive capabilities, in build order)

1. **`repeat.source:'local'`** (`CollectionRepeat`, `node.types.ts`) — clone-and-bind driven by a
   small admin-authored array living directly on the node, not fetched from a Content Type. Powers
   IntroRail/TimelineList/ProcessSteps/ContactColumns-shaped content.
2. **No-code color/media-fill system** — alpha-channel color controls, and `typography.color`
   gaining `type:'image'|'video'` (text clipped to a photo/video fill), alongside the pre-existing
   `solid`/`gradient` modes. Not part of the retirement itself, but a prerequisite the later
   sub-projects' visual fidelity depended on.
3. **Frame `behavior.type:'accordion-item'`** — any Frame becomes a toggleable accordion item
   (open/close, one Frame's children act as trigger+body), not hardcoded to FAQ title/body text.
4. **`Text` capabilities**: `richText`, `countUp` (StatMetrics' animated numbers), `spotlightReveal`
   (cursor-following reveal effect).
5. **Frame `behavior.type:'spotlight-list'`** — pointer/hover handlers layered onto unchanged
   children (a list where hovering one item dims the others).
6. **`DataBinding.mode:'mixedField'`** — a repeat entry sourced from one of several *different*
   Content Types in a single feed, each contributing its own field-name mapping (MixedFeed's
   "combined feed" behavior).
7. **Frame `behavior.type:'carousel'`** — self-resolving (fetches its own `repeat` entries, not
   sibling-cloned by the parent), renders exactly one "active" entry at a time via GSAP fade
   transitions, timer-driven autoplay, 3 configurable pagination styles (dots / arrows+counter /
   none). The architecturally largest single addition — everything else composed existing
   mechanisms; this one needed a genuinely new rendering mode.

## The 13 retired types → their replacement composition

| Old bespoke type | Replacement composition |
|---|---|
| AccordionList | Frame(`behavior:'accordion-item'`) × N, admin-composed trigger/body children |
| SpotlightList | Frame(`behavior:'spotlight-list'`) wrapping unchanged Text/Image children |
| StatMetrics | Text(`countUp:true`) × N inside a plain Frame grid |
| MixedFeed | Frame(`repeat.source:'mixed'`) + Text/Image(`dataBinding.mode:'mixedField'`) |
| ProjectShowcase | Frame(`behavior:'carousel'`) nested inside a static header Frame |
| MediaHero | Image + Text + Button composition (background pan/zoom preset) |
| LogoGrid | Frame(`repeat`) + Image + Text + hover-state primitives (grayscale reveal) |
| FeaturedEntry | Frame(`repeat`, cardinality:'one') + bound Text/Image children |
| InquiryForm | `FormEmbed` node pointing at a real `Form` entity (functional upgrade — the
  original never actually submitted anywhere; no backend endpoint was ever wired) |
| IntroRail | Frame(`repeat.source:'local'`) + Image/Text template children |
| TimelineList | Frame(`repeat.source:'local'`) + Text template children |
| ProcessSteps | Frame(`repeat.source:'local'`) + Text template children |
| ContactColumns | Frame(`repeat.source:'local'`) + Text template children |

Each retirement was: design → implementation plan → subagent-driven build (implementer + task
reviewer per task) → a final whole-branch review (broad, cross-file) → fix rounds → merge to
master, on both `ddd-graphql-fe` and `ddd-graphql-be`. The final whole-branch review caught a real
bug in nearly every sub-project that no per-task review had — usually a cross-file consistency gap
(a field set in one context-construction site but not its parallel copy elsewhere; a design doc
that described the same structural decision two contradictory ways).

## Migration (BE) — pure transform + runner script per type

Each retired type's old row shape (`node.props.content`/`.slots`/`.dataSource`) got a pure,
DB-free transform function (`src/modules/node/application/services/transformXToPrimitives.ts`,
**kept** — these remain permanent application code with unit test coverage documenting exactly
what reshaping was applied) plus a one-off CLI runner script (`scripts/migrateXToPrimitives.ts`,
**deleted after running** — disposable, single-use tooling with no reason to persist once executed).

**Real-data migration status (2026-08-24, this local dev DB):**
- ✅ MediaHero, LogoGrid, FeaturedEntry — 3/3 migrated
- ✅ IntroRail, TimelineList, ProcessSteps, ContactColumns — 9/9 nodes migrated
- ✅ AccordionList — 5/5
- ✅ SpotlightList — 2/2
- ✅ StatMetrics — 2/2
- ✅ MixedFeed — 2/2
- ✅ ProjectShowcase — 1/1
- ⏳ **InquiryForm — 1 node still pending.** Unlike the other 12 (pure structural reshaping),
  this one requires a real `Form` entity to already exist (a human content-modeling decision, not
  something a script can infer) — create one at `/cms/forms`, then run
  `scripts/migrateInquiryFormToFormEmbed.ts --form-id-map <path-to-json>` (this script and its
  transform are the only migration tooling deliberately kept in `scripts/` — everything else was
  removed after running). See that script's own header comment for the exact JSON map shape.

## The "Add Element" picker gap (closed 2026-08-24)

Every sub-project above replaced a type's *rendering* and wrote its migration transform — but for
several days, none of them had stopped the Node Builder's "Add Element" picker from creating
**brand-new** instances of the old bespoke types. `RETIRED_NODE_TYPES` (`node.constants.ts`)
now excludes all 13 from `NodePalette.tsx`, while deliberately leaving `nodeRegistry`/
`nodeCapabilities`/each type's `fieldSchema` untouched — existing pages (until their migration
runs) still render and remain fully editable; only *new* insertion is blocked. `TABLE`,
`CARD_LIST`, and `CONTENT_DETAIL` were deliberately excluded from this set — accepted utility
types, explicitly kept as first-class options, out of scope for this roadmap.

## What's still open

1. **InquiryForm's migration** — needs a `Form` entity created via `/cms/forms`, then the runner
   script (see above). The script is kept specifically for this.
2. **Full deletion of the 13 `ENodeType` entries** (registry + bespoke component files) — safe
   only once every one of the 13 has 0 real rows referencing it. 12/13 are there now; InquiryForm
   blocks the last one. Not started.
