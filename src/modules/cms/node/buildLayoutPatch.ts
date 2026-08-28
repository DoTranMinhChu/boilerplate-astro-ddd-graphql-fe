// src/modules/cms/node/buildLayoutPatch.ts
//
// Task 15 — fixes the "breakpoint-blind" canvas drag/resize/rotate bug: the Node
// Builder canvas's direct-manipulation gesture handlers (handleDragStart/
// handleResizeStart/handleRotateStart, NodeBuilder.page.tsx) always wrote to a node's
// DESKTOP `layout` field, even while the admin was previewing Tablet/Mobile — silently
// discarding the point of switching breakpoints. The Inspector's own Layout/Style tabs
// already branch on `previewBreakpoint()` to read/write the correct bucket (see
// NodeTransformTab's wiring in NodeBuilder.page.tsx) — this is the SAME logic,
// extracted so the canvas gestures can share it instead of duplicating (and, until
// this task, NOT having) the same branch. Building a full `Partial<NodeRow>`-shaped
// patch (not just the layout value) keeps the 2 call sites (`createUpdateNodePropertyCommand`
// call sites in NodeBuilder.page.tsx, `createDragNodesCommand` in nodeCommands.ts)
// simple — they can pass this return value straight through as their
// `beforePatch`/`afterPatch`/per-move patch argument.
import type { LayoutProps, ResponsiveOverrides, Breakpoint } from './node.types';

export function buildLayoutPatch(
    node: { responsiveOverrides?: ResponsiveOverrides },
    breakpoint: Breakpoint,
    newLayout: LayoutProps,
): { layout: LayoutProps } | { responsiveOverrides: ResponsiveOverrides } {
    if (breakpoint === 'desktop') return { layout: newLayout };
    const bucketKey = breakpoint as 'tablet' | 'mobile';
    return {
        responsiveOverrides: {
            ...node.responsiveOverrides,
            [bucketKey]: { ...node.responsiveOverrides?.[bucketKey], layout: newLayout },
        },
    };
}
