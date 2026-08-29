// @vitest-environment jsdom
//
// This project's vitest.config.ts default is `environment: 'node'` (no DOM globals).
// Importing nodeRegistry.ts transitively pulls in every primitive .tsx component down
// to NodeRenderer.tsx, whose Solid-compiled JSX calls `delegateEvents()` at module
// load time — that needs `window`. This pragma opts just this file into jsdom, the
// same per-file override ContentEntryRepeaterInput.test.ts already uses for the same
// reason (jsdom is present in node_modules; no config change, no new dependency).
//
// jsdom's `window` doesn't implement `matchMedia` (a well-known jsdom gap) — GSAP's
// ScrollTrigger plugin registers itself as a side effect when nodeRegistry.ts's
// primitive-component imports transitively load animation/presetRegistry.ts, and that
// registration calls `matchMedia` at MODULE-EVALUATION time. A plain top-level stub
// wouldn't help here: static ESM imports are hoisted above a file's own code, so
// `nodeRegistry.ts` would already be evaluating before any stub assignment placed
// after a static `import` runs. Fixed by stubbing `matchMedia` first, then pulling in
// `node.constants.ts`/`nodeRegistry.ts` via dynamic `import()` inside `beforeAll` —
// dynamic imports resolve at the point they're awaited, not hoisted, so ordering is
// guaranteed correct.
import { describe, it, expect, beforeAll } from 'vitest';

if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

let ENodeType: typeof import('./node.constants')['ENodeType'];
let MIGRATION_ONLY_NODE_TYPES: typeof import('./node.constants')['MIGRATION_ONLY_NODE_TYPES'];
let SELF_RESOLVING_REPEAT_NODE_TYPES: typeof import('./node.constants')['SELF_RESOLVING_REPEAT_NODE_TYPES'];
let nodeTypeRegistry: typeof import('./nodeRegistry')['nodeTypeRegistry'];
let nodeRegistry: typeof import('./nodeRegistry')['nodeRegistry'];
let nodeCapabilities: typeof import('./nodeRegistry')['nodeCapabilities'];
let NODE_TYPE_META: typeof import('./nodeRegistry')['NODE_TYPE_META'];

// Dynamically importing nodeRegistry.ts transitively evaluates all 22+ primitive
// .tsx components (Task 4 added a 23rd) — Vite/esbuild transforming that whole graph
// cold routinely takes 9-11s on this machine, right at the edge of vitest's default
// 10000ms hookTimeout (observed intermittent failures at ~10-11s, confirmed
// pre-existing/not caused by any specific task — just this import graph's size).
// Explicit timeout so this genuinely-slow-but-correct hook doesn't flake in CI.
beforeAll(async () => {
    ({ ENodeType, MIGRATION_ONLY_NODE_TYPES, SELF_RESOLVING_REPEAT_NODE_TYPES } = await import('./node.constants'));
    ({ nodeTypeRegistry, nodeRegistry, nodeCapabilities, NODE_TYPE_META } = await import('./nodeRegistry'));
}, 30000);

describe('nodeTypeRegistry (Widget Registry v2)', () => {
    it('has an entry for every ENodeType value', () => {
        for (const type of Object.values(ENodeType)) {
            expect(nodeTypeRegistry[type], `missing descriptor for ${type}`).toBeDefined();
        }
    });

    it('derives nodeRegistry/nodeCapabilities/NODE_TYPE_META consistently from nodeTypeRegistry', () => {
        for (const [type, descriptor] of Object.entries(nodeTypeRegistry)) {
            expect(nodeRegistry[type]).toBe(descriptor.renderer);
            expect(nodeCapabilities[type]).toEqual(descriptor.capabilities);
            expect(NODE_TYPE_META[type]).toEqual({ icon: descriptor.icon, labelKey: descriptor.labelKey });
        }
    });

    it('gives every hand-authorable primitive (non-migration-only) a non-empty fieldSchema, except FRAME/TABLE/CARD_LIST (container/self-contained-list types with no generic Content tab)', () => {
        // Node-level data binding (2026-08-17): TABLE/CARD_LIST are configured entirely through
        // the Data Source Inspector tab (node.props.columns/.slots), same reason FRAME (a plain
        // container) has none — neither has a generic FieldRenderer-driven Content tab field.
        // CONTENT_DETAIL (Canvas Editor v2, Task 12) is by-design empty too — its Content tab is
        // the custom ContentDetailLayoutTab branch (NodeContentTab.tsx), not a fieldSchema loop.
        const NO_CONTENT_TAB = new Set<string>([ENodeType.FRAME, ENodeType.TABLE, ENodeType.CARD_LIST, ENodeType.CONTENT_DETAIL]);
        const handAuthorable = Object.values(ENodeType).filter((t) => !MIGRATION_ONLY_NODE_TYPES.has(t));
        for (const type of handAuthorable) {
            if (NO_CONTENT_TAB.has(type)) continue;
            expect(nodeTypeRegistry[type].fieldSchema.length, `${type} should have at least 1 field`).toBeGreaterThan(0);
        }
    });

    it('gives every migration-only type an empty fieldSchema (no Content tab, unchanged from Phase 0)', () => {
        for (const type of MIGRATION_ONLY_NODE_TYPES) {
            expect(nodeTypeRegistry[type].fieldSchema).toEqual([]);
        }
    });

    it('MIGRATION_ONLY_NODE_TYPES is now empty — all 14 legacy types ported (Canvas Editor v2, Tasks 3-17)', () => {
        expect(MIGRATION_ONLY_NODE_TYPES.size).toBe(0);
    });

    it('every self-contained-list repeat type (capabilities.repeat===true AND layoutChildren===false) is registered in SELF_RESOLVING_REPEAT_NODE_TYPES', () => {
        // Distinguishes the "resolves + iterates its own `repeat` internally" primitives
        // (TABLE/CARD_LIST/CHART) from FRAME, the only OTHER type with capabilities.repeat===true
        // — FRAME instead marks itself as a sibling-cloning TEMPLATE (layoutChildren:true) that
        // NodeChildrenList clones once per matched entry, the opposite mechanism. A future new
        // self-resolving type that sets repeat:true + layoutChildren:false on its registry entry
        // but forgets to also add itself to SELF_RESOLVING_REPEAT_NODE_TYPES would get WRONGLY
        // double-resolved (once by its own createResource, once by
        // NodeChildrenList/resolveRenderableChildren.ts treating it as a sibling-cloning
        // template) — this test catches that omission at registration time. (Task 2 of the Motion
        // System Unification roadmap deleted FEATURED_ENTRY/PROJECT_SHOWCASE/LOGO_GRID/MIXED_FEED,
        // which used to appear in both lists below — confirmed 0 real rows before deletion.)
        const selfContainedListTypes = Object.entries(nodeTypeRegistry)
            .filter(([, descriptor]) => descriptor.capabilities.repeat === true && descriptor.capabilities.layoutChildren === false)
            .map(([type]) => type);
        expect(selfContainedListTypes.sort()).toEqual(
            [...SELF_RESOLVING_REPEAT_NODE_TYPES].sort(),
        );
        expect([...SELF_RESOLVING_REPEAT_NODE_TYPES].sort()).toEqual(
            [ENodeType.TABLE, ENodeType.CARD_LIST, ENodeType.CHART].sort(),
        );
    });

    // Final-review fix (Critical): `staticSeries` used to be a `code` control, i.e. a plain
    // textarea persisting the RAW STRING typed into it with no parse step, while ChartNode
    // consumed it as `ChartPoint[]` — so the DEFAULT authoring path (seriesMode defaults to
    // 'static') produced a chart that always threw `points.map is not a function`. It is now
    // a repeater whose itemFields match ChartPoint's real shape exactly.
    it('Chart staticSeries is an object-repeater matching ChartPoint, NOT a raw code textarea', () => {
        const schema = nodeTypeRegistry[ENodeType.CHART].fieldSchema;
        const staticSeriesField = schema.find((f) => f.key === 'staticSeries')!;
        expect(staticSeriesField.control).toBe('repeater');
        expect(staticSeriesField.repeaterItemShape).toBe('object');
        expect(staticSeriesField.itemFields?.map((f) => f.key)).toEqual(['label', 'value']);
        expect(staticSeriesField.itemFields?.map((f) => f.control)).toEqual(['text', 'number']);
    });

    it('Chart seriesMode still defaults to static, the path the repeater above serves', () => {
        const schema = nodeTypeRegistry[ENodeType.CHART].fieldSchema;
        expect(schema.find((f) => f.key === 'seriesMode')!.defaultValue).toBe('static');
    });
});
