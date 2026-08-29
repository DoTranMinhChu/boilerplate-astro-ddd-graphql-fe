// src/modules/cms/node/resolveTypographyRoleCss.ts
import type { TypographyRole } from '@/modules/theme/theme.types';

/** A typography `role` resolves to CSS custom properties the ACTIVE theme is responsible for
 * defining (see Task 9's `resolveThemeCssVars` extension in Task 11, which emits
 * `--type-h1-min`/`--type-h1-max`/`--type-h1-line-height`/`--type-h1-weight`/
 * `--type-h1-letter-spacing` etc. per role onto `<body>`) — resolving to `var(...)` here, not a
 * hardcoded px number, is what makes a node's `typography.role:'h1'` automatically follow
 * whichever theme the page actually has active, including a live theme edit with no need to
 * touch a single node's stored style. */

/** final-review fix (Important #2, Part A): every `var()` reference below now carries a
 * fallback — the Theme Manager admin form (`/admin/cms/themes`) only ever writes
 * `displayFont.family`/`bodyFont.family`, never `typography.scale` (that 9-role matrix has no v1
 * editing UI — set only via the seed script or a direct mutation, see `docs/PROJECT-CONTEXT.md`
 * §7). Every theme an admin creates through that form therefore never defines
 * `--type-<role>-*` at all, which makes the WHOLE `font-size`/`font-weight`/`line-height`/
 * `letter-spacing` declaration set invalid-at-computed-value-time (an undefined custom property
 * with no fallback) and silently dropped by the browser — `typography.role` was completely inert
 * for every such theme. These are a defensive fallback only (a theme that DOES define the
 * `--type-*` vars, e.g. the seeded default theme, is unaffected — its real values always win over
 * the fallback); per-role defaults roughly mirror `seed-default-theme.ts`'s own scale so the
 * fallback look is consistent with the one real theme this codebase ships with a full scale. */
const ROLE_FALLBACK: Record<TypographyRole, { min: string; max: string; weight: string; lineHeight: string; letterSpacing: string }> = {
    display: { min: '40px', max: '72px', weight: '800', lineHeight: '1.1', letterSpacing: '-0.02em' },
    h1: { min: '32px', max: '48px', weight: '700', lineHeight: '1.15', letterSpacing: '-0.01em' },
    h2: { min: '26px', max: '36px', weight: '700', lineHeight: '1.2', letterSpacing: 'normal' },
    h3: { min: '22px', max: '28px', weight: '600', lineHeight: '1.25', letterSpacing: 'normal' },
    h4: { min: '18px', max: '22px', weight: '600', lineHeight: '1.3', letterSpacing: 'normal' },
    bodyLg: { min: '17px', max: '18px', weight: '400', lineHeight: '1.6', letterSpacing: 'normal' },
    body: { min: '15px', max: '16px', weight: '400', lineHeight: '1.6', letterSpacing: 'normal' },
    small: { min: '13px', max: '14px', weight: '400', lineHeight: '1.5', letterSpacing: 'normal' },
    caption: { min: '11px', max: '12px', weight: '400', lineHeight: '1.4', letterSpacing: '0.02em' },
};

/** final-review fix (Important #4): `fontFamily` is new — previously `typography.role` resolved
 * font-size/weight/line-height/letter-spacing but never font-family, even though the theme
 * layer already injects `--font-display`/`--font-body` custom properties (`resolveThemeCssVars`)
 * AND loads their Google Font `<link>`s — nothing ever consumed them. Heading-shaped roles
 * (display/h1-h4) use the theme's display font, the rest (bodyLg/body/small/caption) use body. */
const DISPLAY_ROLES = new Set<TypographyRole>(['display', 'h1', 'h2', 'h3', 'h4']);

/** "measure" (max line length) — 65ch is the fixed value from the master prompt's own
 * "60-75ch" range (feedback/UPGRADE-PROMPT.md §4.D), not theme-configurable (YAGNI, no request
 * for per-theme tuning). Only body-shaped roles — a heading/caption/small string is short
 * enough that measure is irrelevant or actively wrong (a big display headline SHOULD be able to
 * span wide). */
const MEASURE_ROLES = new Set<TypographyRole>(['body', 'bodyLg']);

export function resolveTypographyRoleCss(role: TypographyRole): { fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string; fontFamily: string; textWrap?: string; maxWidth?: string } {
    const fallback = ROLE_FALLBACK[role];
    return {
        fontSize: `clamp(var(--type-${role}-min, ${fallback.min}), 5vw, var(--type-${role}-max, ${fallback.max}))`,
        fontWeight: `var(--type-${role}-weight, ${fallback.weight})`,
        lineHeight: `var(--type-${role}-line-height, ${fallback.lineHeight})`,
        letterSpacing: `var(--type-${role}-letter-spacing, ${fallback.letterSpacing})`,
        fontFamily: DISPLAY_ROLES.has(role) ? 'var(--font-display)' : 'var(--font-body)',
        textWrap: DISPLAY_ROLES.has(role) ? 'balance' : undefined,
        maxWidth: MEASURE_ROLES.has(role) ? '65ch' : undefined,
    };
}
