// src/modules/cms/node/applyNodeStyle.ts
import type { StyleObject, ResponsiveOverrides, Breakpoint } from './node.types';
import { mergeStyleOverride } from './mergeResponsiveOverride';

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
        if (padding) css.padding = `${padding.t ?? 0}px ${padding.r ?? 0}px ${padding.b ?? 0}px ${padding.l ?? 0}px`;
        if (margin) css.margin = `${margin.t ?? 0}px ${margin.r ?? 0}px ${margin.b ?? 0}px ${margin.l ?? 0}px`;
        if (gap !== undefined) css.gap = `${gap}px`;
    }

    if (effective.size) {
        const { width, height, minW, maxW, minH, maxH } = effective.size;
        if (width) css.width = width;
        if (height) css.height = height;
        if (minW) css['min-width'] = minW;
        if (maxW) css['max-width'] = maxW;
        if (minH) css['min-height'] = minH;
        if (maxH) css['max-height'] = maxH;
    }

    if (effective.typography) {
        const t = effective.typography;
        if (t.fontFamily) css['font-family'] = t.fontFamily;
        if (t.size !== undefined) css['font-size'] = `${t.size}px`;
        if (t.weight !== undefined) css['font-weight'] = String(t.weight);
        if (t.lineHeight !== undefined) css['line-height'] = String(t.lineHeight);
        if (t.letterSpacing !== undefined) css['letter-spacing'] = `${t.letterSpacing}px`;
        if (t.color) css.color = t.color;
        if (t.align) css['text-align'] = t.align;
        if (t.transform) css['text-transform'] = t.transform;
        if (t.decoration) css['text-decoration'] = t.decoration;
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
        if (type === 'color' && bg.value) css['background-color'] = bg.value;
        if (type === 'gradient' && bg.value) css['background-image'] = bg.value;
        if (type === 'image' && bg.value) {
            css['background-image'] = `url(${bg.value})`;
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
        if (b.width !== undefined && b.color) css.border = `${b.width}px ${borderStyle} ${b.color}`;
        if (b.radius) css['border-radius'] = `${b.radius.tl ?? 0}px ${b.radius.tr ?? 0}px ${b.radius.br ?? 0}px ${b.radius.bl ?? 0}px`;
    }

    if (effective.shadow?.length) {
        css['box-shadow'] = effective.shadow
            .map((s) => `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`)
            .join(', ');
    }

    if (effective.effects) {
        const e = effective.effects;
        if (e.opacity !== undefined) css.opacity = String(e.opacity);
        const filters: string[] = [];
        if (e.blur !== undefined) filters.push(`blur(${e.blur}px)`);
        if (filters.length) css.filter = filters.join(' ');
        if (e.backdropBlur !== undefined) css['backdrop-filter'] = `blur(${e.backdropBlur}px)`;
        if (e.blendMode) css['mix-blend-mode'] = e.blendMode;
    }

    if (effective.transform) {
        const t = effective.transform;
        const parts: string[] = [];
        if (t.rotate !== undefined) parts.push(`rotate(${t.rotate}deg)`);
        if (t.scaleX !== undefined) parts.push(`scaleX(${t.scaleX})`);
        if (t.scaleY !== undefined) parts.push(`scaleY(${t.scaleY})`);
        if (parts.length) css.transform = parts.join(' ');
    }

    return css;
}
