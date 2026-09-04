// src/core/components/control/Select.tsx
// @vitest-environment jsdom
//
// Covers setAgencyActingTenantIdResolver's dependency-injection wiring — same DI pattern as
// core/api/graphql.ts's _actingTenantResolver (see test/core/api/graphql.test.ts), mirrored
// here at the component level: (1) the safe default BEFORE AuthProvider ever wires the real
// resolver in (this file only imports Select itself, no AuthProvider import chain, so the
// module is guaranteed to still be in its just-constructed state at the top of this file),
// and (2) that optionsQuery's filter carries the resolved tenant id once a resolver IS
// registered. Order matters within this file: the "before any resolver is registered" case
// must run first, since setAgencyActingTenantIdResolver mutates a module-level field for the
// rest of the file (there is no reset hook, same as the token/acting-tenant/locale resolvers
// this pattern is copied from).
//
// Exercised via a real render (not by exporting the internal loadOptionsQuery) — mounting
// <Select optionsQuery={...}/> triggers the component's own initial-load effect immediately,
// so the mock optionsQuery.query fn's call args are the actual filter Select builds, without
// needing to reach into component internals.
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@solidjs/testing-library';
import { Select, setAgencyActingTenantIdResolver } from '@core/components/control/Select';

type Item = { id: string; name: string };

const makeOptionsQuery = () => {
    const query = vi.fn().mockResolvedValue({
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
    });
    return {
        query,
        option: (item: Item) => ({ label: item.name, value: item.id }),
        filter: { active: true },
    };
};

describe('Select agency-tenant-scoping resolver injection', () => {
    it('does not add tenantId to the query filter before any resolver is registered', async () => {
        const optionsQuery = makeOptionsQuery();

        render(() => (
            <Select value="" onChange={vi.fn()} fieldless optionsQuery={optionsQuery} />
        ));

        await waitFor(() => expect(optionsQuery.query).toHaveBeenCalled());

        const { filter } = optionsQuery.query.mock.calls[0][0].input;
        expect(filter).toEqual({ active: true });
        expect(filter.tenantId).toBeUndefined();
    });

    it('adds tenantId to the query filter once a resolver is registered and returns one', async () => {
        setAgencyActingTenantIdResolver(() => 'tenant-abc');

        const optionsQuery = makeOptionsQuery();

        render(() => (
            <Select value="" onChange={vi.fn()} fieldless optionsQuery={optionsQuery} />
        ));

        await waitFor(() => expect(optionsQuery.query).toHaveBeenCalled());

        const { filter } = optionsQuery.query.mock.calls[0][0].input;
        expect(filter).toEqual({ active: true, tenantId: 'tenant-abc' });
    });

    it('falls back to the plain filter again once the resolver returns undefined (e.g. a non-agency user)', async () => {
        setAgencyActingTenantIdResolver(() => undefined);

        const optionsQuery = makeOptionsQuery();

        render(() => (
            <Select value="" onChange={vi.fn()} fieldless optionsQuery={optionsQuery} />
        ));

        await waitFor(() => expect(optionsQuery.query).toHaveBeenCalled());

        const { filter } = optionsQuery.query.mock.calls[0][0].input;
        expect(filter).toEqual({ active: true });
        expect(filter.tenantId).toBeUndefined();
    });
});
