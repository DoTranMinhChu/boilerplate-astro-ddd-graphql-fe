import { describe, expect, it, vi } from 'vitest';

vi.mock('@shared/services/merchant/merchant.service', () => ({
    MerchantService: {
        switchToAgency: vi.fn(async (args: { input: { agencyCode: string } }) => ({
            token: `agency-token-for-${args.input.agencyCode}`,
        })),
        switchToTenant: vi.fn(async (args: { input: { tenantCode: string } }) => ({
            token: `tenant-token-for-${args.input.tenantCode}`,
        })),
    },
}));

import { MERCHANT_SWITCH_CONFIG } from '@shared/services/merchant/merchantSwitchConfig';

describe('MERCHANT_SWITCH_CONFIG', () => {
    it('registers exactly the AGENCY and TENANT org types', () => {
        expect(Object.keys(MERCHANT_SWITCH_CONFIG).sort()).toEqual(['AGENCY', 'TENANT']);
    });

    it('routes AGENCY to the agency login redirect path', () => {
        expect(MERCHANT_SWITCH_CONFIG.AGENCY.redirectPath).toBe('/agency/login');
    });

    it('routes TENANT to the tenant login redirect path', () => {
        expect(MERCHANT_SWITCH_CONFIG.TENANT.redirectPath).toBe('/tenant/login');
    });

    it('AGENCY.call forwards the code to switchToAgency and returns a token', async () => {
        const res = await MERCHANT_SWITCH_CONFIG.AGENCY.call('acme');
        expect(res?.token).toBe('agency-token-for-acme');
    });

    it('TENANT.call forwards the code to switchToTenant and returns a token', async () => {
        const res = await MERCHANT_SWITCH_CONFIG.TENANT.call('acme-tenant');
        expect(res?.token).toBe('tenant-token-for-acme-tenant');
    });
});
