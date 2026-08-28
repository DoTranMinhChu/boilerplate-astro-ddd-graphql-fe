import type { ThemeDTO } from '@/shared/services/theme/theme.service';
import type { ThemeColorSet } from './theme.types';

const COLOR_KEYS: (keyof ThemeColorSet)[] = [
    'background', 'surface', 'surfaceMuted', 'foreground', 'foregroundMuted', 'border',
    'primary', 'onPrimary', 'secondary', 'onSecondary', 'accent', 'onAccent',
    'success', 'warning', 'danger',
];

/** kebab-case CSS custom-property key for a color token, e.g. 'onPrimary' -> '--color-on-primary'. */
function colorVarName(key: string): string {
    return `--color-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

/** Resolves a page's theme into a flat `Record<string,string>` of CSS custom properties, meant
 * to be spread onto `<body style={...}>` in `CmsPageShell.astro` — every node's compiled CSS
 * that references `var(--color-primary)` etc. (see `resolveThemeCssVars.test.ts`'s exact
 * variable names) picks these up via normal CSS cascade, with ZERO per-node re-computation
 * needed when an admin edits the theme (the page just needs a fresh render, not a rebuild of
 * every node's stored style). Returns `{}` (never throws) for an undefined theme so a page
 * that somehow resolves no theme at all (should only happen on a totally empty, unseeded DB —
 * see BE's `resolveTheme` fallback chain) still renders with browser-default styling instead of
 * crashing. */
export function resolveThemeCssVars(theme: ThemeDTO | undefined, mode: 'light' | 'dark'): Record<string, string> {
    if (!theme?.colors?.light) return {};
    const colorSet: ThemeColorSet = mode === 'dark' ? (theme.colors.dark ?? theme.colors.light) : theme.colors.light;

    const vars: Record<string, string> = {};
    for (const key of COLOR_KEYS) {
        vars[colorVarName(key)] = colorSet[key];
    }

    if (theme.typography?.displayFont) {
        vars['--font-display'] = `'${theme.typography.displayFont.family}', ${theme.typography.displayFont.fallback}`;
    }
    if (theme.typography?.bodyFont) {
        vars['--font-body'] = `'${theme.typography.bodyFont.family}', ${theme.typography.bodyFont.fallback}`;
    }
    if (theme.typography?.monoFont) {
        vars['--font-mono'] = `'${theme.typography.monoFont.family}', ${theme.typography.monoFont.fallback}`;
    }

    if (theme.typography?.scale) {
        for (const [role, def] of Object.entries(theme.typography.scale)) {
            vars[`--type-${role}-min`] = `${def.minPx}px`;
            vars[`--type-${role}-max`] = `${def.maxPx}px`;
            vars[`--type-${role}-line-height`] = String(def.lineHeight);
            vars[`--type-${role}-weight`] = String(def.weight);
            vars[`--type-${role}-letter-spacing`] = def.letterSpacing;
        }
    }

    if (theme.layout?.containerWidths) {
        vars['--container-content'] = `${theme.layout.containerWidths.content}px`;
        vars['--container-wide'] = `${theme.layout.containerWidths.wide}px`;
    }

    if (theme.motion?.duration) {
        vars['--motion-hover'] = `${theme.motion.duration.hover}ms`;
        vars['--motion-reveal'] = `${theme.motion.duration.reveal}ms`;
        vars['--motion-stagger'] = `${theme.motion.duration.stagger}ms`;
    }
    if (theme.motion?.easing) {
        vars['--motion-ease-standard'] = theme.motion.easing.standard;
        vars['--motion-ease-enter'] = theme.motion.easing.enter;
        vars['--motion-ease-exit'] = theme.motion.easing.exit;
    }

    return vars;
}
