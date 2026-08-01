// src/pages/merchant/auth/MerchantSelectContextPage.tsx

import { createResource, createSignal, For, Show } from 'solid-js';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { EAccountType } from '@/shared/types/auth.type';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { getLabelByValue } from '@/core/helpers/string';
import { RoleOptions } from '@/shared/types/auth.type';

// ─── Org-type presentation config ─────────────────────────────────────────
// Everything that varies per org type (label, icon, color classes, and the
// failure toast copy) lives here. Adding a new org type later is a matter of
// adding a new entry to these maps, not editing the JSX below.

type OrgType = 'AGENCY' | 'TENANT';

const ORG_TYPE_CONFIG: Record<OrgType, {
    sectionLabel: string;
    icon: string;
    iconBg: string;
    iconText: string;
    hoverBorder: string;
    spinnerText: string;
    switchErrorMessage: string;
}> = {
    AGENCY: {
        sectionLabel: 'Đối tác',
        icon: 'heroicons-outline:briefcase',
        iconBg: 'bg-violet-100',
        iconText: 'text-violet-600',
        hoverBorder: 'hover:border-violet-300',
        spinnerText: 'text-violet-500',
        switchErrorMessage: 'Không thể truy cập đối tác này',
    },
    TENANT: {
        sectionLabel: 'Đơn vị / Tenant',
        icon: 'heroicons-outline:building-storefront',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
        hoverBorder: 'hover:border-blue-300',
        spinnerText: 'text-blue-500',
        switchErrorMessage: 'Không thể truy cập đơn vị này',
    },
};

// Badge shown on each Tenant row indicating whether it was assigned directly
// or delegated from an Agency (`item.source`). Distinct from ORG_TYPE_CONFIG
// above — this is a sub-classification within the Tenant list, not a
// top-level org type — but kept as a config map for the same reason.
const TENANT_SOURCE_CONFIG: Record<OrgType, {
    label: string;
    icon: string;
    iconBg: string;
    iconText: string;
    badgeBg: string;
    badgeText: string;
}> = {
    AGENCY: {
        label: 'Agency',
        icon: 'heroicons-outline:building-office-2',
        iconBg: 'bg-indigo-100',
        iconText: 'text-indigo-600',
        badgeBg: 'bg-indigo-100',
        badgeText: 'text-indigo-600',
    },
    TENANT: {
        label: 'Nội bộ',
        icon: 'heroicons-outline:building-storefront',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-600',
    },
};

export function MerchantSelectContextPage() {
    const auth = useAuth();
    const [loading, setLoading] = createSignal<string | null>(null);

    const [assignments] = createResource(() => MerchantService.getMyAssignments());

    // Gọi switch API → nhận token → mở tab mới /{orgType}/login?token=
    const handleSelect = async (orgType: OrgType, code: string) => {
        setLoading(`${orgType.toLowerCase()}_${code}`);
        try {
            // switchContext tự mở tab mới bên trong (xem AuthProvider.switchContext)
            const ok = await auth.switchContext(orgType, code);
            if (!ok) {
                toast().danger(ORG_TYPE_CONFIG[orgType].switchErrorMessage);
            }
        } finally {
            setLoading(null);
        }
    };

    return (
        <div class="min-h-screen bg-linear-to-br from-violet-50 to-slate-100 flex items-center justify-center p-4">
            <div class="w-full max-w-2xl">

                {/* Header */}
                <div class="text-center mb-8">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 shadow-lg mb-4">
                        <Icon name="heroicons-outline:squares-2x2" class="w-9 h-9 text-white" />
                    </div>
                    <h1 class="text-2xl font-bold text-gray-900">
                        Xin chào, {auth.authAccount()?.account.name}
                    </h1>
                    <p class="text-gray-500 mt-1 text-sm">
                        Chọn nơi bạn muốn làm việc hôm nay
                    </p>
                    <p class="text-gray-400 mt-1 text-xs">
                        Mỗi nơi làm việc sẽ mở trong tab mới
                    </p>
                </div>

                {/* Agency list */}
                <Show when={(assignments()?.agencies?.length ?? 0) > 0}>
                    <div class="mb-6">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                            {ORG_TYPE_CONFIG.AGENCY.sectionLabel}
                        </p>
                        <div class="grid gap-3">
                            <For each={assignments()?.agencies}>
                                {(item) => (
                                    <button
                                        onClick={() => handleSelect('AGENCY', item?.agency?.code!)}
                                        disabled={!item.isActivated || !!loading()}
                                        class={`
                                            w-full flex items-center gap-4 p-4 rounded-2xl border-2
                                            bg-white text-left transition-all
                                            ${item.isActivated
                                                ? `border-transparent ${ORG_TYPE_CONFIG.AGENCY.hoverBorder} hover:shadow-md cursor-pointer`
                                                : 'border-gray-100 opacity-50 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        <div class={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${ORG_TYPE_CONFIG.AGENCY.iconBg}`}>
                                            <Icon name={ORG_TYPE_CONFIG.AGENCY.icon} class={`w-6 h-6 ${ORG_TYPE_CONFIG.AGENCY.iconText}`} />
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="font-bold text-gray-900 truncate">{item?.agency?.name}</p>
                                            <p class="text-xs text-gray-400 mt-0.5">{item?.roles!?.map(role => `(${getLabelByValue(role, RoleOptions)})`)?.join(', ')}</p>
                                        </div>
                                        <Show
                                            when={loading() === `agency_${item?.agency?.code}`}
                                            fallback={
                                                <div class="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                                                    <Icon name="heroicons-outline:arrow-top-right-on-square" class="w-4 h-4" />
                                                    <span>Tab mới</span>
                                                </div>
                                            }
                                        >
                                            <Icon name="svg-spinners:ring-resize" class={`w-5 h-5 shrink-0 ${ORG_TYPE_CONFIG.AGENCY.spinnerText}`} />
                                        </Show>
                                    </button>
                                )}
                            </For>
                        </div>
                    </div>
                </Show>

                {/* Tenant list */}
                <Show when={(assignments()?.tenants?.length ?? 0) > 0}>
                    <div class="mb-6">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                            {ORG_TYPE_CONFIG.TENANT.sectionLabel}
                        </p>
                        <div class="grid gap-3">
                            <For each={assignments()?.tenants}>
                                {(item) => {
                                    const source = () => TENANT_SOURCE_CONFIG[(item.source === 'AGENCY' ? 'AGENCY' : 'TENANT') as OrgType];
                                    return (
                                        <button
                                            onClick={() => handleSelect('TENANT', item?.tenant?.code!)}
                                            disabled={!item.isActivated || !!loading()}
                                            class={`
                                                w-full flex items-center gap-4 p-4 rounded-2xl border-2
                                                bg-white text-left transition-all
                                                ${item.isActivated
                                                    ? `border-transparent ${ORG_TYPE_CONFIG.TENANT.hoverBorder} hover:shadow-md cursor-pointer`
                                                    : 'border-gray-100 opacity-50 cursor-not-allowed'
                                                }
                                            `}
                                        >
                                            <div class={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${source().iconBg}`}>
                                                <Icon name={source().icon} class={`w-6 h-6 ${source().iconText}`} />
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-center gap-2">
                                                    <p class="font-bold text-gray-900 truncate">{item?.tenant?.name}</p>
                                                    <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${source().badgeBg} ${source().badgeText}`}>
                                                        {source().label}
                                                    </span>
                                                </div>
                                                <p class="text-xs text-gray-400 mt-0.5">{item?.roles!?.map(role => `(${getLabelByValue(role, RoleOptions)})`)?.join(', ')}</p>
                                            </div>
                                            <Show
                                                when={loading() === `tenant_${item?.tenant?.code}`}
                                                fallback={
                                                    <div class="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                                                        <Icon name="heroicons-outline:arrow-top-right-on-square" class="w-4 h-4" />
                                                        <span>Tab mới</span>
                                                    </div>
                                                }
                                            >
                                                <Icon name="svg-spinners:ring-resize" class={`w-5 h-5 shrink-0 ${ORG_TYPE_CONFIG.TENANT.spinnerText}`} />
                                            </Show>
                                        </button>
                                    );
                                }}
                            </For>
                        </div>
                    </div>
                </Show>

                {/* Empty state */}
                <Show when={!assignments()?.agencies?.length && !assignments()?.tenants?.length}>
                    <div class="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Icon name="heroicons-outline:inbox" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p class="text-gray-500 font-medium">Bạn chưa được phân công vào đơn vị nào</p>
                        <p class="text-gray-400 text-sm mt-1">Liên hệ quản lý để được cấp quyền truy cập</p>
                    </div>
                </Show>

                {/* Logout */}
                <div class="mt-6 text-center">
                    <button
                        onClick={() => auth.logout(EAccountType.MERCHANT)}
                        class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    );
}
