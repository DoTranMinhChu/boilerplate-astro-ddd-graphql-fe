# MixedFeed close-out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `DataBinding.mode:'mixedField'` capability (resolving a per-content-type field name against a repeat clone's own `contentTypeId`), fix a real Inspector reachability bug it would otherwise inherit, then migrate existing MixedFeed rows into a primitive-only composition reusing the already-fully-working `repeat.source:'mixed'` fetch.

**Architecture:** FE Task 1 extends `DataBinding`/`resolveBoundValue`/`NodeRenderContext`/`resolveRenderableChildren.ts` (small, additive) and fixes `NodeDataBindingTab.tsx`'s mode-Select reachability gate. BE Tasks 2-3 follow the established family precedent (pure transform + thin runner).

**Tech Stack:** SolidJS (FE), NestJS + TypeORM (BE), Vitest (FE), Jest (BE).

## Global Constraints

- `mixedField` is additive: every existing binding without it must render byte-for-byte unchanged.
- **Inspector reachability fix (required, not optional)**: `NodeDataBindingTab.tsx`'s mode `<Select>` currently has `disabled={props.availableFields.length === 0}` — but `source:'mixed'` ancestors ALWAYS have `availableFields.length === 0` by design (the component's own doc comment: mixed sources have no single unified static field list), and `itemIndex` has the identical problem for any zero-field-list repeat. Without a fix, BOTH `itemIndex` and the new `mixedField` mode would be completely unreachable in the Inspector for a `source:'mixed'` repeat — the mode Select must never be `disabled`; only the boundField-specific field-picker sub-control stays gated on `availableFields.length > 0`.
- BE migration transform functions are PURE (no I/O, no TypeORM). The runner preserves `props.legacyAnimation`/`props.enabled` and creates children before reshaping the bespoke row.
- Accepted, disclosed simplification: `line-clamp-2` on the description has no `StyleObject` equivalent — renders unclamped.

---

## File Structure

| File | Repo | Responsibility |
|---|---|---|
| `src/modules/cms/node/node.types.ts` (modify) | fe | `DataBinding.mode` gains `'mixedField'`; `NodeRenderContext` gains `contextMixedSources?`. |
| `src/modules/cms/node/nodeDataBinding.ts` (modify) | fe | `resolveBoundValue` gains the `mixedField` branch + 6th param. |
| `src/modules/cms/node/nodeDataBinding.test.ts` (modify) | fe | New tests. |
| `src/modules/cms/node/resolveRenderableChildren.ts` (modify) | fe | Sets `contextMixedSources` per clone when `source==='mixed'`. |
| `src/modules/cms/node/resolveRenderableChildren.test.ts` (modify) | fe | New test. |
| `src/modules/cms/node/primitives/TextNode.tsx`, `ImageNode.tsx`, `ButtonNode.tsx`, `VideoNode.tsx` (modify) | fe | Thread `contextMixedSources` through their `resolveBoundValue` calls. |
| `src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.tsx` (modify) | fe | Mode Select never disabled; new `mixedField` option + fixed 3-slot field picker. |
| `src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.test.tsx` (modify) | fe | New tests. |
| `src/modules/cms/cms.i18n.ts` (modify) | fe | New vi+en keys. |
| `src/modules/node/application/services/transformMixedFeedToPrimitives.ts` (new) | be | Pure transform: `buildMixedFeedSubtree`. |
| `src/modules/node/application/services/__tests__/transformMixedFeedToPrimitives.test.ts` (new) | be | Unit tests. |
| `scripts/migrateMixedFeedToPrimitives.ts` (new) | be | Runner. |

---

### Task 1: FE — `DataBinding.mode:'mixedField'` + Inspector reachability fix

**Files:** (see table above, FE rows)

**Interfaces:**
- Produces: `DataBinding.mode: 'static' | 'boundField' | 'itemIndex' | 'mixedField'`.
- Produces: `resolveBoundValue(binding, contextEntry, staticValue, contextEntryIndex?, contextEntryContentTypeId?, contextMixedSources?): any` — 2 new optional trailing params.
- Produces: `NodeRenderContext.contextMixedSources?: Array<{contentTypeId: string; fieldMapping?: Record<string, string | undefined>}>`.

- [ ] **Step 1: Write the failing tests for `resolveBoundValue`'s new `mixedField` mode**

Read `nodeDataBinding.ts`/`.test.ts` in full first, then add:
```ts
describe('resolveBoundValue — mixedField mode', () => {
    const sources = [
        { contentTypeId: 'ct-blog', fieldMapping: { heading: 'title', image: 'coverImage' } },
        { contentTypeId: 'ct-product', fieldMapping: { heading: 'productName' } },
    ];

    it('resolves the real field name for the matching content type, then reads it off contextEntry', () => {
        const result = resolveBoundValue({ mode: 'mixedField', field: 'heading' }, { title: 'Bài viết A', productName: 'ignored' }, 'fallback', undefined, 'ct-blog', sources);
        expect(result).toBe('Bài viết A');
    });

    it('uses a DIFFERENT real field name for a different content type sharing the same node', () => {
        const result = resolveBoundValue({ mode: 'mixedField', field: 'heading' }, { productName: 'Sản phẩm B' }, 'fallback', undefined, 'ct-product', sources);
        expect(result).toBe('Sản phẩm B');
    });

    it('falls back to staticValue when no source matches the content type', () => {
        expect(resolveBoundValue({ mode: 'mixedField', field: 'heading' }, { title: 'x' }, 'fallback', undefined, 'ct-unknown', sources)).toBe('fallback');
    });

    it('falls back to staticValue when the matched source has no mapping for this field', () => {
        expect(resolveBoundValue({ mode: 'mixedField', field: 'image' }, { productName: 'x' }, 'fallback', undefined, 'ct-product', sources)).toBe('fallback');
    });

    it('existing modes are byte-for-byte unchanged when contextMixedSources is passed', () => {
        expect(resolveBoundValue({ mode: 'static' }, { title: 'x' }, 'fallback', 0, 'ct-blog', sources)).toBe('fallback');
    });
});
```

- [ ] **Step 2: Run to verify they fail, then implement**

Run: `npx vitest run src/modules/cms/node/nodeDataBinding.test.ts` — expect FAIL.

In `node.types.ts`:
```ts
export interface DataBinding {
    mode: 'static' | 'boundField' | 'itemIndex' | 'mixedField';
    field?: string;
}
```
Find `NodeRenderContext` and add, next to `contextEntryContentTypeId`:
```ts
    /** MixedFeed close-out (2026-08-22): the parent repeat's own `sources[]` config (each
     * content type's `fieldMapping`), threaded down so a LEAF Text/Image node — which has no
     * direct access to its ancestor Frame's `repeat` — can resolve which real field name applies
     * to ITS clone's content type. Set only for `repeat.source==='mixed'`. */
    contextMixedSources?: Array<{ contentTypeId: string; fieldMapping?: Record<string, string | undefined> }>;
```

In `nodeDataBinding.ts`:
```ts
export function resolveBoundValue(
    binding: DataBinding,
    contextEntry: Record<string, any> | undefined,
    staticValue: any,
    contextEntryIndex?: number,
    contextEntryContentTypeId?: string,
    contextMixedSources?: Array<{ contentTypeId: string; fieldMapping?: Record<string, string | undefined> }>,
): any {
    if (binding.mode === 'itemIndex') return String((contextEntryIndex ?? 0) + 1).padStart(2, '0');
    if (binding.mode === 'mixedField') {
        const realField = contextMixedSources?.find((s) => s.contentTypeId === contextEntryContentTypeId)?.fieldMapping?.[binding.field ?? ''];
        if (!realField || !contextEntry || !(realField in contextEntry)) return staticValue;
        return contextEntry[realField];
    }
    if (binding.mode !== 'boundField' || !binding.field) return staticValue;
    if (!contextEntry || !(binding.field in contextEntry)) return staticValue;
    return contextEntry[binding.field];
}
```
(Confirm the existing function's real current parameter list/body by reading the file first — this shows the intended final shape, adapt to match whatever the itemIndex-era version actually looks like today.)

Run again: expect PASS (5 new tests + all pre-existing).

- [ ] **Step 3: Write the failing test for `resolveRenderableChildren`'s new `contextMixedSources`**

Read `resolveRenderableChildren.test.ts` first, then add:
```ts
it('sets contextMixedSources only for source:"mixed" repeats, from the repeat\'s own sources array', () => {
    const node = { id: 'n1', type: 'frame', repeat: { source: 'mixed', sources: [{ contentTypeId: 'ct-a', fieldMapping: { heading: 'x' } }] } } as any;
    const entries = new Map([['n1', [{ id: 'e1', data: {}, contentTypeId: 'ct-a' }]]]);
    const result = resolveRenderableChildren([node], {}, entries);
    expect(result[0].context.contextMixedSources).toEqual([{ contentTypeId: 'ct-a', fieldMapping: { heading: 'x' } }]);
});

it('does not set contextMixedSources for a non-mixed repeat', () => {
    const node = { id: 'n2', type: 'frame', repeat: { source: 'local' } } as any;
    const entries = new Map([['n2', [{ id: 'e1', data: {} }]]]);
    const result = resolveRenderableChildren([node], {}, entries);
    expect(result[0].context.contextMixedSources).toBeUndefined();
});
```

- [ ] **Step 4: Run to verify it fails, then implement**

In `resolveRenderableChildren.ts`, change the `entries.forEach` line to add one field:
```ts
entries.forEach((entry, i) => {
    result.push({
        node,
        context: {
            ...parentContext,
            contextEntry: entry.data,
            contextEntryId: entry.id,
            contextEntryContentTypeId: entry.contentTypeId,
            contextHref: entry.__detailHref,
            contextEntryIndex: i,
            contextMixedSources: node.repeat?.source === 'mixed' ? node.repeat.sources : undefined,
        },
        key: `${node.id ?? ''}:${i}`,
    });
});
```
Run again: expect PASS.

- [ ] **Step 5: Thread `contextMixedSources` through the other binding call sites**

In `TextNode.tsx`, `ImageNode.tsx`, `ButtonNode.tsx`, `VideoNode.tsx`, add `, props.context.contextMixedSources` as the 6th argument to each existing `resolveBoundValue(...)` call (read each file first for the exact current call site — they already have a 5th argument, `props.context.contextEntryContentTypeId`, from... confirm this — if the 5th arg isn't already threaded, add BOTH the 5th and 6th together, matching whatever the real current call signature is).

- [ ] **Step 6: Fix the Inspector's mode-Select reachability + add the mixedField field picker**

Read `NodeDataBindingTab.tsx` in full first (shown above in this plan's context — confirm it still matches). Remove `disabled={props.availableFields.length === 0}` from the mode `<Select>` entirely (it should always be interactive — `static`/`itemIndex`/`mixedField` are all valid choices regardless of whether `availableFields` has entries; only the boundField-specific sub-picker below stays gated). Add a `mixedField` option to the mode Select's `options` array, and a new `<Show when={props.dataBinding.mode === 'mixedField'}>` block with a FIXED 3-option field picker (heading/image/description — NOT derived from `availableFields`, since mixed sources have no unified field list):
```tsx
<Show when={props.dataBinding.mode === 'mixedField'}>
    <div>
        <label class={LABEL_CLASS}>{t('cms.node.dataBinding.mixedFieldSlotLabel')}</label>
        <Select
            value={props.dataBinding.field ?? ''}
            options={[
                { value: 'heading', label: t('cms.node.dataBinding.mixedFieldHeading') },
                { value: 'image', label: t('cms.node.dataBinding.mixedFieldImage') },
                { value: 'description', label: t('cms.node.dataBinding.mixedFieldDescription') },
            ]}
            onChange={(v) => props.onChange({ ...props.dataBinding, field: v || undefined })}
            fieldless
        />
    </div>
</Show>
```
The mode `onChange` needs updating so selecting `mixedField` produces a clean `{mode:'mixedField'}` (no stale `field` from a prior mode) — mirror the existing `itemIndex` special-case in the current `onChange` handler.

- [ ] **Step 7: Add i18n keys**

vi `dataBinding` block: `mixedFieldLabel: 'Trường theo loại nội dung (nguồn trộn)', mixedFieldSlotLabel: 'Vai trò dữ liệu', mixedFieldHeading: 'Tiêu đề', mixedFieldImage: 'Ảnh', mixedFieldDescription: 'Mô tả',`
en: `mixedFieldLabel: 'Field by content type (mixed source)', mixedFieldSlotLabel: 'Data role', mixedFieldHeading: 'Heading', mixedFieldImage: 'Image', mixedFieldDescription: 'Description',`
(Confirm exact block name/structure by reading `cms.i18n.ts`'s existing `dataBinding` section first — `itemIndexLabel` already lives there per an earlier sub-project.)

- [ ] **Step 8: Write the failing Inspector tests, then verify**

Read `NodeDataBindingTab.test.tsx` first. Add tests: the mode Select is NOT disabled when `availableFields` is empty (regression guard for the reachability fix); selecting "mixedField" produces `{mode:'mixedField'}` with no stale `field`; the 3-slot picker appears only when `mode==='mixedField'`, and selecting one of its options calls `onChange` with the right `field` value.

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.test.tsx` — FAIL then PASS.

- [ ] **Step 9: Run the full affected test set + typecheck**

Run: `npx vitest run src/modules/cms/node/nodeDataBinding.test.ts src/modules/cms/node/resolveRenderableChildren.test.ts src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.test.tsx`
Run: `npx astro check` — 0 errors.

- [ ] **Step 10: Commit**

```bash
git add src/modules/cms/node/node.types.ts src/modules/cms/node/nodeDataBinding.ts src/modules/cms/node/nodeDataBinding.test.ts src/modules/cms/node/resolveRenderableChildren.ts src/modules/cms/node/resolveRenderableChildren.test.ts src/modules/cms/node/primitives/TextNode.tsx src/modules/cms/node/primitives/ImageNode.tsx src/modules/cms/node/primitives/ButtonNode.tsx src/modules/cms/node/primitives/VideoNode.tsx src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.tsx src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.test.tsx src/modules/cms/cms.i18n.ts
git commit -m "feat(node): DataBinding mixedField mode + Inspector mode-Select reachability fix -- unblocks MixedFeed primitive migration"
```

---

### Task 2: BE — pure transform function

**Files:**
- Create: `src/modules/node/application/services/transformMixedFeedToPrimitives.ts`
- Test: `src/modules/node/application/services/__tests__/transformMixedFeedToPrimitives.test.ts`

Working directory: `D:\OTHER\node-source-base\ddd-graphql-be`.

**Interfaces:**
- Consumes: `NewChildSpec`/`SubtreeTransformResult` from `transformCloseOutBatchToPrimitives.ts`.
- Produces: `export function buildMixedFeedSubtree(oldProps: Record<string, any>): SubtreeTransformResult;`

- [ ] **Step 1: Read `MixedFeedNode.tsx` (FE repo, read-only) and `transformAccordionListToPrimitives.ts` (reference for `legacyAnimation`/`enabled`) in full first.**

- [ ] **Step 2: Write the failing tests**

```ts
import { describe, it, expect } from '@jest/globals';
import { buildMixedFeedSubtree } from '../transformMixedFeedToPrimitives';

describe('buildMixedFeedSubtree', () => {
    it('converts the root to a Frame with a static heading Text + a grid Frame containing an asLink template Frame', () => {
        const result = buildMixedFeedSubtree({ content: { heading: 'Tin mới nhất' }, layoutPreset: 'grid-3' });
        expect(result.updatedRoot.type).toBe('frame');
        expect(result.children[0]).toEqual(expect.objectContaining({ type: 'text', props: expect.objectContaining({ text: 'Tin mới nhất' }) }));
        const gridFrame = result.children.find((c) => c.layout?.display === 'grid')!;
        expect(gridFrame.layout).toEqual(expect.objectContaining({ gridTemplate: 'repeat(3, 1fr)' }));
    });

    it('explicitly clears the root\'s own repeat to null -- the old row self-resolved its repeat on its own row, the new root must not (repeat now lives on the nested template Frame)', () => {
        const result = buildMixedFeedSubtree({ content: {} }, { source: 'mixed', sources: [] });
        expect(result.updatedRoot.repeat).toBeNull();
    });

    it('the template Frame carries the repeat unchanged (source, sources, limit) with asLink:true and 3 mixedField-bound children', () => {
        const oldRepeat = { source: 'mixed', sources: [{ contentTypeId: 'ct-a', fieldMapping: { heading: 'title' } }], limit: 12, linkToDetail: true };
        const result = buildMixedFeedSubtree({ content: {} }, oldRepeat);
        const gridFrame = result.children.find((c) => c.layout?.display === 'grid')!;
        const templateFrame = gridFrame.children!.find((c) => c.repeat != null)!;
        expect(templateFrame.repeat).toEqual(oldRepeat);
        expect(templateFrame.props).toEqual({ asLink: true });
        expect(templateFrame.children).toEqual([
            expect.objectContaining({ type: 'image', dataBinding: { mode: 'mixedField', field: 'image' } }),
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'mixedField', field: 'heading' } }),
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'mixedField', field: 'description' } }),
        ]);
    });

    it('defaults to a 3-column grid when layoutPreset is unset', () => {
        const result = buildMixedFeedSubtree({ content: {} });
        const gridFrame = result.children.find((c) => c.layout?.display === 'grid')!;
        expect(gridFrame.layout?.gridTemplate).toBe('repeat(3, 1fr)');
    });

    it('carries legacyAnimation and enabled through to updatedRoot.props', () => {
        const result = buildMixedFeedSubtree({ content: {}, legacyAnimation: [{ type: 'fade-in' }], enabled: false });
        expect(result.updatedRoot.props).toStrictEqual({ legacyAnimation: [{ type: 'fade-in' }], enabled: false });
    });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx jest transformMixedFeedToPrimitives` — expect FAIL.

- [ ] **Step 4: Implement**

```ts
// src/modules/node/application/services/transformMixedFeedToPrimitives.ts
// MixedFeed close-out (Phase B3) — pure, DB-free transform converting the bespoke MixedFeed
// type into a primitive-tree subtree, reusing the ALREADY-FULLY-WORKING repeat.source:'mixed'
// fetch unchanged (only the RENDERING moves from bespoke logic to primitives + the new
// DataBinding.mode:'mixedField'). Follows transformAccordionListToPrimitives.ts's exact shape,
// including legacyAnimation/enabled preservation.
import type { NewChildSpec, SubtreeTransformResult } from './transformCloseOutBatchToPrimitives';

const GRID_COLS: Record<string, number> = { 'grid-2': 2, 'grid-3': 3, 'grid-4': 4 };

export function buildMixedFeedSubtree(oldProps: Record<string, any>, oldRepeat?: Record<string, any> | null): SubtreeTransformResult {
    const content = oldProps?.content ?? {};
    const children: NewChildSpec[] = [];
    if (content.heading) children.push({ type: 'text', props: { text: content.heading } });

    const cols = GRID_COLS[(oldProps?.layoutPreset as string) ?? 'grid-3'] ?? 3;

    // `repeat` is carried over COMPLETELY UNCHANGED — the existing source:'mixed' fetch
    // mechanism (fetchRepeatEntries, nodeDataBinding.ts) already reads exactly this shape
    // (source/sources/limit/linkToDetail), already tested, already production-proven. Only the
    // RENDERING moves from MixedFeedNode.tsx's bespoke per-entry field lookup onto this
    // template Frame's mixedField-bound children.
    const templateFrame: NewChildSpec = {
        type: 'frame',
        props: { asLink: true },
        repeat: oldRepeat ?? undefined,
        children: [
            { type: 'image', dataBinding: { mode: 'mixedField', field: 'image' } },
            { type: 'text', dataBinding: { mode: 'mixedField', field: 'heading' } },
            { type: 'text', dataBinding: { mode: 'mixedField', field: 'description' } },
        ],
    };

    children.push({
        type: 'frame',
        layout: { display: 'grid', gridTemplate: `repeat(${cols}, 1fr)`, gap: 24 },
        responsiveOverrides: { mobile: { layout: { gridTemplate: 'repeat(1, 1fr)' } } },
        children: [templateFrame],
    });

    const preservedProps: Record<string, any> = {};
    if (oldProps.legacyAnimation !== undefined) preservedProps.legacyAnimation = oldProps.legacyAnimation;
    if (oldProps.enabled !== undefined) preservedProps.enabled = oldProps.enabled;

    return {
        updatedRoot: {
            type: 'frame',
            props: preservedProps,
            style: { spacing: { padding: { t: 56, b: 56 } } },
        },
        children,
    };
}
```
**Note**: `templateFrame.repeat` is set to `oldRepeat ?? undefined` — the CALLER (the runner script, Task 3) passes the OLD ROW's existing `repeat` column value in as `oldRepeat`, since MixedFeed rows already carry `repeat` (unlike LogoGrid/FeaturedEntry's own precedent, this repeat does NOT need clearing from the root — it needs to be MOVED from the root row down onto the nested template Frame, and the root's OWN `repeat` needs to be explicitly cleared, matching LogoGrid's precedent exactly. Re-check `buildLogoGridSubtree` for the `updatedRoot.repeat: null` pattern and apply it here too:
```ts
    return {
        updatedRoot: {
            type: 'frame',
            props: preservedProps,
            style: { spacing: { padding: { t: 56, b: 56 } } },
            repeat: null, // clears the OLD root's own self-resolving repeat -- it now lives on templateFrame instead
        },
        children,
    };
```
(add this `repeat: null` line — the test in Step 2 should also assert `result.updatedRoot.repeat === null`, add that assertion.)

- [ ] **Step 5: Run to verify they pass**

Run: `npx jest transformMixedFeedToPrimitives` — expect PASS (4-5 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit` — 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/node/application/services/transformMixedFeedToPrimitives.ts src/modules/node/application/services/__tests__/transformMixedFeedToPrimitives.test.ts
git commit -m "feat(node): pure subtree transform for MixedFeed -> mixed-source repeat + mixedField primitive composition"
```

---

### Task 3: BE — runner script

**Files:**
- Create: `scripts/migrateMixedFeedToPrimitives.ts`

Working directory: `D:\OTHER\node-source-base\ddd-graphql-be`.

- [ ] **Step 1: Read `scripts/migrateAccordionListToPrimitives.ts` in full** (the reference). Write the new script following its EXACT shape, querying `type = 'mixed-feed'` (confirm the exact real `ENodeType` string value in `node.constants.ts` first) and dispatching to `buildMixedFeedSubtree(row.props, row.repeat)` — note the SECOND argument, `row.repeat` (the row's OWN existing repeat column), since `buildMixedFeedSubtree` needs it to move onto the nested template Frame.

- [ ] **Step 2: Write the script** (mirror `migrateAccordionListToPrimitives.ts`'s structure exactly, remembering `'repeat' in result.updatedRoot` handling since this transform explicitly sets `updatedRoot.repeat: null`).

- [ ] **Step 3: Confirm it compiles**

Run: `npx tsc -p scripts/tsconfig.json --noEmit` — 0 errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrateMixedFeedToPrimitives.ts
git commit -m "feat(node): migration runner for MixedFeed -> mixed-source repeat + mixedField primitive subtree"
```

---

## Manual verification (after all 3 tasks — required before running the migration script for real)

1. In the running admin, build one instance by hand using primitives (a mixed-source repeat Frame with mixedField-bound Image/Text children), confirm real content from 2+ different content types renders correctly per-entry.
2. Screenshot-compare against a real existing MixedFeed instance.
3. Run `migrateMixedFeedToPrimitives.ts` against a COPY of real data, spot-check, THEN schedule the real run with the user's explicit go-ahead.
4. Once 0 pages reference `mixed-feed`, retiring the `ENodeType` entry + deleting the component file becomes safe.
