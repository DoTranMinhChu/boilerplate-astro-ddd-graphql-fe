// src/modules/cms/node/mergeResponsiveOverride.ts
//
// Phase 3 (Responsive) — merges a partial per-breakpoint override onto a base
// style/layout. A shallow `{ ...base, ...override }` at the TOP level would be wrong
// for StyleObject: if a tablet override only sets `typography.size`, a naive shallow
// merge would replace the ENTIRE `typography` sub-object, silently losing the base's
// `typography.color`/`fontFamily`/etc.
//
// Phase 3 bugfix — merging exactly ONE level deep (per sub-group) was still not enough:
// several StyleObject sub-groups contain their OWN nested objects (`spacing.padding`,
// `spacing.margin`, `border.radius`; `LayoutProps.constraints` on the layout side), and
// `applyNodeStyle` reads those nested fields with `?? 0` fallbacks. A mobile override of
// `{ spacing: { padding: { t: 8 } } }` on a node whose desktop padding is `20/20/20/20`
// therefore replaced the whole `padding` object and silently rendered
// `padding: 8px 0px 0px 0px` — collapsing right/bottom/left to zero. That directly
// contradicts the promise the Inspector makes to the admin in its own amber hint
// ("để trống 1 trường nghĩa là giữ theo Máy tính (Desktop)" — an unset field inherits
// from Desktop). The merge is now recursive over plain objects at every depth.
import type { StyleObject, LayoutProps, ResponsiveOverrides, Breakpoint } from './node.types';

function isPlainObject(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Recursive merge over PLAIN objects only. Arrays and primitives are replaced
 * wholesale by the override — notably `StyleObject.shadow`, an ORDERED LIST of shadow
 * layers: there is no "field" inside an array entry to selectively keep, so an override
 * that mentions `shadow` at all replaces the whole stack (same rule as before this fix).
 * Always allocates fresh objects — never returns a sub-object of `base` OR of `override`
 * by reference, so a merged result can never alias live store state. */
function deepMerge<T extends Record<string, any>>(base: T, override: Record<string, any>): T {
    const merged: Record<string, any> = { ...base };
    for (const key of Object.keys(override)) {
        const overrideValue = override[key];
        // An explicitly-`undefined` field means "not overridden" (that is exactly what
        // NodeStyleTab writes when a control is cleared, e.g. `size: v ?? undefined`), so it
        // must NOT wipe the base's value.
        if (overrideValue === undefined) continue;
        merged[key] = isPlainObject(overrideValue)
            ? deepMerge(isPlainObject(merged[key]) ? merged[key] : {}, overrideValue)
            : overrideValue;
    }
    return merged as T;
}

export function mergeStyleOverride(base: StyleObject, override?: Partial<StyleObject>): StyleObject {
    if (!override) return base;
    return deepMerge(base, override);
}

/** LayoutProps is almost entirely flat (x, y, width, gap, order, ...) — each field is
 * independently overridable. `constraints` is the one nested sub-object, and goes
 * through the same recursive merge so overriding `constraints.horizontal` alone doesn't
 * drop `constraints.vertical`. */
export function mergeLayoutOverride(base: LayoutProps, override?: Partial<LayoutProps>): LayoutProps {
    if (!override) return base;
    return deepMerge(base, override);
}

/** final-review fix round 4: the SAME desktop-first (tablet then mobile) cascade
 * `applyNodeStyle.ts` performs internally to compute flat CSS — extracted here so any
 * OTHER consumer that needs the merged, STILL-STRUCTURED StyleObject (not flattened CSS)
 * can share exactly one implementation instead of growing its own copy. This is precisely
 * how the round-4 bug happened: `FrameNode.tsx`'s `effectiveStyle()` (round 3) inlined its
 * own copy of this cascade for the video/breathe background layers, but
 * `applyNodeBackgroundAnimation.ts`'s `buildBackgroundAnimationCss` was never updated to
 * match, so a `background.animate:'breathe'` set only inside `responsiveOverrides.mobile`
 * rendered the `data-breathe-id` DOM layer (FrameNode.tsx correctly merges overrides) but
 * emitted no matching `@keyframes`/`animation` CSS at all (this function still only saw
 * desktop). Both `FrameNode.tsx` and `buildBackgroundAnimationCss` now call this one
 * function — see node.types.ts's `ResponsiveOverrides` doc and `applyNodeStyle.ts`'s own
 * matching comment for why the cascade order is tablet-then-mobile (mobile inherits from
 * tablet, which inherits from desktop). */
export function resolveEffectiveStyle(style: StyleObject | undefined, responsiveOverrides: ResponsiveOverrides | undefined, breakpoint: Breakpoint): StyleObject {
    let effective = style ?? {};
    if (breakpoint === 'tablet' || breakpoint === 'mobile') {
        effective = mergeStyleOverride(effective, responsiveOverrides?.tablet?.style);
    }
    if (breakpoint === 'mobile') {
        effective = mergeStyleOverride(effective, responsiveOverrides?.mobile?.style);
    }
    return effective;
}
