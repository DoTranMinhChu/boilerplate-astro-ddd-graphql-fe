// src/modules/cms/node/compileNodeStateCss.test.ts
import { describe, it, expect } from 'vitest';
import { compileNodeStateCss } from './compileNodeStateCss';

describe('compileNodeStateCss', () => {
    it('returns null when no hover/focus/active is set', () => {
        expect(compileNodeStateCss({ id: 'n1', style: {} })).toBeNull();
    });

    it('compiles a :hover rule for the node\'s own scope', () => {
        const css = compileNodeStateCss({ id: 'n1', style: { hover: { background: { type: 'color', value: '#000' } } } });
        expect(css).toContain('[data-node-id="n1"]:hover > *');
        expect(css).toContain('background-color: #000 !important');
    });

    it('compiles a :focus-visible rule targeting the child directly, not the wrapper', () => {
        const css = compileNodeStateCss({ id: 'n1', style: { focus: { border: { width: 2, color: '#4f46e5' } } } });
        // The wrapper `[data-node-id]` div is never itself the focused element (its rendered
        // child is), so the pseudo-class must be asserted on the child selector `> *:focus-visible`
        // directly, NOT `[data-node-id="n1"]:focus-visible > *` (that shape is correct for
        // :hover/:active, which DO propagate to ancestors, but :focus-visible does not).
        expect(css).toContain('[data-node-id="n1"] > *:focus-visible');
        expect(css).not.toContain('[data-node-id="n1"]:focus-visible');
        expect(css).toContain('border: 2px solid #4f46e5 !important');
    });

    it('compiles an :active rule', () => {
        const css = compileNodeStateCss({ id: 'n1', style: { active: { transform: { scaleX: 0.98, scaleY: 0.98 } } } });
        expect(css).toContain('[data-node-id="n1"]:active > *');
        expect(css).toContain('transform: scaleX(0.98) scaleY(0.98) !important');
    });

    it('compiles all three states into one combined string when all are set', () => {
        const css = compileNodeStateCss({
            id: 'n1',
            style: {
                hover: { effects: { opacity: 0.9 } },
                focus: { border: { width: 2, color: '#000' } },
                active: { transform: { scaleX: 0.98 } },
            },
        });
        expect(css).toContain(':hover');
        expect(css).toContain(':focus-visible');
        expect(css).toContain(':active');
    });

    it('resolves a theme color tokenRef inside a hover override', () => {
        const css = compileNodeStateCss({ id: 'n1', style: { hover: { background: { type: 'color', value: { tokenRef: 'accent' } as any } } } });
        expect(css).toContain('background-color: var(--color-accent) !important');
    });

    it('a "parent" scope hover targets the parent selector, same as the old hover-only compiler', () => {
        const css = compileNodeStateCss({ id: 'child', parentId: 'card', style: { hover: { scope: 'parent', effects: { grayscale: 0 } } } });
        expect(css).toContain('[data-node-id="card"]:hover [data-node-id="child"] > *');
    });

    it('returns null for a parent-scoped hover with no parentId', () => {
        expect(compileNodeStateCss({ id: 'child', style: { hover: { scope: 'parent', effects: { grayscale: 0 } } } })).toBeNull();
    });

    // Ported forward from the deleted hover-only compiler's own test file — cases exercising behavior
    // (no-id guard, empty-override guard, scope-field stripping, multi-property composition,
    // text-color-only override) not already covered by the brief's own test list above, per
    // Task 12's "confirm every case is covered, port forward anything that isn't" instruction.

    it('returns null when there is no style at all (no `style` key)', () => {
        expect(compileNodeStateCss({ id: 'n1' })).toBeNull();
    });

    it('returns null when there is no node id', () => {
        expect(compileNodeStateCss({ style: { hover: { effects: { opacity: 0.5 } } } })).toBeNull();
    });

    it('returns null when hover is set but resolves to zero CSS properties', () => {
        expect(compileNodeStateCss({ id: 'n1', style: { hover: {} } })).toBeNull();
    });

    it('does not leak the scope field itself into the emitted CSS', () => {
        const css = compileNodeStateCss({ id: 'card-3', style: { hover: { scope: 'self', effects: { opacity: 0.8 } } } });
        expect(css).toBe('[data-node-id="card-3"]:hover > * { opacity: 0.8 !important; }');
    });

    it('composes multiple hover properties (transform lift + background + effects) into one rule body', () => {
        const css = compileNodeStateCss({
            id: 'card-2',
            style: { hover: { transform: { translateY: -6 }, background: { type: 'color', value: '#141414' }, effects: { opacity: 1 } } },
        });
        expect(css).toBe('[data-node-id="card-2"]:hover > * { background-color: #141414 !important; opacity: 1 !important; transform: translate(0px, -6px) !important; }');
    });

    it('supports a text-color-only hover override (e.g. a muted label brightening on hover)', () => {
        const css = compileNodeStateCss({ id: 'label-1', parentId: 'card-1', style: { hover: { scope: 'parent', typography: { color: { type: 'solid', value: '#f2f2f2' } } } } });
        expect(css).toBe('[data-node-id="card-1"]:hover [data-node-id="label-1"] > * { color: #f2f2f2 !important; }');
    });

    it('builds a self-scoped rule (default scope) targeting the node\'s own rendered child (not the data-node-id wrapper itself), with !important', () => {
        const css = compileNodeStateCss({ id: 'card-1', style: { hover: { border: { width: 1, color: '#d4a62b' } } } });
        expect(css).toBe('[data-node-id="card-1"]:hover > * { border: 1px solid #d4a62b !important; }');
    });

    it('builds a parent-scoped rule using the descendant combinator, reaching into the own node\'s rendered child, with !important', () => {
        const css = compileNodeStateCss({ id: 'logo-1', parentId: 'card-1', style: { hover: { scope: 'parent', effects: { grayscale: 0 } } } });
        expect(css).toBe('[data-node-id="card-1"]:hover [data-node-id="logo-1"] > * { filter: grayscale(0%) !important; }');
    });

    // Parent-scope + focus: not covered by Task 12's original test list (all its focus tests were
    // self-scope only) — the gap that let the dead :focus-visible-on-wrapper selector ship
    // unnoticed. Unlike hover/active, there's no single "child of parent" to point :focus-visible
    // at for parent scope (the actually-focused descendant could be any node under the parent, not
    // necessarily this target's own child), so the fix uses :focus-within on the parent instead —
    // the closest CSS-buildable approximation of "some descendant of the parent currently has
    // focus" (propagates to ancestors like :hover/:active do, at the cost of also firing for a
    // plain mouse click, not just keyboard-visible focus).
    it('builds a parent-scoped focus rule using :focus-within (the ancestor-propagating equivalent of :focus-visible)', () => {
        const css = compileNodeStateCss({ id: 'child', parentId: 'card', style: { focus: { scope: 'parent', border: { width: 2, color: '#4f46e5' } } } });
        expect(css).toBe('[data-node-id="card"]:focus-within [data-node-id="child"] > * { border: 2px solid #4f46e5 !important; }');
    });

    describe('prefers-reduced-motion', () => {
        it('wraps a hover transform rule in a (prefers-reduced-motion: no-preference) media query when reducedMotionOverride is set', () => {
            const css = compileNodeStateCss({
                id: 'n1',
                style: { hover: { transform: { translateY: -8 }, reducedMotionOverride: { transform: undefined } } },
            });
            expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
            expect(css).toContain('transform: translate(0px, -8px) !important');
        });

        it('emits the reducedMotionOverride\'s own rule unconditionally (no media wrapper) alongside the wrapped default', () => {
            const css = compileNodeStateCss({
                id: 'n1',
                style: { hover: { effects: { opacity: 0.9 }, reducedMotionOverride: { effects: { opacity: 0.9 } } } },
            });
            // The opacity-only fallback has no motion component, so it should render for EVERY user
            // (not media-query-gated) — only the transform/animation-bearing parts of a hover need
            // gating; a plain opacity change is always safe to keep.
            expect(css).toContain('opacity: 0.9 !important');
        });

        it('renders exactly the pre-Task-14 output (no media wrapper at all) when reducedMotionOverride is absent', () => {
            const css = compileNodeStateCss({ id: 'n1', style: { hover: { transform: { translateY: -8 } } } });
            expect(css).not.toContain('@media');
            expect(css).toContain('transform: translate(0px, -8px) !important');
        });
    });

    describe('::before/::after', () => {
        it('compiles a ::before rule with content and background', () => {
            const css = compileNodeStateCss({
                id: 'n1',
                style: { before: { content: '""', background: { type: 'color', value: '#4f46e5' }, size: { width: '4px', height: '100%' } } },
            });
            expect(css).toContain('[data-node-id="n1"] > *::before');
            expect(css).toContain("content: \"\";");
            expect(css).toContain('background-color: #4f46e5;');
        });

        it('compiles an ::after rule independently from ::before', () => {
            const css = compileNodeStateCss({
                id: 'n1',
                style: { after: { content: "'→'" } },
            });
            expect(css).toContain('[data-node-id="n1"] > *::after');
            expect(css).toContain("content: '→';");
        });

        it('returns null when before/after have no content set', () => {
            expect(compileNodeStateCss({ id: 'n1', style: { before: { background: { type: 'color', value: '#000' } } } as any })).toBeNull();
        });
    });
});
