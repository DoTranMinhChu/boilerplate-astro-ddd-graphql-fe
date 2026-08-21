# Phase A2a: Frame accordion-item behavior — Design

**Status:** Approved by user in chat (2026-08-20/21). Sub-project of `2026-08-20-retire-specialized-node-types-roadmap.md`'s Phase A2, split into two independent pieces after research revealed very different complexity: this doc covers only the accordion-item half. Carousel is deferred to its own future design (genuinely closer to a new self-resolving-repeat rendering mode than a simple behavior flag — see Rejected/Deferred section). InquiryForm is reclassified as already solved by the existing `FORM_EMBED` primitive (`FormEmbedNode.tsx`) — no new capability needed, moves straight to the close-out/migration step.

## Problem

`AccordionListNode.tsx` (a bespoke component) is a plain multi-open FAQ accordion: a `Set<number>` of open indices, click a header to toggle, conditionally render that item's body. The user wants this expressed as a reusable Frame *behavior* instead of a one-off component — any Frame should be able to become a toggleable accordion item regardless of what's composed inside it (not hardcoded to FAQ title/body text).

## Design

### 1. Data shape — new `behavior` field on the Node, not `StyleObject`

```ts
// node.types.ts, sibling to layoutMode/style/repeat
export interface NodeBehavior {
    type: 'accordion-item'; // future: | 'carousel' | ...
    /** accordion-item only. Initial open/closed state — read once at mount, matches SSR
     * output exactly (no client-only flash), only ever changes via user interaction after. */
    defaultOpen?: boolean;
}
```
Added to `NodeTree`/`NodeDTO` as `behavior?: NodeBehavior`. Kept OUT of `StyleObject` deliberately — this is interaction/rendering-mode, not CSS, and doesn't belong in the hover/style pipeline `applyNodeStyle.ts` owns.

### 2. Structural convention: first child = trigger, remaining children = body

No per-child "is this the trigger" flag needed. `FrameNode.tsx`, when `node.behavior?.type === 'accordion-item'`, splits `node.children` positionally: `children[0]` is always the clickable trigger region (whatever the admin composed there — typically a Frame with a Text heading + Icon), `children.slice(1)` is the collapsible body (whatever else the admin composed — typically Text/Image/richtext). This matches how every real accordion is naturally authored (header row, then body) and needs zero new Inspector UI beyond the existing tree — an admin adds a Frame with `behavior: accordion-item`, adds a header child first, then body children after.

### 3. Rendering — `FrameNode.tsx`

```tsx
const isAccordion = () => props.node.behavior?.type === 'accordion-item';
const [open, setOpen] = createSignal(props.node.behavior?.defaultOpen ?? false);
const trigger = () => props.node.children[0];
const body = () => props.node.children.slice(1);
let bodyRef: HTMLDivElement | undefined;

createEffect((prevOpen: boolean | undefined) => {
    const isOpen = open();
    if (bodyRef && prevOpen !== undefined) { // skip the animation on first run (SSR/mount state already correct)
        gsap.to(bodyRef, { height: isOpen ? 'auto' : 0, duration: 0.3, ease: 'power2.inOut' });
    }
    return isOpen;
}, undefined);
```

The outer Frame keeps its existing `style()` (background/border/etc — the accordion item's own "card" look, untouched by this feature). Two new structural sub-elements, ONLY when `isAccordion()`:
- `<button type="button" onClick={() => setOpen(!open())} aria-expanded={open()} style={{all:'unset', display:'block', width:'100%', cursor:'pointer'}}>` wrapping the trigger's `NodeChildrenList` — a real `<button>`, not a `div role="button"`, so Enter/Space activation is free (native semantics), matching `AccordionListNode.tsx`'s own existing pattern. `all: unset` strips default button chrome so the admin's own composed trigger content controls 100% of the visual.
- `<div ref={bodyRef} style={{overflow: 'hidden', height: open() ? 'auto' : '0px'}}>` wrapping the body's `NodeChildrenList` — the animated container. Server-rendered `height` already matches `defaultOpen` with zero JS, so there's no flash-of-wrong-state; GSAP only drives the TRANSITION on later client-side toggles (the effect guard above explicitly skips animating on the first run for exactly this reason).

Every other `FrameNode` behavior (video background, `asLink`, layout) is untouched — this is a THIRD top-level branch alongside the existing `isLink()`/plain-`<div>` branches, not a rewrite of either.

### 4. Inspector UI

`NodeContainerLayoutTab.tsx` — not `NodeStyleTab.tsx` — is the right home: it already owns "how does this Frame treat its children" (flow/free, flex/grid), and accordion behavior is the same category of concern (positional treatment of children), not a visual/styling one. Its props (`layout?: LayoutProps; onChange`) grow to also take `behavior?: NodeBehavior; onBehaviorChange: (next: NodeBehavior | undefined) => void` (a sibling top-level Node field, same pattern this tab already uses for `layout`). New section: a "Hành vi" (Behavior) `<Select>`, Frame nodes only: "Không" (none, default) / "Mục accordion (mở/đóng)". When set to accordion, show a `defaultOpen` `<Checkbox>`. No per-child config needed per §2.

### 5. Multiple items, independent state

Each accordion-item Frame owns its own `open` signal — zero coordination between siblings. This naturally reproduces `AccordionListNode.tsx`'s existing multi-open semantics (any number of items can be open simultaneously) with no extra "accordion group" concept, since composing several accordion-item Frames as siblings under a plain parent Frame already produces exactly that.

## Testing

- `FrameNode.test.tsx`: accordion-item renders a `<button>` wrapping child[0] only; body wraps children[1:] only; clicking the button toggles `aria-expanded` and the body's rendered content (jsdom can assert the DOM structure and `aria-expanded`, not the GSAP animation itself — animation is a live/manual check); `defaultOpen: true` renders the body content present at mount with no click needed; a Frame with `behavior` unset (or any other type) renders exactly as before (regression guard — the existing `isLink()`/plain-`<div>` behavior must be byte-for-byte unchanged).
- A live manual check (GSAP animation, real height-0-to-auto transition, keyboard Enter/Space activation) — automated tests cover structure/state, not the animation itself.

## Rejected/Deferred

- **Carousel as part of this same `behavior` field**: technically fits the same `NodeBehavior.type` union going forward, but its rendering mode is fundamentally different — it needs to become a new `SELF_RESOLVING_REPEAT_NODE_TYPES` entry (fetch N repeat entries, render exactly 1 "active" clone at a time with timer-driven advancement + crossfade), not a simple boolean-toggle wrapper like accordion-item. Deferred to its own design when that sub-project starts; the `NodeBehavior` type is written to be extended later without a breaking change (`type` is already a union with room for `'carousel'`).
- **InquiryForm as a `behavior` type**: reclassified as unnecessary. `FormEmbedNode.tsx` (the existing `FORM_EMBED` primitive) already provides real field/validation/submit/success-message orchestration against a genuine Form entity — building a parallel "Frame.behavior: form" would duplicate that. InquiryForm's close-out is now just "create a matching Form entity + migrate existing InquiryForm nodes to a FORM_EMBED node bound to it," no new engine capability.
- **A shared "only one open at a time" accordion-group mode**: not requested, not present in the original `AccordionListNode.tsx` (which is multi-open by design) — omitted per YAGNI. Could be added later as a `behavior.exclusiveGroupId` if ever needed, out of scope now.
