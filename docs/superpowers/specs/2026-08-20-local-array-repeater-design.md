# Phase A1: Local array repeater — Design

**Status:** Approved by user in chat (2026-08-20). First sub-project of `2026-08-20-retire-specialized-node-types-roadmap.md`.

## Problem

`node.repeat` today only clones a Frame subtree once per entry fetched from a *Content Type* (network-bound). Six of the 13 specialized types slated for retirement (IntroRail, TimelineList, ProcessSteps, ContactColumns, and the base layout of SpotlightList/StatMetrics) need the identical clone-and-bind mechanism, but driven by a small, *admin-authored* array that lives directly on the node — a list of features, timeline entries, process steps, or contact columns typed in by the admin, not fetched from anywhere.

## Design

### 1. Reuse `CollectionRepeat`, don't invent a parallel field

`node.types.ts`'s `CollectionRepeat.source` (currently `'own' | 'related' | 'backlink' | 'mixed'`) gains a fifth value, `'local'`. Two new optional fields on the same interface:

```ts
export interface CollectionRepeat {
    // ...existing fields unchanged...
    source?: 'own' | 'related' | 'backlink' | 'mixed' | 'local';
    /** Only meaningful when source==='local'. Admin-defined shape of one array item — reuses
     * the SAME FieldDescriptor[] type nodeRegistry.ts's fieldSchema already uses for repeater
     * itemFields (RepeaterFieldEditor.tsx), so the item-editing UI is the existing component,
     * not a new one. One level only (no nested repeaters), matching that existing constraint. */
    localItemFields?: FieldDescriptor[];
    /** Only meaningful when source==='local'. The actual data — one Record per item, keyed by
     * localItemFields[].key, same shape RepeaterFieldEditor already produces for any other
     * repeater field in this codebase. */
    localItems?: Array<Record<string, unknown>>;
}
```

Everything downstream of `CollectionRepeat` — `resolveRenderableChildren.ts`'s clone loop, `resolveBoundValue`'s field lookup, the Frame-as-template mechanism — reads `entries[i].data`/`.id`/`.contentTypeId` generically regardless of where the entries came from. **None of that code changes.** The only new code is producing entries in that same shape from a local array instead of a network fetch.

### 2. `fetchRepeatEntries` — one new synchronous branch

In `nodeDataBinding.ts`, add before the `source === 'own'` fallback:

```ts
if (source === 'local') {
    return (repeat.localItems ?? []).map((item, i) => ({ id: `local-${i}`, data: item, contentTypeId: undefined }));
}
```

No network call, no `await` needed inside the branch (the function stays `async` for the other branches' sake — this branch just returns synchronously through the same async function). `fetchRepeatEntryCount` gets a matching `source === 'local'` branch returning `repeat.localItems?.length ?? 0` (a local array has a real, already-known count — unlike `related`/`backlink`/`mixed`'s `return 0`, pagination over a local array is meaningful and cheap).

### 3. Inspector UI — `NodeDataSourceTab.tsx`

The existing "Nguồn dữ liệu" (Data Source) `<Select>` gains a `'local'` option (`cms.node.dataSource.sourceLocal`, label "Mảng tự nhập"). When selected, the tab shows two new sections instead of the Content-Type/filter/sort controls that only make sense for network sources:

1. **Item shape editor (genuinely new UI).** A small add/remove list letting the admin define `localItemFields`: each row is one field with a name (label), a key (auto-slugified from the label, editable), and a control-type `<Select>` restricted to the subset of `FieldControl` that makes sense for hand-typed repeater items — `text`, `textarea`, `richtext`, `image`, `number`. (`select`/`boolean`/`code`/`repeater` excluded: `select` needs per-field options authoring which is out of scope for v1, `boolean`/`code` have no real use case in these 6 unblocked types' actual field needs, and `repeater` would violate the existing one-level-only constraint.) This is the one piece with no prior art in this codebase — every existing `itemFields` array is hardcoded in `nodeRegistry.ts` source, never admin-edited at runtime.
2. **Item data editor (fully reused).** `RepeaterFieldEditor` mounted with `field={{ key: 'localItems', labelKey: '...', control: 'repeater', repeaterItemShape: 'object', itemFields: repeat.localItemFields }}`, `value={repeat.localItems}`, `onChange={(v) => patch({ localItems: v as Record<string, unknown>[] })}` — identical usage pattern to every other repeater field in this codebase, just fed a runtime-defined `itemFields` instead of a hardcoded one.

Editing `localItemFields` after `localItems` already has data does NOT retroactively touch existing rows (adding a field leaves existing rows without that key — `resolveBoundValue` already degrades a missing key to the static fallback value, no crash; removing a field leaves stale keys in existing rows' data, harmless — `FieldRenderer`/`RepeaterFieldEditor` only reads keys that are still in `itemFields`).

### 4. Child binding — zero new code

A child Text/Image inside a `source: 'local'` Frame gets `dataBinding: { mode: 'boundField', field: '<key>' }` through the exact same Inspector control (the "Nguồn giá trị" → "Trường dữ liệu" picker) already used for content-type-bound repeat children. That picker currently sources its field-list options from the bound Content Type's schema (`NodeDataSourceTab.tsx`'s `fieldOptions` memo, line ~54) — it needs one small addition: when `repeat.source === 'local'`, the field-list options come from `repeat.localItemFields` instead of a fetched Content Type's fields. This is the one place outside `NodeDataSourceTab.tsx` itself that needs a change, and it's in the SAME file (the field-options memo the picker already reads from).

## Testing

- `nodeDataBinding.test.ts`: `fetchRepeatEntries` with `source:'local'` returns items wrapped correctly (no network call made — spy/mock the service calls and confirm zero invocations); empty/undefined `localItems` returns `[]`; `fetchRepeatEntryCount` with `source:'local'` returns the real length.
- `resolveRenderableChildren.test.ts`: a Frame with `repeat.source==='local'` and pre-populated `entriesByNodeId` (simulating what `NodeRenderer.tsx` would have already fetched) clones correctly, one clone per item, `contextEntry` set to the raw item object.
- `NodeDataSourceTab.test.tsx`: selecting "local" source shows the item-shape editor + `RepeaterFieldEditor`, hides Content-Type/filter/sort controls; adding a field to `localItemFields` updates the array correctly; the field-options memo (feeding the binding picker) returns `localItemFields`-derived options when source is local, Content-Type-derived options otherwise.
- A live manual check (not automated, this is a UI/UX judgment call): build a small IntroRail-shaped feature list this way in the running admin and confirm it renders identically to a real `IntroRailNode` instance, before this capability gets used to actually retire that type in a later sub-project.

## Out of scope (deferred to later sub-projects in the roadmap)

- Actually rebuilding IntroRail/TimelineList/ProcessSteps/ContactColumns as primitive-tree templates using this capability — that's each type's own close-out step per the roadmap, not part of A1 itself.
- The migration script converting existing DB nodes of those types — same, deferred per-type.
- `select`-control item fields (options-authoring UI) — no known real use case among the 6 types this unblocks; add later if a genuine need surfaces.
