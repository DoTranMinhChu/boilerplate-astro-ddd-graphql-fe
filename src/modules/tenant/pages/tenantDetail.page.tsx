import { createResource } from "solid-js";

import { Card } from "@core/components/utilities/Card";
import { Icon } from "@shared/components/icons/Icon";
import { TenantService } from "@/shared/services/tenant/tenant.service";
import { Tabs } from "@/core/components/tab/Tabs";

import { TenantAccountSection } from "../components/tenantAccountSection.component";
import { useRoutes } from "@/shared/contexts/routes/RoutesContext";
import { Button } from "@/core/components/button/Button";
import { useNavigate } from "@solidjs/router";
import { notifyResourceError } from "@core/helpers/resourceError";
import { t } from "@/shared/i18n/t";

export default function TenantDetailPage() {
  const navigate = useNavigate();
  const { searchParams } = useRoutes();
  const [tenant] = createResource(
    () => searchParams.tenantId,
    (id) => TenantService.getOneTenant(id)
  );
  notifyResourceError(tenant, t('tenant.detail.loadError'));

  return (
    <div class="space-y-6 animate-in">
      {/* Header */}
      <div class="flex items-center gap-4">
        <Button
          class="p-2 bg-white rounded-xl border shadow-sm hover:bg-gray-50"
          onClick={() => {
            navigate(-1);
          }}
        >
          <Icon
            name="heroicons-outline:arrow-left"
            class="w-5 h-5 text-gray-500"
          />
        </Button>
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">
            {tenant()?.name || t('tenant.detail.loadingName')}
          </h1>
          <p class="text-sm text-gray-500 font-medium italic">
            {t('tenant.detail.belongsToAgency', { name: tenant()?.agency?.name ?? '' })}
          </p>
        </div>
      </div>

      <Tabs id="TenantDetailTabs">
        <Tabs.Tab
          label={t('tenant.detail.tabSystemStaff')}
          icon={<Icon name="heroicons-outline:home-modern" />}
        >
          <div class="mt-4 space-y-6">
            <Card class="p-6 bg-blue-50/20 border-blue-100 border shadow-none grid grid-cols-2 gap-4">
              <div>
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t('tenant.detail.orgLabel')}
                </span>
                <p class="font-bold text-blue-800">{tenant()?.contactEmail}</p>
              </div>
              <div>
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t('tenant.detail.codeLabel')}
                </span>
                <p class="font-bold">{tenant()?.code}</p>
              </div>
            </Card>
            <Card>
              <TenantAccountSection tenantId={searchParams?.tenantId!} />
            </Card>
          </div>
        </Tabs.Tab>

        <Tabs.Tab
          label={t('tenant.detail.tabBilling')}
          icon={<Icon name="heroicons-outline:document-text" />}
        >
          <Card class="mt-4 p-24 flex flex-col items-center border-dashed border-2">
            <p class="text-gray-400 italic">
              {t('tenant.detail.billingInDev')}
            </p>
          </Card>
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}
