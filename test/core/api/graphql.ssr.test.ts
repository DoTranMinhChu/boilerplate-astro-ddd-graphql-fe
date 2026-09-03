import { describe, it, expect } from 'vitest';
import { GraphQL } from '@core/api/graphql';

describe('GraphQL.defaultContext — SSR', () => {
    it('uses network-only server-side — no server-process-lifetime stale cache (see fix comment in graphql.ts)', () => {
        expect(GraphQL.defaultContext.requestPolicy).toBe('network-only');
    });
});
