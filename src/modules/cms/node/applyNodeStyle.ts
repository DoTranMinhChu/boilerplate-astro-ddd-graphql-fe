// src/modules/cms/node/applyNodeStyle.ts
import type { StyleObject, ResponsiveOverrides, Breakpoint } from './node.types';
import { normalizeTypographyColor } from './node.types';
import { mergeStyleOverride } from './mergeResponsiveOverride';
import { isThemeColorTokenRef, type ThemeColorTokenRef } from '@/modules/theme/theme.types';
import { resolveTypographyRoleCss } from './resolveTypographyRoleCss';

/** A theme-token color reference resolves to `var(--color-<key>)`; a raw string passes through
 * unchanged. Centralizing this in one place (rather than repeating the `isThemeColorTokenRef`
 * check at each of the 3 call sites below) keeps the 3 color-bearing fields — typography.color,
 * background.value, border.color — behaving identically. */
// Uses the real `ThemeColorTokenRef` type (not a hand-written `{ tokenRef: string }` shape) so
// `isThemeColorTokenRef`'s `value is ThemeColorTokenRef` predicate can actually narrow the `else`
// branch below to plain `string` — a locally-shaped duplicate type isn't structurally excludable
// by TS in the negative branch (its `tokenRef` is general `string`, not `keyof ThemeColorSet`),
// which is what regressed `npx astro check` to 0→14 errors when Task 10 widened these fields.
export function resolveColorValue(value: string | ThemeColorTokenRef | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (isThemeColorTokenRef(value)) return `var(--color-${value.tokenRef.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)})`;
    return value;
}

/** StyleObject (admin-facing, structured) → flat CSS property map ready for a
 * Solid `style={...}` prop. Every branch is independently additive — an empty
 * sub-object contributes nothing.
 *
 * Phase 3 (Responsive) — optional 2nd/3rd params activate responsiveOverrides:
 * when both are supplied and `breakpoint` is 'tablet' or 'mobile', the matching
 * override bucket(s) are deep-merged onto `style` (desktop-first cascade — at
 * 'mobile', BOTH tablet's and mobile's overrides apply, tablet's first) before
 * computing CSS. Callers that don't pass them (the 1-arg call) get byte-for-byte
 * the same output as before this phase — zero behavior change for any node
 * without responsiveOverrides set. */
export function applyNodeStyle(style: StyleObject): Record<string, string>;
export function applyNodeStyle(style: StyleObject, responsiveOverrides: ResponsiveOverrides | undefined, breakpoint: Breakpoint): Record<string, string>;
export function applyNodeStyle(style: StyleObject, responsiveOverrides?: ResponsiveOverrides, breakpoint?: Breakpoint): Record<string, string> {
    let effective = style;
    if (responsiveOverrides && breakpoint) {
        if (breakpoint === 'tablet' || breakpoint === 'mobile') {
            effective = mergeStyleOverride(effective, responsiveOverrides.tablet?.style);
        }
        if (breakpoint === 'mobile') {
            effective = mergeStyleOverride(effective, responsiveOverrides.mobile?.style);
        }
    }

    const css: Record<string, string> = {};

    if (effective.spacing) {
        const { padding, margin, gap } = effective.spacing;
        // Post-final-review fix (N1): a truthy `padding`/`margin` OBJECT isn't enough — the
        // Inspector's SpacingControl (see SpacingControl.tsx's `setSide` in "linked" mode) can
        // write `{ t: undefined, r: undefined, b: undefined, l: undefined }` when an admin clears
        // a previously-set value (the object survives, every side doesn't). Emitting the shorthand
        // for that shape produces `padding: 0px 0px 0px 0px` — which, on a `containerWidth`-set
        // FRAME, is declared AFTER (and so silently defeats) `applyContainerLayout`'s token-derived
        // `padding-block`, even though that function's own `hasExplicitPad` guard correctly saw no
        // side was actually set and correctly still emitted the token. Require at least one side to
        // hold an actual defined value before emitting the shorthand at all — same "explicit means
        // an actual value, not just an existing object" rule `hasExplicitPad` already follows.
        const hasPaddingSide = padding && (padding.t !== undefined || padding.r !== undefined || padding.b !== undefined || padding.l !== undefined);
        if (hasPaddingSide) css.padding = `${padding.t ?? 0}px ${padding.r ?? 0}px ${padding.b ?? 0}px ${padding.l ?? 0}px`;
        const hasMarginSide = margin && (margin.t !== undefined || margin.r !== undefined || margin.b !== undefined || margin.l !== undefined);
        if (hasMarginSide) css.margin = `${margin.t ?? 0}px ${margin.r ?? 0}px ${margin.b ?? 0}px ${margin.l ?? 0}px`;
        if (gap !== undefined) css.gap = `${gap}px`;
    }

    if (effective.size) {
        const { width, height, minW, maxW, minH, maxH, objectFit } = effective.size;
        if (width) css.width = width;
        if (height) css.height = height;
        if (minW) css['min-width'] = minW;
        if (maxW) css['max-width'] = maxW;
        if (minH) css['min-height'] = minH;
        if (maxH) css['max-height'] = maxH;
        // Only meaningful on <img>/<video> — harmless no-op CSS on any other element, so this
        // is safe to emit unconditionally rather than needing per-node-type branching here.
        if (objectFit) css['object-fit'] = objectFit;
    }

    // General overflow-clipping ("Tràn nội dung" — NodeStyleTab.tsx's Effects section). Placed
    // BEFORE the typography branch below on purpose: `typography.maxLines` (line-clamp) needs
    // `overflow: hidden` to work at all, so it deliberately overwrites whatever this branch sets
    // — a node with both set always keeps its clamp functional regardless of this pick.
    if (effective.overflow) css.overflow = effective.overflow;

    if (effective.typography) {
        const t = effective.typography;
        // Typography role (Task 10/11) — a fluid clamp() from the theme's scale for this role,
        // applied FIRST so any explicit fontFamily/size/weight/lineHeight/letterSpacing below
        // still wins (same "explicit overrides role default" rule the rest of this function
        // follows). Resolves to var(--type-<role>-*) references (see resolveTypographyRoleCss.ts)
        // rather than a hardcoded px number, so a role automatically follows whichever theme is
        // active. final-review fix (Important #4): also resolves `font-family` now
        // (`var(--font-display)`/`var(--font-body)`) — previously `typography.role` never set a
        // font-family at all, even though the theme layer already injects those custom
        // properties AND loads their Google Font `<link>`s; nothing ever consumed them.
        if (t.role) {
            const roleCss = resolveTypographyRoleCss(t.role);
            css['font-family'] = roleCss.fontFamily;
            css['font-size'] = roleCss.fontSize;
            css['font-weight'] = roleCss.fontWeight;
            css['line-height'] = roleCss.lineHeight;
            css['letter-spacing'] = roleCss.letterSpacing;
            if (roleCss.textWrap) css['text-wrap'] = roleCss.textWrap;
            // "Explicit beats token default" — an explicit style.size.width means the admin
            // has already deliberately constrained this node's width; the role's measure
            // default would be redundant or fight that explicit choice.
            if (roleCss.maxWidth && effective.size?.width === undefined) css['max-width'] = roleCss.maxWidth;
        }
        // Moved below the `t.role` block (final-review fix Important #4) — an explicit
        // `t.fontFamily` must win over the role's font-family default, same as every other
        // explicit typography field below; it used to run BEFORE the role block, which was
        // harmless only because the role branch never touched `font-family` until now.
        if (t.fontFamily) css['font-family'] = t.fontFamily;
        if (t.size !== undefined) css['font-size'] = `${t.size}px`;
        if (t.weight !== undefined) css['font-weight'] = String(t.weight);
        if (t.lineHeight !== undefined) css['line-height'] = String(t.lineHeight);
        if (t.letterSpacing !== undefined) css['letter-spacing'] = `${t.letterSpacing}px`;
        // Runtime safety net: a Node styled before `typography.color` became a `{type,value}`
        // union (stale DB row, or an un-migrated call site behind an `as any` cast — see
        // `manageCmsPages.page.tsx`'s `seedSamplePage()`) still has a plain hex string here at
        // runtime. Normalize it to `solid` mode instead of matching none of the branches below
        // and silently emitting no color at all.
        const normalizedColor = normalizeTypographyColor(t.color);
        if (normalizedColor) {
            if (normalizedColor.type === 'solid') {
                css.color = resolveColorValue(normalizedColor.value) ?? '';
            } else if ((normalizedColor.type === 'image' || normalizedColor.type === 'gradient') && normalizedColor.value) {
                const resolved = resolveColorValue(normalizedColor.value)!;
                css['background-image'] = normalizedColor.type === 'image' ? `url(${resolved})` : resolved;
                css['background-clip'] = 'text';
                css['-webkit-background-clip'] = 'text';
                css.color = 'transparent';
            }
            // type === 'video': cannot be expressed via inline style at all (a <video> element
            // isn't a valid background-image source) — TextNode.tsx renders the real <video> +
            // SVG mask pair itself when it sees this type, reading `normalizedColor.value` directly.
        }
        if (t.align) css['text-align'] = t.align;
        if (t.transform) css['text-transform'] = t.transform;
        if (t.decoration) css['text-decoration'] = t.decoration;
        // Line-clamp truncation ("Số dòng tối đa" — NodeStyleTab.tsx) — the standard 4-property
        // combo every browser needs for multi-line `-webkit-line-clamp` (still vendor-prefixed
        // everywhere despite the name; there is no unprefixed equivalent with matching support).
        // Deliberately OVERWRITES `overflow` after the top-level `effective.overflow` branch
        // below runs (line-clamp truncation would silently do nothing without `hidden`, so a
        // node with maxLines set always wins that particular property regardless of what the
        // admin picked in "Tràn nội dung").
        if (t.maxLines !== undefined) {
            css.display = '-webkit-box';
            css['-webkit-line-clamp'] = String(t.maxLines);
            css['-webkit-box-orient'] = 'vertical';
            css.overflow = 'hidden';
        }
    }

    if (effective.background) {
        const bg = effective.background;
        // Phase 3 bugfix — `type` MUST default to 'color', not stay undefined. NodeStyleTab.tsx's
        // "Loại nền" <Select> DISPLAYS `style().background?.type ?? 'color'`, but `Select` only
        // fires `onChange` when the admin actually picks a different option — so the single most
        // common edit ("open Background, pick a colour") persists `{ background: { value } }` with
        // NO `type` at all, and this branch then emitted nothing whatsoever. On DESKTOP that was
        // already wrong but easy to miss (a node usually already had a `type` from an earlier
        // edit); Phase 3 made it a guaranteed failure, because at tablet/mobile the Style tab
        // edits the responsiveOverrides BUCKET, which always starts EMPTY — so the very first
        // per-breakpoint background-colour override on any node could never render. Defaulting
        // here (the one and only place `type` is read) makes what renders match what the
        // Inspector shows. Strictly additive: an absent `type` used to render NOTHING, so no
        // style that rendered before this change can render differently now.
        const type = bg.type ?? 'color';
        if (type === 'color' && bg.value) css['background-color'] = resolveColorValue(bg.value)!;
        // `gradient`/`image` route through the SAME `resolveColorValue()` helper as `color` above
        // (previously `gradient` used a bare `as string` cast and `image` had no handling at all)
        // — both are latent-unsound today only because nothing yet WRITES a `ThemeColorTokenRef`
        // here, but `NodeStyleTab.tsx`'s background `type` <Select> spreads (not resets) `value`
        // across a type switch, so a color-token background flipped to gradient/image would
        // otherwise render `[object Object]` the moment a token picker (Task 13) exists.
        if (type === 'gradient' && bg.value) css['background-image'] = resolveColorValue(bg.value)!;
        if (type === 'image' && bg.value) {
            css['background-image'] = `url(${resolveColorValue(bg.value)})`;
            css['background-position'] = bg.position ?? 'center';
            css['background-size'] = bg.size ?? 'cover';
            css['background-repeat'] = bg.repeat ?? 'no-repeat';
        }
        // type === 'video' được xử lý ở component (cần <video> element thật, không
        // biểu diễn được qua inline style) — component tự đọc style.background.value.
    }

    if (effective.border) {
        const b = effective.border;
        // Same class of fix as `background.type` above: NodeStyleTab's "Kiểu viền" <Select> shows
        // `style().border?.style ?? 'solid'` but only persists `style` when the admin changes the
        // option, so `{ border: { width, color } }` (no `style`) is a perfectly normal stored
        // shape — it used to silently render no border at all. `width` is deliberately NOT
        // defaulted: the Inspector's "Độ dày" field is a `nullable` InputNumber that shows EMPTY
        // (no default), and a border with no width genuinely is a 0-width border — defaulting it
        // would render borders the Inspector claims are unset, i.e. the mirror-image
        // inconsistency of the one being fixed here.
        const borderStyle = b.style ?? 'solid';
        if (b.width !== undefined && b.color) css.border = `${b.width}px ${borderStyle} ${resolveColorValue(b.color)}`;
        if (b.radius) css['border-radius'] = `${b.radius.tl ?? 0}px ${b.radius.tr ?? 0}px ${b.radius.br ?? 0}px ${b.radius.bl ?? 0}px`;
    }

    if (effective.shadow?.length) {
        css['box-shadow'] = effective.shadow
            .map((s) => `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`)
            .join(', ');
    }

    // Shared across the `effects` and `image` blocks below (Phase 4) — previously `filters` was
    // declared INSIDE the `effects` block, so `image.treatment`'s grayscale had no way to combine
    // with `effects.blur`/`.grayscale` into a single `filter` declaration. Declaring it here and
    // assigning `css.filter` only once, after BOTH blocks have had a chance to push into it, lets
    // an ImageNode with both an Effects-tab filter and an art-direction treatment emit both.
    const filters: string[] = [];

    if (effective.effects) {
        const e = effective.effects;
        if (e.opacity !== undefined) css.opacity = String(e.opacity);
        if (e.blur !== undefined) filters.push(`blur(${e.blur}px)`);
        if (e.grayscale !== undefined) filters.push(`grayscale(${e.grayscale}%)`);
        if (e.backdropBlur !== undefined) css['backdrop-filter'] = `blur(${e.backdropBlur}px)`;
        if (e.blendMode) css['mix-blend-mode'] = e.blendMode;
    }

    // Image/Media art-direction (Phase 4) — meaningful only on ImageNode; see
    // `StyleObject.image` (node.types.ts) for field docs.
    if (effective.image) {
        const img = effective.image;
        if (img.aspectRatio) {
            const ratioMap: Record<NonNullable<typeof img.aspectRatio>, string> = {
                '1:1': '1 / 1', '4:3': '4 / 3', '3:2': '3 / 2',
                '16:10': '16 / 10', '16:9': '16 / 9', '21:9': '21 / 9',
            };
            css['aspect-ratio'] = ratioMap[img.aspectRatio];
        }
        if (img.focalPoint) css['object-position'] = `${img.focalPoint.x}% ${img.focalPoint.y}%`;
        if (img.mask && img.mask !== 'none') {
            const maskMap: Record<'circle' | 'blob' | 'diagonal', string> = {
                circle: 'circle(50% at 50% 50%)',
                blob: 'polygon(45% 2%, 78% 12%, 96% 42%, 88% 76%, 58% 96%, 24% 90%, 4% 62%, 8% 28%)',
                diagonal: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)',
            };
            css['clip-path'] = maskMap[img.mask];
        }
        // `duotone` also gets a `grayscale(1)` base filter — the color tint itself is applied by
        // a separate overlay div (see ImageNode.tsx), not expressible via a single `filter` value.
        if (img.treatment === 'duotone' || img.treatment === 'grayscale') filters.push('grayscale(1)');
    }

    if (filters.length) css.filter = filters.join(' ');

    if (effective.transform) {
        const t = effective.transform;
        const parts: string[] = [];
        // Translate before rotate/scale so a lift-on-hover (translateY) composes the same way
        // most design tools order it — order only matters when BOTH translate and rotate/scale
        // are set on the same node, which none of this session's usages do, but this keeps the
        // function's output predictable for future callers.
        if (t.translateX !== undefined || t.translateY !== undefined) {
            parts.push(`translate(${t.translateX ?? 0}px, ${t.translateY ?? 0}px)`);
        }
        if (t.rotate !== undefined) parts.push(`rotate(${t.rotate}deg)`);
        if (t.scaleX !== undefined) parts.push(`scaleX(${t.scaleX})`);
        if (t.scaleY !== undefined) parts.push(`scaleY(${t.scaleY})`);
        if (parts.length) css.transform = parts.join(' ');
    }

    return css;
}
