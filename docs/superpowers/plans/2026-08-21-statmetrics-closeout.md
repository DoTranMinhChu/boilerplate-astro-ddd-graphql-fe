# StatMetrics close-out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a count-up-on-scroll-into-view rendering mode to the generic `Text` primitive (porting the proven `CountUpValue` mechanism from the bespoke `StatMetricsNode.tsx` verbatim), then migrate existing StatMetrics rows into a primitive-only composition using the local array repeater.

**Architecture:** FE Task 1 is a self-contained Text-primitive capability addition, following the exact pattern `richText`/`itemIndex` already established (new optional `props.node.props?.countUp` field, a new rendering branch in `TextNode.tsx`, a `fieldSchema` boolean descriptor for the Inspector checkbox). BE Tasks 2-3 follow the exact precedent of `transformLocalRepeaterBatchToPrimitives.ts`/`migrateLocalRepeaterBatchToPrimitives.ts` (already merged): a pure, DB-free transform function + a thin runner script.

**Tech Stack:** SolidJS (FE, `ddd-graphql-fe`), NestJS + TypeORM (BE, `ddd-graphql-be`), Vitest (FE), Jest (BE).

## Global Constraints

- `countUp` is additive: every existing Text node without `props.countUp` must render byte-for-byte unchanged.
- When `countUp:true` but the resolved value doesn't parse as a finite number, fall back to plain rendering — never crash, never show `NaN`.
- The ported `CountUpValue` mechanism (IntersectionObserver threshold 0.4, rAF loop, 1400ms cubic ease-out, `Math.round` integer display) must match `StatMetricsNode.tsx`'s proven original EXACTLY — this is a verbatim port, not a redesign.
- Accepted, disclosed simplification (from the design doc): the animated value and its `suffix` (e.g. `"+"`, `"%"`) render as two stacked lines (two sibling Text nodes) instead of one inline string ("500+") — every `TextNode` render branch is block-level, so two siblings cannot concatenate inline without new binding machinery, which is out of scope (see design doc's Rejected/Deferred).
- BE migration transform functions are PURE (no I/O, no TypeORM) — testable with plain object fixtures.
- The runner script creates ALL new children BEFORE reshaping the bespoke row's own `type`/`props`, per-row try/catch with real `migrated`/`failed` counts, and preserves `props.legacyAnimation`/`props.enabled` from the old row (the systemic fix already applied to every other transform in this family — do NOT reintroduce the wholesale-`props`-overwrite bug this project already found and fixed once).

---

## File Structure

| File | Repo | Responsibility |
|---|---|---|
| `src/modules/cms/node/primitives/TextNode.tsx` (modify) | fe | New count-up rendering branch + ported `CountUpValue` helper. |
| `src/modules/cms/node/primitives/TextNode.test.tsx` (modify) | fe | New tests for the count-up branch. |
| `src/modules/cms/node/nodeRegistry.ts` (modify) | fe | TEXT's `fieldSchema` gains a `countUp` boolean field descriptor. |
| `src/modules/cms/cms.i18n.ts` (modify) | fe | New vi+en key pair for the `countUp` field label. |
| `src/modules/node/application/services/transformStatMetricsToPrimitives.ts` (new) | be | Pure transform: `buildStatMetricsSubtree`. |
| `src/modules/node/application/services/__tests__/transformStatMetricsToPrimitives.test.ts` (new) | be | Unit tests, plain fixtures, no DB. |
| `scripts/migrateStatMetricsToPrimitives.ts` (new) | be | Runner: queries `type = 'stat-metrics'`, calls the transform, writes via `NodeService`. |

---

### Task 1: FE — count-up Text rendering mode

**Files:**
- Modify: `src/modules/cms/node/primitives/TextNode.tsx`
- Modify: `src/modules/cms/node/primitives/TextNode.test.tsx`
- Modify: `src/modules/cms/node/nodeRegistry.ts`
- Modify: `src/modules/cms/cms.i18n.ts`

**Interfaces:**
- Produces: `props.node.props?.countUp === true` triggers count-up rendering when the resolved text value parses as a finite number.

- [ ] **Step 1: Read `TextNode.tsx` in full first** to see its exact current structure — it already has 3 rendering modes nested as `<Show when={isRichText()} fallback={<Show when={isVideoFill()} fallback={<p>...</p>}>...</Show>}>...</Show>` (richText is the outermost check, added most recently; videoFill/plain is the original inner pair). Add count-up as a NEW outermost `<Show>`, following the same incremental-nesting pattern each prior mode addition used — i.e. the new structure becomes `<Show when={isCountUp()} fallback={<the existing richText/videoFill/plain Show chain, byte-for-byte unchanged>}>...</Show>`.

- [ ] **Step 2: Write the failing tests**

Read `TextNode.test.tsx` in full first to match its existing fixture/render style exactly, then add:
```tsx
describe('TextNode — count-up (StatMetrics close-out, 2026-08-21)', () => {
    it('renders the count-up mechanism when countUp is true and the resolved value is numeric', () => {
        const node = { id: 'n1', type: 'text', props: { text: '500', countUp: true }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        // Initial render is 0 (animation hasn't fired yet — IntersectionObserver hasn't intersected in jsdom)
        expect(container.querySelector('span')?.textContent).toBe('0');
    });

    it('falls back to plain rendering when countUp is true but the value is not numeric', () => {
        const node = { id: 'n1', type: 'text', props: { text: 'not a number', countUp: true }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        expect(container.textContent).toBe('not a number');
    });

    it('plain-text mode is unaffected when countUp is unset (regression guard)', () => {
        const node = { id: 'n1', type: 'text', props: { text: '500' }, children: [] } as any;
        const { container } = render(() => <TextNode node={node} context={baseContext} />);
        expect(container.querySelector('p')?.textContent).toBe('500');
    });
});
```
(Adjust exact assertions to match how `IntersectionObserver` behaves under jsdom in this repo's test setup — jsdom does not implement `IntersectionObserver` natively; check whether this repo's `vitest.setup.ts`/similar already provides a mock/stub for it (search for `IntersectionObserver` in test setup files) since other animation-adjacent tests in this codebase may have already solved this. If no stub exists, the component's own `onMount` will throw on `new IntersectionObserver(...)` under jsdom — read how `StatMetricsNode.tsx` was tested, if it has its own test file, for the established pattern; if it does NOT have a test file, this is the first test to hit this, and you may need to add a minimal `IntersectionObserver` stub via `vi.stubGlobal` in the test file itself.)

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run src/modules/cms/node/primitives/TextNode.test.tsx`
Expected: FAIL — no count-up branch exists yet.

- [ ] **Step 4: Implement**

Port `CountUpValue` from `StatMetricsNode.tsx` (read that file in full for the exact, proven implementation — `IntersectionObserver` threshold 0.4, `onMount`/`onCleanup`, rAF loop with `Math.min(1, (now-start)/duration)` progress and `Math.round(target * (1 - Math.pow(1-progress, 3)))` cubic ease-out, default `durationMs: 1400`) as a local helper function inside `TextNode.tsx` (or a tiny sibling file, implementer's call), taking `target: number` as its prop. Wire it into the new outermost `<Show when={isCountUp()}>` branch:
```ts
const isCountUp = () => props.node.props?.countUp === true;
const countUpTarget = () => { const n = Number(text()); return Number.isFinite(n) ? n : null; };
```
When `isCountUp() && countUpTarget() !== null`: render `<p use:nodeAnimation={...} style={applyNodeStyle(style(), ...)}><CountUpValue target={countUpTarget()!} /></p>` (matching the plain-text branch's own `<p>` wrapper/style application, just with the animated value inside instead of `{text()}`). When `isCountUp()` is true but `countUpTarget()` is `null` (non-numeric), fall through to the EXISTING richText/videoFill/plain chain unchanged — i.e. the outer `<Show>`'s `when` condition should be `isCountUp() && countUpTarget() !== null`, not just `isCountUp()`, so a non-numeric value falls through cleanly to the fallback chain via the `<Show>`'s own `when` being false, rather than needing a nested fallback inside the count-up branch itself.

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run src/modules/cms/node/primitives/TextNode.test.tsx`
Expected: PASS (all pre-existing tests + 3 new).

- [ ] **Step 6: Add the `countUp` field descriptor**

In `nodeRegistry.ts`, add to TEXT's `fieldSchema` (alongside `text`/`richText`, added in an earlier sub-project):
```ts
{ key: 'countUp', labelKey: 'cms.node.content.countUpLabel', control: 'boolean' },
```

- [ ] **Step 7: Add i18n keys**

In `cms.i18n.ts`, vi `content` block (next to `richTextLabel`): `countUpLabel: 'Đếm số khi cuộn tới',`
En `content` block: `countUpLabel: 'Count up on scroll into view',`

- [ ] **Step 8: Run the full affected test set + whole-project typecheck**

Run: `npx vitest run src/modules/cms/node/primitives/TextNode.test.tsx`
Expected: PASS.
Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add src/modules/cms/node/primitives/TextNode.tsx src/modules/cms/node/primitives/TextNode.test.tsx src/modules/cms/node/nodeRegistry.ts src/modules/cms/cms.i18n.ts
git commit -m "feat(node): Text count-up-on-scroll rendering mode (ports StatMetricsNode's proven CountUpValue) -- unblocks StatMetrics primitive migration"
```

---

### Task 2: BE — pure transform function

**Files:**
- Create: `src/modules/node/application/services/transformStatMetricsToPrimitives.ts`
- Test: `src/modules/node/application/services/__tests__/transformStatMetricsToPrimitives.test.ts`

Working directory: `D:\OTHER\node-source-base\ddd-graphql-be`.

**Interfaces:**
- Consumes: `NewChildSpec`/`SubtreeTransformResult` from the already-merged `transformCloseOutBatchToPrimitives.ts`.
- Produces: `export function buildStatMetricsSubtree(oldProps: Record<string, any>): SubtreeTransformResult;`

- [ ] **Step 1: Read `StatMetricsNode.tsx` (FE repo, read-only) and `transformAccordionListToPrimitives.ts` (this repo — the most recent, `legacyAnimation`/`enabled`-preserving reference pattern) in full first.**

- [ ] **Step 2: Write the failing tests**

```ts
// src/modules/node/application/services/__tests__/transformStatMetricsToPrimitives.test.ts
import { describe, it, expect } from '@jest/globals';
import { buildStatMetricsSubtree } from '../transformStatMetricsToPrimitives';

describe('buildStatMetricsSubtree', () => {
    it('converts the root to a Frame with a static heading Text + a repeat-bound metric template Frame', () => {
        const result = buildStatMetricsSubtree({
            content: { heading: 'Con số ấn tượng', metrics: [{ value: 500, suffix: '+', label: 'Dự án' }] },
        });
        expect(result.updatedRoot.type).toBe('frame');
        expect(result.children[0]).toEqual(expect.objectContaining({ type: 'text', props: expect.objectContaining({ text: 'Con số ấn tượng' }) }));
        const templateFrame = result.children.find((c) => c.repeat != null)!;
        expect(templateFrame.repeat?.localItems).toEqual([{ value: 500, suffix: '+', label: 'Dự án' }]);
    });

    it('the template Frame has exactly 3 children: count-up value Text, suffix Text, label Text, in that order', () => {
        const result = buildStatMetricsSubtree({ content: { metrics: [{}] } });
        const templateFrame = result.children.find((c) => c.repeat != null)!;
        expect(templateFrame.children).toEqual([
            expect.objectContaining({ type: 'text', props: { countUp: true }, dataBinding: { mode: 'boundField', field: 'value' } }),
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'suffix' } }),
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'label' } }),
        ]);
    });

    it('handles a missing metrics array without throwing, producing an empty repeat', () => {
        const result = buildStatMetricsSubtree({ content: {} });
        const templateFrame = result.children.find((c) => c.repeat != null)!;
        expect(templateFrame.repeat?.localItems).toEqual([]);
    });

    it('carries legacyAnimation and enabled through to updatedRoot.props', () => {
        const result = buildStatMetricsSubtree({ content: {}, legacyAnimation: [{ type: 'fade-in' }], enabled: false });
        expect(result.updatedRoot.props).toStrictEqual({ legacyAnimation: [{ type: 'fade-in' }], enabled: false });
    });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx jest transformStatMetricsToPrimitives`
Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Implement**

```ts
// src/modules/node/application/services/transformStatMetricsToPrimitives.ts
// StatMetrics close-out (Phase B1 of the "retire specialized node types" roadmap) — pure,
// DB-free transform converting the bespoke StatMetrics type into a primitive-tree subtree using
// the local array repeater + the new Text count-up rendering mode. Follows
// transformAccordionListToPrimitives.ts's exact shape, including preservation of
// legacyAnimation/enabled (the systemic fix already applied to every sibling transform).
import type { NewChildSpec, SubtreeTransformResult } from './transformCloseOutBatchToPrimitives';

export function buildStatMetricsSubtree(oldProps: Record<string, any>): SubtreeTransformResult {
    const content = oldProps?.content ?? {};
    const children: NewChildSpec[] = [];
    if (content.heading) children.push({ type: 'text', props: { text: content.heading } });

    const templateFrame: NewChildSpec = {
        type: 'frame',
        repeat: {
            source: 'local',
            cardinality: 'many',
            localItemFields: [
                { key: 'value', labelKey: 'cms.node.content.textLabel', control: 'number' },
                { key: 'suffix', labelKey: 'cms.node.content.textLabel', control: 'text' },
                { key: 'label', labelKey: 'cms.node.content.titleLabel', control: 'text' },
            ],
            localItems: content.metrics ?? [],
        },
        children: [
            // Accepted simplification (design doc): value + suffix render as two stacked lines
            // instead of one inline "500+" string — TextNode has no mechanism for two bound
            // values to concatenate inline within one element.
            { type: 'text', props: { countUp: true }, dataBinding: { mode: 'boundField', field: 'value' } },
            { type: 'text', dataBinding: { mode: 'boundField', field: 'suffix' } },
            { type: 'text', dataBinding: { mode: 'boundField', field: 'label' } },
        ],
    };
    children.push(templateFrame);

    const preservedProps: Record<string, any> = {};
    if (oldProps.legacyAnimation !== undefined) preservedProps.legacyAnimation = oldProps.legacyAnimation;
    if (oldProps.enabled !== undefined) preservedProps.enabled = oldProps.enabled;

    return {
        updatedRoot: {
            type: 'frame',
            props: preservedProps,
            style: {
                background: { type: 'color', value: '#020202' },
                spacing: { padding: { t: 80, b: 80 } },
                typography: { color: { type: 'solid', value: '#f2f2f2' } },
            },
        },
        children,
    };
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `npx jest transformStatMetricsToPrimitives`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/node/application/services/transformStatMetricsToPrimitives.ts src/modules/node/application/services/__tests__/transformStatMetricsToPrimitives.test.ts
git commit -m "feat(node): pure subtree transform for StatMetrics -> local-repeater + count-up primitive composition"
```

---

### Task 3: BE — runner script

**Files:**
- Create: `scripts/migrateStatMetricsToPrimitives.ts`

Working directory: `D:\OTHER\node-source-base\ddd-graphql-be`.

- [ ] **Step 1: Read `scripts/migrateAccordionListToPrimitives.ts` in full** (already merged — the most recent, final-review-hardened reference: children-before-reshape ordering, per-row try/catch with real counts, `legacyAnimation`/`enabled` preservation via `'repeat' in result.updatedRoot`-style guarding, the partial-failure re-run warning). Write the new script following its EXACT shape, querying `type = 'stat-metrics'` (confirm the exact real `ENodeType` string value in `node.constants.ts` first) and dispatching to `buildStatMetricsSubtree`.

- [ ] **Step 2: Write the script** (mirror `migrateAccordionListToPrimitives.ts`'s structure exactly — `createChildChain`, `run()`, the `require.main === module` guard, threading `responsiveOverrides` through `createChildChain` even though this transform doesn't set it, for consistency with the shared helper's full field list).

- [ ] **Step 3: Confirm it compiles**

Run: `npx tsc -p scripts/tsconfig.json --noEmit`
Expected: 0 errors. Not run against a real database as part of this task.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrateStatMetricsToPrimitives.ts
git commit -m "feat(node): migration runner for StatMetrics -> local-repeater primitive subtree"
```

---

## Manual verification (after all 3 tasks — required before running the migration script for real)

1. In the running admin, build one instance by hand using primitives (local-repeat Frame with a count-up Text child), confirm the animation genuinely fires on scroll-into-view in a real browser (jsdom cannot verify this).
2. Screenshot-compare against a real existing StatMetrics instance — confirm close visual/functional parity (accepted simplification: value+suffix stack instead of concatenating inline).
3. Run `migrateStatMetricsToPrimitives.ts` against a COPY of real data, spot-check, THEN schedule the real run with the user's explicit go-ahead.
4. Once 0 pages reference `stat-metrics`, retiring the `ENodeType` entry + deleting the component file becomes safe — a follow-up task, not part of this plan.
