// src/modules/cms/node/applyNodeLayout.test.ts
import { describe, it, expect } from 'vitest';
import { applyContainerLayout, applyChildLayout, resolveEffectiveLayout } from './applyNodeLayout';
import type { NodeTree } from './node.types';

// NodeTree's non-JSON fields (pageId/parentId/order/type/layoutMode/id/createdAt/
// updatedAt/deletedAt/animationRef) come straight from the raw GraphQL-codegen'd
// NodeDTO, where every field is `string | undefined` (not `string | null`) — see
// node.service.ts / buildNodeTree.test.ts's `n()` helper for the same convention.
function node(overrides: Partial<NodeTree> = {}): NodeTree {
    return {
        id: 'x',
        pageId: 'p1',
        parentId: undefined,
        order: 0,
        type: 'frame',
        layoutMode: 'flow',
        style: {},
        layout: {},
        props: {},
        dataBinding: { mode: 'static' },
        responsiveOverrides: {},
        createdAt: '',
        updatedAt: '',
        deletedAt: undefined,
        animationRef: undefined,
        componentDefinitionId: undefined,
        componentSourceNodeId: undefined,
        children: [],
        ...overrides,
    };
}

describe('applyContainerLayout — flow', () => {
    it('defaults to display:flex, column direction', () => {
        const css = applyContainerLayout(node({ layoutMode: 'flow', layout: {} })).outer;
        expect(css.display).toBe('flex');
        expect(css['flex-direction']).toBe('column');
    });

    it('maps direction/wrap/justify/align/gap/grid', () => {
        const css = applyContainerLayout(node({
            layoutMode: 'flow',
            layout: { direction: 'row', wrap: true, justify: 'space-between', align: 'center', gap: 16, display: 'grid', gridTemplate: 'repeat(3, 1fr)' },
        })).outer;
        expect(css.display).toBe('grid');
        expect(css['flex-direction']).toBe('row');
        expect(css['flex-wrap']).toBe('wrap');
        expect(css['justify-content']).toBe('space-between');
        expect(css['align-items']).toBe('center');
        expect(css.gap).toBe('16px');
        expect(css['grid-template-columns']).toBe('repeat(3, 1fr)');
    });
});

describe('applyContainerLayout — free', () => {
    it('sets position:relative on the free container itself', () => {
        const css = applyContainerLayout(node({ layoutMode: 'free' })).outer;
        expect(css.position).toBe('relative');
    });
});

describe('applyContainerLayout — containerWidth (section mode)', () => {
    it('no containerWidth: outer has today\'s flow CSS, no inner', () => {
        const result = applyContainerLayout(node({ layoutMode: 'flow', layout: {} }));
        expect(result.outer.display).toBe('flex');
        expect(result.inner).toBeUndefined();
    });

    it('containerWidth "content": outer is full-bleed, inner is centered at --container-content', () => {
        const result = applyContainerLayout(node({ layoutMode: 'flow', layout: { containerWidth: 'content' } }));
        expect(result.outer.width).toBe('100%');
        expect(result.inner).toBeDefined();
        expect(result.inner!['max-width']).toBe('var(--container-content)');
        expect(result.inner!['margin-inline']).toBe('auto');
    });

    it('containerWidth "wide": inner maxes at --container-wide', () => {
        const result = applyContainerLayout(node({ layoutMode: 'flow', layout: { containerWidth: 'wide' } }));
        expect(result.inner!['max-width']).toBe('var(--container-wide)');
    });

    it('containerWidth "full": outer is full-bleed, no inner (no max-width/centering)', () => {
        const result = applyContainerLayout(node({ layoutMode: 'flow', layout: { containerWidth: 'full' } }));
        expect(result.outer.width).toBe('100%');
        expect(result.inner).toBeUndefined();
    });

    it('containerWidth applies desktop section-padding by default (breakpoint omitted = desktop)', () => {
        const result = applyContainerLayout(node({ layoutMode: 'flow', layout: { containerWidth: 'content' } }));
        expect(result.outer['padding-block']).toBe(
            'clamp(var(--section-padding-desktop-min), 8vw, var(--section-padding-desktop-max))',
        );
    });

    it('containerWidth applies the MATCHING breakpoint\'s section-padding vars', () => {
        const result = applyContainerLayout(node({ layoutMode: 'flow', layout: { containerWidth: 'content' } }), 'mobile');
        expect(result.outer['padding-block']).toBe(
            'clamp(var(--section-padding-mobile-min), 8vw, var(--section-padding-mobile-max))',
        );
    });

    it('explicit spacing.padding.t/.b wins over the section-padding default', () => {
        const result = applyContainerLayout(node({
            layoutMode: 'flow',
            layout: { containerWidth: 'content' },
            style: { spacing: { padding: { t: 20, b: 20 } } },
        }));
        expect(result.outer['padding-block']).toBeUndefined();
    });

    // I3 final-review fix — the previous guard only checked t/b, so a node with ONLY left/right
    // padding explicitly set still got the token-derived `padding-block` on `outer`, even though
    // `applyNodeStyle.ts`'s `padding` CSS SHORTHAND (declared later in the cascade) zeroes out
    // top/bottom the moment ANY side is set — the token value silently never took visible effect.
    // Widened to: any explicit side suppresses the default entirely.
    it('explicit spacing.padding.l/.r ONLY (no t/b) also suppresses the section-padding default (I3 fix)', () => {
        const result = applyContainerLayout(node({
            layoutMode: 'flow',
            layout: { containerWidth: 'content' },
            style: { spacing: { padding: { l: 20, r: 20 } } },
        }));
        expect(result.outer['padding-block']).toBeUndefined();
    });

    // Post-final-review fix (N1) — SpacingControl's "linked" clear leaves the `padding` OBJECT
    // present with every side `undefined` (not the object itself absent). `hasExplicitPad` here
    // already correctly treats that as "no explicit side" (each `!== undefined` check is false),
    // so `applyContainerLayout` in isolation was never the bug — this just documents that this
    // half of the pipeline was already correct. The actual root cause (applyNodeStyle.ts's own
    // `padding` CSS shorthand firing on the same all-undefined-sides object and clobbering this
    // very token AFTER it's merged in) is proven at the real-DOM integration level in
    // FrameNode.test.tsx, and at the applyNodeStyle unit level in applyNodeStyle.test.ts.
    it('a padding object present with every side undefined (SpacingControl "linked" clear shape) still suppresses nothing — the token default still applies (N1)', () => {
        const result = applyContainerLayout(node({
            layoutMode: 'flow',
            layout: { containerWidth: 'content' },
            style: { spacing: { padding: { t: undefined, r: undefined, b: undefined, l: undefined } } },
        }));
        expect(result.outer['padding-block']).toBe(
            'clamp(var(--section-padding-desktop-min), 8vw, var(--section-padding-desktop-max))',
        );
    });

    // §A of the design spec (I4 fix) — the inner wrapper gets a small default inline padding
    // (the theme's smallest spacing step) so 'content'/'wide' section content doesn't touch the
    // viewport edge on narrow screens, unless the admin already set explicit left/right padding.
    describe('containerWidth — inner wrapper default inline padding (§A / I4 fix)', () => {
        it('containerWidth "content" with no explicit padding: inner gets the default padding-inline', () => {
            const result = applyContainerLayout(node({ layoutMode: 'flow', layout: { containerWidth: 'content' } }));
            expect(result.inner!['padding-inline']).toBe('var(--spacing-0, 4px)');
        });

        it('containerWidth "content" with explicit spacing.padding.l/.r set: no default padding-inline (explicit wins)', () => {
            const result = applyContainerLayout(node({
                layoutMode: 'flow',
                layout: { containerWidth: 'content' },
                style: { spacing: { padding: { l: 40, r: 40 } } },
            }));
            expect(result.inner!['padding-inline']).toBeUndefined();
        });

        it('containerWidth "content" with explicit spacing.padding.t/.b ONLY: still suppresses the horizontal default too (one consistent "explicit wins entirely" rule)', () => {
            const result = applyContainerLayout(node({
                layoutMode: 'flow',
                layout: { containerWidth: 'content' },
                style: { spacing: { padding: { t: 20, b: 20 } } },
            }));
            expect(result.inner!['padding-inline']).toBeUndefined();
        });

        it('containerWidth "full" (no inner): no padding-inline is emitted anywhere (there is no inner box to put it on)', () => {
            const result = applyContainerLayout(node({ layoutMode: 'flow', layout: { containerWidth: 'full' } }));
            expect(result.inner).toBeUndefined();
            expect(result.outer['padding-inline']).toBeUndefined();
        });
    });

    // §C of the design spec (I4 fix) — a grid container with no explicit gap defaults to a sane
    // grid gutter (the theme's spacing-scale step nearest 24px) instead of 0.
    describe('grid gap default (§C / I4 fix)', () => {
        it('display:grid with no explicit gap: defaults to the nearest-24px spacing var, not 0', () => {
            const result = applyContainerLayout(node({ layoutMode: 'flow', layout: { display: 'grid' } }));
            expect(result.outer.gap).toBe('var(--spacing-4, 24px)');
        });

        it('display:grid with an explicit gap:0: still produces exactly 0, not the token default', () => {
            const result = applyContainerLayout(node({ layoutMode: 'flow', layout: { display: 'grid', gap: 0 } }));
            expect(result.outer.gap).toBe('0px');
        });

        it('display:flex (not grid) with no explicit gap: still no gap at all (default only applies to grid)', () => {
            const result = applyContainerLayout(node({ layoutMode: 'flow', layout: { display: 'flex' } }));
            expect(result.outer.gap).toBeUndefined();
        });

        it('containerWidth "content" + display:grid + no explicit gap: the default gap lands on inner (Minor 1 combined-path proof, part 1) — grid-template-columns also lands on inner, not outer', () => {
            const result = applyContainerLayout(node({
                layoutMode: 'flow',
                layout: { containerWidth: 'content', display: 'grid', gridTemplate: 'repeat(3, 1fr)' },
            }));
            expect(result.inner).toBeDefined();
            expect(result.inner!.gap).toBe('var(--spacing-4, 24px)');
            expect(result.inner!['grid-template-columns']).toBe('repeat(3, 1fr)');
            expect(result.outer.gap).toBeUndefined();
            expect(result.outer['grid-template-columns']).toBeUndefined();
        });
    });

    // Post-review fix: `inner` (not `outer`) is the box the real children actually render
    // inside once `containerWidth` is 'content'/'wide' — the arrangement CSS (display/gap/
    // justify/align/etc.) must land there, or it's silently lost (children fall back to plain
    // block stacking since `outer`'s gap has nothing left to space).
    it('containerWidth "content": arrangement CSS (gap/justify) lands on inner, NOT outer', () => {
        const result = applyContainerLayout(node({
            layoutMode: 'flow',
            layout: { containerWidth: 'content', gap: 24, justify: 'center' },
        }));
        expect(result.inner).toBeDefined();
        expect(result.inner!.gap).toBe('24px');
        expect(result.inner!['justify-content']).toBe('center');
        expect(result.outer.gap).toBeUndefined();
        expect(result.outer['justify-content']).toBeUndefined();
    });

    it('containerWidth "full": no inner exists, so arrangement CSS (gap) still lands on outer', () => {
        const result = applyContainerLayout(node({
            layoutMode: 'flow',
            layout: { containerWidth: 'full', gap: 16 },
        }));
        expect(result.inner).toBeUndefined();
        expect(result.outer.gap).toBe('16px');
    });
});

describe('applyContainerLayout — free (return shape)', () => {
    it('free container: still returns { outer } with position:relative, no inner', () => {
        const result = applyContainerLayout(node({ layoutMode: 'free' }));
        expect(result.outer.position).toBe('relative');
        expect(result.inner).toBeUndefined();
    });
});

describe('applyChildLayout', () => {
    it('flow parent → maps item-level flex/grid props', () => {
        const css = applyChildLayout(node({ layout: { order: 2, grow: 1, shrink: 0, basis: '200px', alignSelf: 'end', gridColumn: '1 / 3' } }), 'flow');
        expect(css.order).toBe('2');
        expect(css['flex-grow']).toBe('1');
        expect(css['flex-shrink']).toBe('0');
        expect(css['flex-basis']).toBe('200px');
        expect(css['align-self']).toBe('end');
        expect(css['grid-column']).toBe('1 / 3');
    });

    it('free parent → absolute position + size + rotation + z-index', () => {
        const css = applyChildLayout(node({ layout: { x: 40, y: 80, width: 200, height: 100, rotation: 10, zIndex: 3 } }), 'free');
        expect(css.position).toBe('absolute');
        expect(css.left).toBe('40px');
        expect(css.top).toBe('80px');
        expect(css.width).toBe('200px');
        expect(css.height).toBe('100px');
        expect(css.transform).toBe('rotate(10deg)');
        expect(css['z-index']).toBe('3');
    });

    it('applyChildLayout: applies no override when breakpoint is omitted', () => {
        const node = { layoutMode: 'free', layout: { x: 10, width: 100 } } as any;
        expect(applyChildLayout(node, 'free')).toEqual(applyChildLayout(node, 'free', undefined));
    });

    it('applyChildLayout: merges tablet override at breakpoint "tablet"', () => {
        const node = { layoutMode: 'free', layout: { x: 10, width: 100 }, responsiveOverrides: { tablet: { layout: { width: 50 } } } } as any;
        const css = applyChildLayout(node, 'free', 'tablet');
        expect(css.width).toBe('50px');
        expect(css.left).toBe('10px'); // x untouched by the tablet override
    });

    it('flow parent in grid mode + colSpan/colStart: emits grid-column shorthand', () => {
        const css = applyChildLayout(node({ layout: { colSpan: 7, colStart: 1 } }), 'flow', undefined, 'grid');
        expect(css['grid-column']).toBe('1 / span 7');
    });

    it('colSpan without colStart: grid-column starts at "auto"', () => {
        const css = applyChildLayout(node({ layout: { colSpan: 5 } }), 'flow', undefined, 'grid');
        expect(css['grid-column']).toBe('auto / span 5');
    });

    it('colSpan/colStart set but parentDisplay is "flex" (not grid): ignored, falls back to raw gridColumn if present', () => {
        const css = applyChildLayout(node({ layout: { colSpan: 5, gridColumn: '2 / 4' } }), 'flow', undefined, 'flex');
        expect(css['grid-column']).toBe('2 / 4');
    });

    it('colSpan/colStart vary per breakpoint via the existing responsiveOverrides merge', () => {
        const n = node({
            layout: { colSpan: 12, colStart: 1 },
            responsiveOverrides: { mobile: { layout: { colSpan: 6 } } },
        });
        const css = applyChildLayout(n, 'flow', 'mobile', 'grid');
        expect(css['grid-column']).toBe('1 / span 6');
    });
});

// Residual-gap fix (post-Task 15) — `resolveEffectiveLayout` is now exported and
// consumed directly by NodeBuilder.page.tsx's handleDragStart/handleResizeStart/
// handleRotateStart to seed each gesture's START snapshot. These cases prove the
// exact scenario the live-testing gap found: a node that ALREADY has a
// `responsiveOverrides.tablet.layout` override (e.g. from a PRIOR gesture in the same
// non-desktop preview session) must have its NEXT gesture seeded from that override's
// values, not the stale desktop `layout` — otherwise the next gesture's own write
// (via buildLayoutPatch) silently reverts the earlier gesture's fields back to desktop.
describe('resolveEffectiveLayout', () => {
    it('desktop (or omitted breakpoint): returns node.layout unchanged', () => {
        const layout = { x: 40, y: 50, width: 120, height: 80 };
        const n = { layout, responsiveOverrides: { tablet: { layout: { width: 999 } } } };
        expect(resolveEffectiveLayout(n, 'desktop')).toEqual(layout);
        expect(resolveEffectiveLayout(n)).toEqual(layout);
    });

    it('tablet with an EXISTING responsiveOverrides.tablet.layout: uses the override as the starting point, not the stale desktop values', () => {
        // Simulates the exact live-repro sequence: a resize already wrote
        // width/height into responsiveOverrides.tablet.layout; a SECOND gesture
        // (e.g. rotate) on the same node must now start from THOSE values.
        const n = {
            layout: { x: 40, y: 50, width: 120, height: 80 },
            responsiveOverrides: { tablet: { layout: { x: 40, y: 48, width: 160, height: 112 } } },
        };
        const effective = resolveEffectiveLayout(n, 'tablet');
        expect(effective).toEqual({ x: 40, y: 48, width: 160, height: 112 });
        // Critically NOT the stale desktop width/height (120/80) — that was the bug.
        expect(effective.width).not.toBe(120);
        expect(effective.height).not.toBe(80);
    });

    it('tablet with a PARTIAL override: unmentioned fields still fall back to desktop', () => {
        const n = {
            layout: { x: 40, y: 50, width: 120, height: 80, rotation: 0 },
            responsiveOverrides: { tablet: { layout: { rotation: 42.76 } } },
        };
        const effective = resolveEffectiveLayout(n, 'tablet');
        expect(effective.rotation).toBe(42.76);
        expect(effective.x).toBe(40);
        expect(effective.y).toBe(50);
        expect(effective.width).toBe(120);
        expect(effective.height).toBe(80);
    });

    it('tablet with NO override yet: falls back to desktop layout entirely (single-gesture case unaffected)', () => {
        const layout = { x: 40, y: 50, width: 120, height: 80 };
        const n = { layout, responsiveOverrides: {} };
        expect(resolveEffectiveLayout(n, 'tablet')).toEqual(layout);
    });

    it('mobile cascades tablet-then-mobile: a mobile override layers on top of an existing tablet override', () => {
        const n = {
            layout: { x: 40, y: 50, width: 120, height: 80 },
            responsiveOverrides: {
                tablet: { layout: { width: 160, height: 112 } },
                mobile: { layout: { x: 10 } },
            },
        };
        const effective = resolveEffectiveLayout(n, 'mobile');
        expect(effective).toEqual({ x: 10, y: 50, width: 160, height: 112 });
    });
});
