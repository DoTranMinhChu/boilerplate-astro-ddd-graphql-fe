# AccordionList close-out — Design

**Status:** Proceeding under the user's standing "continue and finish everything" directive (2026-08-21). Covers AccordionList, the first of the 3 "Hard" roadmap types whose blocking capability (Phase A2a's `Frame.behavior:'accordion-item'`, already merged) is done but whose actual template rebuild + migration was never executed.

## Problem

`AccordionListNode.tsx` is a bespoke FAQ-style accordion: `heading` (static) + `items: {title, body}[]` rendered via a hand-rolled `createSignal<Set<number>>` open-state, first item (`index===0`) open by default, body as sanitized rich-text HTML.

Everything needed already exists: the local array repeater (`repeat.source:'local'`) clones a template subtree per array entry with its own `dataBinding`-bound children; the accordion-item Frame behavior (A2a) makes any Frame a toggleable accordion item, positionally splitting `children[0]` (trigger) from `children[1:]` (body), each clone owning its own independent open-state signal (confirmed by A2a's own design: "Each accordion-item Frame owns its own open signal — zero coordination between siblings," which extends naturally to repeat-cloned instances since each clone is a separate component instance).

## Design

**Template**: outer static Frame (dark theme, ported literally from the original's `bg-[#020202] py-20 text-[#f2f2f2]`) containing a `heading` Text (static) + one repeat-bound **accordion-item template Frame**:
```
Frame {
  props: { behavior: { type: 'accordion-item', defaultOpen: false } }
  repeat: { source:'local', cardinality:'many',
            localItemFields: [{key:'title', control:'text'}, {key:'body', control:'richtext'}],
            localItems: content.items ?? [] }
  style: { border: { width:1, style:'solid', color:'rgba(255,255,255,.14)' } }  // divider between items
  children: [
    Text { dataBinding: {mode:'boundField', field:'title'} }       // child[0] = trigger
    Text { dataBinding: {mode:'boundField', field:'body'}, props:{richText:true} }  // child[1:] = body
  ]
}
```

## Accepted simplifications (disclosed)

- **"First item open by default" is dropped** — `props.behavior.defaultOpen` is a static value on the TEMPLATE, shared identically by every repeat clone (repeat cloning duplicates the whole subtree including its static `props`, not a per-item override) — there is no per-item way to say "only item 0 starts open" without a new per-item behavior-override capability, which is disproportionate scope for a one-item convenience. All items start closed. (A future generic "per-item prop override" capability, if ever built for another reason, could restore this — not now, YAGNI.)
- **The trigger's dynamic "−"/"+" open/closed indicator is dropped.** The original swaps a literal glyph inside the trigger based on `open()` state — the current accordion-item mechanism exposes `aria-expanded` on the real `<button>` (so assistive tech still announces state correctly) but has no mechanism for a composed trigger CHILD to reactively read that same `open()` signal (it's local to `FrameNode`'s own accordion branch, not threaded into `NodeRenderContext` for descendants). Building that would be a real new capability (context-threading a boolean signal down through arbitrary composed content) for one cosmetic glyph — accepted loss, matching this session's established pattern for similar hover/interaction-choreography simplifications (MediaHero, FeaturedEntry, IntroRail's CTA).
- **Divider styling approximated as a full 4-side border** (same class as the local-repeater batch's ProcessSteps/ContactColumns border approximation) rather than a `border-t`-only rule between items — `StyleObject.border` has no per-side variant.

## Testing

- BE: pure-function unit test (plain fixtures, no DB), matching the local-repeater batch's established shape exactly (same file family, `transformCloseOutBatchToPrimitives.ts`'s sibling pattern).
- No FE code changes needed — this is pure composition using capabilities that already shipped (local repeater + accordion-item behavior + Text rich-text mode, all merged).
- Live verification (deferred, per this session's standing Playwright-unavailable practice): build one instance via primitives, compare against a real existing AccordionList instance.
