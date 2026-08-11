// src/modules/cms/node/applyNodeLayout.ts
import type { NodeTree } from './node.types';

/** CSS for a node acting as a CONTAINER (rules that apply to itself so its
 * children lay out correctly), driven by its own `layoutMode`. */
export function applyContainerLayout(node: NodeTree): Record<string, string> {
    if (node.layoutMode === 'free') {
        // Free children are positioned absolute relative to this box.
        return { position: 'relative' };
    }
    const l = node.layout ?? {};
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
export function applyChildLayout(node: NodeTree, parentLayoutMode: 'flow' | 'free'): Record<string, string> {
    const l = node.layout ?? {};
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
