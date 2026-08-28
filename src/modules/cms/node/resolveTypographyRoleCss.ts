// src/modules/cms/node/resolveTypographyRoleCss.ts
import type { TypographyRole } from '@/modules/theme/theme.types';

/** A typography `role` resolves to CSS custom properties the ACTIVE theme is responsible for
 * defining (see Task 9's `resolveThemeCssVars` extension in Task 11, which emits
 * `--type-h1-min`/`--type-h1-max`/`--type-h1-line-height`/`--type-h1-weight`/
 * `--type-h1-letter-spacing` etc. per role onto `<body>`) — resolving to `var(...)` here, not a
 * hardcoded px number, is what makes a node's `typography.role:'h1'` automatically follow
 * whichever theme the page actually has active, including a live theme edit with no need to
 * touch a single node's stored style. */
export function resolveTypographyRoleCss(role: TypographyRole): { fontSize: string; fontWeight: string; lineHeight: string; letterSpacing: string } {
    return {
        fontSize: `clamp(var(--type-${role}-min), 5vw, var(--type-${role}-max))`,
        fontWeight: `var(--type-${role}-weight)`,
        lineHeight: `var(--type-${role}-line-height)`,
        letterSpacing: `var(--type-${role}-letter-spacing)`,
    };
}
