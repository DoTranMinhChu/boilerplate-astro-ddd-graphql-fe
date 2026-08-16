// src/modules/cms/node/mergeResponsiveOverride.ts
//
// Phase 3 (Responsive) — merges a partial per-breakpoint override onto a base
// style/layout, one sub-group at a time. A shallow `{ ...base, ...override }` at
// the TOP level would be wrong for StyleObject: if a tablet override only sets
// `typography.size`, a naive shallow merge would replace the ENTIRE `typography`
// sub-object, silently losing the base's `typography.color`/`fontFamily`/etc. This
// merges each present sub-group's OWN fields, leaving absent sub-groups (and
// absent fields within a present sub-group) untouched from `base`.
import type { StyleObject, LayoutProps } from './node.types';

export function mergeStyleOverride(base: StyleObject, override?: Partial<StyleObject>): StyleObject {
    if (!override) return base;
    const merged: StyleObject = { ...base };
    for (const key of Object.keys(override) as (keyof StyleObject)[]) {
        const overrideValue = override[key];
        if (overrideValue === undefined) continue;
        if (key === 'shadow') {
            // shadow is an array (ordered layers), not a flat sub-object — an
            // override REPLACES the whole array rather than merging field-by-field
            // (there's no "field" within an array entry to selectively keep).
            merged.shadow = overrideValue as StyleObject['shadow'];
            continue;
        }
        merged[key] = { ...(base[key] as object ?? {}), ...(overrideValue as object) } as any;
    }
    return merged;
}

/** LayoutProps is flat (no nested sub-groups like StyleObject) — a shallow merge
 * is correct here: each individual field (x, y, width, gap, order, ...) is
 * independently overridable, there's no sub-object whose OTHER fields could be
 * accidentally dropped. */
export function mergeLayoutOverride(base: LayoutProps, override?: Partial<LayoutProps>): LayoutProps {
    if (!override) return base;
    return { ...base, ...override };
}
