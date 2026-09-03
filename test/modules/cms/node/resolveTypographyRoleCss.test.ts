// src/modules/cms/node/resolveTypographyRoleCss.test.ts
import { describe, it, expect } from 'vitest';
import { resolveTypographyRoleCss } from '@modules/cms/node/resolveTypographyRoleCss';

describe('resolveTypographyRoleCss', () => {
    // final-review fix (Important #2, Part A): a theme created via the Theme Manager admin form
    // (`/admin/cms/themes`) only ever writes `displayFont.family`/`bodyFont.family`, never
    // `typography.scale` (no v1 editing UI for that 9-role matrix) — so `--type-<role>-*` is
    // undefined for every such theme, which previously made the WHOLE font-size/weight/
    // line-height/letter-spacing declaration set invalid-at-computed-value-time and silently
    // dropped. Every var() reference must now carry a fallback value.
    it('every var() reference for every role carries an explicit fallback value (no bare var(--type-*-x) with no 2nd argument)', () => {
        const roles = ['display', 'h1', 'h2', 'h3', 'h4', 'bodyLg', 'body', 'small', 'caption'] as const;
        for (const role of roles) {
            const css = resolveTypographyRoleCss(role);
            // clamp(var(--type-<role>-min, <fallback>), 5vw, var(--type-<role>-max, <fallback>))
            expect(css.fontSize).toMatch(new RegExp(`^clamp\\(var\\(--type-${role}-min, [^)]+\\), 5vw, var\\(--type-${role}-max, [^)]+\\)\\)$`));
            expect(css.fontWeight).toMatch(new RegExp(`^var\\(--type-${role}-weight, [^)]+\\)$`));
            expect(css.lineHeight).toMatch(new RegExp(`^var\\(--type-${role}-line-height, [^)]+\\)$`));
            expect(css.letterSpacing).toMatch(new RegExp(`^var\\(--type-${role}-letter-spacing, [^)]+\\)$`));
        }
    });

    it('resolves the exact h1 fallback values', () => {
        const css = resolveTypographyRoleCss('h1');
        expect(css.fontSize).toBe('clamp(var(--type-h1-min, 32px), 5vw, var(--type-h1-max, 48px))');
        expect(css.fontWeight).toBe('var(--type-h1-weight, 700)');
        expect(css.lineHeight).toBe('var(--type-h1-line-height, 1.15)');
        expect(css.letterSpacing).toBe('var(--type-h1-letter-spacing, -0.01em)');
    });

    it('a heavier/larger role (display) gets a heavier-weight, larger-size fallback than a lighter role (caption)', () => {
        const display = resolveTypographyRoleCss('display');
        const caption = resolveTypographyRoleCss('caption');
        expect(parseInt(display.fontWeight.match(/, (\d+)\)/)![1], 10)).toBeGreaterThan(parseInt(caption.fontWeight.match(/, (\d+)\)/)![1], 10));
    });

    // final-review fix (Important #4): fontFamily is new — resolves to the theme's injected
    // --font-display/--font-body custom property depending on whether the role is heading-shaped
    // or body-shaped, so `typography.role` finally sets a font-family at all.
    describe('fontFamily', () => {
        it('resolves display/h1-h4 (heading-shaped roles) to var(--font-display)', () => {
            expect(resolveTypographyRoleCss('display').fontFamily).toBe('var(--font-display)');
            expect(resolveTypographyRoleCss('h1').fontFamily).toBe('var(--font-display)');
            expect(resolveTypographyRoleCss('h2').fontFamily).toBe('var(--font-display)');
            expect(resolveTypographyRoleCss('h3').fontFamily).toBe('var(--font-display)');
            expect(resolveTypographyRoleCss('h4').fontFamily).toBe('var(--font-display)');
        });

        it('resolves bodyLg/body/small/caption (body-shaped roles) to var(--font-body)', () => {
            expect(resolveTypographyRoleCss('bodyLg').fontFamily).toBe('var(--font-body)');
            expect(resolveTypographyRoleCss('body').fontFamily).toBe('var(--font-body)');
            expect(resolveTypographyRoleCss('small').fontFamily).toBe('var(--font-body)');
            expect(resolveTypographyRoleCss('caption').fontFamily).toBe('var(--font-body)');
        });
    });

    it('heading roles (display/h1-h4) get text-wrap: balance', () => {
        for (const role of ['display', 'h1', 'h2', 'h3', 'h4'] as const) {
            expect(resolveTypographyRoleCss(role).textWrap).toBe('balance');
        }
    });

    it('non-heading roles do not set textWrap', () => {
        for (const role of ['bodyLg', 'body', 'small', 'caption'] as const) {
            expect(resolveTypographyRoleCss(role).textWrap).toBeUndefined();
        }
    });

    it('body/bodyLg roles get a 65ch measure', () => {
        expect(resolveTypographyRoleCss('body').maxWidth).toBe('65ch');
        expect(resolveTypographyRoleCss('bodyLg').maxWidth).toBe('65ch');
    });

    it('heading/small/caption roles do not set maxWidth', () => {
        for (const role of ['display', 'h1', 'small', 'caption'] as const) {
            expect(resolveTypographyRoleCss(role).maxWidth).toBeUndefined();
        }
    });
});
