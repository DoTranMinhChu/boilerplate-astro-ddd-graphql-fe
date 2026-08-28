// src/modules/cms/node/buildLayoutPatch.test.ts
// Task 15 — canvas drag/resize/rotate "breakpoint-blind" bug fix. Extracted from the
// Inspector's own previewBreakpoint()-branching logic (NodeTransformTab wiring in
// NodeBuilder.page.tsx) so the canvas gesture handlers can share the exact same
// desktop-vs-tablet/mobile-bucket decision instead of always writing to the desktop
// `layout` field regardless of which breakpoint is being previewed.
import { describe, it, expect } from 'vitest';
import { buildLayoutPatch } from './buildLayoutPatch';

describe('buildLayoutPatch', () => {
    it('desktop breakpoint patches the top-level layout field', () => {
        const patch = buildLayoutPatch({}, 'desktop', { x: 10, y: 20 });
        expect(patch).toEqual({ layout: { x: 10, y: 20 } });
    });

    it('tablet breakpoint patches responsiveOverrides.tablet.layout', () => {
        const patch = buildLayoutPatch({}, 'tablet', { x: 10, y: 20 });
        expect(patch).toEqual({ responsiveOverrides: { tablet: { layout: { x: 10, y: 20 } } } });
    });

    it('mobile breakpoint patches responsiveOverrides.mobile.layout', () => {
        const patch = buildLayoutPatch({}, 'mobile', { x: 5, y: 5 });
        expect(patch).toEqual({ responsiveOverrides: { mobile: { layout: { x: 5, y: 5 } } } });
    });

    it('preserves an existing sibling style override in the SAME bucket when patching layout', () => {
        const node = { responsiveOverrides: { tablet: { style: { spacing: { gap: 8 } } } } };
        const patch = buildLayoutPatch(node, 'tablet', { x: 1, y: 1 });
        expect(patch).toEqual({ responsiveOverrides: { tablet: { style: { spacing: { gap: 8 } }, layout: { x: 1, y: 1 } } } });
    });

    it('preserves the OTHER breakpoint bucket untouched when patching one', () => {
        const node = { responsiveOverrides: { mobile: { layout: { x: 99, y: 99 } } } };
        const patch = buildLayoutPatch(node, 'tablet', { x: 1, y: 1 });
        expect(patch).toEqual({ responsiveOverrides: { mobile: { layout: { x: 99, y: 99 } }, tablet: { layout: { x: 1, y: 1 } } } });
    });
});
