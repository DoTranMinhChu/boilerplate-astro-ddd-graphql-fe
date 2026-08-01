// src/modules/tenant/pages/staff/components/PermissionModal.tsx

import {
    createSignal, createResource, For, Show, batch, Accessor,
} from 'solid-js';
import { Avatar } from '@core/components/utilities/Avatar';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import {
    AccountPermissionService,
    PermissionGroupDTO,

} from '@/shared/services/accountPermission/accountPermission.service';
import type { TenantAccountDTO } from '@/shared/services/tenantAccount/tenantAccount.service';
import type { EPermission } from '@shared/generated/typed-graphql';
import { IScopeRuleFE, stripScopeRuleTypename } from '@/shared/helpers/scopeRule.helpers';
import { PermRow } from './permRow';


interface PermissionModalProps {
    tenantAccount: TenantAccountDTO;
    onClose: () => void;
}

export function PermissionModal(props: PermissionModalProps) {
    const [permState, setPermState] = createSignal<Record<string, IScopeRuleFE | null>>({});
    const [saving, setSaving] = createSignal(false);
    const [dataLoaded, setDataLoaded] = createSignal(false);

    const [groups] = createResource<PermissionGroupDTO[]>(() =>
        AccountPermissionService.getPermissionGroups(),
    );

    createResource(
        () => props.tenantAccount.id,
        async (tenantAccountId) => {
            setDataLoaded(false);
            try {
                const res = await AccountPermissionService.getAccountPermissions({ tenantAccountId });
                const init: Record<string, IScopeRuleFE | null> = {};

                for (const p of res?.permissions ?? []) {
                    if (p?.permission && (p as any).scopeRule) {
                        // ── Strip __typename ngay khi load từ API ─────────────
                        // Apollo/urql thêm __typename vào response objects.
                        // Clean ngay lúc này để localRule trong PermRow không
                        // bao giờ chứa __typename.
                        init[p.permission] = stripScopeRuleTypename((p as any).scopeRule);
                    }
                }

                batch(() => {
                    setPermState(init);
                    setDataLoaded(true);
                });
            } catch {
                setDataLoaded(true);
            }
        },
    );

    const togglePerm = (permValue: string) =>
        setPermState(prev => ({
            ...prev,
            [permValue]: prev[permValue] != null ? null : { type: 'ALLOW_ALL' },
        }));

    const updateScopeRule = (permValue: string, rule: IScopeRuleFE) =>
        setPermState(prev => ({ ...prev, [permValue]: rule }));

    const toggleGroup = (group: PermissionGroupDTO) =>
        setPermState(prev => {
            const allOn = group?.permissions?.every(p => prev[p?.value!] != null) ?? false;
            const next = { ...prev };
            for (const p of group?.permissions ?? []) {
                next[p?.value!] = allOn ? null : { type: 'ALLOW_ALL' };
            }
            return next;
        });

    const makeScopeAccessor = (permValue: string): Accessor<IScopeRuleFE | null> =>
        () => permState()[permValue] ?? null;

    const isGroupAllOn = (g: PermissionGroupDTO) =>
        g?.permissions?.every(p => permState()[p?.value!] != null) ?? false;
    const isGroupSomeOn = (g: PermissionGroupDTO) =>
        !isGroupAllOn(g) && (g?.permissions?.some(p => permState()[p?.value!] != null) ?? false);

    const enabledCount = () => Object.values(permState()).filter(v => v != null).length;

    const handleSave = async () => {
        setSaving(true);
        try {
            const permissions = Object.entries(permState())
                .filter(([, v]) => v != null)
                .map(([permission, scopeRule]) => ({
                    permission: permission as EPermission,
                    // ── Strip __typename trước khi gửi mutation ───────────────
                    // Dù đã clean lúc load, user có thể giữ nguyên rule từ state
                    // mà không qua PermRow (ví dụ toggle group). Clean lần nữa
                    // để chắc chắn không có __typename nào lọt vào mutation.
                    scopeRule: stripScopeRuleTypename(scopeRule!),
                }));

            await AccountPermissionService.setAccountPermissions({
                input: {
                    tenantAccountId: props.tenantAccount.id!,
                    accountScope: 'TENANT' as any,
                    permissions: permissions as any,
                },
            });

            toast().success(`Đã lưu phân quyền cho ${props.tenantAccount.fullname}`);
            props.onClose();
        } catch (e: any) {
            toast().danger(e.message ?? 'Lưu quyền thất bại');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            class="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                   bg-black/40 backdrop-blur-[2px] p-0 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) props.onClose(); }}
        >
            <div class="relative w-full sm:max-w-[520px] bg-white
                        rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col
                        max-h-[92dvh] sm:max-h-[88vh] overflow-hidden">

                {/* Drag handle mobile */}
                <div class="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
                    <div class="w-10 h-1 rounded-full bg-gray-300" />
                </div>

                {/* Header */}
                <div class="px-4 sm:px-5 py-3 border-b border-gray-100 shrink-0">
                    <div class="flex items-center gap-3">
                        <Avatar
                            text={props.tenantAccount.fullname!}
                            class="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 font-bold text-sm shrink-0"
                        />
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-gray-900 text-sm leading-tight truncate">
                                {props.tenantAccount.fullname}
                            </p>
                            <p class="text-[11px] text-gray-400 truncate">
                                {props.tenantAccount.username}
                            </p>
                        </div>
                        <button type="button" onClick={props.onClose}
                            class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition shrink-0">
                            <Icon name="heroicons-outline:x" class="w-4 h-4" />
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-2 leading-relaxed">
                        Bật quyền và chọn phạm vi truy cập cho từng chức năng.
                        Nhân viên chỉ thấy và thao tác những gì được cấp quyền.
                    </p>
                </div>

                {/* Loading */}
                <Show when={groups.loading || !dataLoaded()}>
                    <div class="flex-1 flex items-center justify-center py-16">
                        <div class="flex flex-col items-center gap-3 text-gray-400">
                            <Icon spinner class="w-5 h-5" />
                            <p class="text-sm">Đang tải quyền...</p>
                        </div>
                    </div>
                </Show>

                {/* Body */}
                <Show when={!groups.loading && dataLoaded()}>
                    <div class="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-2 min-h-0">
                        <For each={groups()}>
                            {group => (
                                <div class="border border-gray-200 rounded-xl overflow-hidden">
                                    <div class="px-3 sm:px-4 py-2.5 bg-gray-50 flex items-center gap-3">
                                        <div class="flex-1 min-w-0">
                                            <p class="font-semibold text-gray-800 text-sm leading-tight">
                                                {group?.label}
                                            </p>
                                            <p class="text-[11px] text-gray-400 mt-0.5 truncate"
                                                title={group?.description!}>
                                                {group?.description}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(group)}
                                            title={isGroupAllOn(group) ? 'Tắt tất cả' : 'Bật tất cả'}
                                            class={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full
                                                    transition-colors duration-200 focus:outline-none
                                                    ${isGroupAllOn(group) ? 'bg-blue-500'
                                                    : isGroupSomeOn(group) ? 'bg-blue-300' : 'bg-gray-200'}`}
                                        >
                                            <span class={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow
                                                          transition-transform duration-200
                                                          ${isGroupAllOn(group) ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                        </button>
                                    </div>

                                    <div class="divide-y divide-gray-50 bg-white">
                                        <For each={group?.permissions}>
                                            {perm => (
                                                <PermRow
                                                    perm={perm!}
                                                    scopeRule={makeScopeAccessor(perm?.value!)}
                                                    onToggle={togglePerm}
                                                    onScopeChange={updateScopeRule}
                                                />
                                            )}
                                        </For>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>

                {/* Footer */}
                <div class="px-4 sm:px-5 py-3 border-t border-gray-100 shrink-0 bg-white
                            flex items-center justify-between gap-3
                            pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
                    <span class="text-xs text-gray-400 shrink-0">
                        <span class="font-semibold text-blue-600">{enabledCount()}</span> quyền đang bật
                    </span>
                    <div class="flex gap-2 shrink-0">
                        <button type="button" onClick={props.onClose}
                            class="px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition">
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving()}
                            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold
                                   text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                                   rounded-lg transition disabled:opacity-60
                                   min-w-[120px] justify-center"
                        >
                            <Show when={saving()}><Icon spinner class="w-3.5 h-3.5" /></Show>
                            {saving() ? 'Đang lưu...' : 'Lưu phân quyền'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}