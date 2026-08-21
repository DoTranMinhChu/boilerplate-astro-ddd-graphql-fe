# AccordionList close-out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate existing AccordionList Node rows into a primitive-only composition using the already-shipped local array repeater + accordion-item Frame behavior. No FE code changes needed — this is pure composition of existing capabilities.

**Architecture:** BE-only. Follows the exact precedent of `transformLocalRepeaterBatchToPrimitives.ts`/`migrateLocalRepeaterBatchToPrimitives.ts` (already merged): a pure, DB-free transform function (unit-tested with plain object fixtures) + a thin runner script using `NodeService.createNode()` exclusively for new rows, children created before the bespoke row is reshaped, per-row try/catch with real `migrated`/`failed` counts.

**Tech Stack:** NestJS + TypeORM (BE, `ddd-graphql-be`), Jest.

## Global Constraints

- The transform function is PURE (no I/O, no TypeORM) — testable with plain object fixtures.
- The runner script creates ALL new children BEFORE reshaping the bespoke row's own `type`/`props` — a mid-migration failure must leave the row still matching the recovery query's `type IN (...)` filter.
- Accepted, disclosed simplifications (from the design doc, not to be "fixed" as part of this plan): "first item open by default" is dropped (all items start closed — `defaultOpen` is a template-level static value, identical across every repeat clone); the trigger's dynamic "−"/"+" indicator is dropped (no mechanism exists to thread `open()` state into composed trigger children); the item divider is approximated as a full 4-side border (no per-side border capability exists).

---

## File Structure

| File | Repo | Responsibility |
|---|---|---|
| `src/modules/node/application/services/transformAccordionListToPrimitives.ts` (new) | be | Pure transform: `buildAccordionListSubtree`. |
| `src/modules/node/application/services/__tests__/transformAccordionListToPrimitives.test.ts` (new) | be | Unit tests, plain fixtures, no DB. |
| `scripts/migrateAccordionListToPrimitives.ts` (new) | be | Runner: queries `type = 'accordion-list'`, calls the transform, writes via `NodeService`. |

---

### Task 1: BE — pure transform + runner script

**Files:**
- Create: `src/modules/node/application/services/transformAccordionListToPrimitives.ts`
- Test: `src/modules/node/application/services/__tests__/transformAccordionListToPrimitives.test.ts`
- Create: `scripts/migrateAccordionListToPrimitives.ts`

Working directory: `D:\OTHER\node-source-base\ddd-graphql-be`.

**Interfaces:**
- Consumes: `NewChildSpec`/`SubtreeTransformResult` from the already-merged `transformCloseOutBatchToPrimitives.ts` (reuse, do not redefine — that file's `NewChildSpec` now also has an optional `responsiveOverrides?: Record<string, any>` field, added in a later sub-project; not needed by THIS transform, but confirm it's still there and the type still compiles cleanly against it).
- Produces: `export function buildAccordionListSubtree(oldProps: Record<string, any>): SubtreeTransformResult;`

- [ ] **Step 1: Write the failing tests**

```ts
// src/modules/node/application/services/__tests__/transformAccordionListToPrimitives.test.ts
import { describe, it, expect } from '@jest/globals';
import { buildAccordionListSubtree } from '../transformAccordionListToPrimitives';

describe('buildAccordionListSubtree', () => {
    it('converts the root to a Frame with a static heading Text + a repeat-bound accordion-item template Frame', () => {
        const result = buildAccordionListSubtree({
            content: { heading: 'Câu hỏi thường gặp', items: [{ title: 'Giá bao nhiêu?', body: '<p>Liên hệ để báo giá</p>' }] },
        });
        expect(result.updatedRoot.type).toBe('frame');
        expect(result.children[0]).toEqual(expect.objectContaining({ type: 'text', props: expect.objectContaining({ text: 'Câu hỏi thường gặp' }) }));
        const templateFrame = result.children.find((c) => c.repeat != null)!;
        expect(templateFrame.repeat?.localItems).toEqual([{ title: 'Giá bao nhiêu?', body: '<p>Liên hệ để báo giá</p>' }]);
        expect(templateFrame.props).toEqual({ behavior: { type: 'accordion-item', defaultOpen: false } });
    });

    it('the template Frame has exactly 2 children: a bound title Text (trigger) and a bound rich-text body Text', () => {
        const result = buildAccordionListSubtree({ content: { items: [{}] } });
        const templateFrame = result.children.find((c) => c.repeat != null)!;
        expect(templateFrame.children).toEqual([
            expect.objectContaining({ type: 'text', dataBinding: { mode: 'boundField', field: 'title' } }),
            expect.objectContaining({ type: 'text', props: { richText: true }, dataBinding: { mode: 'boundField', field: 'body' } }),
        ]);
    });

    it('handles a missing items array without throwing, producing an empty repeat', () => {
        const result = buildAccordionListSubtree({ content: {} });
        const templateFrame = result.children.find((c) => c.repeat != null)!;
        expect(templateFrame.repeat?.localItems).toEqual([]);
    });

    it('omits the heading Text child entirely when there is no heading', () => {
        const result = buildAccordionListSubtree({ content: { items: [] } });
        expect(result.children.some((c) => c.type === 'text' && !c.repeat)).toBe(false);
    });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest transformAccordionListToPrimitives`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the transform**

```ts
// src/modules/node/application/services/transformAccordionListToPrimitives.ts
// AccordionList close-out (Hard-difficulty type from the "retire specialized node types"
// roadmap, whose blocking capability — Frame.behavior:'accordion-item' — already shipped) —
// pure, DB-free transform converting the bespoke AccordionList type into a primitive-tree
// subtree using the local array repeater + accordion-item Frame behavior. Follows
// transformLocalRepeaterBatchToPrimitives.ts's exact shape: no I/O, no TypeORM, tested with
// plain object fixtures. The runner script is the only DB-touching piece.
import type { NewChildSpec, SubtreeTransformResult } from './transformCloseOutBatchToPrimitives';

export function buildAccordionListSubtree(oldProps: Record<string, any>): SubtreeTransformResult {
    const content = oldProps?.content ?? {};
    const children: NewChildSpec[] = [];
    if (content.heading) children.push({ type: 'text', props: { text: content.heading } });

    // Accepted simplification (design doc): "first item open by default" is dropped —
    // defaultOpen is a template-level static prop shared identically by every repeat clone,
    // there is no per-item override mechanism. All items start closed.
    const templateFrame: NewChildSpec = {
        type: 'frame',
        props: { behavior: { type: 'accordion-item', defaultOpen: false } },
        // Accepted simplification: approximates the original's `border-b` divider-between-items
        // as a full 4-side border — StyleObject has no per-side border variant.
        style: { border: { width: 1, style: 'solid', color: 'rgba(255,255,255,.14)' } },
        repeat: {
            source: 'local',
            cardinality: 'many',
            localItemFields: [
                { key: 'title', labelKey: 'cms.node.content.titleLabel', control: 'text' },
                { key: 'body', labelKey: 'cms.node.content.textLabel', control: 'richtext' },
            ],
            localItems: content.items ?? [],
        },
        children: [
            { type: 'text', dataBinding: { mode: 'boundField', field: 'title' } },
            { type: 'text', props: { richText: true }, dataBinding: { mode: 'boundField', field: 'body' } },
        ],
    };
    children.push(templateFrame);

    return {
        updatedRoot: {
            type: 'frame',
            props: {},
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

- [ ] **Step 4: Run to verify they pass**

Run: `npx jest transformAccordionListToPrimitives`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the runner script**

Read `scripts/migrateLocalRepeaterBatchToPrimitives.ts` in full first (already merged — the final, review-hardened version: children created before the row is reshaped, per-row try/catch with real counts, `responsiveOverrides` threaded through `createChildChain`, a clear operator warning about partial-failure re-runs). Write the new script following its EXACT shape — same `createChildChain`, same ordering, same error handling — just querying `type = 'accordion-list'` (confirm the exact real `ENodeType` string value in `node.constants.ts` first) and dispatching to `buildAccordionListSubtree`.

```ts
// scripts/migrateAccordionListToPrimitives.ts
// One-off migration (AccordionList close-out, "retire specialized node types" roadmap):
// converts AccordionList rows into a primitive-only subtree using the local array repeater +
// accordion-item Frame behavior. Run ONCE per environment against a COPY of real data first —
// spot-check the converted pages render correctly before ever running this against production.
// Usage: npx ts-node scripts/migrateAccordionListToPrimitives.ts
import 'reflect-metadata';
import { AppDataSource } from '../src/config/database.config';
import { NodeEntity } from '../src/modules/node/domain/entities/node.entity';
import { NodeService } from '../src/modules/node/application/services/node.service';
import { buildAccordionListSubtree } from '../src/modules/node/application/services/transformAccordionListToPrimitives';
import type { NewChildSpec } from '../src/modules/node/application/services/transformCloseOutBatchToPrimitives';

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
            responsiveOverrides: child.responsiveOverrides,
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

    const rows = await repo.createQueryBuilder('node').where('node.type = :type', { type: 'accordion-list' }).getMany();

    let migrated = 0;
    let failed = 0;
    for (const row of rows) {
        try {
            const result = buildAccordionListSubtree((row.props as Record<string, any>) ?? {});

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
        `Migrated ${migrated} of ${rows.length} accordion-list nodes` +
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

- [ ] **Step 6: Confirm it compiles**

Run: `npx tsc -p tsconfig.json --noEmit` and `npx tsc -p scripts/tsconfig.json --noEmit`
Expected: 0 errors both. Not run against a real database as part of this task.

- [ ] **Step 7: Commit**

```bash
git add src/modules/node/application/services/transformAccordionListToPrimitives.ts src/modules/node/application/services/__tests__/transformAccordionListToPrimitives.test.ts scripts/migrateAccordionListToPrimitives.ts
git commit -m "feat(node): AccordionList -> local-repeater + accordion-item primitive migration"
```

---

## Manual verification (after the task — required before running the migration script for real)

1. In the running admin, build one instance by hand using primitives (local-repeat Frame with `behavior.type:'accordion-item'`), screenshot-compare against a real existing AccordionList instance — confirm close visual/functional parity (accepted simplifications: no first-item-open-by-default, no dynamic −/+ indicator, full-border divider approximation).
2. Run `migrateAccordionListToPrimitives.ts` against a COPY of real data, spot-check several converted pages render correctly, THEN schedule the real run with the user's explicit go-ahead.
3. Once 0 pages reference `accordion-list`, retiring the `ENodeType` entry + deleting the component file becomes safe — a follow-up task, not part of this plan.
