// @vitest-environment jsdom
//
// Deviation from the plan's verbatim test file text (Task 9): this repo's default
// vitest.config.ts pins `environment: 'node'` for the whole project — but Vitest derives
// its *transform* mode (which decides the `import.meta.env.SSR` define, per vite-node's
// getTransformMode) from that `environment` setting alone, NOT from the file's
// `resolve.conditions: ['browser']`. Vitest's built-in 'node' environment always maps to
// transformMode 'ssr', so `import.meta.env.SSR` is `true` even in this "client" project —
// verified empirically (a bare `console.log(import.meta.env.SSR)` prints `true` here
// without this pragma). Only jsdom/happy-dom environments map to transformMode 'web',
// which is what actually flips the define to `false`, matching Astro's real client
// browser bundle. This repo already has the exact pragma for pulling in jsdom scoped to
// one file (see applyAnimationTimeline.test.ts, ContentEntryRepeaterInput.test.ts) — here
// it is repurposed for the SSR define instead of `window`/`document`, but the mechanism
// and the "scoped to just this file" rationale are the same.
import { describe, it, expect } from 'vitest';
import type { CombinedError } from '@urql/core';
import { GraphQL } from '@core/api/graphql';
import { baseConfig } from '@core/components/config/BaseConfig';

describe('GraphQL.defaultContext — client', () => {
    it('keeps cache-first on the client — resetClient() on every mutation still handles invalidation there', () => {
        expect(GraphQL.defaultContext.requestPolicy).toBe('cache-first');
    });
});

// Locale + error-action resolution moved from direct `getLocale()`/`getErrorAction()` imports
// (shared/) to the same resolver-injection pattern already used for the JWT/acting-tenant
// resolvers above. These tests exercise both halves: (1) the safe default BEFORE AuthProvider
// ever wires the real resolvers in — this file only imports `GraphQL` itself (no AuthProvider
// import chain), so the class is guaranteed to still be in its just-constructed state here,
// unlike an app-level test; and (2) that a request/error still carries the correct value once
// a resolver IS registered. Order matters within this describe block: the "before any resolver
// is registered" cases must run first, since setLocaleResolver/setErrorActionResolver mutate
// GraphQL's static fields for the rest of the file (there is no reset hook, matching how the
// existing token/acting-tenant resolvers work too).
describe('GraphQL locale/error-action resolver injection', () => {
    it('defaultHeaders defaults x-locale to "vi" before any locale resolver is registered — never sends a malformed header', () => {
        expect(GraphQL.defaultHeaders['x-locale']).toBe('vi');
    });

    it('handleError does not flip tokenExpired/outOfScope before any error-action resolver is registered', () => {
        const error = {
            graphQLErrors: [{ message: 'boom', extensions: { code: 'SOME_UNMAPPED_CODE' } }],
            networkError: null,
        } as unknown as CombinedError;

        GraphQL.handleError(error);

        expect(baseConfig().tokenExpired()).toBe(false);
        expect(baseConfig().outOfScope()).toBe(false);
    });

    it('defaultHeaders sends x-locale from the injected resolver once wired (mirrors AuthProvider wiring getLocale())', () => {
        GraphQL.setLocaleResolver(() => 'en');
        expect(GraphQL.defaultHeaders['x-locale']).toBe('en');
    });

    it('handleError flips tokenExpired when the injected error-action resolver reports sessionExpired — same signal legacy OauthError.REFRESH_TOKEN_EXPIRED drives', () => {
        GraphQL.setErrorActionResolver((code) => ({
            severity: 'warning',
            sessionExpired: code === 'AUTH_REQUIRED',
        }));

        const error = {
            graphQLErrors: [{ message: 'no auth', extensions: { code: 'AUTH_REQUIRED' } }],
            networkError: null,
        } as unknown as CombinedError;

        GraphQL.handleError(error);

        expect(baseConfig().tokenExpired()).toBe(true);
    });

    it('handleError flips outOfScope when the injected error-action resolver reports outOfScope — same signal legacy OauthError.OUT_OF_SCOPE drives', () => {
        GraphQL.setErrorActionResolver((code) => ({
            severity: 'warning',
            outOfScope: code === 'PERMISSION_DENIED',
        }));

        const error = {
            graphQLErrors: [{ message: 'denied', extensions: { code: 'PERMISSION_DENIED' } }],
            networkError: null,
        } as unknown as CombinedError;

        GraphQL.handleError(error);

        expect(baseConfig().outOfScope()).toBe(true);
    });
});
