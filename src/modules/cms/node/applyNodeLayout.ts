// src/modules/cms/node/applyNodeLayout.ts
import type { NodeTree, Breakpoint, LayoutProps, ResponsiveOverrides } from './node.types';
import { mergeLayoutOverride } from './mergeResponsiveOverride';

/** Structural subset of NodeTree/NodeDTO that `resolveEffectiveLayout` actually needs.
 * Narrower than `NodeTree` on purpose — `NodeTree` additionally requires `children`
 * (buildNodeTree()'s output), which a flat, not-yet-tree-built `NodeDTO` (e.g. the raw
 * store entries `NodeBuilder.page.tsx`'s gesture handlers read) doesn't have. Both
 * `NodeTree` and `NodeDTO` satisfy this structurally, so no cast is needed at either
 * call site. */
export interface LayoutSourceNode {
    layout?: LayoutProps;
    responsiveOverrides?: ResponsiveOverrides;
}

/** Phase 3 (Responsive) — resolves node.layout merged with the matching
 * responsiveOverrides bucket(s) for `breakpoint` (desktop-first cascade, same
 * rule as applyNodeStyle). Omitting `breakpoint` (or passing undefined) returns
 * node.layout unchanged — zero behavior change for existing 1-arg-equivalent callers.
 *
 * Task 15 follow-up fix — exported (was module-private) so `NodeBuilder.page.tsx`'s
 * drag/resize/rotate gesture handlers can seed their gesture-START snapshot from the
 * SAME effective (merged) layout this function already gives the canvas renderer and
 * the Inspector's Layout tab, instead of always reading the raw desktop `node.layout`
 * regardless of `previewBreakpoint()`. Before this fix, a SECOND gesture on the same
 * node within one non-desktop preview session re-seeded from stale desktop values and
 * silently reverted whatever an earlier gesture in that session had already written
 * into that breakpoint's `responsiveOverrides` bucket (e.g. resize-then-rotate in
 * Tablet: the rotate's start-snapshot ignored the resize's just-written width/height,
 * so the rotate's own write reset them back to desktop's). */
export function resolveEffectiveLayout(node: LayoutSourceNode, breakpoint?: Breakpoint): LayoutProps {
    let layout = node.layout ?? {};
    if (breakpoint === 'tablet' || breakpoint === 'mobile') {
        layout = mergeLayoutOverride(layout, node.responsiveOverrides?.tablet?.layout);
    }
    if (breakpoint === 'mobile') {
        layout = mergeLayoutOverride(layout, node.responsiveOverrides?.mobile?.layout);
    }
    return layout;
}

/** CSS for a node acting as a CONTAINER (rules that apply to itself so its
 * children lay out correctly), driven by its own `layoutMode`. */
export function applyContainerLayout(node: NodeTree, breakpoint?: Breakpoint): Record<string, string> {
    if (node.layoutMode === 'free') {
        // Free children are positioned absolute relative to this box.
        return { position: 'relative' };
    }
    const l = resolveEffectiveLayout(node, breakpoint);
    const css: Record<string, string> = {
        display: l.display ?? 'flex',
        'flex-direction': l.direction ?? 'column',
    };
    if (l.wrap) css['flex-wrap'] = 'wrap';
    if (l.justify) css['justify-content'] = l.justify;
    if (l.align) css['align-items'] = l.align;
    if (l.gap !== undefined) css.gap = `${l.gap}px`;
    if (l.display === 'grid' && l.gridTemplate) css['grid-template-columns'] = l.gridTemplate;
    return css;
}

/** CSS for a node acting as a CHILD of `parentLayoutMode` — item-level flex/grid
 * props when the parent is flow, absolute positioning when the parent is free. */
export function applyChildLayout(node: NodeTree, parentLayoutMode: 'flow' | 'free', breakpoint?: Breakpoint): Record<string, string> {
    const l = resolveEffectiveLayout(node, breakpoint);
    if (parentLayoutMode === 'free') {
        const css: Record<string, string> = { position: 'absolute' };
        if (l.x !== undefined) css.left = `${l.x}px`;
        if (l.y !== undefined) css.top = `${l.y}px`;
        if (l.width !== undefined) css.width = `${l.width}px`;
        if (l.height !== undefined) css.height = `${l.height}px`;
        if (l.rotation !== undefined) css.transform = `rotate(${l.rotation}deg)`;
        if (l.zIndex !== undefined) css['z-index'] = String(l.zIndex);
        return css;
    }
    const css: Record<string, string> = {};
    if (l.order !== undefined) css.order = String(l.order);
    if (l.grow !== undefined) css['flex-grow'] = String(l.grow);
    if (l.shrink !== undefined) css['flex-shrink'] = String(l.shrink);
    if (l.basis !== undefined) css['flex-basis'] = l.basis;
    if (l.alignSelf !== undefined) css['align-self'] = l.alignSelf;
    if (l.gridColumn !== undefined) css['grid-column'] = l.gridColumn;
    if (l.gridRow !== undefined) css['grid-row'] = l.gridRow;
    return css;
}
