# SpotlightList close-out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Frame `'spotlight-list'` behavior (pointer-tracking lerp, ported verbatim from `SpotlightListNode.tsx`) + a Text `spotlightReveal` capability (a masked color-reveal `::after` overlay driven by the Frame's CSS custom properties), then migrate existing SpotlightList rows into a primitive-only composition using the local array repeater.

**Architecture:** FE Task 1 extends `FrameNode.tsx`'s existing `behavior` dispatch (currently only `'accordion-item'`) with a second variant that does NOT restructure children — it only attaches pointer handlers + writes `--spot-x`/`--spot-opacity` CSS custom properties onto the Frame's own rendered element, which cascade to descendants via normal CSS inheritance. FE Task 2 adds a new pure CSS-emitting helper (`buildSpotlightRevealCss`, mirroring `applyNodeHoverStyle.ts`'s established shape) + wires it into `NodeRenderer.tsx`'s existing "inject a `<style>` tag next to the node" mechanism. BE Tasks 3-4 follow the exact precedent of `transformAccordionListToPrimitives.ts`/`migrateAccordionListToPrimitives.ts`.

**Tech Stack:** SolidJS (FE, `ddd-graphql-fe`), NestJS + TypeORM (BE, `ddd-graphql-be`), Vitest (FE), Jest (BE).

## Global Constraints

- Both new capabilities are additive: every existing Frame without `behavior.type:'spotlight-list'` and every existing Text without `props.spotlightReveal` must render byte-for-byte unchanged.
- The pointer/rAF lerp mechanism (factor 0.24, stop threshold 0.15) and the mask-gradient CSS (8-stop `linear-gradient`, `#dc619c` default color) must be PORTED VERBATIM from `SpotlightListNode.tsx`/`editorialEffects.css` — this is a proven mechanism, not a redesign.
- The accordion-item behavior branch (Phase A2a) must remain completely untouched — this is a SECOND, independent `behavior.type` value, not a modification of the first.
- `rafId`/animation-frame cleanup must be handled on `onCleanup` (matching this session's own recent finding in the StatMetrics count-up work: a leaked rAF after unmount silently ticks against a dead component).
- BE migration transform functions are PURE (no I/O, no TypeORM). The runner script preserves `props.legacyAnimation`/`props.enabled` (the systemic fix already applied to every sibling transform in this family) and creates children before reshaping the bespoke row.
- Accepted, disclosed simplification (from the design doc): `LineArrowButton`'s hover choreography downgrades to `Button` + `StyleObject.hover`'s box-only affordances (same precedent as IntroRail's identical CTA).

---

## File Structure

| File | Repo | Responsibility |
|---|---|---|
| `src/modules/cms/node/primitives/FrameNode.tsx` (modify) | fe | `FrameBehaviorConfig.type` gains `'spotlight-list'`; new pointer/rAF handlers + custom-property writes. |
| `src/modules/cms/node/primitives/FrameNode.test.tsx` (modify) | fe | New tests for the spotlight-list behavior. |
| `src/modules/cms/node/applySpotlightRevealStyle.ts` (new) | fe | Pure helper: `buildSpotlightRevealCss(node): string \| null`. |
| `src/modules/cms/node/applySpotlightRevealStyle.test.ts` (new) | fe | Unit tests. |
| `src/modules/cms/node/NodeRenderer.tsx` (modify) | fe | Renders the spotlight-reveal `<style>` tag as a sibling next to the node, mirroring the existing hover-CSS `<Show>` block. |
| `src/modules/cms/node/primitives/TextNode.tsx` (modify) | fe | `spotlightReveal:true` renders `data-label={text()}` on the wrapper. |
| `src/modules/cms/node/primitives/TextNode.test.tsx` (modify) | fe | New tests. |
| `src/modules/cms/node/nodeRegistry.ts` (modify) | fe | TEXT's `fieldSchema` gains a `spotlightReveal` boolean field descriptor. |
| `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx` (modify) | fe | Behavior `<Select>` gains a "Danh sách con trỏ nổi bật" (spotlight-list) option, alongside the existing accordion option. |
| `src/modules/cms/cms.i18n.ts` (modify) | fe | New vi+en keys. |
| `src/modules/node/application/services/transformSpotlightListToPrimitives.ts` (new) | be | Pure transform: `buildSpotlightListSubtree`. |
| `src/modules/node/application/services/__tests__/transformSpotlightListToPrimitives.test.ts` (new) | be | Unit tests. |
| `scripts/migrateSpotlightListToPrimitives.ts` (new) | be | Runner. |

---

### Task 1: FE — Frame `spotlight-list` behavior

**Files:**
- Modify: `src/modules/cms/node/primitives/FrameNode.tsx`
- Modify: `src/modules/cms/node/primitives/FrameNode.test.tsx`

**Interfaces:**
- Produces: `FrameBehaviorConfig.type: 'accordion-item' | 'spotlight-list'`.

- [ ] **Step 1: Read `FrameNode.tsx` and `SpotlightListNode.tsx` in full first.** `FrameNode.tsx`'s current structure: `behavior()`/`isAccordion()` computed near the top; an early-return `if (isAccordion())` branch; then a final `return isLink() ? <a>...</a> : <div>...</div>` with `{videoLayer()}{breatheLayer()}` identically present in both. `SpotlightListNode.tsx`'s pointer/rAF mechanism (lines ~25-58) is the exact code to port: `let target/current/frame` locals, `render()` (lerp factor 0.24, stop threshold 0.15), `onMove`/`onEnter`/`onLeave` handlers, `onCleanup(() => window.cancelAnimationFrame(frame))`.

- [ ] **Step 2: Write the failing tests**

Read `FrameNode.test.tsx` in full first to match its existing fixture/render style, then add:
```tsx
describe('FrameNode — spotlight-list behavior (SpotlightList close-out, 2026-08-22)', () => {
    it('attaches pointer handlers and writes --spot-x on pointermove when behavior.type is spotlight-list', () => {
        const node = { id: 'n1', type: 'frame', props: { behavior: { type: 'spotlight-list' } }, children: [] } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const el = container.firstElementChild as HTMLElement;
        el.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 50, right: 200, bottom: 50, x: 0, y: 0, toJSON: () => ({}) });
        fireEvent.pointerEnter(el, { clientX: 50 });
        expect(el.style.getPropertyValue('--spot-x')).toBe('50px');
        expect(el.style.getPropertyValue('--spot-opacity')).toBe('1');
    });

    it('resets --spot-opacity to 0 on pointerleave', () => {
        const node = { id: 'n1', type: 'frame', props: { behavior: { type: 'spotlight-list' } }, children: [] } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const el = container.firstElementChild as HTMLElement;
        fireEvent.pointerLeave(el);
        expect(el.style.getPropertyValue('--spot-opacity')).toBe('0');
    });

    it('a plain Frame (no spotlight-list behavior) has no pointer handlers attached (regression guard — renders exactly as before)', () => {
        const node = { id: 'n1', type: 'frame', children: [] } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        const el = container.firstElementChild as HTMLElement;
        expect(el.style.getPropertyValue('--spot-x')).toBe('');
    });

    it('the accordion-item behavior branch is completely unaffected by this addition (regression guard)', () => {
        // reuse this file's existing accordion fixture/assertions — confirm they still pass unchanged
    });
});
```
(Adjust exact `fireEvent`/`getBoundingClientRect`-mocking syntax to match whatever pointer-event test conventions already exist elsewhere in this codebase — check `SpotlightListNode.tsx` has no test file today, so this is new territory; a plain `new PointerEvent('pointerenter', {clientX: 50})` dispatched via `el.dispatchEvent(...)` is an acceptable alternative to `fireEvent.pointerEnter` if Testing Library's helper doesn't support the needed event properties directly.)

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run src/modules/cms/node/primitives/FrameNode.test.tsx`
Expected: FAIL — no spotlight-list branch exists yet.

- [ ] **Step 4: Implement**

Widen `FrameBehaviorConfig`:
```ts
interface FrameBehaviorConfig {
    type: 'accordion-item' | 'spotlight-list';
    defaultOpen?: boolean; // accordion-item only
}
```
Add a new computed + the ported mechanism, near the existing `behavior()`/`isAccordion()`:
```ts
const isSpotlightList = () => behavior()?.type === 'spotlight-list';
let spotlightRef: HTMLElement | undefined;
let spotlightTarget = 0;
let spotlightCurrent = 0;
let spotlightFrame = 0;
const spotlightRenderLoop = () => {
    spotlightCurrent += (spotlightTarget - spotlightCurrent) * 0.24;
    spotlightRef?.style.setProperty('--spot-x', `${spotlightCurrent}px`);
    if (Math.abs(spotlightTarget - spotlightCurrent) > 0.15) {
        spotlightFrame = window.requestAnimationFrame(spotlightRenderLoop);
    } else {
        spotlightCurrent = spotlightTarget;
        spotlightRef?.style.setProperty('--spot-x', `${spotlightCurrent}px`);
        spotlightFrame = 0;
    }
};
const onSpotlightMove = (e: PointerEvent) => {
    if (!spotlightRef) return;
    const bounds = spotlightRef.getBoundingClientRect();
    spotlightTarget = Math.max(0, Math.min(bounds.width, e.clientX - bounds.left));
    if (!spotlightFrame) spotlightFrame = window.requestAnimationFrame(spotlightRenderLoop);
};
const onSpotlightEnter = (e: PointerEvent) => {
    if (!spotlightRef) return;
    const bounds = spotlightRef.getBoundingClientRect();
    spotlightTarget = e.clientX - bounds.left;
    spotlightCurrent = spotlightTarget;
    spotlightRef.style.setProperty('--spot-x', `${spotlightCurrent}px`);
    spotlightRef.style.setProperty('--spot-opacity', '1');
};
const onSpotlightLeave = () => spotlightRef?.style.setProperty('--spot-opacity', '0');
onCleanup(() => { if (typeof window !== 'undefined') window.cancelAnimationFrame(spotlightFrame); });
```
(`onCleanup` needs importing from `solid-js` alongside the existing `Show`/`createSignal`/`createEffect` import — check it's not already imported under a different name.)

Wire into BOTH the `isLink()` `<a>` and plain `<div>` branches (the final `return isLink() ? <a>...</a> : <div>...</div>`), adding `ref={(el) => { spotlightRef = el; }}` and conditional handlers to each:
```tsx
ref={(el) => { spotlightRef = el; }}
onPointerEnter={isSpotlightList() ? onSpotlightEnter : undefined}
onPointerMove={isSpotlightList() ? onSpotlightMove : undefined}
onPointerLeave={isSpotlightList() ? onSpotlightLeave : undefined}
```
A `ref` unconditionally assigned is harmless when `isSpotlightList()` is false (the handlers are `undefined`, so no listeners attach, so `spotlightRef` is simply never read). Do NOT touch the accordion-item branch's own return statement at all — it's a completely separate early-return.

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run src/modules/cms/node/primitives/FrameNode.test.tsx`
Expected: PASS (all pre-existing tests + 3-4 new).

- [ ] **Step 6: Run typecheck**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/cms/node/primitives/FrameNode.tsx src/modules/cms/node/primitives/FrameNode.test.tsx
git commit -m "feat(node): Frame spotlight-list behavior (ports SpotlightListNode's pointer-tracking lerp) -- unblocks SpotlightList primitive migration"
```

---

### Task 2: FE — Text `spotlightReveal` capability + CSS emitter

**Files:**
- Create: `src/modules/cms/node/applySpotlightRevealStyle.ts`
- Create: `src/modules/cms/node/applySpotlightRevealStyle.test.ts`
- Modify: `src/modules/cms/node/NodeRenderer.tsx`
- Modify: `src/modules/cms/node/primitives/TextNode.tsx`
- Modify: `src/modules/cms/node/primitives/TextNode.test.tsx`
- Modify: `src/modules/cms/node/nodeRegistry.ts`
- Modify: `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx`
- Modify: `src/modules/cms/cms.i18n.ts`

**Interfaces:**
- Consumes: Task 1's `FrameBehaviorConfig`.
- Produces: `buildSpotlightRevealCss(node: {id?: string; props?: Record<string, any>}): string | null`.

- [ ] **Step 1: Read `applyNodeHoverStyle.ts` in full first** — the exact template to mirror (guard conditions, `null` returns, `data-node-id` selector convention, the doc comment style).

- [ ] **Step 2: Write the failing tests**

```ts
// src/modules/cms/node/applySpotlightRevealStyle.test.ts
import { describe, it, expect } from 'vitest';
import { buildSpotlightRevealCss } from './applySpotlightRevealStyle';

describe('buildSpotlightRevealCss', () => {
    it('returns null when spotlightReveal is unset', () => {
        expect(buildSpotlightRevealCss({ id: 'n1', props: {} })).toBeNull();
    });

    it('returns null when there is no node id', () => {
        expect(buildSpotlightRevealCss({ props: { spotlightReveal: true } })).toBeNull();
    });

    it('builds a ::after mask-reveal rule scoped to the node\'s own data-node-id, reading the ancestor Frame\'s --spot-x/--spot-opacity custom properties', () => {
        const css = buildSpotlightRevealCss({ id: 'n1', props: { spotlightReveal: true } });
        expect(css).toContain('[data-node-id="n1"] > *::after');
        expect(css).toContain('content: attr(data-label)');
        expect(css).toContain('var(--spot-x)');
        expect(css).toContain('opacity: var(--spot-opacity, 0)');
        expect(css).toContain('#dc619c');
    });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run src/modules/cms/node/applySpotlightRevealStyle.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Implement the helper**

Port `.ed-industry-list button::after`'s exact CSS (`editorialEffects.css` lines 121-127 — read it first to copy the exact mask-gradient stop values) into a JS string:
```ts
// src/modules/cms/node/applySpotlightRevealStyle.ts
export interface SpotlightRevealNode {
    id?: string;
    props?: Record<string, any>;
}

/** Compiles `props.spotlightReveal` into a real `::after`-pseudo-element CSS rule — a colored
 * duplicate of the node's own text content (`content: attr(data-label)`), revealed through a
 * horizontal mask-image gradient centered on the ANCESTOR Frame's `--spot-x` custom property
 * (set by FrameNode.tsx's `behavior.type:'spotlight-list'` — see that file). CSS custom
 * properties inherit down the DOM tree by the cascade itself, so no JS wiring is needed between
 * the Frame and this node beyond normal DOM nesting. Ported verbatim from
 * `.ed-industry-list button::after` (editorialShared/editorialEffects.css). */
export function buildSpotlightRevealCss(node: SpotlightRevealNode): string | null {
    if (node.props?.spotlightReveal !== true || !node.id) return null;
    const selector = `[data-node-id="${node.id}"] > *::after`;
    return `${selector} { content: attr(data-label); position: absolute; inset: 0; color: #dc619c; pointer-events: none; white-space: nowrap; opacity: var(--spot-opacity, 0); mask-image: linear-gradient(90deg, transparent calc(var(--spot-x) - 104px), rgba(0,0,0,.16) calc(var(--spot-x) - 82px), rgba(0,0,0,.72) calc(var(--spot-x) - 42px), #000 calc(var(--spot-x) - 18px), #000 calc(var(--spot-x) + 18px), rgba(0,0,0,.72) calc(var(--spot-x) + 42px), rgba(0,0,0,.16) calc(var(--spot-x) + 82px), transparent calc(var(--spot-x) + 104px)); -webkit-mask-image: linear-gradient(90deg, transparent calc(var(--spot-x) - 104px), rgba(0,0,0,.16) calc(var(--spot-x) - 82px), rgba(0,0,0,.72) calc(var(--spot-x) - 42px), #000 calc(var(--spot-x) - 18px), #000 calc(var(--spot-x) + 18px), rgba(0,0,0,.72) calc(var(--spot-x) + 42px), rgba(0,0,0,.16) calc(var(--spot-x) + 82px), transparent calc(var(--spot-x) + 104px)); transition: opacity .28s ease; }`;
}
```
(Confirm the exact gradient stop values against the real `editorialEffects.css` lines 121-127 before finalizing — copy them precisely, don't retype from memory.)

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run src/modules/cms/node/applySpotlightRevealStyle.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Wire the `<style>` tag into `NodeRenderer.tsx`**

Read the file first (find the existing `<Show when={buildHoverCss(props.node)}>`/`<Show when={buildBackgroundAnimationCss(...)}>` blocks) and add a third, identically-shaped block:
```ts
import { buildSpotlightRevealCss } from './applySpotlightRevealStyle';
```
```tsx
<Show when={buildSpotlightRevealCss(props.node)}>{(css) => <style>{css()}</style>}</Show>
```

- [ ] **Step 7: Add `data-label` to `TextNode.tsx`'s rendered elements**

Read `TextNode.tsx` in full first (it now has 4 rendering branches: countUp/richText/videoFill/plain). Add `data-label={props.node.props?.spotlightReveal === true ? text() : undefined}` to the plain-text `<p>` branch specifically (the only branch relevant here — SpotlightList's migrated items are always plain text, per the design doc's own documented scope boundary). Do not add it to the other 3 branches.

- [ ] **Step 8: Write the failing test, then verify it passes**

Add to `TextNode.test.tsx`:
```tsx
it('renders data-label matching its own text when spotlightReveal is true', () => {
    const node = { id: 'n1', type: 'text', props: { text: 'Bán lẻ', spotlightReveal: true }, children: [] } as any;
    const { container } = render(() => <TextNode node={node} context={baseContext} />);
    expect(container.querySelector('p')?.getAttribute('data-label')).toBe('Bán lẻ');
});

it('does not render data-label when spotlightReveal is unset (regression guard)', () => {
    const node = { id: 'n1', type: 'text', props: { text: 'Bán lẻ' }, children: [] } as any;
    const { container } = render(() => <TextNode node={node} context={baseContext} />);
    expect(container.querySelector('p')?.hasAttribute('data-label')).toBe(false);
});
```
Run: `npx vitest run src/modules/cms/node/primitives/TextNode.test.tsx` — FAIL then PASS.

- [ ] **Step 9: Add the `spotlightReveal` field descriptor + Inspector option**

In `nodeRegistry.ts`, add to TEXT's `fieldSchema`: `{ key: 'spotlightReveal', labelKey: 'cms.node.content.spotlightRevealLabel', control: 'boolean' }`.

Read `NodeContainerLayoutTab.tsx` in full first (the existing behavior `<Select>` from Phase A2a, "Không"/"Mục accordion") and add a third option, "Danh sách con trỏ nổi bật" (spotlight-list), writing `behavior: {type:'spotlight-list'}` when selected (no `defaultOpen` field needed — that Checkbox should stay hidden for this behavior type, only shown for `accordion-item`).

- [ ] **Step 10: Add i18n keys**

vi `content` block: `spotlightRevealLabel: 'Hiệu ứng nổi bật theo con trỏ',`
en `content` block: `spotlightRevealLabel: 'Pointer-tracking spotlight reveal',`
vi `containerLayout` block (near the existing `behaviorAccordionItem` key): `behaviorSpotlightList: 'Danh sách con trỏ nổi bật',`
en: `behaviorSpotlightList: 'Spotlight list',`

- [ ] **Step 11: Run the full affected test set + typecheck**

Run: `npx vitest run src/modules/cms/node/applySpotlightRevealStyle.test.ts src/modules/cms/node/primitives/TextNode.test.tsx src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx`
Expected: PASS.
Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 12: Commit**

```bash
git add src/modules/cms/node/applySpotlightRevealStyle.ts src/modules/cms/node/applySpotlightRevealStyle.test.ts src/modules/cms/node/NodeRenderer.tsx src/modules/cms/node/primitives/TextNode.tsx src/modules/cms/node/primitives/TextNode.test.tsx src/modules/cms/node/nodeRegistry.ts src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx src/modules/cms/cms.i18n.ts
git commit -m "feat(node): Text spotlightReveal masked-color-reveal capability -- pairs with Frame's spotlight-list behavior"
```

---

### Task 3: BE — pure transform function

**Files:**
- Create: `src/modules/node/application/services/transformSpotlightListToPrimitives.ts`
- Test: `src/modules/node/application/services/__tests__/transformSpotlightListToPrimitives.test.ts`

Working directory: `D:\OTHER\node-source-base\ddd-graphql-be`.

- [ ] **Step 1: Read `SpotlightListNode.tsx` (FE repo, read-only) and `transformAccordionListToPrimitives.ts` (this repo, reference for the `legacyAnimation`/`enabled` preservation pattern) in full first.**

- [ ] **Step 2: Write the failing tests**

```ts
// src/modules/node/application/services/__tests__/transformSpotlightListToPrimitives.test.ts
import { describe, it, expect } from '@jest/globals';
import { buildSpotlightListSubtree } from '../transformSpotlightListToPrimitives';

describe('buildSpotlightListSubtree', () => {
    it('converts the root to a Frame with a rail (title/text/CTA) + a spotlight-list-behavior Frame containing a local-repeat template', () => {
        const result = buildSpotlightListSubtree({
            content: { railTitle: 'Ngành nghề', railText: '<p>Chúng tôi phục vụ</p>', railArrowHref: '#clients', items: ['Bán lẻ', 'Sản xuất'] },
        });
        expect(result.updatedRoot.type).toBe('frame');
        expect(result.children.some((c) => c.type === 'text' && c.props?.text === 'Ngành nghề')).toBe(true);
        expect(result.children.some((c) => c.type === 'button' && c.props?.href === '#clients')).toBe(true);
        const spotlightFrame = result.children.find((c) => c.props?.behavior?.type === 'spotlight-list')!;
        expect(spotlightFrame).toBeDefined();
        const templateFrame = spotlightFrame.children!.find((c) => c.repeat != null)!;
        expect(templateFrame.repeat?.localItems).toEqual([{ label: 'Bán lẻ' }, { label: 'Sản xuất' }]);
    });

    it('the template Frame has exactly 1 child: a spotlightReveal Text bound to label', () => {
        const result = buildSpotlightListSubtree({ content: { items: ['x'] } });
        const spotlightFrame = result.children.find((c) => c.props?.behavior?.type === 'spotlight-list')!;
        const templateFrame = spotlightFrame.children!.find((c) => c.repeat != null)!;
        expect(templateFrame.children).toEqual([
            expect.objectContaining({ type: 'text', props: { spotlightReveal: true }, dataBinding: { mode: 'boundField', field: 'label' } }),
        ]);
    });

    it('handles a missing items array without throwing, producing an empty repeat', () => {
        const result = buildSpotlightListSubtree({ content: {} });
        const spotlightFrame = result.children.find((c) => c.props?.behavior?.type === 'spotlight-list')!;
        const templateFrame = spotlightFrame.children!.find((c) => c.repeat != null)!;
        expect(templateFrame.repeat?.localItems).toEqual([]);
    });

    it('carries legacyAnimation and enabled through to updatedRoot.props', () => {
        const result = buildSpotlightListSubtree({ content: {}, legacyAnimation: [{ type: 'fade-in' }], enabled: false });
        expect(result.updatedRoot.props).toStrictEqual({ legacyAnimation: [{ type: 'fade-in' }], enabled: false });
    });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx jest transformSpotlightListToPrimitives`
Expected: FAIL.

- [ ] **Step 4: Implement**

```ts
// src/modules/node/application/services/transformSpotlightListToPrimitives.ts
// SpotlightList close-out (Phase B2) — pure, DB-free transform converting the bespoke
// SpotlightList type into a primitive-tree subtree using the local array repeater + the new
// Frame spotlight-list behavior + Text spotlightReveal capability. Follows
// transformAccordionListToPrimitives.ts's exact shape, including legacyAnimation/enabled
// preservation.
import type { NewChildSpec, SubtreeTransformResult } from './transformCloseOutBatchToPrimitives';

export function buildSpotlightListSubtree(oldProps: Record<string, any>): SubtreeTransformResult {
    const content = oldProps?.content ?? {};
    const children: NewChildSpec[] = [];
    if (content.railTitle) children.push({ type: 'text', props: { text: content.railTitle } });
    if (content.railText) children.push({ type: 'text', props: { text: content.railText, richText: true } });
    children.push({ type: 'button', props: { href: content.railArrowHref || '#clients', label: 'Xem khách hàng' } });

    const templateFrame: NewChildSpec = {
        type: 'frame',
        repeat: {
            source: 'local',
            cardinality: 'many',
            localItemFields: [{ key: 'label', labelKey: 'cms.node.content.titleLabel', control: 'text' }],
            // Original items are plain strings, not objects -- each becomes a single-field
            // record so it fits the local repeater's Record<string,unknown>[] item shape.
            localItems: (content.items ?? []).map((label: string) => ({ label })),
        },
        children: [
            { type: 'text', props: { spotlightReveal: true }, dataBinding: { mode: 'boundField', field: 'label' } },
        ],
    };

    const spotlightFrame: NewChildSpec = {
        type: 'frame',
        props: { behavior: { type: 'spotlight-list' } },
        children: [templateFrame],
    };
    children.push(spotlightFrame);

    const preservedProps: Record<string, any> = {};
    if (oldProps.legacyAnimation !== undefined) preservedProps.legacyAnimation = oldProps.legacyAnimation;
    if (oldProps.enabled !== undefined) preservedProps.enabled = oldProps.enabled;

    return {
        updatedRoot: {
            type: 'frame',
            props: preservedProps,
            style: {
                background: { type: 'color', value: '#020202' },
                spacing: { padding: { t: 60, b: 80 } },
                typography: { color: { type: 'solid', value: '#f2f2f2' } },
            },
        },
        children,
    };
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `npx jest transformSpotlightListToPrimitives`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/node/application/services/transformSpotlightListToPrimitives.ts src/modules/node/application/services/__tests__/transformSpotlightListToPrimitives.test.ts
git commit -m "feat(node): pure subtree transform for SpotlightList -> local-repeater + spotlight-list primitive composition"
```

---

### Task 4: BE — runner script

**Files:**
- Create: `scripts/migrateSpotlightListToPrimitives.ts`

Working directory: `D:\OTHER\node-source-base\ddd-graphql-be`.

- [ ] **Step 1: Read `scripts/migrateAccordionListToPrimitives.ts` in full** (the most recent, final-review-hardened reference). Write the new script following its EXACT shape, querying `type = 'spotlight-list'` (confirm the exact real `ENodeType` string value in `node.constants.ts` first) and dispatching to `buildSpotlightListSubtree`.

- [ ] **Step 2: Write the script** (mirror `migrateAccordionListToPrimitives.ts`'s structure exactly).

- [ ] **Step 3: Confirm it compiles**

Run: `npx tsc -p scripts/tsconfig.json --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrateSpotlightListToPrimitives.ts
git commit -m "feat(node): migration runner for SpotlightList -> local-repeater primitive subtree"
```

---

## Manual verification (after all 4 tasks — required before running the migration script for real)

1. In the running admin, build one instance by hand using primitives (spotlight-list-behavior Frame containing a local-repeat Frame with a spotlightReveal Text), confirm the pointer-tracking mask reveal genuinely works in a real browser (jsdom cannot verify the visual mask/gradient rendering).
2. Screenshot-compare against a real existing SpotlightList instance.
3. Run `migrateSpotlightListToPrimitives.ts` against a COPY of real data, spot-check, THEN schedule the real run with the user's explicit go-ahead.
4. Once 0 pages reference `spotlight-list`, retiring the `ENodeType` entry + deleting the component file becomes safe — a follow-up task, not part of this plan.
