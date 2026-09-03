// src/modules/cms/node/node.constants.ts
// Same `as const` pattern as ESectionType/ECustomElementType — plain objects, never a
// real TS enum, because values are serialized verbatim into the `type` jsonb column.

export const ENodeType = {
    FRAME: 'frame',
    TEXT: 'text',
    IMAGE: 'image',
    SHAPE: 'shape',
    VIDEO: 'video',
    ICON: 'icon',
    BUTTON: 'button',
    FORM_EMBED: 'form-embed',
    // Phase 2 (Widget Registry v2) — new hand-authorable primitive, NOT migration-only:
    // raw HTML/CSS/JS embed with 3 selectable isolation modes (see CustomCodeNode.tsx).
    CUSTOM_CODE: 'custom-code',
    // Node-level data binding (2026-08-17) — self-contained list renderers, resolve + iterate
    // their own `repeat` config internally (NOT sibling-cloning templates like FRAME — see
    // SELF_RESOLVING_REPEAT_NODE_TYPES below).
    TABLE: 'table',
    CARD_LIST: 'card-list',
    CHART: 'chart',
    CONTENT_DETAIL: 'content-detail',
} as const;
export type ENodeType = (typeof ENodeType)[keyof typeof ENodeType];

/** Phase 0 M2c: 14 loại M2b (12 editorial + content-detail + mixed-feed) chỉ được TẠO bởi
 * `migrateSectionsToNodes.ts` (BE) — không loại nào trong 14 có Inspector tab (Style/
 * DataBinding/Content) để admin CẤU HÌNH sau khi tạo. `NodePalette.tsx` dùng set này để ẩn
 * chúng khỏi danh sách "thêm khối mới" (final whole-branch review, M2b), tránh tạo ra 1 khối
 * không sửa được gì. Node đã tồn tại trong cây (từ migration) KHÔNG bị ảnh hưởng — vẫn render
 * đầy đủ, chỉ ẩn khỏi palette. Xoá khỏi set này (và thêm Inspector tab tương ứng) khi 1 loại
 * được nâng cấp thành hand-authorable thật.
 *
 * Canvas Editor v2, Task 17: MIXED_FEED (the last of the 14) has now been upgraded to
 * hand-authorable (repeat.sources + Content-tab fieldSchema, see nodeRegistry.ts) — this set is
 * now INTENTIONALLY EMPTY. All 14 legacy Section-migrated types have been ported (Phases 2-4,
 * Tasks 3-17). See nodeRegistry.test.ts's explicit "is now empty" assertion. */
export const MIGRATION_ONLY_NODE_TYPES = new Set<string>([]);

/** Node-level data binding (2026-08-17) — node types whose `repeat` is resolved and iterated
 * INTERNALLY by their own renderer (one `<table>`/one grid, N rows/cards inside it) — as opposed
 * to FRAME, where `repeat` marks the node as a TEMPLATE its parent's `NodeChildrenList` clones
 * once per entry (N sibling copies). `NodeChildrenList`'s `repeatNodes` filter and
 * `resolveRenderableChildren.ts` both exclude this set from the sibling-cloning path — without
 * this, a Table node would itself get cloned once per matched row (N separate `<table>` elements
 * instead of one table with N rows). */
export const SELF_RESOLVING_REPEAT_NODE_TYPES = new Set<string>([
    ENodeType.TABLE,
    ENodeType.CARD_LIST,
    ENodeType.CHART,
]);

export const ELayoutMode = { FLOW: 'flow', FREE: 'free' } as const;
export type ELayoutMode = (typeof ELayoutMode)[keyof typeof ELayoutMode];

/** Discriminant for `FrameBehaviorConfig.type` (FrameNode.tsx) — declared here, alongside
 * `ELayoutMode`/`ENodeType`, rather than in `FrameNode.tsx` itself, deliberately: a real test
 * regression (Task 13) showed that importing a VALUE (not `import type`) from `FrameNode.tsx`
 * forces that module's entire runtime — GSAP/ScrollTrigger, `NodeRenderer.tsx`, the whole
 * Tooltip/Floating chain — to evaluate wherever it's imported, which broke
 * `resolveRenderableChildren.test.ts` (no `window` in its plain-function test environment) and
 * `NodeContainerLayoutTab.test.tsx` (`window.matchMedia` unmocked in its jsdom environment) the
 * moment they needed this discriminant as a real value rather than only the (type-erased,
 * already-safe) `FrameBehaviorConfig` interface. `node.constants.ts` has zero runtime
 * dependencies of its own, so importing a value from here is always safe. */
export const EFrameBehaviorType = { ACCORDION_ITEM: 'accordion-item', SPOTLIGHT_LIST: 'spotlight-list', CAROUSEL: 'carousel' } as const;
export type EFrameBehaviorType = (typeof EFrameBehaviorType)[keyof typeof EFrameBehaviorType];

/** Discriminant for `CustomCodeProps.isolationMode` (CustomCodeNode.tsx) — relocated here
 * (final whole-branch review, Minor #5) for the SAME reason Task 13 relocated
 * `EFrameBehaviorType` above: `nodeRegistry.ts` needs this as a real VALUE (its Content-tab
 * field-schema `options` list, not just the type), and `CustomCodeNode.tsx` is a node
 * PRIMITIVE component — pulling a value import from it into the shared registry drags along
 * its whole runtime (GSAP `useNodeAnimation`, `applyNodeStyle`, `NodeRenderer.tsx`'s primitive
 * dispatch chain) wherever that value is needed. No NEW bundle regression exists today
 * (`nodeRegistry.ts` already value-imports `CustomCodeNode` itself, for component
 * registration), but keeping the discriminant here — the same shared, zero-runtime-dependency
 * home as `EFrameBehaviorType`/`ENodeType`/`ELayoutMode` — is the consistent, defensive choice
 * regardless of what any one current importer happens to already pull in. */
export const ECodeIsolationMode = { DIRECT: 'direct', SHADOW: 'shadow', SANDBOXED: 'sandboxed' } as const;
export type ECodeIsolationMode = (typeof ECodeIsolationMode)[keyof typeof ECodeIsolationMode];

export const MAX_TREE_DEPTH = 30;
export const MAX_NODES_PER_PAGE = 500;
