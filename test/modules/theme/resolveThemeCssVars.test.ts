import { describe, it, expect } from 'vitest';
import { resolveThemeCssVars } from '@modules/theme/resolveThemeCssVars';
import type { ThemeDTO } from '@/shared/services/theme/theme.service';

const theme: ThemeDTO = {
    id: 't1', name: 'Test', isDefault: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    colors: {
        light: {
            background: '#fff', surface: '#f7f7f8', surfaceMuted: '#eee',
            foreground: '#111', foregroundMuted: '#555', border: '#ddd',
            primary: '#4f46e5', onPrimary: '#fff',
            secondary: '#0ea5e9', onSecondary: '#fff',
            accent: '#f59e0b', onAccent: '#111',
            success: '#16a34a', warning: '#d97706', danger: '#dc2626',
        },
        dark: {
            background: '#0b0e17', surface: '#141b2e', surfaceMuted: '#1c2438',
            foreground: '#f2f4f8', foregroundMuted: '#9aa3b8', border: '#2a3350',
            primary: '#7c8bff', onPrimary: '#0b0e17',
            secondary: '#22d3ee', onSecondary: '#0b0e17',
            accent: '#ff9d4d', onAccent: '#0b0e17',
            success: '#4ade80', warning: '#fbbf24', danger: '#f87171',
        },
    },
    typography: {
        displayFont: { family: 'Lexend', fallback: 'sans-serif', weights: [700] },
        bodyFont: { family: 'Inter', fallback: 'sans-serif', weights: [400] },
        scale: {
            display: { minPx: 44, maxPx: 88, lineHeight: 1.05, weight: 800, letterSpacing: '-0.02em' },
            h1: { minPx: 36, maxPx: 56, lineHeight: 1.12, weight: 700, letterSpacing: '-0.01em' },
            h2: { minPx: 28, maxPx: 40, lineHeight: 1.18, weight: 700, letterSpacing: '0' },
            h3: { minPx: 22, maxPx: 28, lineHeight: 1.22, weight: 600, letterSpacing: '0' },
            h4: { minPx: 18, maxPx: 22, lineHeight: 1.3, weight: 600, letterSpacing: '0' },
            bodyLg: { minPx: 17, maxPx: 18, lineHeight: 1.6, weight: 400, letterSpacing: '0' },
            body: { minPx: 15, maxPx: 16, lineHeight: 1.6, weight: 400, letterSpacing: '0' },
            small: { minPx: 13, maxPx: 14, lineHeight: 1.5, weight: 500, letterSpacing: '0.01em' },
            caption: { minPx: 11, maxPx: 12, lineHeight: 1.4, weight: 500, letterSpacing: '0.04em' },
        },
    },
    layout: {
        spacing: [4, 8, 16], sectionPadding: { desktop: [96, 144], tablet: [64, 96], mobile: [32, 48] },
        containerWidths: { content: 1280, wide: 1600 }, radius: [0, 8], shadow: ['0 1px 2px rgba(0,0,0,.1)'], borderWidth: [1],
    },
    motion: { duration: { hover: 200, reveal: 600, stagger: 60 }, easing: { standard: 'ease', enter: 'ease', exit: 'ease' }, signature: 'x' },
};

describe('resolveThemeCssVars', () => {
    it('maps every semantic color to a --color-* custom property for light mode', () => {
        const vars = resolveThemeCssVars(theme, 'light');
        expect(vars['--color-primary']).toBe('#4f46e5');
        expect(vars['--color-background']).toBe('#fff');
        expect(vars['--color-on-primary']).toBe('#fff');
    });

    it('uses the dark color set when mode is dark and one is defined', () => {
        const vars = resolveThemeCssVars(theme, 'dark');
        expect(vars['--color-primary']).toBe('#7c8bff');
        expect(vars['--color-background']).toBe('#0b0e17');
    });

    it('falls back to light colors for dark mode when the theme has no dark set', () => {
        const lightOnly: ThemeDTO = { ...theme, colors: { light: theme.colors!.light } };
        const vars = resolveThemeCssVars(lightOnly, 'dark');
        expect(vars['--color-primary']).toBe('#4f46e5');
    });

    it('emits font family variables with the real fallback stack', () => {
        const vars = resolveThemeCssVars(theme, 'light');
        expect(vars['--font-display']).toBe("'Lexend', sans-serif");
        expect(vars['--font-body']).toBe("'Inter', sans-serif");
    });

    it('emits container width and motion duration variables', () => {
        const vars = resolveThemeCssVars(theme, 'light');
        expect(vars['--container-content']).toBe('1280px');
        expect(vars['--motion-hover']).toBe('200ms');
    });

    it('returns an empty object (never throws) when theme is undefined', () => {
        expect(resolveThemeCssVars(undefined, 'light')).toEqual({});
    });

    it('emits per-role type-scale variables', () => {
        const vars = resolveThemeCssVars(theme, 'light');
        expect(vars['--type-h1-min']).toBe('36px');
        expect(vars['--type-h1-max']).toBe('56px');
        expect(vars['--type-h1-weight']).toBe('700');
    });

    it('emits one --spacing-N var per index of the theme\'s layout.spacing array', () => {
        const vars = resolveThemeCssVars(theme, 'light');
        // theme fixture's layout.spacing is [4, 8, 16] (see the top-of-file fixture).
        expect(vars['--spacing-0']).toBe('4px');
        expect(vars['--spacing-1']).toBe('8px');
        expect(vars['--spacing-2']).toBe('16px');
        expect(vars['--spacing-3']).toBeUndefined();
    });

    it('emits section-padding min/max vars per breakpoint', () => {
        const vars = resolveThemeCssVars(theme, 'light');
        expect(vars['--section-padding-desktop-min']).toBe('96px');
        expect(vars['--section-padding-desktop-max']).toBe('144px');
        expect(vars['--section-padding-tablet-min']).toBe('64px');
        expect(vars['--section-padding-tablet-max']).toBe('96px');
        expect(vars['--section-padding-mobile-min']).toBe('32px');
        expect(vars['--section-padding-mobile-max']).toBe('48px');
    });
});
