// src/modules/cms/cms.constants.ts
//
// Central definitions for every enum-like value used across the CMS module —
// section type keys, data-source modes, sort directions, style themes,
// animation presets/speeds, feature icon keys. Import the const object instead
// of retyping the string literal: a typo becomes a compile error instead of a
// silent runtime mismatch, and renaming a value only touches one place.
//
// These are plain `as const` objects (not TS `enum`) because the values are
// also what's stored verbatim in `Section.content`/`dataSource` JSONB columns —
// a real TS `enum` would add a runtime object with numeric reverse-mappings we
// don't want serialized. `EFoo.BAR` still gives full autocomplete + type safety.

export const ESectionType = {
    HERO: 'hero',
    TEXT_IMAGE: 'text-image',
    CTA: 'cta',
    CONTENT_GRID: 'content-grid',
    CONTENT_DETAIL: 'content-detail',
    MEDIA_HERO: 'media-hero',
    INTRO_RAIL: 'intro-rail',
    PROJECT_SHOWCASE: 'project-showcase',
    SPOTLIGHT_LIST: 'spotlight-list',
    LOGO_GRID: 'logo-grid',
    STAT_METRICS: 'stat-metrics',
    TIMELINE_LIST: 'timeline-list',
    ACCORDION_LIST: 'accordion-list',
    PROCESS_STEPS: 'process-steps',
    CONTACT_COLUMNS: 'contact-columns',
    INQUIRY_FORM: 'inquiry-form',
    FEATURED_ENTRY: 'featured-entry',
    RELATED_ENTRIES: 'related-entries',
    MIXED_FEED: 'mixed-feed',
    CUSTOM_BLOCK: 'custom-block',
    BACKLINK_ENTRIES: 'backlink-entries',
} as const;
export type ESectionType = (typeof ESectionType)[keyof typeof ESectionType];

export const ECustomElementType = {
    HEADING: 'heading',
    TEXT: 'text',
    IMAGE: 'image',
    BUTTON: 'button',
    SPACER: 'spacer',
    DIVIDER: 'divider',
} as const;
export type ECustomElementType = (typeof ECustomElementType)[keyof typeof ECustomElementType];

export const EDataSourceMode = { MANUAL: 'manual', DYNAMIC: 'dynamic', DETAIL: 'detail' } as const;
export type EDataSourceMode = (typeof EDataSourceMode)[keyof typeof EDataSourceMode];

export const ESortDirection = { ASC: 'ASC', DESC: 'DESC' } as const;
export type ESortDirection = (typeof ESortDirection)[keyof typeof ESortDirection];

export const ESectionTheme = { LIGHT: 'light', DARK: 'dark', BRAND: 'brand' } as const;
export type ESectionTheme = (typeof ESectionTheme)[keyof typeof ESectionTheme];

export const EImagePosition = { LEFT: 'left', RIGHT: 'right' } as const;
export type EImagePosition = (typeof EImagePosition)[keyof typeof EImagePosition];

export const ESpacing = { SM: 'sm', MD: 'md', LG: 'lg' } as const;
export type ESpacing = (typeof ESpacing)[keyof typeof ESpacing];

export const EAnimationSpeed = { SLOW: 'slow', MEDIUM: 'medium', FAST: 'fast' } as const;
export type EAnimationSpeed = (typeof EAnimationSpeed)[keyof typeof EAnimationSpeed];

export const EAnimationPreset = {
    NONE: 'none',
    FADE_IN: 'fade-in',
    FADE_UP: 'fade-up',
    FADE_DOWN: 'fade-down',
    SLIDE_LEFT: 'slide-left',
    SLIDE_RIGHT: 'slide-right',
    SCALE_IN: 'scale-in',
    TEXT_REVEAL: 'text-reveal',
    STAGGER_CHILDREN: 'stagger-children',
} as const;
export type EAnimationPreset = (typeof EAnimationPreset)[keyof typeof EAnimationPreset];

export const EFeatureIcon = { DESIGN: 'design', QUALITY: 'quality', PRICE: 'price' } as const;
export type EFeatureIcon = (typeof EFeatureIcon)[keyof typeof EFeatureIcon];
