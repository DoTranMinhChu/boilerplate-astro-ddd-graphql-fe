import { describe, it, expect } from 'vitest';
import { BaseService } from './base.service';

// Companion to core/api/graphql.ssr.test.ts (Task 9) — proves the SSR fix there isn't
// silently overridden by BaseService's own defaultContext, which every queryApi/mutationApi
// call merges on TOP of GraphQL.defaultContext (context arg wins in Util.assign). See the
// fix comment on BaseService.defaultContext for the full mechanism.
describe('BaseService.defaultContext — SSR', () => {
    it('uses network-only server-side, matching GraphQL.defaultContext (was hardcoded cache-first, silently overriding the SSR fix for every domain service)', () => {
        expect(BaseService.defaultContext.requestPolicy).toBe('network-only');
    });
});
