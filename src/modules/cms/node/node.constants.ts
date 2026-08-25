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
    // Phase 0 M2b: 12 editorial widgets + 2 self-contained primitives (giá trị string PHẢI khớp
    // đúng ESectionType tương ứng trong cms.constants.ts — migrateSectionsToNodes.ts (BE) viết
    // `type: section.type` nguyên trạng cho 12 loại editorial, xem Task 8).
    MEDIA_HERO: 'media-hero',
    INTRO_RAIL: 'intro-rail',
    SPOTLIGHT_LIST: 'spotlight-list',
    STAT_METRICS: 'stat-metrics',
    TIMELINE_LIST: 'timeline-list',
    PROCESS_STEPS: 'process-steps',
    CONTACT_COLUMNS: 'contact-columns',
    ACCORDION_LIST: 'accordion-list',
    INQUIRY_FORM: 'inquiry-form',
    PROJECT_SHOWCASE: 'project-showcase',
    LOGO_GRID: 'logo-grid',
    FEATURED_ENTRY: 'featured-entry',
    CONTENT_DETAIL: 'content-detail',
    MIXED_FEED: 'mixed-feed',
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
    // Canvas Editor v2, Task 14: FeaturedEntryNode migrated off its legacy
    // node.props.dataSource/fieldMapping read path onto node.repeat (cardinality:'one') +
    // fetchRepeatEntries — SAME "resolves its own `repeat` internally" shape as TABLE/CARD_LIST
    // above, not a FRAME-style sibling-cloning template. Without this entry, a FeaturedEntry
    // node placed as a CHILD of some other container would get double-resolved: once correctly
    // by FeaturedEntryNode.tsx's own createResource, and once WRONGLY by
    // NodeChildrenList/resolveRenderableChildren.ts treating its `repeat` as a template to clone
    // (N sibling copies bound via `contextEntry`, which FeaturedEntryNode.tsx never reads).
    ENodeType.FEATURED_ENTRY,
    // Canvas Editor v2, Task 15: ProjectShowcaseNode migrated off its legacy
    // node.props.dataSource/fieldMapping read path onto node.repeat (cardinality:'many') +
    // fetchRepeatEntries — same "resolves its own `repeat` internally" shape as
    // TABLE/CARD_LIST/FEATURED_ENTRY above (its own createResource iterates the whole entry
    // list to drive the carousel), not a FRAME-style sibling-cloning template.
    ENodeType.PROJECT_SHOWCASE,
    // Canvas Editor v2, Task 16: LogoGridNode migrated off its legacy
    // node.props.dataSource/fieldMapping read path onto node.repeat (cardinality:'many') +
    // fetchRepeatEntries — same "resolves its own `repeat` internally" shape as
    // TABLE/CARD_LIST/FEATURED_ENTRY/PROJECT_SHOWCASE above (its own createResource iterates the
    // whole entry list to render the logo grid), not a FRAME-style sibling-cloning template.
    ENodeType.LOGO_GRID,
    // Canvas Editor v2, Task 17 (last of the 4-task migration arc): MixedFeedNode migrated off
    // its legacy node.props.dataSource (MixedFeedNodeDataSource) read path onto node.repeat
    // (source:'mixed') + fetchRepeatEntries — same "resolves its own `repeat` internally" shape
    // as TABLE/CARD_LIST/FEATURED_ENTRY/PROJECT_SHOWCASE/LOGO_GRID above (its own createResource
    // iterates the whole entry list, mapping each entry's fields via its own contentTypeId), not
    // a FRAME-style sibling-cloning template.
    ENodeType.MIXED_FEED,
]);

/** "Retire specialized node types" roadmap (docs/superpowers/specs/2026-08-20-retire-specialized-
 * node-types-roadmap.md, completed 2026-08-24) — every type in this set now has an equivalent,
 * user-approved composition of true primitives (FRAME behaviors, DataBinding modes, Text
 * capabilities) that can build the same result, so `NodePalette.tsx`'s "add new element" picker
 * excludes them: new content should be composed from primitives, not these bespoke shortcuts.
 *
 * Unlike `MIGRATION_ONLY_NODE_TYPES` above, membership here does NOT mean "no Inspector tab" —
 * every type below still has a full, working Content/Style/DataBinding/Animation/Visibility tab
 * set, because existing pages still contain real instances of them (each type's BE migration
 * script, e.g. `migrateProjectShowcaseToPrimitives.ts`, converts old rows to primitive
 * compositions, but has NOT been run against real data yet — that's a separate, explicit,
 * human-authorized step for every type here, not automated). So `nodeRegistry`/`nodeCapabilities`/
 * `nodeTypeRegistry[type].fieldSchema` are intentionally UNCHANGED — only the palette is filtered.
 *
 * Once a type's migration script has actually run and 0 pages reference it, remove it from this
 * set is the WRONG next step — remove the type from `ENodeType`/`nodeTypeRegistry` entirely (and
 * delete its component file), since at that point nothing needs it to keep rendering either. */
export const RETIRED_NODE_TYPES = new Set<string>([
    ENodeType.MEDIA_HERO,
    ENodeType.INTRO_RAIL,
    ENodeType.SPOTLIGHT_LIST,
    ENodeType.STAT_METRICS,
    ENodeType.TIMELINE_LIST,
    ENodeType.PROCESS_STEPS,
    ENodeType.CONTACT_COLUMNS,
    ENodeType.ACCORDION_LIST,
    ENodeType.INQUIRY_FORM,
    ENodeType.PROJECT_SHOWCASE,
    ENodeType.LOGO_GRID,
    ENodeType.FEATURED_ENTRY,
    ENodeType.MIXED_FEED,
]);

export const ELayoutMode = { FLOW: 'flow', FREE: 'free' } as const;
export type ELayoutMode = (typeof ELayoutMode)[keyof typeof ELayoutMode];

export const MAX_TREE_DEPTH = 30;
export const MAX_NODES_PER_PAGE = 500;
