// src/shared/services/merchant/merchantSwitchConfig.ts
//
// Config-driven registry backing AuthProvider.switchContext(orgType, code).
// Each Merchant SSO org type just needs a GraphQL call + redirect path
// registered here — adding a new org type later (e.g. a future 'CUSTOMER'
// workspace) is a config change in this file, not a new hardcoded method
// (merchantSwitchToX) plus new call sites scattered across pages.
//
// Extracted to its own module (rather than living inline in AuthProvider) so
// the mapping is unit-testable without needing a SolidJS component context.

import { MerchantService } from './merchant.service';

export type MerchantOrgType = 'AGENCY' | 'TENANT';

export interface MerchantSwitchConfigEntry {
    call: (code: string) => Promise<{ token?: string | null } | null | undefined>;
    redirectPath: string;
}

export const MERCHANT_SWITCH_CONFIG: Record<MerchantOrgType, MerchantSwitchConfigEntry> = {
    AGENCY: {
        call: (code) => MerchantService.switchToAgency({ input: { agencyCode: code } }),
        redirectPath: '/agency/login',
    },
    TENANT: {
        call: (code) => MerchantService.switchToTenant({ input: { tenantCode: code } }),
        redirectPath: '/tenant/login',
    },
};
