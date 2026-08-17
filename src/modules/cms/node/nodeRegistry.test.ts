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
    ({ ENodeType, MIGRATION_ONLY_NODE_TYPES } = await import('./node.constants'));
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
        const NO_CONTENT_TAB = new Set<string>([ENodeType.FRAME, ENodeType.TABLE, ENodeType.CARD_LIST]);
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

    it('MediaHero fieldSchema round-trips through content.* (Canvas Editor v2, Task 3)', async () => {
        const { getAtPath, setAtPath } = await import('../admin/nodeBuilder/NodeContentTab');
        const schema = nodeTypeRegistry[ENodeType.MEDIA_HERO].fieldSchema;
        expect(schema.map((f) => f.key)).toEqual(['content.image', 'content.caption', 'content.arrowHref']);
        let props: Record<string, any> = {};
        for (const field of schema) props = setAtPath(props, field.key, `v-${field.key}`);
        for (const field of schema) expect(getAtPath(props, field.key)).toBe(`v-${field.key}`);
    });

    it('IntroRail fieldSchema round-trips scalars + features repeater (Task 4)', async () => {
        const { getAtPath, setAtPath } = await import('../admin/nodeBuilder/NodeContentTab');
        const schema = nodeTypeRegistry[ENodeType.INTRO_RAIL].fieldSchema;
        expect(schema.map((f) => f.key)).toEqual([
            'content.railTitle', 'content.railArrowHref', 'content.railServiceTitle',
            'content.railServiceText', 'content.heading', 'content.lead', 'content.features', 'content.featureColumns',
        ]);
        const featuresField = schema.find((f) => f.key === 'content.features')!;
        expect(featuresField.control).toBe('repeater');
        expect(featuresField.repeaterItemShape).toBe('object');
        expect(featuresField.itemFields?.map((f) => f.key)).toEqual(['image', 'text']);
        let props: Record<string, any> = setAtPath({}, 'content.features', [{ image: 'a.png', text: 'A' }]);
        expect(getAtPath(props, 'content.features')).toEqual([{ image: 'a.png', text: 'A' }]);
    });
});
