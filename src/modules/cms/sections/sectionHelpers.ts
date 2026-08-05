import { ESectionTheme, ESpacing, type ESectionTheme as ESectionThemeType, type ESpacing as ESpacingType } from '@/modules/cms/cms.constants';
import type { AnimationLayer, SectionDTO } from '@/modules/cms/cms.types';

export const DEFAULT_ACCENT_COLOR = '#2563eb'; // tailwind primary-600 — matches pre-style-system default

export function getLayer(section: SectionDTO, target: string): AnimationLayer | undefined {
    return section.animation?.find((l) => l.target === target);
}

/** CSS custom properties from `section.style` (Page Builder Style tab) — set only when the
 * admin actually customized a value, so components' `var(--x, <fallback>)` keeps rendering
 * their original hardcoded look when no style was set (no visual change for existing data). */
export function sectionCssVars(section: SectionDTO): Record<string, string> {
    const s = section.style;
    const vars: Record<string, string> = {};
    if (s?.backgroundColor) vars['--section-bg'] = s.backgroundColor;
    if (s?.textColor) vars['--section-text'] = s.textColor;
    if (s?.accentColor) vars['--section-accent'] = s.accentColor;
    return vars;
}

/** Resolves the effective theme: new `style.theme` (Page Builder) wins; falls back to the
 * older per-type `content.theme` field (still used by Hero's own form) for old sections. */
export function resolveTheme(section: SectionDTO, legacyThemeField?: string): ESectionThemeType {
    return section.style?.theme ?? (legacyThemeField === ESectionTheme.DARK ? ESectionTheme.DARK : ESectionTheme.LIGHT);
}

export function themeBackgroundClass(theme: ESectionThemeType): string {
    switch (theme) {
        case ESectionTheme.DARK: return 'bg-neutral-950 text-white';
        case ESectionTheme.BRAND: return 'bg-[var(--section-accent,#2563eb)] text-white';
        default: return 'bg-white text-neutral-900';
    }
}

export function spacingClass(spacing?: ESpacingType): string {
    switch (spacing) {
        case ESpacing.SM: return 'py-8 md:py-12';
        case ESpacing.LG: return 'py-20 md:py-32';
        default: return 'py-14 md:py-20';
    }
}

export function hiddenOnMobileClass(section: SectionDTO): string {
    return section.responsiveSettings?.hideOnMobile ? 'hidden md:block' : '';
}
