# ProjectShowcase → Frame carousel behavior — Design

**Status:** Approved by user in chat (2026-08-23). Final item of `docs/superpowers/specs/2026-08-20-retire-specialized-node-types-roadmap.md`.

## Problem

`ProjectShowcaseNode.tsx` is a self-resolving carousel: fetches N entries via `node.repeat`, shows exactly one "active" project (image + title + description + year/client/category) with timer-driven auto-advance, a crossfade-style transition, a clickable next-project thumbnail preview, and prev/next arrows + a numeric "X / Y" counter.

Unlike every other type retired this session, this needs genuine new architecture: no primitive today can render "exactly 1 of N repeat entries, cycling over time" — every existing repeat mechanism (`resolveRenderableChildren.ts`'s sibling-cloning, or `SELF_RESOLVING_REPEAT_NODE_TYPES`'s self-fetching-but-render-all-N) either clones every entry as a sibling or renders all of them internally. Nothing renders one at a time with internal state.

## Decisions (via brainstorming, 2026-08-23)

1. **Drop the next-project preview thumbnail.** It requires binding to TWO repeat entries simultaneously (current + next), which no primitive supports (Text/Image bind to exactly one entry at a time) and would require a disproportionate new capability for one visual detail. Accepted, disclosed loss.
2. **Replace the arrows + numeric counter with configurable pagination.** Per the user's explicit standing philosophy (maximize reusability, avoid single-purpose choices baked in), pagination style is an admin-facing OPTION on the behavior config, not a hardcoded style: `'dots' | 'arrows-counter' | 'none'`, default `'dots'`.
3. **Everything else ports verbatim**: autoplay timing (2300ms default, configurable), the fade-based switching transition (re-expressed via GSAP instead of the original's bespoke CSS classes), no swipe gestures, no hover/focus-pause (matching the original, and consistent with this codebase's existing precedent of not supporting `prefers-reduced-motion` anywhere yet — not a gap introduced by this feature).

## Design

### 1. `FrameBehaviorConfig` gains a third variant: `'carousel'`

```ts
interface FrameBehaviorConfig {
    type: 'accordion-item' | 'spotlight-list' | 'carousel';
    defaultOpen?: boolean; // accordion-item only
    autoplayMs?: number;   // carousel only, default 2300
    pagination?: 'dots' | 'arrows-counter' | 'none'; // carousel only, default 'dots'
}
```

### 2. Repeat resolution: carousel Frames self-resolve, they are NOT sibling-cloned

`resolveRenderableChildren.ts`'s repeat-expansion branch currently checks `!SELF_RESOLVING_REPEAT_NODE_TYPES.has(node.type ?? '')` (a `node.type`-keyed set — Table/CardList/FeaturedEntry/ProjectShowcase-the-old-bespoke-type/LogoGrid/MixedFeed). This needs one more exclusion condition, checked ALONGSIDE the existing type-based one: a Frame with `props.behavior?.type === 'carousel'` must ALSO be excluded from sibling-cloning, regardless of its `node.type` (which is always `'frame'`). This is a small, precise addition — it does NOT affect `accordion-item`/`spotlight-list`/plain Frames, which must keep going through the normal sibling-cloning path when they carry a `repeat` (e.g. an accordion built from a `source:'local'` repeat, already shipped).

**A second, independent location has the byte-identical filter and must be updated in lockstep**: `NodeRenderer.tsx` (confirmed by reading it) has its OWN copy of the exact same condition — `c.repeat && !SELF_RESOLVING_REPEAT_NODE_TYPES.has(c.type ?? '')` — used to decide which nodes get their repeat entries PRE-FETCHED into `repeatEntriesByNodeId` before `resolveRenderableChildren` runs. Without the same carousel exclusion added here too, `NodeRenderer.tsx` would still pre-fetch entries for a carousel Frame (wasted duplicate work, since the carousel branch does its own independent `createResource` fetch) — not a correctness bug, but exactly the kind of "two hardcoded copies of one condition silently drift apart" bug class this project has been bitten by repeatedly this session (Phase 4's `animationRef`, the close-out-batch's `background.animate` CSS-emitter-vs-DOM-layer split). Both locations get the identical added clause; the implementation plan must call this out as ONE change applied to TWO files, not two separate decisions.

### 3. `FrameNode.tsx`'s new carousel branch

A FOURTH top-level rendering branch (alongside plain/link/accordion-item; spotlight-list is not a branch, it's a style/handler addition to the existing plain/link branches — carousel needs its own branch like accordion-item does, since it manages its own async data + active-index state):

```tsx
if (isCarousel()) {
    const [entriesResource] = createResource(
        () => ({ repeat: props.node.repeat, locale: props.context.locale, pathParams: props.context.pathParams, queryParams: props.context.queryParams }),
        (args) => args.repeat ? fetchRepeatEntries(args.repeat, {locale: args.locale, pathParams: args.pathParams, queryParams: args.queryParams}) : Promise.resolve([]),
    );
    const [active, setActive] = createSignal(0);
    // ...ported showProject/resetTimer state machine (430ms fade-out via GSAP, then swap active,
    // then re-enable after 700ms), autoplayMs from behavior config, onCleanup clears the interval...
    const activeContext = () => ({ ...props.context, contextEntry: entriesResource()?.[active()]?.data, contextEntryId: entriesResource()?.[active()]?.id });
    return (
        <div use:nodeAnimation={...} style={style()}>
            <div ref={contentRef}>
                <NodeChildrenList children={props.node.children} context={activeContext()} parentLayoutMode={...} />
            </div>
            <Show when={(entriesResource()?.length ?? 0) > 1}>
                {/* built-in pagination — dots, arrows-counter, or none per behavior.pagination */}
            </Show>
        </div>
    );
}
```

The admin composes `props.node.children` exactly like a repeat-template card (Image bound to a real field via `dataBinding.mode:'boundField'`, Text bound to title/description/etc.) — but instead of being cloned N times as siblings, this single composed template re-binds to whichever entry is currently `active`, one at a time. The GSAP fade timing ports the original's 430ms/700ms numbers.

### 4. Built-in pagination — NOT admin-composed

Dots/arrows-counter are generated FROM `entriesResource()?.length` (a runtime value), not authored as static children (children arrays are fixed at authoring time; the number of dots is not knowable until data loads) — same reasoning `AccordionListNode`'s trigger/body split does NOT apply here. Rendered directly by `FrameNode.tsx`'s carousel branch based on `behavior.pagination`:
- `'dots'` (default): one small button per entry, `aria-current` on the active one, click jumps to that index.
- `'arrows-counter'`: `‹`/`›` buttons (advance/retreat by 1) + a `"{active+1} / {length}"` text span — ports the original's exact control shape.
- `'none'`: no built-in navigation UI at all (autoplay-only, or admin composes their own via a future extension — out of scope now).

### 5. Inspector

`NodeContainerLayoutTab.tsx`'s existing "Hành vi" (Behavior) `<Select>` gains a third option, "Carousel". When selected, show `autoplayMs` (number input, default 2300) and `pagination` (a 3-option `<Select>`: Chấm tròn / Mũi tên + số đếm / Không có).

### 6. Migration

Root Frame (heading + subtitle + intro CTA, static, matching IntroRail/SpotlightList's own rail-header precedent) → a carousel-behavior Frame carrying the OLD row's `repeat` UNCHANGED (real content-type fetch, not local/mixed — no reshaping needed, same "pass through wholesale" pattern MixedFeed's migration already established) → its children are a template composition: Image bound to `slots.imageField`'s real field name, Text bound to `slots.headingField`, Text bound to `slots.descriptionField`, plus year/client/category as additional bound Texts when their slots are configured. `props.behavior = {type:'carousel', autoplayMs: content.autoplayMs ?? 2300, pagination:'dots'}`.

**Note**: unlike LogoGrid/MixedFeed, this old row is NOT a `SELF_RESOLVING_REPEAT_NODE_TYPES` member that needs its `repeat` explicitly cleared and moved to a nested child — the carousel Frame IS the root itself carrying the repeat directly (no nested template Frame needed, since there's no sibling-cloning to speak of — only one entry is ever rendered at a time, directly by the root carousel Frame's own children). This simplifies the migration: `updatedRoot.repeat` keeps the OLD row's exact repeat value (no `null`-clearing, no move-to-child).

## Accepted simplifications

- Next-project preview thumbnail — dropped (Decision 1).
- Arrows + numeric counter — now one of 3 configurable pagination options rather than the only option (Decision 2) — not a loss, a generalization.
- No swipe gestures, no hover/focus-pause — matches the original exactly, not a new gap.
- The corner arrow icon (`↗`) overlay on the media — a small decorative detail with no primitive equivalent (an icon absolutely-positioned over an image); accepted as dropped, matching the class of decorative-detail losses already accepted for OrbGlow/LineArrowButton elsewhere this session.

## Testing

- FE: unit tests for the new carousel branch (renders the active entry's bound children, cycles `active` on the ported timer mechanism — jsdom limitations on real timer/GSAP verification apply, matching every other animation-driven capability this session; pagination renders the right control set per `behavior.pagination`, dot click jumps to the right index, arrows advance/retreat correctly); a test confirming `resolveRenderableChildren.ts` does NOT sibling-clone a carousel-behavior Frame's repeat.
- BE: pure-function unit test for `buildProjectShowcaseSubtree`.
- Live verification (deferred, per this session's standing Playwright-unavailable practice).

## Rejected/Deferred

- **Swipe/touch gestures, hover/focus-pause, `prefers-reduced-motion` support** — none exist in the original, none exist anywhere else in this codebase yet; adding them here would be scope creep beyond what's asked, not a "close the gap this component already proved needed" case.
- **A 4th pagination style or admin-composable pagination markup** — YAGNI; the 2 real styles the original component itself used (arrows-counter) plus the requested default (dots) cover the actual need. `'none'` is nearly free to include (a Frame's-own-length check) so it's kept too.
