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

export function TenantStaffSettingsPanel() {
    const [allowSelf, setAllowSelf] = createSignal(false);
    const [autoApprove, setAutoApprove] = createSignal(false);
    const [defaultRoles, setDefaultRoles] = createSignal<ERole[]>([ERole.TENANT_STAFF]);
    const [defaultPerms, setDefaultPerms] = createSignal<Set<string>>(new Set());
    const [saving, setSaving] = createSignal(false);
    const [loaded, setLoaded] = createSignal(false);
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
            toast().danger(e?.message ?? 'Không tải được cấu hình nhân sự');
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
            toast().success('Đã lưu cấu hình nhân sự');
        } catch (e: any) {
            toast().danger(e?.message ?? 'Lưu cấu hình thất bại');
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
                    <h3 class="font-bold text-gray-900">Cấu hình tự đăng ký nhân sự</h3>
                    <p class="text-xs text-gray-500 mt-0.5">
                        Cho phép nhân sự tự đăng ký & thiết lập vai trò/quyền cấp sẵn khi họ tham gia.
                    </p>
                </div>
            </div>

            <Show
                when={loaded()}
                fallback={
                    <div class="flex items-center gap-2 text-sm text-gray-400 py-6">
                        <Icon name="svg-spinners:ring-resize" class="w-4 h-4" /> Đang tải cấu hình...
                    </div>
                }
            >
                <div class="space-y-4">
                    {/* Toggle: cho phép tự đăng ký */}
                    <div class="flex items-center justify-between gap-4 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                        <div class="min-w-0">
                            <p class="text-sm font-semibold text-gray-800">Cho phép tự đăng ký</p>
                            <p class="text-xs text-gray-500">Hiện nút "Đăng ký & xin vào đơn vị" ở trang đăng nhập tenant.</p>
                        </div>
                        <Toggle value={allowSelf()} onChange={setAllowSelf} />
                    </div>

                    {/* Toggle: tự động duyệt */}
                    <div class="flex items-center justify-between gap-4 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                        <div class="min-w-0">
                            <p class="text-sm font-semibold text-gray-800">Tự động duyệt yêu cầu</p>
                            <p class="text-xs text-gray-500">Lời xin làm nhân sự được duyệt ngay, không cần thao tác thủ công.</p>
                        </div>
                        <Toggle value={autoApprove()} onChange={setAutoApprove} />
                    </div>

                    {/* Vai trò mặc định */}
                    <div>
                        <label class="text-sm font-semibold text-gray-800">Vai trò cấp khi khởi tạo</label>
                        <div class="mt-1.5">
                            <Select
                                multi
                                type="array"
                                value={defaultRoles()}
                                onChange={(v: any) => setDefaultRoles((v ?? []) as ERole[])}
                                options={TENANT_ROLE_OPTIONS}
                                placeholder="Chọn vai trò mặc định..."
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
                                Quyền cấp sẵn
                                <span class="text-xs font-normal text-gray-400">({defaultPerms().size} quyền)</span>
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
                                    fallback={<div class="text-sm text-gray-400 py-4 text-center">Đang tải danh sách quyền...</div>}
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
                                                            {allOn() ? 'Bỏ chọn' : 'Chọn tất cả'}
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
                            disabled={saving()}
                            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white
                                   bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition
                                   disabled:opacity-60 min-w-[130px] justify-center"
                        >
                            <Show when={saving()}><Icon name="svg-spinners:ring-resize" class="w-3.5 h-3.5" /></Show>
                            {saving() ? 'Đang lưu...' : 'Lưu cấu hình'}
                        </button>
                    </div>
                </div>
            </Show>
        </Card>
    );
}
