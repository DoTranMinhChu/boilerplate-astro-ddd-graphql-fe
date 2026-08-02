// src/modules/tenant/pages/organization/manageTenantBusinessRoles.page.tsx
//
// Lets the current tenant pick its business role(s) — Tenant.businessRoles is the
// source of truth (see TenantService.setMyTenantBusinessRoles / TenantRolesContext,
// which sidebar entries can gate on via `requiredBusinessRole`). Roles/copy here
// are a generic example (src/shared/config/tenantBusinessRole.meta.ts) — replace
// with the real business-role taxonomy for your product.

import { createEffect, createSignal, For } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';
import { Button } from '@core/components/button/Button';
import { toast } from '@core/components/toast/ToastProvider';
import { TenantService } from '@/shared/services/tenant/tenant.service';
import { TENANT_BUSINESS_ROLE_META, TENANT_BUSINESS_ROLE_ORDER } from '@/shared/config/tenantBusinessRole.meta';
import { ETenantBusinessRole } from '@/shared/generated/typed-graphql';

export function ManageTenantBusinessRolesPage() {
  const [selected, setSelected] = createSignal<Set<ETenantBusinessRole>>(new Set());
  const [saving, setSaving] = createSignal(false);

  createEffect(() => {
    TenantService.getMyTenant()
      .then(tenant => {
        const roles = (tenant?.businessRoles ?? []) as ETenantBusinessRole[];
        setSelected(new Set(roles));
      })
      .catch(() => { /* keep empty selection on error */ });
  });

  const toggle = (role: ETenantBusinessRole) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await TenantService.setMyTenantBusinessRoles(Array.from(selected()));
      toast().success('Đã lưu vai trò tổ chức');
    } catch (e: any) {
      toast().danger(e?.message ?? 'Có lỗi khi lưu vai trò tổ chức');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="space-y-6 animate-in max-w-2xl">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Vai trò tổ chức</h1>
          <p class="text-sm text-gray-500 mt-1">
            Chọn một hoặc nhiều vai trò nghiệp vụ mô tả tổ chức của bạn — dùng để
            hiển thị đúng menu/tính năng liên quan.
          </p>
        </div>
        <Button main label="Lưu" loading={saving()} onClick={handleSave} class="shrink-0 h-10 px-5 rounded-xl font-semibold" />
      </div>

      <div class="grid gap-3">
        <For each={TENANT_BUSINESS_ROLE_ORDER}>
          {(role) => {
            const meta = TENANT_BUSINESS_ROLE_META[role];
            const isActive = () => selected().has(role);
            return (
              <Card
                class={`cursor-pointer border p-4 transition-colors ${isActive() ? meta.accent : 'border-gray-100'}`}
                onClick={() => toggle(role)}
              >
                <div class="flex items-start gap-3">
                  <div class="shrink-0 w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center">
                    <Icon name={meta.icon} class="w-5 h-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-bold text-sm">{meta.label}</p>
                    <p class="text-xs opacity-80 mt-0.5">{meta.description}</p>
                  </div>
                  <Icon
                    name={isActive() ? 'heroicons-solid:check-circle' : 'heroicons-outline:circle'}
                    class="w-5 h-5 shrink-0 mt-0.5"
                  />
                </div>
              </Card>
            );
          }}
        </For>
      </div>
    </div>
  );
}

export default ManageTenantBusinessRolesPage;
