// FE mirror of ddd-graphql-be/src/modules/theme/domain/entities/theme.entity.ts's exported
// interfaces — kept in lockstep by hand (same convention this codebase already uses for every
// other BE-entity-shape mirrored FE-side, e.g. node.types.ts's own doc comment on
// NodeJsonFields). The 4 core token-group types (ThemeColorSet/ThemeColors/ThemeFontDef/
// TypographyRole/ThemeTypography/ThemeLayout/ThemeMotion) were created in Task 7 for
// ThemeService; Task 8 (style-pipeline token-resolution) extends this same file with
// ThemeColorTokenRef/isThemeColorTokenRef below — do not create a second, divergent copy of
// any of these types elsewhere.

/** Single source of truth for the 15 semantic color-token keys — every consumer that previously
 * hand-copied this exact list (resolveThemeCssVars.ts's `COLOR_KEYS`, manageThemes.page.tsx's
 * `COLOR_FIELDS`) now imports this instead, so that byte-identical-array drift risk can't recur.
 * (ColorTokenOrCustom.tsx's token `<Select>` already derives its options dynamically from
 * `Object.keys(activeTheme.colors.light)` rather than hand-listing the keys, so it had no
 * duplicate array to redirect here.) `ThemeColorSet` is derived from this array below rather
 * than hand-listed. */
export const THEME_COLOR_TOKEN_KEYS = [
    'background', 'surface', 'surfaceMuted', 'foreground', 'foregroundMuted', 'border',
    'primary', 'onPrimary', 'secondary', 'onSecondary', 'accent', 'onAccent',
    'success', 'warning', 'danger',
] as const;

export type ThemeColorSet = Record<(typeof THEME_COLOR_TOKEN_KEYS)[number], string>;

export interface ThemeColors {
    light: ThemeColorSet;
    /** Optional — a theme MAY be deliberately single-mode (no dark variant): `colors.dark`
     * absent means every page using this theme renders identically regardless of
     * `prefers-color-scheme` (mirrors BE ThemeColors, same comment). */
    dark?: ThemeColorSet;
}

export interface ThemeFontDef {
    family: string;
    /** Full Google Fonts CSS2 URL, e.g. "https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap" — omit for a system font that needs no @import. */
    googleFontUrl?: string;
    fallback: string;
    weights: number[];
}

export type TypographyRole = 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'bodyLg' | 'body' | 'small' | 'caption';

export interface ThemeTypography {
    displayFont: ThemeFontDef;
    bodyFont: ThemeFontDef;
    monoFont?: ThemeFontDef;
    scale: Record<TypographyRole, { minPx: number; maxPx: number; lineHeight: number; weight: number; letterSpacing: string }>;
}

export interface ThemeLayout {
    spacing: number[];
    sectionPadding: { desktop: [number, number]; tablet: [number, number]; mobile: [number, number] };
    containerWidths: { content: number; wide: number };
    radius: number[];
    shadow: string[];
    borderWidth: number[];
}

export interface ThemeMotion {
    duration: { hover: number; reveal: number; stagger: number };
    easing: { standard: string; enter: string; exit: string };
    signature: string;
}

/** A leaf color value in a node's `StyleObject` can be either a raw literal (unchanged from
 * before this plan — every already-authored node keeps rendering byte-for-byte) or a reference
 * to a semantic theme token, resolved against the page's theme at compile time. See
 * `resolveThemeCssVars.ts`'s `--color-*` variable names for the exact `key` values this accepts
 * (e.g. `{ tokenRef: 'primary' }` resolves to `var(--color-primary)`). */
export interface ThemeColorTokenRef {
    tokenRef: keyof ThemeColorSet;
}

export function isThemeColorTokenRef(value: unknown): value is ThemeColorTokenRef {
    return typeof value === 'object' && value !== null && typeof (value as any).tokenRef === 'string';
}
