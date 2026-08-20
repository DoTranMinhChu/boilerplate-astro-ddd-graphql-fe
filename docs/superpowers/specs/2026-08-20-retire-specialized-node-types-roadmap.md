# Retire the 13 specialized Node types — Roadmap

**Status:** Approved by user in chat (2026-08-20). This is a program-level roadmap, not an implementation-ready spec — each phase below gets its own dedicated design doc + implementation plan before any code is written for it.

## Problem

The CMS Node-tree builder has 8 true primitives (Frame/Text/Image/Shape/Video/Icon/Button/Form-embed) plus 3 accepted utilities (Table/CardList/CustomCode), and 14 "specialized" types migrated from the old Section system (MediaHero, IntroRail, SpotlightList, StatMetrics, TimelineList, ProcessSteps, ContactColumns, AccordionList, InquiryForm, ProjectShowcase, LogoGrid, FeaturedEntry, ContentDetail, MixedFeed) — each a bespoke, single-purpose component. The user's standing design philosophy (already enforced once this session for `LogoGridNode`) is: no bespoke single-purpose blocks — everything should compose from primitives, and where a primitive lacks a capability, the primitive gets upgraded, not replaced by a one-off component.

## Decisions made (via brainstorming, 2026-08-20)

1. **Scope: 13 of the 14 types are in scope for retirement.** `ContentDetail` is excluded — it dynamically dispatches rendering based on the *linked entry's own* Content Type schema at runtime, which is a fundamentally different rendering mode (schema introspection), not a fixed layout composable from static primitives. It stays a utility type, same standing as `Table`/`CardList`.
2. **The 4 "hard" types with real interactive state (AccordionList, InquiryForm, ProjectShowcase) get a shared new Frame capability, not bespoke logic each.** A new `Frame.behavior` field (`'accordion-item' | 'carousel' | 'form'`) lets ANY Frame subtree gain toggle/carousel/form-submit behavior regardless of what's composed inside it — not hardcoded to FAQ/carousel/contact-form specifically.
3. **Migration of existing content is automated, not manual.** For each type, once its blocking capability exists and the type is rebuilt as a primitive-tree template, a backend migration script converts every existing DB node of that type into the new primitive structure — mirroring how `migrateSectionsToNodes.ts` handled the original Section→Node migration. The type is only actually retired (ENodeType removed, component file deleted) once zero pages reference the old shape.
4. **Sequencing is capability-first, not type-first** — most of the 13 types share 2-3 blocking capabilities; building those capabilities once unblocks multiple types at once rather than solving each type's problem independently.

## Full inventory (13 types in scope)

| Type | Difficulty | Blocking capability |
|---|---|---|
| MediaHero | Easy | none (trivial CSS preset on Frame's background) |
| LogoGrid | Easy | none (already fits generic `repeat`+Frame+dataBinding) |
| FeaturedEntry | Easy | none (already fits generic `repeat`+Frame+dataBinding) |
| IntroRail | Medium | Local array repeater |
| TimelineList | Medium | Local array repeater |
| ProcessSteps | Medium | Local array repeater |
| ContactColumns | Medium | Local array repeater |
| SpotlightList | Medium | Local array repeater + pointer-tracking spotlight effect |
| StatMetrics | Medium | Local array repeater + count-up-on-scroll animation |
| MixedFeed | Medium | Per-content-type field mapping over a mixed repeat source |
| AccordionList | Hard | `Frame.behavior: 'accordion-item'` |
| InquiryForm | Hard | `Frame.behavior: 'form'` |
| ProjectShowcase | Hard | `Frame.behavior: 'carousel'` |

(`ContentDetail` — excluded, stays a utility type, see Decision 1.)

## Phased build order

**Phase A — Foundation capabilities (highest leverage, build first):**
- **A1. Local array repeater.** A Frame can hold a `localRepeat: { items: Array<Record<string, unknown>> }` (admin-authored JSON array, editable via a repeater control in the Inspector — same UI pattern `RepeaterFieldEditor.tsx` already established for fieldSchema repeaters elsewhere) and clone a single child template subtree once per array entry, binding each clone's descendants to that entry's fields (same `dataBinding` mechanism `node.repeat` clones already use, just sourced from the local array instead of a fetched Content Type). Unblocks IntroRail, TimelineList, ProcessSteps, ContactColumns fully, and the base layout of SpotlightList/StatMetrics.
- **A2. `Frame.behavior` system** (`'accordion-item' | 'carousel' | 'form'`). Unblocks AccordionList, ProjectShowcase, InquiryForm.

**Phase B — Point capabilities (layer on top of A1):**
- B1. Count-up-on-scroll-into-view number animation (unblocks StatMetrics)
- B2. Pointer-tracking spotlight/glow effect (unblocks SpotlightList)
- B3. Per-content-type field mapping over a mixed/merged repeat source (unblocks MixedFeed)

**Phase C — Composition + migration only, no new capability:**
- C1. MediaHero (CSS preset)
- C2. LogoGrid
- C3. FeaturedEntry

**Per-type close-out sequence** (applies to every type above once its blocking capability lands): rebuild the type as a primitive-tree template → write + run an automated DB migration script converting every existing node of that type → verify live on a real page → retire the `ENodeType` (remove from registry, delete the component file) once zero pages reference the old shape.

## Next step

Phase A1 (local array repeater) is the first sub-project — proceeding to its own detailed design now.
