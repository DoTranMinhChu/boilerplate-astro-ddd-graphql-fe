// src/core/hooks/useFeatureFetcher.ts

import { useFeature } from '@/shared/contexts/feature/FeatureContext';
import { EFeature } from '@/shared/generated/typed-graphql';
import { TenantService } from '@/shared/services/tenant/tenant.service';

export function useFeatureFetcher() {
    const { setFeatures } = useFeature();

    const fetchFeatures = async () => {
        try {
            const tenant = await TenantService.getMyTenant();
            if (tenant?.subscribedFeatures) {
                setFeatures(tenant.subscribedFeatures as EFeature[]);
            }
        } catch (e) {
            console.warn('[Feature] Failed to fetch features:', e);
        }
    };

    return { fetchFeatures };
}