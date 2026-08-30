// src/modules/cms/artDirectionKit.types.ts
//
// FE mirror of ddd-graphql-be/src/modules/artDirectionKit/domain/entities/artDirectionKit.entity.ts
// (`KitTemplate`) and .../domain/constants/artDirectionKit.constants.ts — kept in lockstep BY HAND,
// same convention as theme.types.ts mirroring theme.entity.ts. `templates` is the Mixed scalar on
// the wire (codegen produces `string`), narrowed to `KitTemplate[]` in artDirectionKit.service.ts's
// DTO override — the one cast point for this service.

/** One page template a kit can start a page from. */
export interface KitTemplate {
    templateKey: string;
    label: string;
    /** ORDERED ComponentDefinition ids (each a curated Section, i.e. `category` set). */
    sectionComponentIds: string[];
}

export const ART_DIRECTION_KIT_INDUSTRIES = ['gaming', 'education', 'pet', 'restaurant', 'generic'] as const;

export type ArtDirectionKitIndustry = (typeof ART_DIRECTION_KIT_INDUSTRIES)[number];
