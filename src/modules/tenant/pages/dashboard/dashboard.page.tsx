// src/modules/tenant/pages/dashboard/dashboard.page.tsx
//
// The original agribase-fe dashboard here was a large (750+ line), fully
// domain-specific page: production plot maps (leaflet), lot/process status
// widgets, overviewStats wired to agri-specific services. None of that
// generalizes, so it was intentionally replaced with this minimal
// placeholder. Reused as-is for both `tenantDashboard.home` and
// `agencyDashboard.default` / `agencyDashboard.home` routes — build your
// real dashboard widgets here against the paired ddd-graphql-be schema.

import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';

export function TenantDashboardPage() {
    const { authAccount } = useAuth();

    return (
        <div class="space-y-6 animate-in">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">
                    Xin chào, {authAccount()?.account.name}
                </h1>
                <p class="text-sm text-gray-500 mt-1">
                    Đây là trang dashboard mẫu — thay bằng các widget nghiệp vụ thực tế của bạn.
                </p>
            </div>

            <Card class="p-10 flex flex-col items-center justify-center text-center border-dashed border-2 gap-2">
                <Icon name="heroicons-outline:chart-bar" class="w-10 h-10 text-gray-300" />
                <p class="text-gray-400 italic">
                    Dashboard content is intentionally left blank in this source base.
                </p>
            </Card>
        </div>
    );
}
