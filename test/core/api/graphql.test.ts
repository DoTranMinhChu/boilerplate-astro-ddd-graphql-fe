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
import { GraphQL } from '@core/api/graphql';

describe('GraphQL.defaultContext — client', () => {
    it('keeps cache-first on the client — resetClient() on every mutation still handles invalidation there', () => {
        expect(GraphQL.defaultContext.requestPolicy).toBe('cache-first');
    });
});
