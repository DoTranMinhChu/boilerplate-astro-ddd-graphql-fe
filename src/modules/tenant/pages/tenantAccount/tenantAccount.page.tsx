import { Card } from "@core/components/utilities/Card";
import { TenantAccountSection } from "@/modules/tenant/components/tenantAccountSection.component"; // Import component tái sử dụng

export function TenantAccountPage() {
  return (
    <div class="space-y-6 animate-in">
      {/*
                isTenantView={true}: Để component biết đang chạy trong Tenant Portal
                Không truyền tenantId: Backend tự lấy từ Token
            */}
      <Card class="border-none shadow-sm">
        <TenantAccountSection isTenantView={true} />
      </Card>
    </div>
  );
}
