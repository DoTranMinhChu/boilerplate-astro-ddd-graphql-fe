// src/modules/cms/node/section.constants.ts
//
// Section/Pattern Library (Phase 6) — FE mirror of
// `ddd-graphql-be/src/modules/component/domain/constants/section.constants.ts`. Same `as const`
// pattern as `ENodeType` in node.constants.ts — plain object/array, never a real TS enum,
// because the value is serialized verbatim into `ComponentDefinition.category`.
//
// Kept in lockstep with the BE copy BY HAND (there is no shared package or codegen between the
// two repos — same convention as theme.types.ts mirroring theme.entity.ts).
export const SECTION_CATEGORIES = [
    'hero',
    'feature-grid',
    'editorial',
    'stats',
    'logo-wall',
    'testimonial',
    'menu-list',
    'gallery',
    'cta',
    'pricing',
    'faq',
    'contact-booking',
] as const;

export type SectionCategory = (typeof SECTION_CATEGORIES)[number];

/** i18n key per category for the Palette's "Sections" tab group headers. Values live in
 * cms.i18n.ts under `cms.nodeBuilder.sectionCategories.*` and are read via `tOrLiteral`, the
 * same helper every other dynamic (non-literal-typed) palette label already uses. */
export const SECTION_CATEGORY_LABEL_KEYS: Record<SectionCategory, string> = {
    'hero': 'cms.nodeBuilder.sectionCategories.hero',
    'feature-grid': 'cms.nodeBuilder.sectionCategories.featureGrid',
    'editorial': 'cms.nodeBuilder.sectionCategories.editorial',
    'stats': 'cms.nodeBuilder.sectionCategories.stats',
    'logo-wall': 'cms.nodeBuilder.sectionCategories.logoWall',
    'testimonial': 'cms.nodeBuilder.sectionCategories.testimonial',
    'menu-list': 'cms.nodeBuilder.sectionCategories.menuList',
    'gallery': 'cms.nodeBuilder.sectionCategories.gallery',
    'cta': 'cms.nodeBuilder.sectionCategories.cta',
    'pricing': 'cms.nodeBuilder.sectionCategories.pricing',
    'faq': 'cms.nodeBuilder.sectionCategories.faq',
    'contact-booking': 'cms.nodeBuilder.sectionCategories.contactBooking',
};

export function isSectionCategory(value: unknown): value is SectionCategory {
    return typeof value === 'string' && (SECTION_CATEGORIES as readonly string[]).includes(value);
}
