# ProjectShowcase carousel behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third Frame `behavior.type:'carousel'` — a self-resolving, timer-driven single-active-entry carousel with configurable pagination — then migrate existing ProjectShowcase rows into a primitive-only composition.

**Architecture:** Unlike `accordion-item`/`spotlight-list` (which style/restructure admin-composed children), `carousel` self-fetches its own `node.repeat` entries (mirroring how `MixedFeedNode.tsx` self-resolves today) and renders the admin's composed `children` ONCE per render, re-bound to whichever entry is currently active — never cloning children as siblings. This requires excluding carousel-behavior Frames from the existing sibling-cloning repeat mechanism in TWO places that share one condition today (`resolveRenderableChildren.ts` and `NodeRenderer.tsx`).

**Tech Stack:** SolidJS (FE, `ddd-graphql-fe`), NestJS + TypeORM (BE, `ddd-graphql-be`), Vitest (FE), Jest (BE), GSAP (already a dependency).

## Global Constraints

- `behavior.type:'carousel'` is additive — every existing Frame without it (plain, `asLink`, `accordion-item`, `spotlight-list`) must render byte-for-byte unchanged.
- The self-resolving exclusion must be applied to BOTH `resolveRenderableChildren.ts` AND `NodeRenderer.tsx` in the SAME task, using the identical condition, to avoid the "two hardcoded copies of one filter drift apart" bug class this project has hit repeatedly (Phase 4's `animationRef`, the close-out-batch's `background.animate` CSS-emitter split).
- The autoplay/transition timing (2300ms default autoplay, 430ms fade-out before swap, 700ms re-enable lock after swap) is PORTED VERBATIM from `ProjectShowcaseNode.tsx` — not redesigned.
- Accepted, disclosed simplifications (from the design doc): no next-entry preview thumbnail, no swipe gestures, no hover/focus-pause, no corner-arrow decorative icon.
- Pagination style is a configurable `behavior.pagination: 'dots' | 'arrows-counter' | 'none'` option (default `'dots'`), not hardcoded.
- BE migration transform is PURE. The runner preserves `props.legacyAnimation`/`props.enabled` and creates children before reshaping the bespoke row. Unlike LogoGrid/MixedFeed, the old ProjectShowcase row is NOT a `SELF_RESOLVING_REPEAT_NODE_TYPES` member with a repeat that needs clearing — the carousel Frame IS the root, carrying the repeat directly, no move-to-nested-child needed.

---

## File Structure

| File | Repo | Responsibility |
|---|---|---|
| `src/modules/cms/node/primitives/FrameNode.tsx` (modify) | fe | `FrameBehaviorConfig` gains `'carousel'` + `autoplayMs`/`pagination`; new carousel rendering branch. |
| `src/modules/cms/node/primitives/FrameNode.test.tsx` (modify) | fe | New tests for the carousel branch. |
| `src/modules/cms/node/resolveRenderableChildren.ts` (modify) | fe | Excludes carousel-behavior Frames from sibling-cloning. |
| `src/modules/cms/node/resolveRenderableChildren.test.ts` (modify) | fe | New test. |
| `src/modules/cms/node/NodeRenderer.tsx` (modify) | fe | Excludes carousel-behavior Frames from repeat-entry pre-fetching (same condition as above). |
| `src/modules/cms/node/NodeRenderer.test.tsx` (modify, or create if absent) | fe | New test. |
| `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx` (modify) | fe | Behavior `<Select>` gains "Carousel" option + `autoplayMs`/`pagination` fields. |
| `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx` (modify) | fe | New tests. |
| `src/modules/cms/cms.i18n.ts` (modify) | fe | New vi+en keys. |
| `src/modules/node/application/services/transformProjectShowcaseToPrimitives.ts` (new) | be | Pure transform: `buildProjectShowcaseSubtree`. |
| `src/modules/node/application/services/__tests__/transformProjectShowcaseToPrimitives.test.ts` (new) | be | Unit tests. |
| `scripts/migrateProjectShowcaseToPrimitives.ts` (new) | be | Runner. |

---

### Task 1: FE — self-resolving plumbing (exclude carousel Frames from sibling-cloning)

**Files:**
- Modify: `src/modules/cms/node/resolveRenderableChildren.ts`
- Modify: `src/modules/cms/node/resolveRenderableChildren.test.ts`
- Modify: `src/modules/cms/node/NodeRenderer.tsx`
- Modify: `src/modules/cms/node/NodeRenderer.test.tsx` (create if it doesn't exist — check first)

**Interfaces:**
- Produces: a Frame node with `props.behavior?.type === 'carousel'` is excluded from BOTH the sibling-cloning repeat-expansion in `resolveRenderableChildren.ts` AND the repeat-entry pre-fetch in `NodeRenderer.tsx`.

- [ ] **Step 1: Read `resolveRenderableChildren.ts` and `NodeRenderer.tsx` in full first.** Confirm the exact current condition in each file — `resolveRenderableChildren.ts` line ~34: `if (node.repeat && !SELF_RESOLVING_REPEAT_NODE_TYPES.has(node.type ?? ''))`; `NodeRenderer.tsx` line ~169: `const repeatNodes = () => props.children.filter((c) => c.repeat && !SELF_RESOLVING_REPEAT_NODE_TYPES.has(c.type ?? ''));`. These MUST have already-matching structure per this plan's research — if the real current code differs even slightly, adapt to match the real file, not this plan's memory of it.

- [ ] **Step 2: Write the failing test for `resolveRenderableChildren.ts`**

Read `resolveRenderableChildren.test.ts` in full first to match its existing fixture/assertion style, then add:
```ts
it('does NOT sibling-clone a carousel-behavior Frame\'s repeat (self-resolving, like Table/CardList/MixedFeed)', () => {
    const node = { id: 'n1', type: 'frame', props: { behavior: { type: 'carousel' } }, repeat: { source: 'own', contentTypeKey: 'ct-1' } } as any;
    const entries = new Map([['n1', [{ id: 'e1', data: { title: 'x' } }, { id: 'e2', data: { title: 'y' } }]]]);
    const result = resolveRenderableChildren([node], {}, entries);
    expect(result).toHaveLength(1);
    expect(result[0].context.contextEntry).toBeUndefined();
});

it('still sibling-clones a PLAIN Frame\'s repeat (regression guard — carousel exclusion must not leak to other Frames)', () => {
    const node = { id: 'n2', type: 'frame', repeat: { source: 'local', localItems: [{ a: 1 }, { a: 2 }] } } as any;
    const entries = new Map([['n2', [{ id: 'local-0', data: { a: 1 } }, { id: 'local-1', data: { a: 2 } }]]]);
    const result = resolveRenderableChildren([node], {}, entries);
    expect(result).toHaveLength(2);
});
```

- [ ] **Step 3: Run to verify the first test fails, then implement**

Run: `npx vitest run src/modules/cms/node/resolveRenderableChildren.test.ts` — expect the FIRST new test to FAIL (currently sibling-clones everything with a `repeat`).

In `resolveRenderableChildren.ts`, change line ~34's condition:
```ts
if (node.repeat && !SELF_RESOLVING_REPEAT_NODE_TYPES.has(node.type ?? '') && (node.props as any)?.behavior?.type !== 'carousel') {
```
(Keep every other line inside that `if` block completely unchanged — this is a condition-only edit.)

Run again: expect PASS (both tests).

- [ ] **Step 4: Write the failing test for `NodeRenderer.tsx`**

Check whether `NodeRenderer.test.tsx` already exists (search for it) — if not, this is a new file; if it exists, read it in full first to match its conventions. The `repeatNodes` computed is internal to the component, so test it indirectly through the component's rendering behavior, OR — if `repeatNodes`/the fetch-triggering logic is more directly testable via a smaller extracted helper, prefer that. Read the real current `NodeRenderer.tsx` structure around line 169 first to decide the most direct testable seam; if no clean seam exists without a larger refactor, a reasonable fallback is: mock `fetchRepeatEntries` and assert it is NOT called for a carousel-behavior Frame's own repeat, but IS called for a plain Frame's repeat, rendering `NodeRenderer` with both node shapes as children and checking the mock's call arguments.

```ts
it('does not pre-fetch repeat entries for a carousel-behavior Frame (it self-resolves via its own createResource)', () => {
    // Implementer: adapt to NodeRenderer.tsx's real testable shape — the intent is: render a tree
    // containing a Frame node with props.behavior.type:'carousel' and a repeat, spy/mock
    // fetchRepeatEntries from nodeDataBinding.ts, assert it is never called with that node's own
    // repeat object (it may still be called for OTHER, non-carousel repeat nodes in the same tree).
});
```

- [ ] **Step 5: Run to verify it fails, then implement**

In `NodeRenderer.tsx`, change the `repeatNodes` filter (line ~169):
```ts
const repeatNodes = () => props.children.filter((c) => c.repeat && !SELF_RESOLVING_REPEAT_NODE_TYPES.has(c.type ?? '') && (c.props as any)?.behavior?.type !== 'carousel');
```
(Identical added clause to Step 3 — this is the SAME condition applied in the SECOND location, per the Global Constraints note.)

Run again: expect PASS.

- [ ] **Step 6: Run the full affected test set + typecheck**

Run: `npx vitest run src/modules/cms/node/resolveRenderableChildren.test.ts src/modules/cms/node/NodeRenderer.test.tsx`
Run: `npx astro check` — 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/cms/node/resolveRenderableChildren.ts src/modules/cms/node/resolveRenderableChildren.test.ts src/modules/cms/node/NodeRenderer.tsx src/modules/cms/node/NodeRenderer.test.tsx
git commit -m "feat(node): exclude carousel-behavior Frames from sibling-cloning + pre-fetch (both locations) -- foundation for the carousel Frame behavior"
```

---

### Task 2: FE — Frame carousel rendering branch + built-in pagination

**Files:**
- Modify: `src/modules/cms/node/primitives/FrameNode.tsx`
- Modify: `src/modules/cms/node/primitives/FrameNode.test.tsx`

**Interfaces:**
- Consumes: Task 1's exclusion (assumed already correct — this task's own tests render `FrameNode` directly, not through the full tree, so Task 1's plumbing isn't directly exercised here).
- Produces: `FrameBehaviorConfig.type: 'accordion-item' | 'spotlight-list' | 'carousel'`, with `autoplayMs?: number` and `pagination?: 'dots' | 'arrows-counter' | 'none'` (carousel-only fields).

- [ ] **Step 1: Read `FrameNode.tsx` and `ProjectShowcaseNode.tsx` in full first.** `ProjectShowcaseNode.tsx`'s `showProject`/`resetTimer`/`active`/`switching` state machine (lines ~56-92) is the mechanism to port — same timing constants (430ms, 700ms, 2300ms default), same clamped-modulo index wrapping, same `onCleanup` interval clearing. `FrameNode.tsx`'s existing `isAccordion()` early-return branch (added in an earlier sub-project) is the closest structural precedent for a NEW top-level branch that manages its own signals/effects — follow that same shape (an `if (isCarousel()) { ...; return (...); }` block, positioned alongside the existing `isAccordion()` block, checked in whichever order makes sense given `behavior.type` is a single string so they're mutually exclusive by construction).

- [ ] **Step 2: Write the failing tests**

Read `FrameNode.test.tsx` in full first to match its fixture/render/mocking conventions (it likely already mocks or stubs `fetchRepeatEntries`/`createResource`-driven data for OTHER tests — check for a precedent before inventing a new mocking approach). Then add:
```tsx
describe('FrameNode — carousel behavior (ProjectShowcase close-out, 2026-08-23)', () => {
    it('renders the active entry\'s bound children (index 0 initially)', async () => {
        // mock fetchRepeatEntries to resolve [{id:'e1',data:{title:'Dự án A'}}, {id:'e2',data:{title:'Dự án B'}}]
        const node = {
            id: 'n1', type: 'frame',
            props: { behavior: { type: 'carousel' } },
            repeat: { source: 'own', contentTypeKey: 'ct-1' },
            children: [{ id: 't1', type: 'text', dataBinding: { mode: 'boundField', field: 'title' } }],
        } as any;
        const { findByText } = render(() => <FrameNode node={node} context={baseContext} />);
        expect(await findByText('Dự án A')).toBeTruthy();
    });

    it('renders dot pagination by default, one dot per entry', async () => {
        // same 2-entry mock; assert 2 button elements with role/aria matching the dot pattern exist
    });

    it('renders arrows-counter pagination when behavior.pagination is "arrows-counter"', async () => {
        // behavior: {type:'carousel', pagination:'arrows-counter'}; assert a "1 / 2" counter text and 2 nav buttons exist
    });

    it('renders no built-in pagination when behavior.pagination is "none"', async () => {
        // behavior: {type:'carousel', pagination:'none'}; assert no dot/arrow buttons exist
    });

    it('renders no pagination at all when there is only 1 entry (regression guard, matches the original\'s items().length > 1 gate)', async () => {
        // mock resolving exactly 1 entry; assert no pagination controls render regardless of behavior.pagination
    });

    it('the accordion-item and spotlight-list branches are completely unaffected by this addition (regression guard)', () => {
        // reuse this file's existing accordion/spotlight fixtures and assertions unchanged
    });
});
```
(Adjust exact mocking mechanics to whatever this test file's established `createResource`/async-data-mocking pattern already is — read the file fully before writing these, this is a description of INTENT, adapt the literal syntax.)

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run src/modules/cms/node/primitives/FrameNode.test.tsx` — expect FAIL (no carousel branch exists).

- [ ] **Step 4: Implement**

Widen `FrameBehaviorConfig`:
```ts
interface FrameBehaviorConfig {
    type: 'accordion-item' | 'spotlight-list' | 'carousel';
    defaultOpen?: boolean; // accordion-item only
    autoplayMs?: number;   // carousel only, default 2300
    pagination?: 'dots' | 'arrows-counter' | 'none'; // carousel only, default 'dots'
}
```

Add imports at the top of `FrameNode.tsx` (check they aren't already imported under different names): `createResource`, `onCleanup`, `For` from `'solid-js'`; `fetchRepeatEntries` from `'../nodeDataBinding'`; `gsap` is likely already imported (used by the accordion branch) — confirm.

Add the carousel branch (positioned alongside the existing `if (isAccordion())` block):
```tsx
const isCarousel = () => behavior()?.type === 'carousel';

if (isCarousel()) {
    const [entriesResource] = createResource(
        () => ({ repeat: props.node.repeat, locale: props.context.locale, pathParams: props.context.pathParams, queryParams: props.context.queryParams }),
        (args) => (args.repeat ? fetchRepeatEntries(args.repeat, { locale: args.locale, pathParams: args.pathParams, queryParams: args.queryParams }) : Promise.resolve([])),
    );
    const [active, setActive] = createSignal(0);
    let animating = false;
    let timer: number | undefined;
    let contentRef: HTMLDivElement | undefined;

    const list = () => entriesResource() ?? [];

    const showProject = (targetIndex: number) => {
        const items = list();
        if (!items.length || animating || targetIndex === active()) return;
        animating = true;
        const commit = () => {
            setActive(((targetIndex % items.length) + items.length) % items.length);
            if (contentRef) gsap.to(contentRef, { opacity: 1, duration: 0.3 });
            window.setTimeout(() => { animating = false; }, 700);
        };
        if (contentRef) {
            gsap.to(contentRef, { opacity: 0, duration: 0.43, onComplete: commit });
        } else {
            commit();
        }
    };

    const resetTimer = () => {
        if (typeof window === 'undefined') return;
        window.clearInterval(timer);
        const items = list();
        if (items.length < 2) return;
        timer = window.setInterval(() => showProject(active() + 1), behavior()?.autoplayMs ?? 2300);
    };
    onMount(resetTimer);
    createEffect(() => {
        if (entriesResource()) resetTimer();
    });
    onCleanup(() => { if (typeof window !== 'undefined') window.clearInterval(timer); });

    const activeContext = () => {
        const entry = list()[active()];
        return {
            ...props.context,
            contextEntry: entry?.data,
            contextEntryId: entry?.id,
            contextEntryContentTypeId: entry?.contentTypeId,
            contextHref: entry?.__detailHref,
        };
    };

    const paginationStyle = () => behavior()?.pagination ?? 'dots';

    return (
        <div use:nodeAnimation={props.node.animationRef} style={style()}>
            <div ref={contentRef}>
                <NodeChildrenList children={props.node.children} context={activeContext()} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
            </div>
            <Show when={list().length > 1 && paginationStyle() === 'dots'}>
                <div style={{ display: 'flex', gap: '8px', 'justify-content': 'center', 'margin-top': '16px' }}>
                    <For each={list()}>
                        {(_entry, i) => (
                            <button
                                type="button"
                                aria-label={`Đi tới mục ${i() + 1}`}
                                aria-current={i() === active()}
                                onClick={() => { showProject(i()); resetTimer(); }}
                                style={{ width: '8px', height: '8px', 'border-radius': '9999px', border: 'none', padding: '0', cursor: 'pointer', background: i() === active() ? '#f2f2f2' : 'rgba(242,242,242,.3)' }}
                            />
                        )}
                    </For>
                </div>
            </Show>
            <Show when={list().length > 1 && paginationStyle() === 'arrows-counter'}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '16px', 'justify-content': 'center', 'margin-top': '16px' }}>
                    <button type="button" aria-label="Mục trước" onClick={() => { showProject(active() - 1); resetTimer(); }}>‹</button>
                    <span><strong>{active() + 1}</strong> / {list().length}</span>
                    <button type="button" aria-label="Mục tiếp theo" onClick={() => { showProject(active() + 1); resetTimer(); }}>›</button>
                </div>
            </Show>
        </div>
    );
}
```
(`onMount`/`createSignal`/`createEffect` are already imported in this file per the accordion branch — confirm before adding duplicate imports.)

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run src/modules/cms/node/primitives/FrameNode.test.tsx` — expect PASS (all pre-existing + 6 new).

- [ ] **Step 6: Run typecheck**

Run: `npx astro check` — 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/cms/node/primitives/FrameNode.tsx src/modules/cms/node/primitives/FrameNode.test.tsx
git commit -m "feat(node): Frame carousel behavior (ports ProjectShowcaseNode's timer/fade state machine) + configurable dots/arrows-counter/none pagination"
```

---

### Task 3: FE — Inspector UI

**Files:**
- Modify: `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx`
- Modify: `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx`
- Modify: `src/modules/cms/cms.i18n.ts`

- [ ] **Step 1: Read `NodeContainerLayoutTab.tsx` in full first.** It already has a "Hành vi" (Behavior) `<Select>` with "Không"/"Mục accordion"/"Danh sách con trỏ nổi bật" options (from earlier sub-projects) and a `defaultOpen` Checkbox shown only for `accordion-item`. Add a 4th option, "Carousel", and — shown only when `behavior?.type === 'carousel'` — an `autoplayMs` number input (default 2300) and a `pagination` `<Select>` (3 options: Chấm tròn / Mũi tên + số đếm / Không có).

- [ ] **Step 2: Write the failing tests, then implement, then verify**

Read `NodeContainerLayoutTab.test.tsx` in full first to match its existing test style for the accordion/spotlight-list options, then add analogous tests: selecting "Carousel" produces `behavior:{type:'carousel'}`; the `autoplayMs`/`pagination` fields render only when `behavior.type==='carousel'`; changing `autoplayMs` calls `onBehaviorChange` with the updated number; changing `pagination` calls `onBehaviorChange` with the updated string; the `defaultOpen` checkbox (accordion-only) stays hidden for carousel.

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx` — FAIL then PASS after implementing.

- [ ] **Step 3: Add i18n keys**

vi `containerLayout` block (near existing `behaviorAccordionItem`/`behaviorSpotlightList`): `behaviorCarousel: 'Carousel', autoplayMsLabel: 'Thời gian tự chuyển (ms)', paginationLabel: 'Kiểu phân trang', paginationDots: 'Chấm tròn', paginationArrowsCounter: 'Mũi tên + số đếm', paginationNone: 'Không có',`
en: `behaviorCarousel: 'Carousel', autoplayMsLabel: 'Autoplay interval (ms)', paginationLabel: 'Pagination style', paginationDots: 'Dots', paginationArrowsCounter: 'Arrows + counter', paginationNone: 'None',`

- [ ] **Step 4: Run the full affected test set + typecheck**

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx`
Run: `npx astro check` — 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx src/modules/cms/cms.i18n.ts
git commit -m "feat(node): Inspector UI for carousel behavior (autoplayMs + configurable pagination style)"
```

---

### Task 4: BE — pure transform function

**Files:**
- Create: `src/modules/node/application/services/transformProjectShowcaseToPrimitives.ts`
- Test: `src/modules/node/application/services/__tests__/transformProjectShowcaseToPrimitives.test.ts`

Working directory: `D:\OTHER\node-source-base\ddd-graphql-be`.

**Interfaces:**
- Consumes: `NewChildSpec`/`SubtreeTransformResult` from `transformCloseOutBatchToPrimitives.ts` (already has `responsiveOverrides` and `repeat` on `updatedRoot`, added during the MixedFeed sub-project).
- Produces: `export function buildProjectShowcaseSubtree(oldProps: Record<string, any>, oldRepeat?: Record<string, any> | null): SubtreeTransformResult;`

- [ ] **Step 1: Read `ProjectShowcaseNode.tsx` (FE repo, read-only) and `transformAccordionListToPrimitives.ts`/`transformMixedFeedToPrimitives.ts` (this repo, for the `legacyAnimation`/`enabled` preservation pattern and the `repeat`-pass-through pattern respectively) in full first.**

- [ ] **Step 2: Write the failing tests**

```ts
// src/modules/node/application/services/__tests__/transformProjectShowcaseToPrimitives.test.ts
import { describe, it, expect } from '@jest/globals';
import { buildProjectShowcaseSubtree } from '../transformProjectShowcaseToPrimitives';

describe('buildProjectShowcaseSubtree', () => {
    it('converts the root to a carousel-behavior Frame with a static heading + subtitle + CTA, carrying the OLD repeat unchanged', () => {
        const oldRepeat = { source: 'own', contentTypeKey: 'ct-1' };
        const result = buildProjectShowcaseSubtree(
            { content: { heading: 'CREATIVE DESIGN', subtitle: 'Chúng tôi làm mọi thứ', introArrowHref: '#projects' } },
            oldRepeat,
        );
        expect(result.updatedRoot.type).toBe('frame');
        expect(result.updatedRoot.props?.behavior).toEqual({ type: 'carousel', autoplayMs: 2300, pagination: 'dots' });
        expect(result.updatedRoot.repeat).toEqual(oldRepeat);
        expect(result.children.some((c) => c.type === 'text' && c.props?.text === 'CREATIVE DESIGN')).toBe(true);
        expect(result.children.some((c) => c.type === 'button' && c.props?.href === '#projects')).toBe(true);
    });

    it('honors a custom autoplayMs from the old content', () => {
        const result = buildProjectShowcaseSubtree({ content: { autoplayMs: 5000 } }, { source: 'own', contentTypeKey: 'ct-1' });
        expect(result.updatedRoot.props?.behavior).toEqual(expect.objectContaining({ autoplayMs: 5000 }));
    });

    it('defaults heading to "CREATIVE DESIGN" when unset, matching the original component\'s own default', () => {
        const result = buildProjectShowcaseSubtree({ content: {} }, { source: 'own', contentTypeKey: 'ct-1' });
        expect(result.children.some((c) => c.type === 'text' && c.props?.text === 'CREATIVE DESIGN')).toBe(true);
    });

    it('the carousel children are bound to the real slot field names via boundField (image/heading/description/year/client/category)', () => {
        const result = buildProjectShowcaseSubtree(
            { content: {}, slots: { imageField: 'coverImg', headingField: 'title', descriptionField: 'desc', yearField: 'year', clientField: 'client', categoryField: 'cat' } },
            { source: 'own', contentTypeKey: 'ct-1' },
        );
        expect(result.children).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'image', dataBinding: { mode: 'boundField', field: 'coverImg' } }),
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'title' } }),
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'desc' } }),
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'year' } }),
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'client' } }),
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'cat' } }),
        ]));
    });

    it('omits a slot\'s Text/Image child entirely when that slot is not configured', () => {
        const result = buildProjectShowcaseSubtree({ content: {} }, { source: 'own', contentTypeKey: 'ct-1' });
        // no slots configured at all -- only the always-present carousel template shell, no bound children for missing slots
        expect(result.children.some((c) => c.dataBinding?.mode === 'boundField')).toBe(false);
    });

    it('carries legacyAnimation and enabled through to updatedRoot.props alongside the behavior config', () => {
        const result = buildProjectShowcaseSubtree({ content: {}, legacyAnimation: [{ type: 'fade-in' }], enabled: false }, { source: 'own', contentTypeKey: 'ct-1' });
        expect(result.updatedRoot.props).toEqual({
            behavior: { type: 'carousel', autoplayMs: 2300, pagination: 'dots' },
            legacyAnimation: [{ type: 'fade-in' }],
            enabled: false,
        });
    });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx jest transformProjectShowcaseToPrimitives` — expect FAIL.

- [ ] **Step 4: Implement**

```ts
// src/modules/node/application/services/transformProjectShowcaseToPrimitives.ts
// ProjectShowcase close-out (final item of the "retire specialized node types" roadmap) — pure,
// DB-free transform converting the bespoke ProjectShowcase type into a primitive-tree subtree
// using the new Frame carousel behavior. Unlike LogoGrid/MixedFeed, this old row is NOT a
// SELF_RESOLVING_REPEAT_NODE_TYPES member needing its repeat cleared and moved to a nested
// child -- the carousel Frame IS the root itself, carrying the repeat directly (only one entry
// is ever rendered at a time, so there's no sibling-cloning to move the repeat away from).
import type { NewChildSpec, SubtreeTransformResult } from './transformCloseOutBatchToPrimitives';

export function buildProjectShowcaseSubtree(oldProps: Record<string, any>, oldRepeat?: Record<string, any> | null): SubtreeTransformResult {
    const content = oldProps?.content ?? {};
    const slots = oldProps?.slots ?? {};
    const children: NewChildSpec[] = [];

    children.push({ type: 'text', props: { text: content.heading || 'CREATIVE DESIGN' } });
    if (content.subtitle) children.push({ type: 'text', props: { text: content.subtitle } });
    children.push({ type: 'button', props: { href: content.introArrowHref || '#projects', label: 'Xem dự án' } });

    // The carousel template: one child per configured slot, bound via dataBinding.mode:
    // 'boundField' against whichever entry is currently active (resolved at render time by
    // FrameNode's carousel branch, not here -- this function has no notion of "active").
    if (slots.imageField) children.push({ type: 'image', dataBinding: { mode: 'boundField', field: slots.imageField } });
    if (slots.headingField) children.push({ type: 'text', dataBinding: { mode: 'boundField', field: slots.headingField } });
    if (slots.descriptionField) children.push({ type: 'text', dataBinding: { mode: 'boundField', field: slots.descriptionField } });
    if (slots.yearField) children.push({ type: 'text', dataBinding: { mode: 'boundField', field: slots.yearField } });
    if (slots.clientField) children.push({ type: 'text', dataBinding: { mode: 'boundField', field: slots.clientField } });
    if (slots.categoryField) children.push({ type: 'text', dataBinding: { mode: 'boundField', field: slots.categoryField } });

    const preservedProps: Record<string, any> = {
        behavior: { type: 'carousel', autoplayMs: content.autoplayMs ?? 2300, pagination: 'dots' },
    };
    if (oldProps.legacyAnimation !== undefined) preservedProps.legacyAnimation = oldProps.legacyAnimation;
    if (oldProps.enabled !== undefined) preservedProps.enabled = oldProps.enabled;

    return {
        updatedRoot: {
            type: 'frame',
            props: preservedProps,
            repeat: oldRepeat ?? undefined,
            style: {
                background: { type: 'color', value: '#020202' },
                spacing: { padding: { t: 80, b: 96 } },
                typography: { color: { type: 'solid', value: '#f2f2f2' }, align: 'center' },
            },
        },
        children,
    };
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `npx jest transformProjectShowcaseToPrimitives` — expect PASS (6 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit` — 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/node/application/services/transformProjectShowcaseToPrimitives.ts src/modules/node/application/services/__tests__/transformProjectShowcaseToPrimitives.test.ts
git commit -m "feat(node): pure subtree transform for ProjectShowcase -> carousel-behavior primitive composition"
```

---

### Task 5: BE — runner script

**Files:**
- Create: `scripts/migrateProjectShowcaseToPrimitives.ts`

Working directory: `D:\OTHER\node-source-base\ddd-graphql-be`.

- [ ] **Step 1: Read `scripts/migrateMixedFeedToPrimitives.ts` in full** (the closest precedent — it also passes the old row's `repeat` as a second argument to its transform function). Write the new script following its shape, BUT note this transform's `updatedRoot` does NOT set `repeat: null` (unlike MixedFeed's) — it passes the old repeat through unchanged on the SAME root row, so the runner's `'repeat' in result.updatedRoot` handling still applies correctly (the key is present, holding the unchanged repeat value, not `null`) but there's no "move to a nested child" step — `createChildChain` only creates the header/CTA/bound-slot children, not a separate template Frame. Query `type = 'project-showcase'` (confirm the exact real `ENodeType` string value in `node.constants.ts` — sibling FE repo).

- [ ] **Step 2: Write the script** (mirror `migrateMixedFeedToPrimitives.ts`'s structure — `createChildChain`, children-before-reshape ordering, per-row try/catch with real counts, the `'repeat' in` check, the partial-failure re-run warning).

- [ ] **Step 3: Confirm it compiles**

Run: `npx tsc -p scripts/tsconfig.json --noEmit` — 0 errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrateProjectShowcaseToPrimitives.ts
git commit -m "feat(node): migration runner for ProjectShowcase -> carousel-behavior primitive subtree"
```

---

## Manual verification (after all 5 tasks — required before running the migration script for real)

1. In the running admin, build one instance by hand using primitives (a carousel-behavior Frame with a real content-type repeat + bound Image/Text children), confirm the timer-driven auto-advance, fade transition, and BOTH pagination styles genuinely work in a real browser (jsdom cannot verify GSAP/timer-driven visual behavior).
2. Screenshot-compare against a real existing ProjectShowcase instance (accepted simplifications: no next-preview thumbnail, dots pagination as the new default instead of arrows+counter, no corner-arrow icon).
3. Run `migrateProjectShowcaseToPrimitives.ts` against a COPY of real data, spot-check, THEN schedule the real run with the user's explicit go-ahead.
4. Once 0 pages reference `project-showcase`, retiring the `ENodeType` entry + deleting the component file becomes safe.
5. **This is the LAST item in the entire "retire specialized node types" roadmap** — once merged, all 13 in-scope types have primitive-composed replacements built (though none have had their migration scripts run against real data yet, per every prior sub-project's own deferred Manual Verification step).
