// src/modules/cms/node/applyNodeStyle.ts
import type { StyleObject } from './node.types';

/** StyleObject (admin-facing, structured) → flat CSS property map ready for a
 * Solid `style={...}` prop. Every branch is independently additive — an empty
 * sub-object contributes nothing. */
export function applyNodeStyle(style: StyleObject): Record<string, string> {
    const css: Record<string, string> = {};

    if (style.spacing) {
        const { padding, margin, gap } = style.spacing;
        if (padding) css.padding = `${padding.t ?? 0}px ${padding.r ?? 0}px ${padding.b ?? 0}px ${padding.l ?? 0}px`;
        if (margin) css.margin = `${margin.t ?? 0}px ${margin.r ?? 0}px ${margin.b ?? 0}px ${margin.l ?? 0}px`;
        if (gap !== undefined) css.gap = `${gap}px`;
    }

    if (style.size) {
        const { width, height, minW, maxW, minH, maxH } = style.size;
        if (width) css.width = width;
        if (height) css.height = height;
        if (minW) css['min-width'] = minW;
        if (maxW) css['max-width'] = maxW;
        if (minH) css['min-height'] = minH;
        if (maxH) css['max-height'] = maxH;
    }

    if (style.typography) {
        const t = style.typography;
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

    if (style.background) {
        const bg = style.background;
        if (bg.type === 'color' && bg.value) css['background-color'] = bg.value;
        if (bg.type === 'gradient' && bg.value) css['background-image'] = bg.value;
        if (bg.type === 'image' && bg.value) {
            css['background-image'] = `url(${bg.value})`;
            css['background-position'] = bg.position ?? 'center';
            css['background-size'] = bg.size ?? 'cover';
            css['background-repeat'] = bg.repeat ?? 'no-repeat';
        }
        // type === 'video' được xử lý ở component (cần <video> element thật, không
        // biểu diễn được qua inline style) — component tự đọc style.background.value.
    }

    if (style.border) {
        const b = style.border;
        if (b.width !== undefined && b.style && b.color) css.border = `${b.width}px ${b.style} ${b.color}`;
        if (b.radius) css['border-radius'] = `${b.radius.tl ?? 0}px ${b.radius.tr ?? 0}px ${b.radius.br ?? 0}px ${b.radius.bl ?? 0}px`;
    }

    if (style.shadow?.length) {
        css['box-shadow'] = style.shadow
            .map((s) => `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`)
            .join(', ');
    }

    if (style.effects) {
        const e = style.effects;
        if (e.opacity !== undefined) css.opacity = String(e.opacity);
        const filters: string[] = [];
        if (e.blur !== undefined) filters.push(`blur(${e.blur}px)`);
        if (filters.length) css.filter = filters.join(' ');
        if (e.backdropBlur !== undefined) css['backdrop-filter'] = `blur(${e.backdropBlur}px)`;
        if (e.blendMode) css['mix-blend-mode'] = e.blendMode;
    }

    if (style.transform) {
        const t = style.transform;
        const parts: string[] = [];
        if (t.rotate !== undefined) parts.push(`rotate(${t.rotate}deg)`);
        if (t.scaleX !== undefined) parts.push(`scaleX(${t.scaleX})`);
        if (t.scaleY !== undefined) parts.push(`scaleY(${t.scaleY})`);
        if (parts.length) css.transform = parts.join(' ');
    }

    return css;
}
