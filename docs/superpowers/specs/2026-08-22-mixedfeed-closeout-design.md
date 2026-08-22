# Phase B3: MixedFeed close-out — Design

**Status:** Proceeding under the user's standing "continue and finish everything" directive. Covers B3 (per-content-type field mapping) from the roadmap, unblocking MixedFeed.

## Problem

`MixedFeedNode.tsx` is `heading` (static) + `node.repeat` (`source:'mixed'`, an already-fully-working, already-tested fetch against MULTIPLE content types at once — confirmed this session: `fetchRepeatEntries`'s `source==='mixed'` branch is real production code, not a stub). Each fetched entry's `contentTypeId` varies (different content types mixed in one list), and `node.repeat.sources[].fieldMapping: {heading?, image?, description?}` maps each SOURCE content type's OWN field names onto 3 FIXED semantic slots. Per-entry rendering looks up `sourceByType().get(entry.contentTypeId)?.fieldMapping`, then reads `data[fieldMapping.heading]` etc.

This is the one piece with no existing primitive equivalent: `DataBinding` (`{mode, field}`) binds exactly ONE static field name per node, identical across every repeat clone — it has no notion of "which field to read depends on which content type THIS clone's entry came from." Building this is a small, bounded extension (3 fixed semantic slots, reusing already-threaded `contextEntryContentTypeId`), not a general system.

## Design

### `DataBinding.mode` gains `'mixedField'`

```ts
export interface DataBinding {
    mode: 'static' | 'boundField' | 'itemIndex' | 'mixedField';
    field?: string; // mixedField: one of the 3 fixed semantic slots ('heading'|'image'|'description')
}
```

### `NodeRenderContext` gains `contextMixedSources`

`resolveRenderableChildren.ts` already sets `contextEntryContentTypeId` per clone (added in an earlier sub-project specifically so a repeat clone knows which content type ITS entry came from). It gains one more field at the exact same call site: `contextMixedSources: node.repeat?.source === 'mixed' ? node.repeat.sources : undefined` — the parent repeat's own `sources[]` config (containing each content type's `fieldMapping`), threaded down so a LEAF Text/Image node (which has no direct access to its ancestor Frame's `repeat`) can resolve which real field name applies to ITS clone's content type, without walking the tree.

### `resolveBoundValue` gains a 6th parameter

```ts
export function resolveBoundValue(
    binding: DataBinding,
    contextEntry: Record<string, any> | undefined,
    staticValue: any,
    contextEntryIndex?: number,
    contextEntryContentTypeId?: string,
    contextMixedSources?: Array<{ contentTypeId: string; fieldMapping?: Record<string, string | undefined> }>,
): any {
    if (binding.mode === 'itemIndex') return ...;
    if (binding.mode === 'mixedField') {
        const realField = contextMixedSources?.find((s) => s.contentTypeId === contextEntryContentTypeId)?.fieldMapping?.[binding.field ?? ''];
        if (!realField || !contextEntry || !(realField in contextEntry)) return staticValue;
        return contextEntry[realField];
    }
    // ...existing boundField/static logic unchanged
}
```
All 5 existing call sites (`TextNode`/`ImageNode`/`ButtonNode`/`VideoNode`) get the 6th argument threaded through (`props.context.contextMixedSources`), matching the exact precedent `contextEntryIndex` already established for uniform threading across every binding-capable primitive.

### Migration structure

Root Frame (`heading` Text, static) → a Frame carrying `repeat: {source:'mixed', sources: <copied unchanged from the old row>, limit: <copied unchanged>, linkToDetail:true}` (the exact same `sources`/`limit` config the bespoke component already reads — zero reshaping needed, since this data already lives in the right shape on `node.repeat`) → a grid-layout wrapper Frame (matching `layoutPreset`'s `grid-2`/`grid-3`/`grid-4` → `gridTemplate`) → a template Frame (`props.asLink:true`, since entries link to their detail page via the repeat's own `linkToDetail`/`contextHref` mechanism — the SAME `asLink` pattern FeaturedEntry/LogoGrid already use) containing: a conditional Image bound `{mode:'mixedField', field:'image'}`, a Text bound `{mode:'mixedField', field:'heading'}`, a Text bound `{mode:'mixedField', field:'description'}`.

## Accepted simplifications

- **Per-card hover styling** (`hover:shadow-lg`, image `group-hover:scale-105`) — expressible via the existing `StyleObject.hover` system (box shadow + transform on hover), no simplification needed, included as-is.
- **`line-clamp-2` on the description** — no `StyleObject` equivalent for line-clamping exists yet; accepted as a disclosed simplification (description renders unclamped) rather than building a new capability for one truncation detail.

## Testing

- FE: unit tests for `resolveBoundValue`'s new `mixedField` mode (resolves the correct real field name per content type, falls back to `staticValue` when no matching source/field, existing modes byte-for-byte unchanged); `resolveRenderableChildren.ts`'s new `contextMixedSources` (set only for `source:'mixed'` repeats, absent otherwise).
- BE: pure-function unit test for `buildMixedFeedSubtree`, matching the established family shape.
- Live verification (deferred, per this session's standing Playwright-unavailable practice).
