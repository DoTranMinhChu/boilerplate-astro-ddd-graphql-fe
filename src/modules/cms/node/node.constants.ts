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

export const ELayoutMode = { FLOW: 'flow', FREE: 'free' } as const;
export type ELayoutMode = (typeof ELayoutMode)[keyof typeof ELayoutMode];

export const MAX_TREE_DEPTH = 30;
export const MAX_NODES_PER_PAGE = 500;
