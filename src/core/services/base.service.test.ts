// @vitest-environment jsdom
//
// Same reason as core/api/graphql.test.ts (Task 9): this repo's default vitest.config.ts
// pins `environment: 'node'`, which makes `import.meta.env.SSR` read `true` even in the
// "client" project unless a file opts into jsdom's transformMode via this pragma.
import { describe, it, expect } from 'vitest';
import { BaseService } from './base.service';

describe('BaseService.defaultContext — client', () => {
    it('keeps cache-first on the client', () => {
        expect(BaseService.defaultContext.requestPolicy).toBe('cache-first');
    });
});
