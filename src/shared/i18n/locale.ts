// src/shared/i18n/locale.ts
//
// Single source of truth for "which locale is the user using" — a persisted Solid
// signal read by both the static-UI-text translator (t.ts) and the GraphQL client
// (sent as the `x-locale` header on every request, so BE-generated error/response
// messages come back already localized — see ddd-graphql-be's core/shared/i18n).
import { createSignal } from 'solid-js';

export type Locale = 'vi' | 'en';
export const DEFAULT_LOCALE: Locale = 'vi';
export const SUPPORTED_LOCALES: Locale[] = ['vi', 'en'];

const STORAGE_KEY = 'agribase:locale';

function isLocale(value: unknown): value is Locale {
    return typeof value === 'string' && (SUPPORTED_LOCALES as string[]).includes(value);
}

function readStoredLocale(): Locale {
    // SSR-safe: `localStorage` doesn't exist on the server, and Astro renders this
    // module server-side first — never assume `window` is present.
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return isLocale(stored) ? stored : DEFAULT_LOCALE;
    } catch {
        return DEFAULT_LOCALE; // private-mode / storage disabled
    }
}

const [locale, setLocaleSignal] = createSignal<Locale>(readStoredLocale());

export function getLocale(): Locale {
    return locale();
}

export function setLocale(next: Locale): void {
    setLocaleSignal(next);
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // private-mode / storage disabled — locale still works for this session via the signal
    }
}

export { locale as localeSignal };
