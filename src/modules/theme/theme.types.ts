// Placeholder — Task 7 creates this file with just the 4 token type aliases the FE
// ThemeService needs (mirrors BE's ThemeEntity interfaces exactly, see
// ddd-graphql-be/src/modules/theme/domain/entities/theme.entity.ts). Task 8 (style-pipeline
// token-resolution) owns EXTENDING this same file with its own types — do not create a
// second, divergent copy of these 4 aliases elsewhere.

export interface ThemeColorSet {
    background: string; surface: string; surfaceMuted: string;
    foreground: string; foregroundMuted: string; border: string;
    primary: string; onPrimary: string;
    secondary: string; onSecondary: string;
    accent: string; onAccent: string;
    success: string; warning: string; danger: string;
}

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
