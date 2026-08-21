# Phase A2a: Frame accordion-item behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any Frame become a toggleable accordion item (click a header to expand/collapse a body, smooth height animation) regardless of what primitives are composed inside it — closing the gap that currently requires the bespoke `AccordionListNode.tsx` component.

**Architecture:** Config lives at `node.props.behavior: { type: 'accordion-item', defaultOpen? }` — the existing generic `props` catch-all, not a new top-level Node field (avoids a backend schema change and a 4th hardcoded persistence list to keep in sync). `FrameNode.tsx` gains a third top-level rendering branch (alongside its existing `isLink()`/plain-`<div>` branches): when accordion, it splits `node.children` positionally (child[0] = trigger, rest = body), wraps the trigger in a real `<button>`, and animates the body's height via GSAP (already a dependency) on toggle. Inspector UI is a new "Hành vi" section in `NodeContainerLayoutTab.tsx`, wired through the same `props`-patching pattern `props.asLink`/slot configs already use.

**Tech Stack:** SolidJS, GSAP (`gsap.to(el, {height: ...})` — no plugin needed, GSAP core animates to `'auto'` natively), Vitest + `@solidjs/testing-library`.

## Global Constraints

- `behavior` lives at `node.props.behavior`, never as a new top-level `NodeJsonFields`/`NodeDTO` field — no backend change, no new entry needed in `NodeBuilder.page.tsx`'s `SavableNodeFields`/`toSavable` or `nodeCommands.ts`'s `toUpdatePayload`/`toCreatePayload` (all three already pass `props` through unchanged).
- `FrameNode.tsx`'s existing 3 behaviors (video background, `asLink`, plain layout) must render byte-for-byte unchanged when `behavior` is unset or any type other than `'accordion-item'`.
- Accordion state is per-Frame-instance, no cross-sibling coordination (multi-open, matching `AccordionListNode.tsx`'s existing semantics) — no "only one open" group concept.
- SSR output must match `defaultOpen` exactly with zero JS (no flash-of-wrong-state); GSAP only drives the transition on later client-side toggles, never the initial render.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/modules/cms/node/primitives/FrameNode.tsx` (modify) | New accordion-item rendering branch: trigger `<button>` + animated body `<div>`. |
| `src/modules/cms/node/primitives/FrameNode.test.tsx` (modify) | New test cases for the accordion branch; regression guard for the 3 existing branches. |
| `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx` (modify) | New "Hành vi" (Behavior) section — type Select + `defaultOpen` Checkbox. |
| `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx` (modify) | New test cases for the Behavior section. |
| `src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx` (modify) | Pass `behavior`/`onBehaviorChange` props to `NodeContainerLayoutTab`, gated to Frame nodes. |
| `src/modules/cms/cms.i18n.ts` (modify) | New vi+en key pairs. |

---

### Task 1: `FrameNode.tsx` accordion-item rendering

**Files:**
- Modify: `src/modules/cms/node/primitives/FrameNode.tsx`
- Modify: `src/modules/cms/node/primitives/FrameNode.test.tsx`

**Interfaces:**
- Produces: `FrameBehaviorConfig` type (local to `FrameNode.tsx`, not exported elsewhere yet — Task 2's Inspector work defines its OWN identical local type, since neither needs to import from the other; if this feels like duplication once both exist, that's an acceptable YAGNI trade-off for two files that today have no shared "node behavior types" module).

- [ ] **Step 1: Write the failing tests**

Append to `src/modules/cms/node/primitives/FrameNode.test.tsx` (inside a new `describe` block, after the existing one):

```tsx
describe('FrameNode — accordion-item behavior (Phase A2a, 2026-08-21)', () => {
    function accordionNode(overrides: Record<string, unknown> = {}) {
        return {
            id: 'acc-1',
            type: 'FRAME',
            props: { behavior: { type: 'accordion-item', ...overrides } },
            children: [
                { id: 'trigger-1', type: 'TEXT', props: { text: 'Câu hỏi 1' }, children: [] },
                { id: 'body-1', type: 'TEXT', props: { text: 'Câu trả lời 1' }, children: [] },
                { id: 'body-2', type: 'TEXT', props: { text: 'Chi tiết thêm' }, children: [] },
            ],
        } as any;
    }

    it('renders child[0] inside a real <button>, children[1:] inside a separate body container', () => {
        const { container, getByText } = render(() => <FrameNode node={accordionNode()} context={baseContext} />);
        const button = container.querySelector('button');
        expect(button).toBeTruthy();
        expect(button!.textContent).toBe('Câu hỏi 1');
        // Body content is present in the DOM (default closed still renders it, just height:0 —
        // see the next test for the closed-state height assertion; this test only checks WHICH
        // content lives in the button vs the body container).
        expect(getByText('Câu trả lời 1')).toBeTruthy();
        expect(getByText('Chi tiết thêm')).toBeTruthy();
        expect(button!.textContent).not.toContain('Câu trả lời 1');
    });

    it('defaults to closed (height:0) when defaultOpen is unset, with aria-expanded="false"', () => {
        const { container } = render(() => <FrameNode node={accordionNode()} context={baseContext} />);
        const button = container.querySelector('button')!;
        expect(button.getAttribute('aria-expanded')).toBe('false');
        const body = container.querySelectorAll('div')[1]; // root div, then the body wrapper
        expect(body.style.height).toBe('0px');
    });

    it('defaultOpen:true renders the body at full height with aria-expanded="true", no click needed', () => {
        const { container } = render(() => <FrameNode node={accordionNode({ defaultOpen: true })} context={baseContext} />);
        const button = container.querySelector('button')!;
        expect(button.getAttribute('aria-expanded')).toBe('true');
        const body = container.querySelectorAll('div')[1];
        expect(body.style.height).toBe('auto');
    });

    it('clicking the trigger button toggles aria-expanded and the body height', () => {
        const { container } = render(() => <FrameNode node={accordionNode()} context={baseContext} />);
        const button = container.querySelector('button')!;
        const body = container.querySelectorAll('div')[1];
        expect(button.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(button);
        expect(button.getAttribute('aria-expanded')).toBe('true');
        // GSAP's .to() call is async/animated in a real browser, but this codebase's jsdom test
        // environment has no real rAF-driven layout — assert on the SIGNAL-DRIVEN state (aria-
        // expanded, which updates synchronously with the click) rather than the animated height,
        // which is a live/manual check per this task's own test-scope note below.
    });

    it('a Frame with no behavior (or a non-accordion type) renders its existing plain <div> unchanged — no <button>, no extra wrapper divs', () => {
        const node = { id: 'plain-1', type: 'FRAME', children: [{ id: 'c1', type: 'TEXT', props: { text: 'Hello' }, children: [] }] } as any;
        const { container } = render(() => <FrameNode node={node} context={baseContext} />);
        expect(container.querySelector('button')).toBeNull();
        // Exactly 1 wrapper div (the Frame's own root) + whatever TextNode renders for its child —
        // no accordion-specific button/body divs injected.
        expect(container.querySelectorAll('div').length).toBeLessThanOrEqual(1);
    });
});
```

Add `fireEvent` to this test file's existing `@solidjs/testing-library` import line (currently `import { render } from '@solidjs/testing-library';` — change to `import { render, fireEvent } from '@solidjs/testing-library';`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/modules/cms/node/primitives/FrameNode.test.tsx`
Expected: FAIL — no `<button>`/accordion rendering exists yet (current `FrameNode.tsx` only has the `isLink()`/plain-`<div>` branches).

- [ ] **Step 3: Implement the accordion-item branch**

Replace the full content of `src/modules/cms/node/primitives/FrameNode.tsx` with:

```tsx
// src/modules/cms/node/primitives/FrameNode.tsx
import { Show, createSignal, createEffect } from 'solid-js';
import { gsap } from 'gsap';
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { applyContainerLayout } from '../applyNodeLayout';
import { NodeChildrenList } from '../NodeRenderer';
import type { ELayoutMode } from '../node.constants';
import { nodeAnimation } from '../useNodeAnimation';

void nodeAnimation;

/** Phase A2a — accordion-item behavior config, read from `node.props.behavior` (the existing
 * generic props catch-all, deliberately NOT a new top-level Node field — see
 * docs/superpowers/specs/2026-08-21-frame-accordion-behavior-design.md §1 for why: a new
 * top-level field would need a backend schema change and a 4th hardcoded persistence list to
 * keep in sync, the exact bug class Phase 4's animationRef rollout hit). */
interface FrameBehaviorConfig {
    type: 'accordion-item';
    defaultOpen?: boolean;
}

/** `style`/`layoutMode` là field JSON/enum nullable ở tầng codegen (mọi field NodeDTO
 * đều `T | undefined`, xem comment ở applyNodeLayout.test.ts) — `?? {}`/cast +
 * fallback `'flow'` ở đây theo đúng convention buildNodeTree.ts đã dùng, KHÔNG đổi lại
 * node.types.ts (field không phải JSONB, không thuộc phạm vi override ở đó).
 *
 * Phase 0 M2a: `props.asLink=true` biến Frame thành thẻ <a> tới `context.contextHref`
 * (URL trang Chi tiết của contextEntry hiện tại, do repeat cha có `linkToDetail:true` gắn
 * vào — xem nodeDataBinding.ts/resolveRenderableChildren.ts) — dùng cho "thẻ card" trong
 * lưới CONTENT_GRID/RELATED_ENTRIES/MIXED_FEED/BACKLINK_ENTRIES, thay hẳn <div> nếu không
 * phải context repeat-có-link (contextHref undefined) thì vẫn render <div> như trước, không
 * đổi hành vi cho MỌI Frame khác trong hệ thống.
 *
 * Phase A2a: `props.behavior.type === 'accordion-item'` is a THIRD top-level rendering branch,
 * checked before isLink()/plain-<div> — a Frame can be either an accordion item OR a link OR
 * plain, never a combination (accordion's own <button>/<div> wrapper already needs the space
 * `<a>` would otherwise occupy; no known use case needs both at once). */
export function FrameNode(props: NodeComponentProps) {
    const isLink = () => props.node.props?.asLink === true && !!props.context.contextHref;
    const isVideoBackground = () => props.node.style?.background?.type === 'video' && !!props.node.style?.background?.value;
    const behavior = () => props.node.props?.behavior as FrameBehaviorConfig | undefined;
    const isAccordion = () => behavior()?.type === 'accordion-item';

    const style = () => ({
        ...applyContainerLayout(props.node, props.context.device()),
        ...applyNodeStyle(props.node.style ?? {}, props.node.responsiveOverrides, props.context.device()),
        // A video background layer (below) needs `position: relative` on this box so it can
        // be absolutely positioned to fill it — harmless to always set since Frame's own
        // layout props (flex/grid) are unaffected by `position`.
        position: 'relative' as const,
        // `position: relative` alone does NOT create a new CSS stacking context (z-index stays
        // `auto`), so the video layer's `-z-10` (below) could hoist past THIS box and paint
        // behind whatever the nearest actual stacking-context ancestor is (e.g. an outer Frame's
        // own background color, if this Frame is nested inside one). `isolation: isolate` forces
        // a real stacking context here so the negative z-index stays contained — only needed
        // when the video layer actually renders, so it's conditional rather than set on every
        // Frame.
        ...(isVideoBackground() ? { isolation: 'isolate' as const } : {}),
    });

    const videoLayer = () => (
        <Show when={isVideoBackground()}>
            <video
                src={props.node.style!.background!.value}
                autoplay
                muted
                loop
                playsinline
                class="absolute inset-0 -z-10 h-full w-full object-cover"
            />
        </Show>
    );

    if (isAccordion()) {
        const [open, setOpen] = createSignal(behavior()?.defaultOpen ?? false);
        const trigger = () => props.node.children[0];
        const body = () => props.node.children.slice(1);
        let bodyRef: HTMLDivElement | undefined;

        createEffect((prevOpen: boolean | undefined) => {
            const isOpen = open();
            // Skip animating on the FIRST run — SSR/mount output already matches defaultOpen
            // with zero JS (the inline height below is computed straight from the signal), so
            // animating on mount would be a spurious "expand" flash for a defaultOpen:true item.
            if (bodyRef && prevOpen !== undefined) {
                gsap.to(bodyRef, { height: isOpen ? 'auto' : 0, duration: 0.3, ease: 'power2.inOut' });
            }
            return isOpen;
        }, undefined);

        return (
            <div use:nodeAnimation={props.node.animationRef} style={style()}>
                <button
                    type="button"
                    onClick={() => setOpen(!open())}
                    aria-expanded={open()}
                    style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}
                >
                    <NodeChildrenList children={trigger() ? [trigger()] : []} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
                </button>
                <div ref={bodyRef} style={{ overflow: 'hidden', height: open() ? 'auto' : '0px' }}>
                    <NodeChildrenList children={body()} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
                </div>
            </div>
        );
    }

    return isLink() ? (
        <a use:nodeAnimation={props.node.animationRef} href={props.context.contextHref} style={style()}>
            {videoLayer()}
            <NodeChildrenList children={props.node.children} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
        </a>
    ) : (
        <div use:nodeAnimation={props.node.animationRef} style={style()}>
            {videoLayer()}
            <NodeChildrenList children={props.node.children} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
        </div>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/modules/cms/node/primitives/FrameNode.test.tsx`
Expected: PASS (all pre-existing tests plus the 5 new ones).

- [ ] **Step 5: Run the whole-project typecheck**

Run: `npx tsc --noEmit -p .`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/cms/node/primitives/FrameNode.tsx src/modules/cms/node/primitives/FrameNode.test.tsx
git commit -m "feat(frame): accordion-item behavior — any Frame can become a toggleable, height-animated accordion item"
```

---

### Task 2: Inspector UI — `NodeContainerLayoutTab.tsx` Behavior section

**Files:**
- Modify: `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx`
- Modify: `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx`
- Modify: `src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx`
- Modify: `src/modules/cms/cms.i18n.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (the two files don't share a type — see Task 1's Interfaces note on why a locally-duplicated `FrameBehaviorConfig` shape is an acceptable YAGNI trade-off here).
- Produces: `NodeContainerLayoutTabProps` grows two new optional props: `behavior?: { type: 'accordion-item'; defaultOpen?: boolean }` and `onBehaviorChange: (next: { type: 'accordion-item'; defaultOpen?: boolean } | undefined) => void`.

- [ ] **Step 1: Add i18n keys**

Read `src/modules/cms/cms.i18n.ts` around its `containerLayout` namespace first (search for `containerLayout:` — the block `NodeContainerLayoutTab.tsx` already reads keys from, e.g. `cms.node.containerLayout.wrapLabel` per that file's own existing usage) to find the exact current insertion points, then add, in the **vi** block:
```ts
                behaviorLabel: 'Hành vi',
                behaviorNone: 'Không',
                behaviorAccordionItem: 'Mục accordion (mở/đóng)',
                behaviorDefaultOpenLabel: 'Mở sẵn khi tải trang',
```
And the matching **en** block:
```ts
                behaviorLabel: 'Behavior',
                behaviorNone: 'None',
                behaviorAccordionItem: 'Accordion item (expand/collapse)',
                behaviorDefaultOpenLabel: 'Open by default',
```

- [ ] **Step 2: Write the failing tests**

Read `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx` first to match its existing render/prop conventions (this component's required props today are `layout`/`onChange` — the new tests below add the 2 new optional props alongside them), then append:

```tsx
describe('NodeContainerLayoutTab — accordion behavior section (Phase A2a, 2026-08-21)', () => {
    it('shows "Không" as the default behavior selection when behavior is unset', () => {
        const { container } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={undefined} onBehaviorChange={vi.fn()} />
        ));
        expect(container.textContent).toContain('Không');
    });

    it('hides the defaultOpen checkbox when behavior is unset', () => {
        const { queryByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={undefined} onBehaviorChange={vi.fn()} />
        ));
        expect(queryByText('Mở sẵn khi tải trang')).toBeNull();
    });

    it('shows the defaultOpen checkbox when behavior is accordion-item', () => {
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={{ type: 'accordion-item' }} onBehaviorChange={vi.fn()} />
        ));
        expect(getByText('Mở sẵn khi tải trang')).toBeTruthy();
    });

    it('selecting accordion-item calls onBehaviorChange with a starter config', () => {
        const onBehaviorChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={undefined} onBehaviorChange={onBehaviorChange} />
        ));
        fireEvent.click(getByText('Mục accordion (mở/đóng)'));
        expect(onBehaviorChange).toHaveBeenCalledWith({ type: 'accordion-item' });
    });

    it('selecting "Không" clears behavior to undefined', () => {
        const onBehaviorChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={{ type: 'accordion-item' }} onBehaviorChange={onBehaviorChange} />
        ));
        fireEvent.click(getByText('Không'));
        expect(onBehaviorChange).toHaveBeenCalledWith(undefined);
    });

    it('toggling defaultOpen writes it into the behavior object', () => {
        const onBehaviorChange = vi.fn();
        const { getByText } = render(() => (
            <NodeContainerLayoutTab layout={{}} onChange={vi.fn()} behavior={{ type: 'accordion-item' }} onBehaviorChange={onBehaviorChange} />
        ));
        fireEvent.click(getByText('Mở sẵn khi tải trang'));
        expect(onBehaviorChange).toHaveBeenCalledWith({ type: 'accordion-item', defaultOpen: true });
    });
});
```

If the top-level `<Select>`'s options need to be reached via a `fireEvent.focus` first to mount their DOM text (this codebase's shared `Select`/`DropdownSelect` only mounts unselected option rows once opened — confirmed pattern from a prior sub-project's own test file, `NodeDataSourceTab.test.tsx`'s local-source tests), adjust the "selecting accordion-item"/"selecting Không" tests accordingly (focus the Select's trigger input before clicking the option text) — check the actual rendered DOM via a quick manual run if the plain `fireEvent.click(getByText(...))` doesn't find the element.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx`
Expected: FAIL — no Behavior section exists yet.

- [ ] **Step 4: Implement the Behavior section**

In `src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx`, add to the props interface:

```ts
export interface NodeContainerLayoutTabProps {
    layout?: LayoutProps;
    onChange: (next: LayoutProps) => void;
    /** Phase A2a — lives at node.props.behavior (NOT node.layout), a deliberately separate
     * prop pair from layout/onChange above since it patches a different part of the Node.
     * See docs/superpowers/specs/2026-08-21-frame-accordion-behavior-design.md §1/§4. */
    behavior?: { type: 'accordion-item'; defaultOpen?: boolean };
    onBehaviorChange?: (next: { type: 'accordion-item'; defaultOpen?: boolean } | undefined) => void;
}
```

Add imports if not already present: `Checkbox` from `@core/components/control/Checkbox`, `Select` from `@core/components/control/Select`, `InspectorSection` from `@core/components/control/InspectorSection` (check the file's current imports first — it may already import some of these).

Add a new `InspectorSection` inside the component's returned JSX (after the existing sections):

```tsx
            <InspectorSection title={t('cms.node.containerLayout.behaviorLabel')}>
                <div class="flex flex-col gap-3">
                    <Select
                        value={props.behavior?.type ?? 'none'}
                        options={[
                            { value: 'none', label: t('cms.node.containerLayout.behaviorNone') },
                            { value: 'accordion-item', label: t('cms.node.containerLayout.behaviorAccordionItem') },
                        ]}
                        onChange={(v: string) => props.onBehaviorChange?.(v === 'accordion-item' ? { type: 'accordion-item' } : undefined)}
                        fieldless
                    />
                    <Show when={props.behavior?.type === 'accordion-item'}>
                        <Checkbox
                            value={!!props.behavior?.defaultOpen}
                            onChange={(v) => props.onBehaviorChange?.({ type: 'accordion-item', defaultOpen: v })}
                            text={t('cms.node.containerLayout.behaviorDefaultOpenLabel')}
                            fieldless
                        />
                    </Show>
                </div>
            </InspectorSection>
```

Confirm `Show` is imported from `solid-js` (the file already imports `Show` per its current header — verify, add if missing).

- [ ] **Step 5: Wire into `NodeBuilder.page.tsx`**

Find the existing `<NodeContainerLayoutTab layout={...} onChange={...} />` call (search for `<NodeContainerLayoutTab`) and add the two new props:

```tsx
                                <Show when={selectedCapabilities()?.layoutChildren && selected()!.layoutMode !== 'free'}>
                                    <NodeContainerLayoutTab
                                        layout={
                                            previewBreakpoint() === 'desktop' ? selected()?.layout
                                            : previewBreakpoint() === 'tablet' ? selected()?.responsiveOverrides?.tablet?.layout
                                            : selected()?.responsiveOverrides?.mobile?.layout
                                        }
                                        onChange={(next) => patchSelected((n) => {
                                            if (previewBreakpoint() === 'desktop') { n.layout = next; return; }
                                            n.responsiveOverrides = {
                                                ...n.responsiveOverrides,
                                                [previewBreakpoint()]: { ...n.responsiveOverrides?.[previewBreakpoint() as 'tablet' | 'mobile'], layout: next },
                                            };
                                        })}
                                        behavior={selected()?.type === ENodeType.FRAME ? (selected()?.props?.behavior as { type: 'accordion-item'; defaultOpen?: boolean } | undefined) : undefined}
                                        onBehaviorChange={(next) => patchSelected((n) => { n.props = { ...n.props, behavior: next }; })}
                                    />
                                </Show>
```

(Keep the existing `layout`/`onChange` props exactly as they are — only add the two new `behavior`/`onBehaviorChange` lines. Confirm `ENodeType` is already imported in this file — search for an existing `ENodeType.` usage; it's used throughout for capability checks, so it should already be imported from `@/modules/cms/node/node.constants`. If not, add `import { ENodeType } from '@/modules/cms/node/node.constants';`.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx`
Expected: PASS (all pre-existing tests plus the 6 new ones).

- [ ] **Step 7: Run the whole-project typecheck**

Run: `npx tsc --noEmit -p .`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.tsx src/modules/cms/admin/nodeBuilder/NodeContainerLayoutTab.test.tsx src/modules/cms/admin/nodeBuilder/NodeBuilder.page.tsx src/modules/cms/cms.i18n.ts
git commit -m "feat(node-builder): accordion-item behavior Inspector UI, wired to node.props.behavior"
```

---

## Manual verification (after both tasks)

Live-check in the Node Builder admin (`/admin/cms/node-builder`) — automated tests cover structure/logic, not the GSAP animation or real click/keyboard interaction:

1. Add a Frame, open its layout tab, set Behavior to "Mục accordion (mở/đóng)".
2. Add a Text child (the trigger/question) first, then a Text child (the answer/body) after.
3. On the public page (or admin canvas), click the trigger — confirm the body smoothly slides open (not an instant jump), and clicking again smoothly collapses it.
4. Tab to the trigger via keyboard and press Enter/Space — confirm it toggles the same way a mouse click does (native `<button>` semantics, should work with zero extra code).
5. Add a second accordion Frame as a sibling — confirm opening one does NOT close the other (independent, multi-open state).
6. Set `defaultOpen` on one and reload the page — confirm it renders already-open with no click needed and no visible flash/jump on load.
