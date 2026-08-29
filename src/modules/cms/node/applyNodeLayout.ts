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
 * children lay out correctly), driven by its own `layoutMode`. When `layout.containerWidth`
 * is set (Phase 2, Layout & Grid), also returns an `inner` CSS map for a wrapper `<div>` the
 * caller (FrameNode.tsx) renders around its children — see node.types.ts's `containerWidth`
 * doc comment for the full semantics. */
export function applyContainerLayout(node: NodeTree, breakpoint?: Breakpoint): { outer: Record<string, string>; inner?: Record<string, string> } {
    if (node.layoutMode === 'free') {
        // Free children are positioned absolute relative to this box.
        return { outer: { position: 'relative' } };
    }
    const l = resolveEffectiveLayout(node, breakpoint);

    // Post-review fix: this arrangement CSS (how THIS box's in-flow children lay out) must land
    // on whichever box ACTUALLY contains the children. When `containerWidth` creates an `inner`
    // wrapper below, the real children render inside `inner` — `outer` then has only one in-flow
    // child (`inner` itself) — so the arrangement CSS belongs on `inner`, not `outer`, or it's
    // silently lost (a `containerWidth:'content'` section with a `gap` rendered with zero spacing
    // between children, since `outer`'s gap has nothing to space and `inner` never got one). Kept
    // as a separate map (merged into whichever box is correct below) rather than writing directly
    // into `outer`, so this one block of logic can't drift out of sync between the two cases.
    const arrangement: Record<string, string> = {
        display: l.display ?? 'flex',
        'flex-direction': l.direction ?? 'column',
    };
    if (l.wrap) arrangement['flex-wrap'] = 'wrap';
    if (l.justify) arrangement['justify-content'] = l.justify;
    if (l.align) arrangement['align-items'] = l.align;
    if (l.gap !== undefined) {
        arrangement.gap = `${l.gap}px`;
    } else if (l.display === 'grid') {
        // §C of the design spec (2026-08-29-layout-grid-typography-design.md) — a grid container
        // with no explicit gap defaults to a sane grid gutter (the theme's spacing-scale step
        // nearest 24px) instead of `0`, computed here at render time (not stored) so an explicit
        // `gap: 0` still produces exactly `0` — only the `undefined` case falls through to this
        // branch. `--spacing-4` is nearest-to-24px in the SEEDED default theme's real spacing
        // scale ([4,8,12,16,24,32,48,64,96,128] — index 4 is exactly 24, see seed-default-theme.ts);
        // a future theme with a differently-shaped spacing array only loses the "nearest" property
        // for this one default, not correctness — the literal `24px` fallback still applies
        // whenever `--spacing-4` itself is undefined (see resolveThemeCssVars.ts).
        arrangement.gap = 'var(--spacing-4, 24px)';
    }
    if (l.display === 'grid' && l.gridTemplate) arrangement['grid-template-columns'] = l.gridTemplate;

    const outer: Record<string, string> = {};

    if (l.containerWidth) {
        outer.width = '100%';
        // I3 final-review fix: explicit spacing.padding on ANY side (t/r/b/l) — not just t/b —
        // now suppresses BOTH token defaults below (vertical section-padding AND §A's inner-wrapper
        // horizontal padding), same "explicit beats token default" rule as every other style field
        // in this codebase. Widened from checking only t/b because `applyNodeStyle.ts` emits
        // `padding` as a CSS SHORTHAND the moment ANY side is set, defaulting every OTHER unset
        // side to a real `0px` (not "unset") — so a node with only left/right padding explicitly
        // set was silently getting `padding: 0px Rpx 0px Lpx` from that shorthand (applied AFTER,
        // and therefore overriding, this function's `padding-block`), while this guard still
        // thought top/bottom were untouched and kept emitting a now-dead token value.
        const explicitPad = node.style?.spacing?.padding;
        const hasExplicitPad = explicitPad?.t !== undefined || explicitPad?.r !== undefined
            || explicitPad?.b !== undefined || explicitPad?.l !== undefined;
        if (!hasExplicitPad) {
            const bp = breakpoint ?? 'desktop';
            outer['padding-block'] = `clamp(var(--section-padding-${bp}-min), 8vw, var(--section-padding-${bp}-max))`;
        }
        if (l.containerWidth !== 'full') {
            // `inner` is the real children's container here — arrangement CSS goes on it, not
            // `outer` (see the comment above `arrangement`'s declaration).
            const inner: Record<string, string> = {
                ...arrangement,
                'max-width': l.containerWidth === 'wide' ? 'var(--container-wide)' : 'var(--container-content)',
                'margin-inline': 'auto',
                width: '100%',
            };
            // §A of the design spec — a small inline (left/right) padding by default so a
            // 'content'/'wide' section's real content doesn't touch the viewport edge on narrow
            // screens, guarded by the SAME `hasExplicitPad` check above (any explicit side skips
            // this too — one consistent "explicit wins entirely" rule, not a separate l/r-only
            // check). `--spacing-0` is the theme's smallest spacing-scale step (index 0 of
            // `ThemeLayout.spacing`, see resolveThemeCssVars.ts).
            if (!hasExplicitPad) {
                inner['padding-inline'] = 'var(--spacing-0, 4px)';
            }
            return { outer, inner };
        }
        // containerWidth === 'full': no `inner` exists, `outer` is the only container — arrangement
        // CSS stays on `outer`, same as the no-containerWidth case below.
    }
    Object.assign(outer, arrangement);
    return { outer };
}

/** CSS for a node acting as a CHILD of `parentLayoutMode` — item-level flex/grid
 * props when the parent is flow, absolute positioning when the parent is free. */
export function applyChildLayout(node: NodeTree, parentLayoutMode: 'flow' | 'free', breakpoint?: Breakpoint, parentDisplay?: 'flex' | 'grid'): Record<string, string> {
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
    if (parentDisplay === 'grid' && l.colSpan !== undefined) {
        css['grid-column'] = `${l.colStart ?? 'auto'} / span ${l.colSpan}`;
    } else if (l.gridColumn !== undefined) {
        css['grid-column'] = l.gridColumn;
    }
    if (l.gridRow !== undefined) css['grid-row'] = l.gridRow;
    return css;
}
