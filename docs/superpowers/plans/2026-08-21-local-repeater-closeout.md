# Local-repeater close-out batch (IntroRail/TimelineList/ProcessSteps/ContactColumns) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two small, reusable primitive capabilities (Text rich-text rendering, an `itemIndex` data-binding mode), then migrate 4 bespoke Node types (IntroRail, TimelineList, ProcessSteps, ContactColumns) into primitive-only compositions using the already-shipped local array repeater.

**Architecture:** FE Task 1 adds the two capabilities, each additive and non-breaking for every node that doesn't opt in. BE Tasks 2-3 follow the exact precedent of `scripts/migrateCloseOutBatchToPrimitives.ts` (already merged): pure, DB-free transform functions per type (unit-tested with plain object fixtures) + a thin runner script using `NodeService.createNode()` exclusively for new rows, children created before the bespoke row is reshaped (the ordering fix the close-out batch's final review already established as correct from day one this time).

**Tech Stack:** SolidJS (FE, `ddd-graphql-fe`), NestJS + TypeORM (BE, `ddd-graphql-be`), Vitest (FE), Jest (BE).

## Global Constraints

- `richText`/`itemIndex` are additive: every existing Text node without `props.richText` and every existing binding without `mode:'itemIndex'` must render byte-for-byte unchanged.
- BE migration transform functions are PURE (no I/O, no TypeORM) — testable with plain object fixtures, matching `transformCloseOutBatchToPrimitives.ts`'s established shape exactly.
- The runner script creates ALL of a row's new children BEFORE reshaping the bespoke row's own `type`/`props` (not after) — a mid-migration failure must leave the row still matching the recovery query's `type IN (...)` filter, not silently orphan it. Wrap each row in a per-row `try/catch` so one bad row doesn't abort the whole batch; track real `migrated`/`failed` counts.
- Accepted, disclosed simplifications (from the design doc, not to be "fixed" as part of this plan): IntroRail's `OrbGlow` decorative layer is dropped entirely; IntroRail's `LineArrowButton` hover choreography downgrades to `Button` + `StyleObject.hover`'s existing box-only affordances; ContactColumns' `whitespace-pre-line` literal-newline preservation is dropped (newlines collapse to spaces).

---

## File Structure

| File | Repo | Responsibility |
|---|---|---|
| `src/modules/cms/node/node.types.ts` (modify) | fe | `DataBinding.mode` gains `'itemIndex'`; `NodeRenderContext` gains `contextEntryIndex?: number`. |
| `src/modules/cms/node/nodeDataBinding.ts` (modify) | fe | `resolveBoundValue` gains the `itemIndex` branch + 4th param. |
| `src/modules/cms/node/nodeDataBinding.test.ts` (modify) | fe | New tests for `itemIndex`. |
| `src/modules/cms/node/resolveRenderableChildren.ts` (modify) | fe | Sets `contextEntryIndex` per repeat clone. |
| `src/modules/cms/node/resolveRenderableChildren.test.ts` (modify) | fe | New test for `contextEntryIndex`. |
| `src/modules/cms/node/primitives/TextNode.tsx` (modify) | fe | New rich-text rendering branch; new 4th arg to `resolveBoundValue`. |
| `src/modules/cms/node/primitives/TextNode.test.tsx` (modify) | fe | New tests for rich-text branch. |
| `src/modules/cms/node/primitives/ImageNode.tsx`, `ButtonNode.tsx`, `VideoNode.tsx` (modify) | fe | Thread `contextEntryIndex` through their existing `resolveBoundValue` calls (consistency, no behavior change for these 3 — they have no `itemIndex` consumer yet, just don't silently diverge from `TextNode`). |
| `src/modules/cms/node/nodeRegistry.ts` (modify) | fe | TEXT's `fieldSchema` gains a `richText` boolean field descriptor. |
| `src/modules/cms/cms.i18n.ts` (modify) | fe | New vi+en key pair for the `richText` field label. |
| `src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.tsx` (modify) | fe | New "Số thứ tự (STT)" fixed option in the bound-field selector, writing `{mode:'itemIndex'}`. |
| `src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.test.tsx` (modify) | fe | New test. |
| `src/modules/node/application/services/transformLocalRepeaterBatchToPrimitives.ts` (new) | be | Pure transforms: `buildIntroRailSubtree`, `buildTimelineListSubtree`, `buildProcessStepsSubtree`, `buildContactColumnsSubtree`. |
| `src/modules/node/application/services/transformLocalRepeaterBatchToPrimitives.test.ts` (new) | be | Unit tests, plain fixtures, no DB. |
| `scripts/migrateLocalRepeaterBatchToPrimitives.ts` (new) | be | Runner: queries the 4 types, calls the transforms, writes via `NodeService`. |

---

### Task 1: FE — rich-text Text mode + `itemIndex` data-binding

**Files:**
- Modify: `src/modules/cms/node/node.types.ts`
- Modify: `src/modules/cms/node/nodeDataBinding.ts`
- Modify: `src/modules/cms/node/nodeDataBinding.test.ts`
- Modify: `src/modules/cms/node/resolveRenderableChildren.ts`
- Modify: `src/modules/cms/node/resolveRenderableChildren.test.ts`
- Modify: `src/modules/cms/node/primitives/TextNode.tsx`
- Modify: `src/modules/cms/node/primitives/TextNode.test.tsx`
- Modify: `src/modules/cms/node/primitives/ImageNode.tsx`
- Modify: `src/modules/cms/node/primitives/ButtonNode.tsx`
- Modify: `src/modules/cms/node/primitives/VideoNode.tsx`
- Modify: `src/modules/cms/node/nodeRegistry.ts`
- Modify: `src/modules/cms/cms.i18n.ts`
- Modify: `src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.tsx`
- Modify: `src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.test.tsx`

**Interfaces:**
- Produces: `resolveBoundValue(binding: DataBinding, contextEntry: Record<string, any> | undefined, staticValue: any, contextEntryIndex?: number): any` — the 4th param is NEW and optional (every existing call site keeps compiling; only call sites that pass it get `itemIndex` support).
- Produces: `DataBinding.mode: 'static' | 'boundField' | 'itemIndex'` (was `'static' | 'boundField'`).
- Produces: `NodeRenderContext.contextEntryIndex?: number`.

- [ ] **Step 1: Write the failing tests for `resolveBoundValue`'s new `itemIndex` mode**

Append to `src/modules/cms/node/nodeDataBinding.test.ts`:
```ts
describe('resolveBoundValue — itemIndex mode', () => {
    it('formats a 0-based index as a 1-based, zero-padded 2-digit string', () => {
        expect(resolveBoundValue({ mode: 'itemIndex' }, undefined, 'fallback', 0)).toBe('01');
        expect(resolveBoundValue({ mode: 'itemIndex' }, undefined, 'fallback', 4)).toBe('05');
        expect(resolveBoundValue({ mode: 'itemIndex' }, undefined, 'fallback', 10)).toBe('11');
    });

    it('treats a missing contextEntryIndex as 0 (formats as "01")', () => {
        expect(resolveBoundValue({ mode: 'itemIndex' }, undefined, 'fallback')).toBe('01');
    });

    it('ignores contextEntry and field entirely in itemIndex mode', () => {
        expect(resolveBoundValue({ mode: 'itemIndex', field: 'title' }, { title: 'should be ignored' }, 'fallback', 2)).toBe('03');
    });

    it('existing static/boundField modes are byte-for-byte unchanged when contextEntryIndex is passed', () => {
        expect(resolveBoundValue({ mode: 'static' }, { title: 'x' }, 'fallback text', 3)).toBe('fallback text');
        expect(resolveBoundValue({ mode: 'boundField', field: 'title' }, { title: 'Sản phẩm A' }, 'fallback', 3)).toBe('Sản phẩm A');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/modules/cms/node/nodeDataBinding.test.ts`
Expected: FAIL — `mode: 'itemIndex'` not assignable to `DataBinding['mode']` (or the runtime branch missing).

- [ ] **Step 3: Implement the type + function changes**

In `node.types.ts`, change:
```ts
export interface DataBinding {
    mode: 'static' | 'boundField' | 'itemIndex';
    field?: string;
}
```
Find `NodeRenderContext` (search for `export interface NodeRenderContext`) and add one field, next to the existing `contextEntry?`/`contextEntryId?` fields:
```ts
    /** Local-repeater close-out (2026-08-21): the current repeat clone's own 0-based position
     * among its siblings — set only by resolveRenderableChildren.ts's repeat-expansion branch,
     * mirrors contextEntry/contextEntryId which are set at the exact same call site. Consumed by
     * resolveBoundValue's 'itemIndex' mode for computed-ordinal fields (e.g. a numbered list's
     * "01/02/03..." badge) that have no backing data field to bind to. */
    contextEntryIndex?: number;
```

In `nodeDataBinding.ts`:
```ts
export function resolveBoundValue(binding: DataBinding, contextEntry: Record<string, any> | undefined, staticValue: any, contextEntryIndex?: number): any {
    if (binding.mode === 'itemIndex') return String((contextEntryIndex ?? 0) + 1).padStart(2, '0');
    if (binding.mode !== 'boundField' || !binding.field) return staticValue;
    if (!contextEntry || !(binding.field in contextEntry)) return staticValue;
    return contextEntry[binding.field];
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/modules/cms/node/nodeDataBinding.test.ts`
Expected: PASS (all pre-existing tests + 4 new ones).

- [ ] **Step 5: Write the failing test for `resolveRenderableChildren`'s new `contextEntryIndex`**

Read `src/modules/cms/node/resolveRenderableChildren.test.ts` first to match its existing fixture/assertion style, then add:
```ts
it('sets contextEntryIndex to the 0-based position of each repeat clone', () => {
    const node = { id: 'n1', type: 'frame', repeat: { source: 'local' } } as any;
    const entries = new Map([['n1', [{ id: 'local-0', data: { a: 1 } }, { id: 'local-1', data: { a: 2 } }]]]);
    const result = resolveRenderableChildren([node], {}, entries);
    expect(result[0].context.contextEntryIndex).toBe(0);
    expect(result[1].context.contextEntryIndex).toBe(1);
});

it('does not set contextEntryIndex for a non-repeated child', () => {
    const node = { id: 'n2', type: 'text' } as any;
    const result = resolveRenderableChildren([node], {});
    expect(result[0].context.contextEntryIndex).toBeUndefined();
});
```
(Adjust the fixture shape to match whatever minimal `NodeTree`/context shape the existing tests in this file already use — read the file first, don't guess field names not confirmed there.)

- [ ] **Step 6: Run to verify it fails, then implement**

Run: `npx vitest run src/modules/cms/node/resolveRenderableChildren.test.ts` — expect FAIL (`contextEntryIndex` undefined).

In `resolveRenderableChildren.ts`, change the `entries.forEach` line to add one field:
```ts
entries.forEach((entry, i) => {
    result.push({ node, context: { ...parentContext, contextEntry: entry.data, contextEntryId: entry.id, contextEntryContentTypeId: entry.contentTypeId, contextHref: entry.__detailHref, contextEntryIndex: i }, key: `${node.id ?? ''}:${i}` });
});
```

Run again: expect PASS.

- [ ] **Step 7: Write the failing tests for `TextNode`'s rich-text branch**

Read `src/modules/cms/node/primitives/TextNode.tsx` and `TextNode.test.tsx` in full first (both already exist — this is a modification, not a new file; match the existing test fixture/render style exactly). Add:
```tsx
describe('TextNode — rich text (local-repeater close-out, 2026-08-21)', () => {
    it('renders sanitized HTML via innerHTML when props.richText is true', () => {
        const node = { id: 'n1', type: 'text', props: { text: '<p>Xin <strong>chào</strong></p>', richText: true } } as any;
        const { container } = render(() => <TextNode node={node} context={{ device: () => 'desktop' as const }} />);
        const p = container.querySelector('p')!;
        expect(p.innerHTML).toContain('<strong>chào</strong>');
    });

    it('strips a script tag via DOMPurify even when richText is true', () => {
        const node = { id: 'n1', type: 'text', props: { text: '<img src=x onerror="alert(1)">safe text', richText: true } } as any;
        const { container } = render(() => <TextNode node={node} context={{ device: () => 'desktop' as const }} />);
        expect(container.querySelector('p')!.innerHTML).not.toContain('onerror');
        expect(container.textContent).toContain('safe text');
    });

    it('plain-text mode is unaffected when richText is unset (regression guard)', () => {
        const node = { id: 'n1', type: 'text', props: { text: '<p>literal tags shown as text</p>' } } as any;
        const { container } = render(() => <TextNode node={node} context={{ device: () => 'desktop' as const }} />);
        expect(container.querySelector('p')!.textContent).toBe('<p>literal tags shown as text</p>');
    });
});
```
(Match whatever `render`/import/context-fixture conventions the EXISTING tests in this file already use — read them first; the snippets above show intent, adjust exact syntax to fit.)

- [ ] **Step 8: Run to verify it fails**

Run: `npx vitest run src/modules/cms/node/primitives/TextNode.test.tsx`
Expected: FAIL — plain-text mode renders literal `<p>` tags as text either way today, so the first 2 new tests fail (no rich-text branch exists yet); the 3rd passes already (documents current behavior).

- [ ] **Step 9: Implement the rich-text branch**

Read the full current `TextNode.tsx` (shown in this task's context below) and add a THIRD `<Show>` branch, checked BEFORE the existing plain-`<p>`/video-fill `<Show>` chain (rich-text and video-fill are mutually exclusive by construction — different trigger fields — so ordering between them doesn't matter for correctness, but checking `richText` first keeps the diff minimal by leaving the existing 2-branch `<Show fallback>` structure intact as the "not rich text" case):
```tsx
import DOMPurify from 'dompurify'; // same import LogoGridNode.tsx already uses — confirm exact import path/style by reading that file if this doesn't match

export function TextNode(props: NodeComponentProps) {
    const text = () => resolveBoundValue(props.node.dataBinding ?? { mode: 'static' }, props.context.contextEntry, props.node.props?.text ?? '', props.context.contextEntryIndex);
    const isRichText = () => props.node.props?.richText === true;
    const style = () => props.node.style ?? {};
    const isVideoFill = () => style().typography?.color?.type === 'video' && !!style().typography?.color?.value;
    const maskId = createUniqueId();

    return (
        <Show
            when={isRichText()}
            fallback={
                <Show
                    when={isVideoFill()}
                    fallback={<p use:nodeAnimation={props.node.animationRef} style={applyNodeStyle(style(), props.node.responsiveOverrides, props.context.device())}>{text()}</p>}
                >
                    {/* ...existing video-fill JSX, byte-for-byte unchanged... */}
                </Show>
            }
        >
            <p use:nodeAnimation={props.node.animationRef} style={applyNodeStyle(style(), props.node.responsiveOverrides, props.context.device())} innerHTML={DOMPurify.sanitize(text())} />
        </Show>
    );
}
```
Do NOT modify the video-fill branch's JSX at all — copy it verbatim into the new nested `fallback`. `text()` gains the 4th `resolveBoundValue` argument (`props.context.contextEntryIndex`) — a pure addition, `undefined` for every context that doesn't set it, matching Step 6.

- [ ] **Step 10: Run to verify it passes**

Run: `npx vitest run src/modules/cms/node/primitives/TextNode.test.tsx`
Expected: PASS (all pre-existing + 3 new).

- [ ] **Step 11: Thread `contextEntryIndex` through the other 3 binding call sites (consistency, no new tests required — same fallback value, same behavior for these 3 today)**

In `ImageNode.tsx`, `ButtonNode.tsx`, `VideoNode.tsx`, add `, props.context.contextEntryIndex` as the 4th argument to each existing `resolveBoundValue(...)` call (read each file first to get the exact call site — they're single-line calls per the earlier research, e.g. `ImageNode.tsx` has two: `src` and `alt`).

- [ ] **Step 12: Add the `richText` field descriptor to TEXT's fieldSchema**

In `nodeRegistry.ts`, change TEXT's entry:
```ts
    [ENodeType.TEXT]: {
        renderer: TextNode,
        icon: 'heroicons-solid:bars-3-bottom-left',
        labelKey: 'cms.node.types.text',
        capabilities: { style: true, animation: true, dataBinding: true, repeat: false, layoutChildren: false },
        fieldSchema: [
            { key: 'text', labelKey: 'cms.node.content.textLabel', control: 'textarea' },
            { key: 'richText', labelKey: 'cms.node.content.richTextLabel', control: 'boolean' },
        ],
    },
```
This automatically gets a checkbox in the Inspector's content tab via the existing generic `FieldRenderer.tsx` (`control === 'boolean'` is already implemented there) — no bespoke Inspector component needed.

- [ ] **Step 13: Add i18n keys**

In `cms.i18n.ts`, in the **vi** `content` block, next to `textLabel`:
```ts
                richTextLabel: 'Văn bản định dạng (HTML)',
```
In the **en** `content` block, next to `textLabel`:
```ts
                richTextLabel: 'Rich text (HTML)',
```

- [ ] **Step 14: Add the "Số thứ tự (STT)" fixed option to the bound-field selector**

Read `src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.tsx` in full first to see its exact current props/rendering (it receives `dataBinding`/`availableFields`/`onChange` per the `NodeBuilder.page.tsx` call site). Add one fixed extra `<option>`/select-item ABOVE the real field list, alongside whatever "Tĩnh" (static)/field-list options already exist, that calls `onChange({ mode: 'itemIndex' })` when selected — labeled via a new i18n key:
```ts
// vi content block:
                itemIndexLabel: 'Số thứ tự (STT)',
// en content block:
                itemIndexLabel: 'Item number',
```
Match whatever `<Select>`/dropdown component the file already uses for the mode/field choice — read the file first, this is a small addition to an existing options list, not a new component.

- [ ] **Step 15: Write the failing test, then verify it passes**

Read `NodeDataBindingTab.test.tsx` first to match its existing test style, then add one test asserting: selecting the new "Số thứ tự (STT)" option calls `onChange({mode:'itemIndex'})`. Run `npx vitest run src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.test.tsx` before (FAIL) and after (PASS) implementing.

- [ ] **Step 16: Run the full affected test set + whole-project typecheck**

Run: `npx vitest run src/modules/cms/node/nodeDataBinding.test.ts src/modules/cms/node/resolveRenderableChildren.test.ts src/modules/cms/node/primitives/TextNode.test.tsx src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.test.tsx`
Expected: PASS, no regressions.
Run: `npx astro check` (this repo's real typecheck — confirmed by every prior task this session)
Expected: 0 errors.

- [ ] **Step 17: Commit**

```bash
git add src/modules/cms/node/node.types.ts src/modules/cms/node/nodeDataBinding.ts src/modules/cms/node/nodeDataBinding.test.ts src/modules/cms/node/resolveRenderableChildren.ts src/modules/cms/node/resolveRenderableChildren.test.ts src/modules/cms/node/primitives/TextNode.tsx src/modules/cms/node/primitives/TextNode.test.tsx src/modules/cms/node/primitives/ImageNode.tsx src/modules/cms/node/primitives/ButtonNode.tsx src/modules/cms/node/primitives/VideoNode.tsx src/modules/cms/node/nodeRegistry.ts src/modules/cms/cms.i18n.ts src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.tsx src/modules/cms/admin/nodeBuilder/NodeDataBindingTab.test.tsx
git commit -m "feat(node): Text rich-text rendering mode + itemIndex data-binding — unblocks IntroRail/ProcessSteps primitive migration"
```

---

### Task 2: BE — pure transform functions for the 4 local-repeater types

**Files:**
- Create: `src/modules/node/application/services/transformLocalRepeaterBatchToPrimitives.ts`
- Test: `src/modules/node/application/services/__tests__/transformLocalRepeaterBatchToPrimitives.test.ts` (Jest — this repo uses Jest, NOT Vitest, confirmed by every prior BE task this session; use the `__tests__/` subdirectory convention, no `vitest` imports)

Working directory for this task: `D:\OTHER\node-source-base\ddd-graphql-be`.

**Interfaces:**
- Consumes: the SAME `NewChildSpec`/`SubtreeTransformResult` shape already defined in `src/modules/node/application/services/transformCloseOutBatchToPrimitives.ts` (already merged to master) — import and reuse those exported types/interfaces rather than redefining them, so the runner script (Task 3) can treat all 4+4=8 transform functions uniformly. Read that file first to get the exact current shape (it may have evolved slightly from earlier drafts — trust the real merged file, not this plan's memory of it).
- Produces:
```ts
export function buildIntroRailSubtree(oldProps: Record<string, any>): SubtreeTransformResult;
export function buildTimelineListSubtree(oldProps: Record<string, any>): SubtreeTransformResult;
export function buildProcessStepsSubtree(oldProps: Record<string, any>): SubtreeTransformResult;
export function buildContactColumnsSubtree(oldProps: Record<string, any>): SubtreeTransformResult;
```
All 4 take ONLY `oldProps` (unlike the close-out batch's Logo Grid/FeaturedEntry, none of these 4 types have an existing `repeat`/`slots` config on their row today — they're "fully static," reading everything from `content`, so there's no `oldRepeat`/`oldSlots` to thread through).

- [ ] **Step 1: Write the failing tests**

```ts
// src/modules/node/application/services/__tests__/transformLocalRepeaterBatchToPrimitives.test.ts
import { describe, it, expect } from '@jest/globals';
import { buildIntroRailSubtree, buildTimelineListSubtree, buildProcessStepsSubtree, buildContactColumnsSubtree } from '../transformLocalRepeaterBatchToPrimitives';

describe('buildIntroRailSubtree', () => {
    it('converts the root to a Frame and creates a local-repeat template Frame carrying the features array as repeat.localItems', () => {
        const result = buildIntroRailSubtree({
            content: {
                railTitle: 'Về chúng tôi', railArrowHref: '#about',
                heading: 'Đội ngũ sáng tạo', lead: '<p>Chúng tôi làm <strong>mọi thứ</strong></p>',
                features: [{ image: 'a.jpg', text: 'Tính năng 1' }, { text: 'Tính năng 2' }],
            },
        });
        expect(result.updatedRoot.type).toBe('frame');
        const templateFrame = result.children.find((c) => c.repeat != null)!;
        expect(templateFrame.repeat).toEqual({ source: 'local', cardinality: 'many', localItemFields: expect.any(Array), localItems: [{ image: 'a.jpg', text: 'Tính năng 1' }, { text: 'Tính năng 2' }] });
        expect(templateFrame.children).toEqual([
            expect.objectContaining({ type: 'image', dataBinding: { mode: 'boundField', field: 'image' } }),
            expect.objectContaining({ type: 'text', props: expect.objectContaining({ richText: true }), dataBinding: { mode: 'boundField', field: 'text' } }),
        ]);
    });

    it('renders lead as a richText Text child bound statically (not per-item)', () => {
        const result = buildIntroRailSubtree({ content: { lead: '<p>Lead text</p>' } });
        const leadChild = result.children.find((c) => c.props?.text === '<p>Lead text</p>');
        expect(leadChild).toEqual(expect.objectContaining({ type: 'text', props: { text: '<p>Lead text</p>', richText: true } }));
    });

    it('drops the legacy feature1Icon/feature2Icon/etc fields entirely (never read by the current bespoke component either)', () => {
        const result = buildIntroRailSubtree({ content: { feature1Icon: 'ignored', feature1Text: 'legacy' } });
        expect(JSON.stringify(result)).not.toContain('ignored');
    });
});

describe('buildTimelineListSubtree', () => {
    it('converts the root to a Frame and creates a local-repeat template Frame with a dot marker + year + text children', () => {
        const result = buildTimelineListSubtree({ content: { heading: 'Hành trình', timeline: [{ year: '2020', text: 'Thành lập' }] } });
        expect(result.updatedRoot.type).toBe('frame');
        const templateFrame = result.children.find((c) => c.repeat != null)!;
        expect(templateFrame.repeat?.localItems).toEqual([{ year: '2020', text: 'Thành lập' }]);
        expect(templateFrame.children).toEqual([
            expect.objectContaining({ type: 'frame' }), // the dot marker
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'year' } }),
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'text' } }),
        ]);
    });
});

describe('buildProcessStepsSubtree', () => {
    it('the ordinal badge Text is bound via itemIndex, not a data field', () => {
        const result = buildProcessStepsSubtree({ content: { heading: 'Quy trình', steps: [{ title: 'Bước 1', text: 'Mô tả' }] } });
        const templateFrame = result.children.find((c) => c.repeat != null)!;
        expect(templateFrame.children![0]).toEqual(expect.objectContaining({ type: 'text', dataBinding: { mode: 'itemIndex' } }));
        expect(templateFrame.children![1]).toEqual(expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'title' } }));
        expect(templateFrame.children![2]).toEqual(expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'text' } }));
    });
});

describe('buildContactColumnsSubtree', () => {
    it('creates static header children (heading, hotline, email) plus a local-repeat template Frame for columns', () => {
        const result = buildContactColumnsSubtree({
            content: { heading: 'Liên hệ', hotlineLabel: 'Hotline', hotline: '0123456789', email: 'a@b.com', columns: [{ title: 'Văn phòng', text: 'Địa chỉ' }] },
        });
        expect(result.children.some((c) => c.type === 'text' && c.props?.text === 'Liên hệ')).toBe(true);
        expect(result.children.some((c) => c.type === 'button' && c.props?.href === 'mailto:a@b.com')).toBe(true);
        const templateFrame = result.children.find((c) => c.repeat != null)!;
        expect(templateFrame.repeat?.localItems).toEqual([{ title: 'Văn phòng', text: 'Địa chỉ' }]);
    });

    it('omits the email Button entirely when there is no email (matching the original\'s conditional render)', () => {
        const result = buildContactColumnsSubtree({ content: { heading: 'Liên hệ' } });
        expect(result.children.some((c) => c.type === 'button')).toBe(false);
    });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest transformLocalRepeaterBatchToPrimitives`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the transforms**

```ts
// src/modules/node/application/services/transformLocalRepeaterBatchToPrimitives.ts
// Local-repeater close-out batch (Phase A1 close-out of the "retire specialized node types"
// roadmap) — pure, DB-free transforms converting 4 bespoke, fully-static node types into
// primitive-tree subtrees driven by the local array repeater (repeat.source:'local', already
// shipped). Follows transformCloseOutBatchToPrimitives.ts's exact shape: no I/O, no TypeORM,
// tested with plain object fixtures. The runner script (Task 3) is the only DB-touching piece.
import type { NewChildSpec, SubtreeTransformResult } from './transformCloseOutBatchToPrimitives';

export function buildIntroRailSubtree(oldProps: Record<string, any>): SubtreeTransformResult {
    const content = oldProps?.content ?? {};
    const children: NewChildSpec[] = [
        { type: 'text', props: { text: content.railTitle } },
        { type: 'button', props: { href: content.railArrowHref, label: '→' } },
    ];
    if (content.lead) children.push({ type: 'text', props: { text: content.lead, richText: true } });
    if (content.heading) children.push({ type: 'text', props: { text: content.heading } });

    const templateFrame: NewChildSpec = {
        type: 'frame',
        repeat: {
            source: 'local',
            cardinality: 'many',
            localItemFields: [
                { key: 'image', labelKey: 'cms.node.content.imageLabel', control: 'image' },
                { key: 'text', labelKey: 'cms.node.content.textLabel', control: 'richtext' },
            ],
            localItems: content.features ?? [],
        },
        children: [
            { type: 'image', dataBinding: { mode: 'boundField', field: 'image' } },
            { type: 'text', props: { richText: true }, dataBinding: { mode: 'boundField', field: 'text' } },
        ],
    };
    children.push(templateFrame);

    return { updatedRoot: { type: 'frame', props: {} }, children };
}

export function buildTimelineListSubtree(oldProps: Record<string, any>): SubtreeTransformResult {
    const content = oldProps?.content ?? {};
    const children: NewChildSpec[] = [];
    if (content.heading) children.push({ type: 'text', props: { text: content.heading } });

    const dotMarker: NewChildSpec = { type: 'frame', style: { size: { w: 9, h: 9 }, border: { radius: 999 }, background: { type: 'color', value: '#ed6aa8' } } };
    const templateFrame: NewChildSpec = {
        type: 'frame',
        repeat: {
            source: 'local',
            cardinality: 'many',
            localItemFields: [
                { key: 'year', labelKey: 'cms.node.content.textLabel', control: 'text' },
                { key: 'text', labelKey: 'cms.node.content.textLabel', control: 'textarea' },
            ],
            localItems: content.timeline ?? [],
        },
        children: [
            dotMarker,
            { type: 'text', dataBinding: { mode: 'boundField', field: 'year' } },
            { type: 'text', dataBinding: { mode: 'boundField', field: 'text' } },
        ],
    };
    children.push(templateFrame);

    return { updatedRoot: { type: 'frame', props: {} }, children };
}

export function buildProcessStepsSubtree(oldProps: Record<string, any>): SubtreeTransformResult {
    const content = oldProps?.content ?? {};
    const children: NewChildSpec[] = [];
    if (content.heading) children.push({ type: 'text', props: { text: content.heading } });

    const templateFrame: NewChildSpec = {
        type: 'frame',
        style: { border: { top: { width: 1, color: 'rgba(255,255,255,.14)' } } },
        repeat: {
            source: 'local',
            cardinality: 'many',
            localItemFields: [
                { key: 'title', labelKey: 'cms.node.content.textLabel', control: 'text' },
                { key: 'text', labelKey: 'cms.node.content.textLabel', control: 'textarea' },
            ],
            localItems: content.steps ?? [],
        },
        children: [
            { type: 'text', dataBinding: { mode: 'itemIndex' } },
            { type: 'text', dataBinding: { mode: 'boundField', field: 'title' } },
            { type: 'text', dataBinding: { mode: 'boundField', field: 'text' } },
        ],
    };
    children.push(templateFrame);

    return { updatedRoot: { type: 'frame', props: {} }, children };
}

export function buildContactColumnsSubtree(oldProps: Record<string, any>): SubtreeTransformResult {
    const content = oldProps?.content ?? {};
    const children: NewChildSpec[] = [];
    if (content.heading) children.push({ type: 'text', props: { text: content.heading } });
    if (content.hotlineLabel) children.push({ type: 'text', props: { text: content.hotlineLabel } });
    if (content.hotline) children.push({ type: 'text', props: { text: content.hotline } });
    if (content.email) children.push({ type: 'button', props: { href: `mailto:${content.email}`, label: content.email, asLink: true } });

    const templateFrame: NewChildSpec = {
        type: 'frame',
        repeat: {
            source: 'local',
            cardinality: 'many',
            localItemFields: [
                { key: 'title', labelKey: 'cms.node.content.textLabel', control: 'text' },
                { key: 'text', labelKey: 'cms.node.content.textLabel', control: 'textarea' },
            ],
            localItems: content.columns ?? [],
        },
        children: [
            { type: 'text', style: { border: { bottom: { width: 1, color: 'rgba(255,255,255,.18)' } } }, dataBinding: { mode: 'boundField', field: 'title' } },
            { type: 'text', dataBinding: { mode: 'boundField', field: 'text' } },
        ],
    };
    children.push(templateFrame);

    return { updatedRoot: { type: 'frame', props: {} }, children };
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx jest transformLocalRepeaterBatchToPrimitives`
Expected: PASS (9 tests). If `NewChildSpec`'s real (already-merged) shape doesn't have a `style` field matching what's used above (`border.top`/`border.radius`/`size.w`/`size.h`), check the real interface first and adjust the field names/shapes used in the `style:` object literals above to match — the STRUCTURE (a template Frame with a dot-marker/border child styled inline) is what matters, exact `StyleObject` field names must match the real, already-merged type.

- [ ] **Step 5: Run the whole-project typecheck**

Run: `npx tsc -p tsconfig.json --noEmit` (or this repo's real command, confirmed by prior tasks)
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/node/application/services/transformLocalRepeaterBatchToPrimitives.ts src/modules/node/application/services/__tests__/transformLocalRepeaterBatchToPrimitives.test.ts
git commit -m "feat(node): pure subtree transforms for IntroRail/TimelineList/ProcessSteps/ContactColumns -> local-repeater primitive composition"
```

---

### Task 3: BE — runner script

**Files:**
- Create: `scripts/migrateLocalRepeaterBatchToPrimitives.ts`

Working directory: `D:\OTHER\node-source-base\ddd-graphql-be`.

**Interfaces:**
- Consumes: the 4 transform functions from Task 2; `NodeService.createNode` (existing, no-arg constructor per the close-out batch's confirmed-correct precedent).

- [ ] **Step 1: Read `scripts/migrateCloseOutBatchToPrimitives.ts` in full** (already merged to master — this is the up-to-date, final-review-hardened version: children created before the row is reshaped, per-row try/catch with real `migrated`/`failed` counts, a clear operator warning about partial-failure re-runs). Write the new script following its EXACT shape — same `createChildChain` recursion, same ordering, same error handling, same warning message pattern — just querying `type IN ('intro-rail','timeline-list','process-steps','contact-columns')` (confirm the exact real `ENodeType` string values in `node.constants.ts` first) and dispatching to the 4 new transform functions by type.

- [ ] **Step 2: Write the script**

```ts
// scripts/migrateLocalRepeaterBatchToPrimitives.ts
// One-off migration (local-repeater close-out, Phase A1 close-out of the "retire specialized
// node types" roadmap): converts IntroRail/TimelineList/ProcessSteps/ContactColumns rows into
// primitive-only subtrees using the local array repeater. Run ONCE per environment against a
// COPY of real data first — spot-check the converted pages render correctly before ever running
// this against production. Usage: npx ts-node scripts/migrateLocalRepeaterBatchToPrimitives.ts
import 'reflect-metadata';
import { AppDataSource } from '../src/config/database.config';
import { NodeEntity } from '../src/modules/node/domain/entities/node.entity';
import { NodeService } from '../src/modules/node/application/services/node.service';
import {
    buildIntroRailSubtree,
    buildTimelineListSubtree,
    buildProcessStepsSubtree,
    buildContactColumnsSubtree,
} from '../src/modules/node/application/services/transformLocalRepeaterBatchToPrimitives';
import type { NewChildSpec } from '../src/modules/node/application/services/transformCloseOutBatchToPrimitives';

// IDENTICAL to migrateCloseOutBatchToPrimitives.ts's createChildChain — copy it verbatim
// (read that file to get the exact current implementation; it recurses into child.children for
// nested template structures, which this batch doesn't need as deeply as LogoGrid did, but the
// function is generic and works unchanged for these flatter trees too).
async function createChildChain(nodeService: NodeService, pageId: string, parentId: string, children: NewChildSpec[]): Promise<void> {
    for (const child of children) {
        const created = await nodeService.createNode({
            pageId,
            parentId,
            type: child.type,
            props: child.props ?? {},
            style: child.style,
            repeat: child.repeat ?? undefined,
            dataBinding: child.dataBinding,
            layoutMode: child.layoutMode,
            layout: child.layout,
        } as any);
        if (child.children?.length) {
            await createChildChain(nodeService, pageId, created.id, child.children);
        }
    }
}

async function run() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(NodeEntity);
    const nodeService = new NodeService();

    const rows = await repo
        .createQueryBuilder('node')
        .where('node.type IN (:...types)', { types: ['intro-rail', 'timeline-list', 'process-steps', 'contact-columns'] })
        .getMany();

    let migrated = 0;
    let failed = 0;
    for (const row of rows) {
        try {
            let result;
            if (row.type === 'intro-rail') result = buildIntroRailSubtree((row.props as Record<string, any>) ?? {});
            else if (row.type === 'timeline-list') result = buildTimelineListSubtree((row.props as Record<string, any>) ?? {});
            else if (row.type === 'process-steps') result = buildProcessStepsSubtree((row.props as Record<string, any>) ?? {});
            else result = buildContactColumnsSubtree((row.props as Record<string, any>) ?? {});

            // Children FIRST, root reshape LAST — if createChildChain throws (e.g. hits
            // MAX_NODES_PER_PAGE/MAX_TREE_DEPTH), row.type/props are untouched, so this row is
            // still matched by the recovery query above on a re-run instead of being silently
            // orphaned (the exact bug the close-out batch's final review caught and fixed).
            await createChildChain(nodeService, row.pageId, row.id, result.children);

            row.type = result.updatedRoot.type;
            row.props = result.updatedRoot.props;
            if (result.updatedRoot.style) row.style = result.updatedRoot.style;
            if ('repeat' in result.updatedRoot) (row as any).repeat = (result.updatedRoot as any).repeat;
            await repo.save(row);

            migrated++;
        } catch (err) {
            failed++;
            // eslint-disable-next-line no-console
            console.error(`Failed to migrate node ${row.id} (type=${row.type}):`, err);
        }
    }

    // eslint-disable-next-line no-console
    console.log(
        `Migrated ${migrated} of ${rows.length} local-repeater-batch nodes` +
            (failed > 0
                ? ` (${failed} failed — before re-running, check each failed row's id in the logs above for any children already created under it from the failed attempt and remove them first; re-running as-is can create a DUPLICATE set of children if the failure happened after some, but not all, of a row's children were already created).`
                : '.'),
    );
    await AppDataSource.destroy();
}

if (require.main === module) {
    run().catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
}
```

- [ ] **Step 3: Confirm it compiles**

Run: `npx tsc -p scripts/tsconfig.json --noEmit` (or this repo's real `typecheck:scripts` command)
Expected: 0 errors. Not run against a real database as part of this task — compiling cleanly is the bar; running it for real is a separate, later human-supervised step.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrateLocalRepeaterBatchToPrimitives.ts
git commit -m "feat(node): migration runner for IntroRail/TimelineList/ProcessSteps/ContactColumns -> local-repeater primitive subtrees"
```

---

## Manual verification (after all 3 tasks — required before running the migration script for real)

1. In the running admin, build one instance of each of the 4 types by hand using primitives (Frame with `repeat.source:'local'` + Text/Image children), screenshot-compare against a real existing instance of the old bespoke type — confirm close visual/functional parity (accepted simplifications: no OrbGlow, simplified hover on IntroRail's CTA, ContactColumns' literal newlines collapse).
2. Confirm IntroRail's rich-text `lead`/feature-text fields render real HTML (bold/links) correctly via the new `richText` mode, and that ProcessSteps' ordinal badges read "01/02/03..." matching item order.
3. Run `migrateLocalRepeaterBatchToPrimitives.ts` against a COPY of real data (never production directly on the first run), spot-check several converted pages render correctly, THEN schedule the real run with the user's explicit go-ahead — a database-write operation on potentially-production content, needing confirmation before proceeding per this project's standing instructions.
4. Once 0 pages reference `intro-rail`/`timeline-list`/`process-steps`/`contact-columns` (confirmed by a query, not assumed), retiring the `ENodeType` entries + deleting the 4 component files becomes safe — a follow-up task, not part of this plan.
