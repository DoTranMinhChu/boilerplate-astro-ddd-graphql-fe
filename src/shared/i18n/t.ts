// src/shared/i18n/t.ts
//
// Minimal hand-rolled translation helper — deliberately not a full i18n framework
// (no ICU plural rules, no namespacing beyond dotted keys), matching this codebase's
// existing "hand-rolled over framework" style elsewhere in core/. Type-safe: `t()`
// only accepts dotted paths that actually exist in the vi dictionary (the source of
// truth for what keys exist at all).
import { vi } from './dictionaries/vi';
import { en } from './dictionaries/en';
import { getLocale } from './locale';

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

// vi.ts is declared `as const` so DotPaths below can infer literal key names — but that
// also narrows every leaf VALUE to its exact string literal, which would make en.ts
// unable to assign different (English) strings to the same keys. This widens every leaf
// back to `string` while preserving the key structure, so `DeepPartial<Widen<typeof vi>>`
// in en.ts type-checks any translated string against the right shape.
export type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

// Recursively build a union of every dotted key path in the vi dictionary, e.g.
// "common.save" | "common.cancel" | "locale.switcherLabel" | ...
type DotPaths<T, Prefix extends string = ''> = T extends string
    ? Prefix extends '' ? never : Prefix
    : {
        [K in keyof T & string]: DotPaths<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>;
    }[keyof T & string];

export type TranslationKey = DotPaths<typeof vi>;

const DICTIONARIES = { vi, en } as const;

function getByPath(obj: any, path: string): string | undefined {
    const value = path.split('.').reduce<any>((acc, segment) => acc?.[segment], obj);
    return typeof value === 'string' ? value : undefined;
}

/**
 * Translate a static UI text key for the current locale. Falls back to the Vietnamese
 * string if the current locale's dictionary doesn't have that key yet (Phase 3 rolls
 * out translations incrementally — a missing `en` entry must never render a blank or
 * a raw key to the user).
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
    return resolve(key, params);
}

function resolve(key: string, params?: Record<string, string | number>): string {
    const locale = getLocale();
    const raw = getByPath(DICTIONARIES[locale], key) ?? getByPath(vi, key) ?? key;
    if (!params) return raw;
    return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) => str.replaceAll(`{${paramKey}}`, String(paramValue)),
        raw,
    );
}

/**
 * Same lookup as `t()`, but accepts any string — for the rare case of data-driven
 * content that's a MIX of real translation keys and literal technical/example values
 * (e.g. a provider-config table with both `"admin.smtpGuide.common.encryptionLabel"`
 * and literal `"smtp.gmail.com"` in the same array). `t()` stays strict (only accepts
 * known keys) as the default/safety-net for ordinary call sites — reach for this only
 * when a field is genuinely allowed to hold either a key or a literal.
 */
export function tOrLiteral(key: string, params?: Record<string, string | number>): string {
    return resolve(key, params);
}
