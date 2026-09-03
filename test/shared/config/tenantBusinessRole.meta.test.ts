import { describe, expect, it } from 'vitest';
import { TENANT_BUSINESS_ROLE_META, TENANT_BUSINESS_ROLE_ORDER } from '@shared/config/tenantBusinessRole.meta';

describe('TENANT_BUSINESS_ROLE_META / TENANT_BUSINESS_ROLE_ORDER', () => {
    it('has metadata for every role listed in TENANT_BUSINESS_ROLE_ORDER', () => {
        for (const role of TENANT_BUSINESS_ROLE_ORDER) {
            expect(TENANT_BUSINESS_ROLE_META[role]).toBeDefined();
            expect(TENANT_BUSINESS_ROLE_META[role].role).toBe(role);
        }
    });

    it('gives every role a non-empty label, description and icon', () => {
        for (const role of TENANT_BUSINESS_ROLE_ORDER) {
            const meta = TENANT_BUSINESS_ROLE_META[role];
            expect(meta.label.length).toBeGreaterThan(0);
            expect(meta.description.length).toBeGreaterThan(0);
            expect(meta.icon.length).toBeGreaterThan(0);
        }
    });

    it('TENANT_BUSINESS_ROLE_ORDER has no duplicate entries', () => {
        expect(new Set(TENANT_BUSINESS_ROLE_ORDER).size).toBe(TENANT_BUSINESS_ROLE_ORDER.length);
    });
});
