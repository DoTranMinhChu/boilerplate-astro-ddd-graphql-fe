# Phase A1: Local array repeater Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Frame clone a child template once per item in an admin-authored array (not fetched from a Content Type), reusing the existing `node.repeat` clone-and-bind machinery end to end.

**Architecture:** `CollectionRepeat.source` gains a 5th value `'local'`, with two new fields (`localItemFields`, `localItems`) carrying an admin-defined item shape and the actual data. `fetchRepeatEntries` gets one new synchronous branch producing entries in the exact same `{id, data, contentTypeId}` shape every other source already produces, so the entire downstream clone/bind pipeline (`resolveRenderableChildren.ts`, `resolveBoundValue`) needs zero changes. The one genuinely new piece of UI is a runtime item-shape editor (`NodeDataSourceTab.tsx`) — every other repeater `itemFields` array in this codebase is hardcoded per node type in source, never admin-edited — plus wiring a child's field-binding picker to read that shape instead of a fetched Content Type's fields when its nearest repeat-ancestor is local.

**Tech Stack:** SolidJS, Vitest + `@solidjs/testing-library`, the existing `FieldDescriptor`/`RepeaterFieldEditor` repeater-editing infrastructure.

## Global Constraints

- `localItemFields` supports only these `FieldControl` values: `text`, `textarea`, `richtext`, `image`, `number` — not `select`/`boolean`/`code`/`repeater` (per design doc §3: no known real use case among the 6 types this unblocks, and `repeater` would violate the existing one-level-only itemFields constraint).
- Zero changes to `resolveRenderableChildren.ts`, `resolveBoundValue`, or `RepeaterFieldEditor.tsx` — this plan proves the reuse claim by NOT touching them.
- Editing `localItemFields` after `localItems` has data must not crash or corrupt existing rows (adding a field: existing rows simply lack that key until edited; removing a field: stale keys in existing rows' data are harmless, never read again).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/modules/cms/node/node.types.ts` (modify) | `CollectionRepeat.source` gains `'local'`; new `localItemFields`/`localItems` fields. |
| `src/modules/cms/node/nodeDataBinding.ts` (modify) | `fetchRepeatEntries`/`fetchRepeatEntryCount` gain a `source==='local'` branch. |
| `src/modules/cms/node/nodeDataBinding.test.ts` (modify) | New cases for the `'local'` branch. |
| `src/modules/cms/node/resolveBindableLocalItemFields.ts` (new) | Walks up from a node looking for the nearest ancestor with `repeat.source==='local'`, returns its `localItemFields` — mirrors `resolveBindableContentType.ts`'s existing walk-up pattern, but synchronous (no content-type fetch needed). |
| `src/modules/cms/node/resolveBindableLocalItemFields.test.ts` (new) | Walk-up behavior, including skipping non-local/`mixed` ancestors and stopping at the nearest local one. |
| `src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx` (modify) | `bindableFields()` reads `localItemFields` (converted to `FieldDefinitionDTO[]`-shaped objects) when the nearest repeat-ancestor is local, bypassing the content-type-fetch resource entirely. |
| `src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.tsx` (modify) | New `LocalItemFieldsEditor` component (item-shape editor); `'local'` option in the source `<Select>`; `RepeaterFieldEditor` mounted for item data when source is local. |
| `src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.test.tsx` (modify) | New cases for the local-source UI. |
| `src/modules/cms/cms.i18n.ts` (modify) | New vi+en key pairs. |

---

### Task 1: `CollectionRepeat` type change + `fetchRepeatEntries`/`fetchRepeatEntryCount` local branch

**Files:**
- Modify: `src/modules/cms/node/node.types.ts`
- Modify: `src/modules/cms/node/nodeDataBinding.ts`
- Test: `src/modules/cms/node/nodeDataBinding.test.ts`

**Interfaces:**
- Produces: `CollectionRepeat.source` now includes `'local'`; `CollectionRepeat.localItemFields?: FieldDescriptor[]`; `CollectionRepeat.localItems?: Array<Record<string, unknown>>`. `fetchRepeatEntries`/`fetchRepeatEntryCount` (unchanged signatures) now handle `source: 'local'`.

- [ ] **Step 1: Change the type**

In `src/modules/cms/node/node.types.ts`, find the `CollectionRepeat` interface (search for `export interface CollectionRepeat`) and change:
```ts
    source?: 'own' | 'related' | 'backlink' | 'mixed';
```
to:
```ts
    source?: 'own' | 'related' | 'backlink' | 'mixed' | 'local';
```
Then, right after the `sources?: { contentTypeId: string; limit?: number; fieldMapping?: Record<string, string | undefined> }[];` line in the same interface, add:
```ts
    /** Only meaningful when source==='local'. Admin-defined shape of one array item — reuses
     * the SAME FieldDescriptor[] type nodeRegistry.ts's fieldSchema already uses for repeater
     * itemFields (RepeaterFieldEditor.tsx), so the item-editing UI is the existing component,
     * not a new one. One level only (no nested repeaters), matching that existing constraint —
     * see NodeDataSourceTab.tsx's LocalItemFieldsEditor for the admin-facing editor. */
    localItemFields?: FieldDescriptor[];
    /** Only meaningful when source==='local'. The actual data — one Record per item, keyed by
     * localItemFields[].key, same shape RepeaterFieldEditor already produces for any other
     * repeater field in this codebase. */
    localItems?: Array<Record<string, unknown>>;
```
Add the import at the top of the file if `FieldDescriptor` isn't already imported: `import type { FieldDescriptor } from './node.fieldSchema.types';`

- [ ] **Step 2: Write the failing tests**

Append to `src/modules/cms/node/nodeDataBinding.test.ts` (inside the existing `describe('fetchRepeatEntries ...')` block, after its last test):

```ts
    it('source="local": returns localItems wrapped as entries, with no network call', async () => {
        const { ContentEntryService } = await import('@/shared/services/contentEntry/contentEntry.service');
        const repeat = {
            source: 'local' as const,
            localItemFields: [{ key: 'title', labelKey: 'Tiêu đề', control: 'text' as const }],
            localItems: [{ title: 'Mục 1' }, { title: 'Mục 2' }],
        };
        const result = await fetchRepeatEntries(repeat, { pathParams: {}, queryParams: {} });
        expect(result).toEqual([
            { id: 'local-0', data: { title: 'Mục 1' }, contentTypeId: undefined },
            { id: 'local-1', data: { title: 'Mục 2' }, contentTypeId: undefined },
        ]);
        expect(ContentEntryService.getPublicContentEntries).not.toHaveBeenCalled();
        expect(ContentEntryService.getRelatedContentEntries).not.toHaveBeenCalled();
        expect(ContentEntryService.getBacklinkContentEntries).not.toHaveBeenCalled();
        expect(ContentEntryService.getMixedContentEntries).not.toHaveBeenCalled();
    });

    it('source="local" with no localItems returns an empty array, not undefined/throw', async () => {
        const result = await fetchRepeatEntries({ source: 'local' as const }, { pathParams: {}, queryParams: {} });
        expect(result).toEqual([]);
    });
```

Append a new `describe` block at the end of the same file (after the existing top-level `describe`s):

```ts
describe('fetchRepeatEntryCount — source="local" (Phase A1)', () => {
    it('returns the real length of localItems (unlike related/backlink/mixed, which return 0)', async () => {
        const count = await fetchRepeatEntryCount(
            { source: 'local' as const, localItems: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] },
            { pathParams: {}, queryParams: {} },
        );
        expect(count).toBe(3);
    });

    it('returns 0 when localItems is unset', async () => {
        const count = await fetchRepeatEntryCount({ source: 'local' as const }, { pathParams: {}, queryParams: {} });
        expect(count).toBe(0);
    });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/modules/cms/node/nodeDataBinding.test.ts`
Expected: FAIL — `source: 'local'` falls through to the `source === 'own'` branch today (no `contentTypeKey` guard triggers an early `return []`, so the new "wrapped entries" assertions fail; `fetchRepeatEntryCount`'s existing `if ((repeat.source ?? 'own') !== 'own') return 0;` line makes both new count tests fail too, expecting 3/0 but getting 0 either way by coincidence for the second one — the FIRST count test genuinely fails, `3 !== 0`).

- [ ] **Step 4: Implement the two branches**

In `src/modules/cms/node/nodeDataBinding.ts`, in `fetchRepeatEntries`, add this branch right before the `// source === 'own'` comment (i.e., right after the `if (source === 'mixed') { ... }` block closes):

```ts
    if (source === 'local') {
        return (repeat.localItems ?? []).map((item, i) => ({ id: `local-${i}`, data: item, contentTypeId: undefined }));
    }

```

In `fetchRepeatEntryCount`, change:
```ts
    if ((repeat.source ?? 'own') !== 'own') return 0;
```
to:
```ts
    if (repeat.source === 'local') return repeat.localItems?.length ?? 0;
    if ((repeat.source ?? 'own') !== 'own') return 0;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/modules/cms/node/nodeDataBinding.test.ts`
Expected: PASS (all pre-existing tests plus the 4 new ones).

- [ ] **Step 6: Run the whole-project typecheck**

Run: `npx tsc --noEmit -p .`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/cms/node/node.types.ts src/modules/cms/node/nodeDataBinding.ts src/modules/cms/node/nodeDataBinding.test.ts
git commit -m "feat(node): add source:'local' to CollectionRepeat — a synchronous, admin-authored-array repeat entry source"
```

---

### Task 2: `resolveBindableLocalItemFields` + wire into `NodeBuilder.page.tsx`'s field-binding picker

**Files:**
- Create: `src/modules/cms/node/resolveBindableLocalItemFields.ts`
- Test: `src/modules/cms/node/resolveBindableLocalItemFields.test.ts`
- Modify: `src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx`

**Interfaces:**
- Consumes: `CollectionRepeat.source`/`localItemFields` (Task 1). `FieldDescriptor` from `./node.fieldSchema.types`.
- Produces: `resolveBindableLocalItemFields(nodeId: string | undefined, nodesById: Map<string, NodeDTO>): FieldDescriptor[] | undefined`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/modules/cms/node/resolveBindableLocalItemFields.test.ts
import { describe, it, expect } from 'vitest';
import { resolveBindableLocalItemFields } from './resolveBindableLocalItemFields';
import type { NodeDTO } from './node.types';

function node(overrides: Partial<NodeDTO>): NodeDTO {
    return { id: 'n', type: 'frame', ...overrides } as NodeDTO;
}

describe('resolveBindableLocalItemFields', () => {
    it('returns the localItemFields of the node itself when it has a local repeat', () => {
        const fields = [{ key: 'title', labelKey: 'Tiêu đề', control: 'text' as const }];
        const map = new Map<string, NodeDTO>([
            ['a', node({ id: 'a', repeat: { source: 'local', localItemFields: fields } as any })],
        ]);
        expect(resolveBindableLocalItemFields('a', map)).toBe(fields);
    });

    it('walks up through non-repeat ancestors to find the nearest local repeat', () => {
        const fields = [{ key: 'year', labelKey: 'Năm', control: 'text' as const }];
        const map = new Map<string, NodeDTO>([
            ['root', node({ id: 'root', repeat: { source: 'local', localItemFields: fields } as any })],
            ['mid', node({ id: 'mid', parentId: 'root' })],
            ['leaf', node({ id: 'leaf', parentId: 'mid' })],
        ]);
        expect(resolveBindableLocalItemFields('leaf', map)).toBe(fields);
    });

    it('skips a "mixed" or "own" repeat ancestor and keeps walking up for a local one further out', () => {
        const fields = [{ key: 'label', labelKey: 'Nhãn', control: 'text' as const }];
        const map = new Map<string, NodeDTO>([
            ['outer', node({ id: 'outer', repeat: { source: 'local', localItemFields: fields } as any })],
            ['inner', node({ id: 'inner', parentId: 'outer', repeat: { source: 'mixed' } as any })],
            ['leaf', node({ id: 'leaf', parentId: 'inner' })],
        ]);
        expect(resolveBindableLocalItemFields('leaf', map)).toBe(fields);
    });

    it('returns undefined when no ancestor (inclusive) has a local repeat', () => {
        const map = new Map<string, NodeDTO>([
            ['a', node({ id: 'a', repeat: { source: 'own', contentTypeKey: 'ct-1' } as any })],
        ]);
        expect(resolveBindableLocalItemFields('a', map)).toBeUndefined();
    });

    it('returns undefined for an undefined nodeId', () => {
        expect(resolveBindableLocalItemFields(undefined, new Map())).toBeUndefined();
    });

    it('a local repeat with no localItemFields set is treated as not-yet-bindable (keeps walking up)', () => {
        const fields = [{ key: 'x', labelKey: 'X', control: 'text' as const }];
        const map = new Map<string, NodeDTO>([
            ['outer', node({ id: 'outer', repeat: { source: 'local', localItemFields: fields } as any })],
            ['inner', node({ id: 'inner', parentId: 'outer', repeat: { source: 'local' } as any })],
            ['leaf', node({ id: 'leaf', parentId: 'inner' })],
        ]);
        expect(resolveBindableLocalItemFields('leaf', map)).toBe(fields);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/cms/node/resolveBindableLocalItemFields.test.ts`
Expected: FAIL — `Cannot find module './resolveBindableLocalItemFields'`

- [ ] **Step 3: Implement it**

```ts
// src/modules/cms/node/resolveBindableLocalItemFields.ts
import type { NodeDTO } from './node.types';
import type { FieldDescriptor } from './node.fieldSchema.types';

/** Walks from `nodeId` UP through `parentId` (inclusive of the node itself) looking for the
 * nearest ancestor whose `repeat.source==='local'` has a defined item shape — the local-repeat
 * counterpart of `resolveBindableContentType.ts` (which does the identical walk for a real
 * Content-Type-bound ancestor). Synchronous and free — unlike the content-type case, there is
 * no ID to resolve and no network fetch to trigger, `localItemFields` already lives on the
 * node itself. An ancestor with `repeat.source==='local'` but no `localItemFields` set yet
 * (freshly toggled on, not configured) is treated as not-yet-bindable and the walk continues
 * past it, matching resolveBindableContentType's identical "present but unconfigured" skip. */
export function resolveBindableLocalItemFields(nodeId: string | undefined, nodesById: Map<string, NodeDTO>): FieldDescriptor[] | undefined {
    let current = nodeId ? nodesById.get(nodeId) : undefined;
    while (current) {
        if (current.repeat?.source === 'local' && current.repeat.localItemFields?.length) {
            return current.repeat.localItemFields;
        }
        current = current.parentId ? nodesById.get(current.parentId) : undefined;
    }
    return undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/cms/node/resolveBindableLocalItemFields.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Wire into `NodeBuilder.page.tsx`'s `bindableFields()`**

Read `src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx` around its `bindableContentTypeId`/`bindableContentType`/`bindableFields` definitions (search for `const bindableFields = ()`) to confirm current exact code, then change:

```ts
    const bindableContentTypeId = () => resolveBindableContentType(selected()?.id, new Map(nodes.map((n) => [n.id ?? '', n])));
    const [bindableContentType] = createResource(bindableContentTypeId, (id) => ContentTypeService.getOneContentType({ id }));
    const bindableFields = (): FieldDefinitionDTO[] => (bindableContentType()?.fields || []).filter((f): f is FieldDefinitionDTO => !!f);
```

to:

```ts
    const bindableContentTypeId = () => resolveBindableContentType(selected()?.id, new Map(nodes.map((n) => [n.id ?? '', n])));
    const [bindableContentType] = createResource(bindableContentTypeId, (id) => ContentTypeService.getOneContentType({ id }));
    // Phase A1 (local array repeater): a local-repeat ancestor has no real Content Type to
    // fetch at all — `localItemFields` already IS the field list, synchronously, on the node
    // itself. Checked FIRST and short-circuits the resource-based content-type path entirely
    // when it applies; falls through to the existing behavior otherwise (zero change for any
    // node whose nearest repeat ancestor is content-type-bound, exactly as today).
    const bindableLocalItemFields = () => resolveBindableLocalItemFields(selected()?.id, new Map(nodes.map((n) => [n.id ?? '', n])));
    const bindableFields = (): FieldDefinitionDTO[] => {
        const local = bindableLocalItemFields();
        if (local) return local.map((f) => ({ key: f.key, label: f.labelKey })) as FieldDefinitionDTO[];
        return (bindableContentType()?.fields || []).filter((f): f is FieldDefinitionDTO => !!f);
    };
```

Add the import near the existing `resolveBindableContentType` import:
```ts
import { resolveBindableLocalItemFields } from '@/modules/cms/node/resolveBindableLocalItemFields';
```

- [ ] **Step 6: Run the whole-project typecheck**

Run: `npx tsc --noEmit -p .`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/cms/node/resolveBindableLocalItemFields.ts src/modules/cms/node/resolveBindableLocalItemFields.test.ts src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx
git commit -m "feat(node): resolve a child's field-binding options from a local-repeat ancestor's item shape"
```

---

### Task 3: `NodeDataSourceTab.tsx` — item-shape editor + local source UI

**Files:**
- Modify: `src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.tsx`
- Modify: `src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.test.tsx`
- Modify: `src/modules/cms/cms.i18n.ts`

**Interfaces:**
- Consumes: `RepeaterFieldEditor` (existing, unchanged), `CollectionRepeat.localItemFields`/`localItems` (Task 1).
- Produces: no new exports — this task only changes `NodeDataSourceTab.tsx`'s JSX and adds one new internal component (`LocalItemFieldsEditor`, not exported, same convention as this file's other internal editors like `MixedSourcesEditor`).

- [ ] **Step 1: Add i18n keys**

In `src/modules/cms/cms.i18n.ts`, in the **vi** `dataSource` block (around line 846, right after `sourceBacklink: 'Tham chiếu ngược',`):
```ts
                sourceBacklink: 'Tham chiếu ngược',
                sourceLocal: 'Mảng tự nhập',
```
And right after `removeSourceButton: 'Xoá nguồn',` (the last key in that block, around line 882):
```ts
                removeSourceButton: 'Xoá nguồn',
                localItemFieldsLabel: 'Định nghĩa các trường cho mỗi mục',
                localItemFieldLabelPlaceholder: 'Tên trường (VD: Tiêu đề)',
                localItemFieldControlLabel: 'Kiểu dữ liệu',
                localItemFieldControlText: 'Văn bản ngắn',
                localItemFieldControlTextarea: 'Văn bản dài',
                localItemFieldControlRichtext: 'Văn bản định dạng (richtext)',
                localItemFieldControlImage: 'Ảnh',
                localItemFieldControlNumber: 'Số',
                addLocalItemFieldButton: '+ Thêm trường',
                localItemsLabel: 'Danh sách mục',
                addLocalItemButton: '+ Thêm mục',
```

In the **en** `dataSource` block (around line 1914, right after `sourceBacklink: 'Backlink',`):
```ts
                sourceBacklink: 'Backlink',
                sourceLocal: 'Manual array',
```
And after this block's own `removeSourceButton` line:
```ts
                removeSourceButton: 'Remove source',
                localItemFieldsLabel: 'Define the fields for each item',
                localItemFieldLabelPlaceholder: 'Field name (e.g. Title)',
                localItemFieldControlLabel: 'Data type',
                localItemFieldControlText: 'Short text',
                localItemFieldControlTextarea: 'Long text',
                localItemFieldControlRichtext: 'Rich text',
                localItemFieldControlImage: 'Image',
                localItemFieldControlNumber: 'Number',
                addLocalItemFieldButton: '+ Add field',
                localItemsLabel: 'Items',
                addLocalItemButton: '+ Add item',
```

(Read the file first to confirm the exact current line content around both insertion points before editing — the file may have shifted slightly since this plan was written.)

- [ ] **Step 2: Write the failing tests**

Append to `src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.test.tsx`:

```ts
describe('NodeDataSourceTab — local array repeater (Phase A1, 2026-08-20)', () => {
    it('shows "Mảng tự nhập" as a source option and selecting it hides the Content Type picker', () => {
        const { getByText, queryByText } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'own', mode: 'dynamic', cardinality: 'many' }} nodeType="frame" onChange={vi.fn()} />
        ));
        expect(getByText('Mảng tự nhập')).toBeTruthy();
        // Content Type picker only shows for source 'own' — not present at all when repeat.source
        // is already 'local' in the next test; this test just confirms the option text exists.
    });

    it('selecting local source shows the item-shape editor and the item-data repeater, hides Content Type controls', () => {
        const { getByText, queryByText } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'local', cardinality: 'many', localItemFields: [{ key: 'title', labelKey: 'Tiêu đề', control: 'text' }], localItems: [{ title: 'Mục 1' }] }}
                nodeType="frame"
                onChange={vi.fn()}
            />
        ));
        expect(getByText('Định nghĩa các trường cho mỗi mục')).toBeTruthy();
        expect(getByText('Danh sách mục')).toBeTruthy();
        expect(queryByText('Content Type')).toBeNull();
    });

    it('adds a new (empty) item field', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'local', cardinality: 'many', localItemFields: [] }} nodeType="frame" onChange={onChange} />
        ));
        fireEvent.click(getByText('+ Thêm trường'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            localItemFields: [{ key: '', labelKey: '', control: 'text' }],
        }));
    });

    it('typing a field label auto-fills the key by slugifying it, when the key has not been hand-edited', () => {
        const onChange = vi.fn();
        const { getByPlaceholderText } = render(() => (
            <NodeDataSourceTab repeat={{ source: 'local', cardinality: 'many', localItemFields: [{ key: '', labelKey: '', control: 'text' }] }} nodeType="frame" onChange={onChange} />
        ));
        fireEvent.input(getByPlaceholderText('Tên trường (VD: Tiêu đề)'), { target: { value: 'Tiêu đề chính' } });
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            localItemFields: [{ key: 'tieudechinh', labelKey: 'Tiêu đề chính', control: 'text' }],
        }));
    });

    it('removes an item field', () => {
        const onChange = vi.fn();
        const { getByLabelText } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'local', cardinality: 'many', localItemFields: [{ key: 'title', labelKey: 'Tiêu đề', control: 'text' }] }}
                nodeType="frame"
                onChange={onChange}
            />
        ));
        fireEvent.click(getByLabelText('remove-local-item-field'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ localItemFields: [] }));
    });

    it('the item-data RepeaterFieldEditor is wired to localItems, writing through onChange on patch', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => (
            <NodeDataSourceTab
                repeat={{ source: 'local', cardinality: 'many', localItemFields: [{ key: 'title', labelKey: 'Tiêu đề', control: 'text' }], localItems: [] }}
                nodeType="frame"
                onChange={onChange}
            />
        ));
        fireEvent.click(getByText('+ Thêm mục'));
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ localItems: [{ title: undefined }] }));
    });
});
```

Note: `'+ Thêm mục'` is the vi value of the CUSTOM `cms.node.dataSource.addLocalItemButton` key defined in Step 1 above (`RepeaterFieldEditor`'s `field.addButtonLabelKey` is set to that key in Step 4's wiring, so it overrides the component's own default `cms.node.content.repeaterAddButton` — confirmed by reading `RepeaterFieldEditor.tsx`'s `props.field.addButtonLabelKey ? tOrLiteral(...) : t('cms.node.content.repeaterAddButton')` fallback logic). `emptyObjectRow`'s output shape (`Object.fromEntries(itemFields.map(f => [f.key, f.defaultValue]))`) matches the `{ title: undefined }` expectation since the test's `itemFields` entry has no `defaultValue` set.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.test.tsx`
Expected: FAIL — `'local'` isn't a source option yet, no item-shape editor exists.

- [ ] **Step 4: Implement `LocalItemFieldsEditor` and wire it in**

In `src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.tsx`, add imports:
```ts
import { RepeaterFieldEditor } from './RepeaterFieldEditor';
import type { FieldDescriptor, FieldControl } from '@/modules/cms/node/node.fieldSchema.types';
```

Add `'local'` to the main "Nguồn dữ liệu" `<Select>`'s options (find the block starting `<Show when={props.nodeType !== 'mixed-feed'}>` around line 84-131) — change the options array:
```ts
                            options={[
                                { value: 'own', label: t('cms.node.dataSource.sourceOwn') },
                                { value: 'related', label: t('cms.node.dataSource.sourceRelated') },
                                { value: 'backlink', label: t('cms.node.dataSource.sourceBacklink') },
                                { value: 'local', label: t('cms.node.dataSource.sourceLocal') },
                            ]}
```
Wrap the EXISTING `Show when={(props.repeat?.source ?? 'own') === 'own'}` block (the Content Type picker + filters) so it also excludes local — it already only shows for `'own'`, so no change needed there; it's naturally hidden for `'local'` already, same as it already is for `'related'`/`'backlink'`. Just add a new sibling `<Show>` block right after the existing `related`/`backlink` `<Show>` blocks (around line 130, right before the closing of the `Show when={props.nodeType !== 'mixed-feed'}` block):

```tsx
                    <Show when={props.repeat?.source === 'local'}>
                        <LocalItemFieldsEditor
                            value={props.repeat?.localItemFields ?? []}
                            onChange={(v) => patch({ localItemFields: v })}
                        />
                        <div>
                            <label class={LABEL_CLASS}>{t('cms.node.dataSource.localItemsLabel')}</label>
                            <RepeaterFieldEditor
                                field={{ key: 'localItems', labelKey: 'cms.node.dataSource.localItemsLabel', control: 'repeater', repeaterItemShape: 'object', itemFields: props.repeat?.localItemFields ?? [], addButtonLabelKey: 'cms.node.dataSource.addLocalItemButton' }}
                                value={props.repeat?.localItems ?? []}
                                onChange={(v) => patch({ localItems: v as Record<string, unknown>[] })}
                            />
                        </div>
                    </Show>
```

Add the new component at the bottom of the file, alongside `MixedSourcesEditor`:

```tsx
const LOCAL_FIELD_CONTROLS: { value: FieldControl; labelKey: string }[] = [
    { value: 'text', labelKey: 'cms.node.dataSource.localItemFieldControlText' },
    { value: 'textarea', labelKey: 'cms.node.dataSource.localItemFieldControlTextarea' },
    { value: 'richtext', labelKey: 'cms.node.dataSource.localItemFieldControlRichtext' },
    { value: 'image', labelKey: 'cms.node.dataSource.localItemFieldControlImage' },
    { value: 'number', labelKey: 'cms.node.dataSource.localItemFieldControlNumber' },
];

/** Slugify a hand-typed field label into a stable object key — lowercase, strip anything
 * that isn't a letter/digit. Deliberately simple (no unicode-diacritic folding): a Vietnamese
 * label with diacritics keeps them stripped by the [^a-z0-9] class, which is a harmless (if
 * slightly odd-looking) key like "tiu" for "Tiêu" — the KEY is never shown to a viewer, only
 * used internally to correlate data with its field descriptor, so exact prettiness doesn't
 * matter, only stability and uniqueness within one item shape. */
function slugifyFieldKey(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Runtime item-SHAPE editor for a local array repeater — distinct from `RepeaterFieldEditor`
 * (which edits the DATA once a shape exists). No prior art in this codebase: every other
 * `itemFields` array is hardcoded per node type in `nodeRegistry.ts` source, never admin-edited
 * — this is the one place an admin defines a field shape at runtime. Hand-rolled add/update/
 * remove directly on `props.value`/`props.onChange`, matching this file's own established
 * convention (`DataSourceFilterEditor`/`MixedSourcesEditor` above). */
function LocalItemFieldsEditor(props: { value: FieldDescriptor[]; onChange: (v: FieldDescriptor[]) => void }) {
    const update = (i: number, patch: Partial<FieldDescriptor>) => {
        const next = [...props.value];
        next[i] = { ...next[i], ...patch };
        props.onChange(next);
    };
    const add = () => props.onChange([...props.value, { key: '', labelKey: '', control: 'text' }]);
    const remove = (i: number) => props.onChange(props.value.filter((_, idx) => idx !== i));
    // A key the admin already hand-edited away from its label's auto-slug must not be silently
    // overwritten on the next label keystroke — only auto-fill when key still matches what the
    // CURRENT label would slugify to (i.e. the admin never touched the key field directly).
    const updateLabel = (i: number, label: string) => {
        const field = props.value[i];
        const keyWasAutoDerived = field.key === slugifyFieldKey(field.labelKey);
        update(i, { labelKey: label, key: keyWasAutoDerived ? slugifyFieldKey(label) : field.key });
    };

    return (
        <div class="flex flex-col gap-2">
            <label class={LABEL_CLASS}>{t('cms.node.dataSource.localItemFieldsLabel')}</label>
            <For each={props.value}>
                {(field, i) => (
                    <div class="grid grid-cols-12 gap-2 rounded-lg border border-neutral-200 p-2">
                        <div class="col-span-6">
                            <Input value={field.labelKey} onChange={(v: string) => updateLabel(i(), v)} placeholder={t('cms.node.dataSource.localItemFieldLabelPlaceholder')} fieldless />
                        </div>
                        <div class="col-span-5">
                            <Select
                                value={field.control}
                                options={LOCAL_FIELD_CONTROLS.map((c) => ({ value: c.value, label: t(c.labelKey as any) }))}
                                onChange={(v: string) => update(i(), { control: v as FieldControl })}
                                fieldless
                            />
                        </div>
                        <div class="col-span-1">
                            <Button sm outline interactDanger aria-label="remove-local-item-field" icon={<Icon name="heroicons-outline:trash" class="text-red-500" />} onClick={() => remove(i())} />
                        </div>
                    </div>
                )}
            </For>
            <Button sm outline onClick={add}>{t('cms.node.dataSource.addLocalItemFieldButton')}</Button>
        </div>
    );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.test.tsx`
Expected: PASS (all pre-existing tests in this file plus the new ones from Step 2). If the "add item" test's expected button text or the emptyObjectRow shape doesn't match, adjust the test to the REAL observed value (confirm via `RepeaterFieldEditor.tsx`'s actual `t('cms.node.content.repeaterAddButton')` dictionary value) — the point of that test is proving the wiring works, not the exact literal string.

- [ ] **Step 6: Run the whole-project typecheck**

Run: `npx tsc --noEmit -p .`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.tsx src/modules/cms/admin/nodeBuilder/NodeDataSourceTab.test.tsx src/modules/cms/cms.i18n.ts
git commit -m "feat(node-builder): local array repeater UI — item-shape editor + wired data editor in the Data Source tab"
```

---

## Manual verification (after all 3 tasks)

Live-check in the Node Builder admin (`/admin/cms/node-builder`) — automated tests cover logic, not the real end-to-end admin flow:

1. Add a Frame, open its "Nguồn dữ liệu" tab, turn on repeat, pick "Mảng tự nhập".
2. Define 2-3 item fields (e.g. "Tiêu đề" / text, "Ảnh" / image, "Mô tả" / textarea).
3. Add 2-3 items with real data via the item-data editor.
4. Add a Text and an Image child inside the Frame, bind each to one of the defined fields via the existing "Nguồn giá trị" → "Trường dữ liệu" picker — confirm the picker's option list shows the LOCAL field labels (not a Content Type's fields).
5. Confirm the public page renders one clone of the Frame's children per item, each showing that item's own data — matching how a Content-Type-bound repeat already renders today, just sourced locally.
