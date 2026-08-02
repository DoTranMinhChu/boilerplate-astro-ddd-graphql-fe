// src/modules/tenant/components/tenantStaffSettings.component.tsx
//
// Panel cấu hình TỰ-ĐĂNG-KÝ & KHỞI TẠO nhân sự cho Tenant.
//   - allowSelfRegistration   : cho phép nhân sự tự đăng ký tại trang login tenant
//   - autoApproveJoinRequests : tự động duyệt lời xin làm nhân sự
//   - defaultRoles            : vai trò cấp cho nhân sự mới lúc khởi tạo
//   - defaultPermissions      : quyền cấp sẵn (phạm vi toàn bộ) lúc khởi tạo

import { createResource, createSignal, For, Show, onMount } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Toggle } from '@core/components/control/Toggle';
import { Select } from '@core/components/control/Select';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { ERole, EPermission } from '@shared/generated/typed-graphql';
import { TENANT_ROLE_OPTIONS } from '@/modules/merchant/merchant.constants';
import { TenantStaffSettingService } from '@/shared/services/tenantStaffSetting/tenantStaffSetting.service';
import { AccountPermissionService, PermissionGroupDTO } from '@/shared/services/accountPermission/accountPermission.service';
import { t } from '@/shared/i18n/t';

export function TenantStaffSettingsPanel() {
    const [allowSelf, setAllowSelf] = createSignal(false);
    const [autoApprove, setAutoApprove] = createSignal(false);
    const [defaultRoles, setDefaultRoles] = createSignal<ERole[]>([ERole.TENANT_STAFF]);
    const [defaultPerms, setDefaultPerms] = createSignal<Set<string>>(new Set());
    const [saving, setSaving] = createSignal(false);
    const [loaded, setLoaded] = createSignal(false);
    const [loadError, setLoadError] = createSignal(false);
    const [showPerms, setShowPerms] = createSignal(false);

    const [groups] = createResource<PermissionGroupDTO[]>(() => AccountPermissionService.getPermissionGroups());

    onMount(async () => {
        try {
            const s = await TenantStaffSettingService.getMyTenantStaffSetting();
            setAllowSelf(!!s?.allowSelfRegistration);
            setAutoApprove(!!s?.autoApproveJoinRequests);
            setDefaultRoles((s?.defaultRoles as ERole[])?.length ? (s!.defaultRoles as ERole[]) : [ERole.TENANT_STAFF]);
            setDefaultPerms(new Set((s?.defaultPermissions as string[]) ?? []));
        } catch (e: any) {
            // Do NOT leave the form at its initial defaults and still saveable —
            // that would let the user overwrite the tenant's real staff settings
            // with defaults without realizing the load failed.
            setLoadError(true);
            toast().danger(e?.message ?? t('tenant.staffSettings.loadError'));
        } finally {
            setLoaded(true);
        }
    });

    const togglePerm = (value: string) =>
        setDefaultPerms((prev) => {
            const next = new Set(prev);
            next.has(value) ? next.delete(value) : next.add(value);
            return next;
        });

    const toggleGroup = (g: PermissionGroupDTO) =>
        setDefaultPerms((prev) => {
            const next = new Set(prev);
            const allOn = g?.permissions?.every((p) => next.has(p?.value!)) ?? false;
            for (const p of g?.permissions ?? []) {
                allOn ? next.delete(p?.value!) : next.add(p?.value!);
            }
            return next;
        });

    const handleSave = async () => {
        if (loadError()) return;
        setSaving(true);
        try {
            await TenantStaffSettingService.upsertMyTenantStaffSetting({
                data: {
                    allowSelfRegistration: allowSelf(),
                    autoApproveJoinRequests: autoApprove(),
                    defaultRoles: defaultRoles(),
                    defaultPermissions: Array.from(defaultPerms()) as EPermission[],
                },
            });
            toast().success(t('tenant.staffSettings.saveSuccess'));
        } catch (e: any) {
            toast().danger(e?.message ?? t('tenant.staffSettings.saveError'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card class="p-5 border-none shadow-sm bg-white">
            <div class="flex items-start gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <Icon name="heroicons-outline:cog-6-tooth" class="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h3 class="font-bold text-gray-900">{t('tenant.staffSettings.title')}</h3>
                    <p class="text-xs text-gray-500 mt-0.5">
                        {t('tenant.staffSettings.subtitle')}
                    </p>
                </div>
            </div>

            <Show
                when={loaded()}
                fallback={
                    <div class="flex items-center gap-2 text-sm text-gray-400 py-6">
                        <Icon name="svg-spinners:ring-resize" class="w-4 h-4" /> {t('tenant.staffSettings.loading')}
                    </div>
                }
            >
                <div class="space-y-4">
                    {/* Toggle: cho phép tự đăng ký */}
                    <div class="flex items-center justify-between gap-4 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                        <div class="min-w-0">
                            <p class="text-sm font-semibold text-gray-800">{t('tenant.staffSettings.allowSelf.label')}</p>
                            <p class="text-xs text-gray-500">{t('tenant.staffSettings.allowSelf.description')}</p>
                        </div>
                        <Toggle value={allowSelf()} onChange={setAllowSelf} />
                    </div>

                    {/* Toggle: tự động duyệt */}
                    <div class="flex items-center justify-between gap-4 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                        <div class="min-w-0">
                            <p class="text-sm font-semibold text-gray-800">{t('tenant.staffSettings.autoApprove.label')}</p>
                            <p class="text-xs text-gray-500">{t('tenant.staffSettings.autoApprove.description')}</p>
                        </div>
                        <Toggle value={autoApprove()} onChange={setAutoApprove} />
                    </div>

                    {/* Vai trò mặc định */}
                    <div>
                        <label class="text-sm font-semibold text-gray-800">{t('tenant.staffSettings.defaultRoles.label')}</label>
                        <div class="mt-1.5">
                            <Select
                                multi
                                type="array"
                                value={defaultRoles()}
                                onChange={(v: any) => setDefaultRoles((v ?? []) as ERole[])}
                                options={TENANT_ROLE_OPTIONS}
                                placeholder={t('tenant.staffSettings.defaultRoles.placeholder')}
                            />
                        </div>
                    </div>

                    {/* Quyền mặc định (tùy chọn) */}
                    <div class="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowPerms((v) => !v)}
                            class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
                        >
                            <span class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                <Icon name="heroicons-outline:shield-check" class="w-4 h-4 text-blue-500" />
                                {t('tenant.staffSettings.defaultPerms.label')}
                                <span class="text-xs font-normal text-gray-400">{t('tenant.staffSettings.defaultPerms.count', { count: defaultPerms().size })}</span>
                            </span>
                            <Icon
                                name="heroicons-outline:chevron-down"
                                class={`w-4 h-4 text-gray-400 transition-transform ${showPerms() ? 'rotate-180' : ''}`}
                            />
                        </button>

                        <Show when={showPerms()}>
                            <div class="p-3 space-y-2 max-h-[340px] overflow-y-auto">
                                <Show
                                    when={!groups.loading}
                                    fallback={<div class="text-sm text-gray-400 py-4 text-center">{t('tenant.staffSettings.loadingPerms')}</div>}
                                >
                                    <For each={groups()}>
                                        {(group) => {
                                            const allOn = () => group?.permissions?.every((p) => defaultPerms().has(p?.value!)) ?? false;
                                            return (
                                                <div class="border border-gray-100 rounded-lg overflow-hidden">
                                                    <div class="px-3 py-2 bg-gray-50 flex items-center justify-between gap-2">
                                                        <p class="text-sm font-semibold text-gray-700">{group?.label}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleGroup(group)}
                                                            class="text-[11px] font-semibold text-blue-600 hover:underline shrink-0"
                                                        >
                                                            {allOn() ? t('tenant.staffSettings.deselectAll') : t('tenant.staffSettings.selectAll')}
                                                        </button>
                                                    </div>
                                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                                                        <For each={group?.permissions}>
                                                            {(perm) => (
                                                                <label class="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                        checked={defaultPerms().has(perm?.value!)}
                                                                        onChange={() => togglePerm(perm?.value!)}
                                                                    />
                                                                    <span class="truncate">{perm?.label}</span>
                                                                </label>
                                                            )}
                                                        </For>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    </For>
                                </Show>
                            </div>
                        </Show>
                    </div>

                    {/* Save */}
                    <div class="flex justify-end pt-1">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving() || loadError()}
                            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white
                                   bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition
                                   disabled:opacity-60 min-w-[130px] justify-center"
                        >
                            <Show when={saving()}><Icon name="svg-spinners:ring-resize" class="w-3.5 h-3.5" /></Show>
                            {saving() ? t('tenant.common.saving') : t('tenant.staffSettings.saveButton')}
                        </button>
                    </div>
                </div>
            </Show>
        </Card>
    );
}
