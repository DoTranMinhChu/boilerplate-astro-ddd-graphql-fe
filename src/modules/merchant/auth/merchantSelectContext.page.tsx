// src/pages/merchant/auth/MerchantSelectContextPage.tsx

import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { EAccountType } from '@/shared/types/auth.type';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { MerchantService } from '@/shared/services/merchant/merchant.service';
import { MerchantOrgType } from '@/shared/services/merchant/merchantSwitchConfig';
import { getLabelByValue } from '@/core/helpers/string';
import { RoleOptions } from '@/shared/types/auth.type';
import { t, type TranslationKey } from '@/shared/i18n/t';

// ─── Org-type presentation config ─────────────────────────────────────────
// Everything that varies per org type (label, icon, color classes, and the
// failure toast copy) lives here. Adding a new org type later is a matter of
// adding a new entry to these maps, not editing the JSX below.

// NOTE: labels/messages below are stored as translation KEYS (not resolved strings) and
// resolved via t() at each usage site. This config map is module-scope (evaluated once at
// import time) — resolving t() here would freeze the copy at whatever locale was active on
// first import, breaking reactive locale switching.
const ORG_TYPE_CONFIG: Record<MerchantOrgType, {
    sectionLabelKey: TranslationKey;
    icon: string;
    iconBg: string;
    iconText: string;
    hoverBorder: string;
    spinnerText: string;
    switchErrorMessageKey: TranslationKey;
}> = {
    AGENCY: {
        sectionLabelKey: 'merchant.selectContext.orgType.agency.sectionLabel',
        icon: 'heroicons-outline:briefcase',
        iconBg: 'bg-violet-100',
        iconText: 'text-violet-600',
        hoverBorder: 'hover:border-violet-300',
        spinnerText: 'text-violet-500',
        switchErrorMessageKey: 'merchant.selectContext.orgType.agency.switchErrorMessage',
    },
    TENANT: {
        sectionLabelKey: 'merchant.selectContext.orgType.tenant.sectionLabel',
        icon: 'heroicons-outline:building-storefront',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
        hoverBorder: 'hover:border-blue-300',
        spinnerText: 'text-blue-500',
        switchErrorMessageKey: 'merchant.selectContext.orgType.tenant.switchErrorMessage',
    },
};

// Badge shown on each Tenant row indicating whether it was assigned directly
// or delegated from an Agency (`item.source`). Distinct from ORG_TYPE_CONFIG
// above — this is a sub-classification within the Tenant list, not a
// top-level org type — but kept as a config map for the same reason.
const TENANT_SOURCE_CONFIG: Record<MerchantOrgType, {
    labelKey: TranslationKey;
    icon: string;
    iconBg: string;
    iconText: string;
    badgeBg: string;
    badgeText: string;
}> = {
    AGENCY: {
        labelKey: 'merchant.selectContext.tenantSource.agency.label',
        icon: 'heroicons-outline:building-office-2',
        iconBg: 'bg-indigo-100',
        iconText: 'text-indigo-600',
        badgeBg: 'bg-indigo-100',
        badgeText: 'text-indigo-600',
    },
    TENANT: {
        labelKey: 'merchant.selectContext.tenantSource.tenant.label',
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
    createEffect(() => {
        if (assignments.error) toast().danger(t('merchant.selectContext.loadFailedToast'));
    });

    // Gọi switch API → nhận token → mở tab mới /{orgType}/login?token=
    const handleSelect = async (orgType: MerchantOrgType, code: string) => {
        setLoading(`${orgType.toLowerCase()}_${code}`);
        try {
            // switchContext tự mở tab mới bên trong (xem AuthProvider.switchContext)
            const ok = await auth.switchContext(orgType, code);
            if (!ok) {
                toast().danger(t(ORG_TYPE_CONFIG[orgType].switchErrorMessageKey));
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
                        {t('merchant.selectContext.welcomeHeading', { name: auth.authAccount()?.account.name ?? '' })}
                    </h1>
                    <p class="text-gray-500 mt-1 text-sm">
                        {t('merchant.selectContext.subtitle')}
                    </p>
                    <p class="text-gray-400 mt-1 text-xs">
                        {t('merchant.selectContext.hint')}
                    </p>
                </div>

                {/* Agency list */}
                <Show when={(assignments()?.agencies?.length ?? 0) > 0}>
                    <div class="mb-6">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                            {t(ORG_TYPE_CONFIG.AGENCY.sectionLabelKey)}
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
                                                    <span>{t('merchant.selectContext.newTabLabel')}</span>
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
                            {t(ORG_TYPE_CONFIG.TENANT.sectionLabelKey)}
                        </p>
                        <div class="grid gap-3">
                            <For each={assignments()?.tenants}>
                                {(item) => {
                                    const source = () => TENANT_SOURCE_CONFIG[(item.source === 'AGENCY' ? 'AGENCY' : 'TENANT') as MerchantOrgType];
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
                                                        {t(source().labelKey)}
                                                    </span>
                                                </div>
                                                <p class="text-xs text-gray-400 mt-0.5">{item?.roles!?.map(role => `(${getLabelByValue(role, RoleOptions)})`)?.join(', ')}</p>
                                            </div>
                                            <Show
                                                when={loading() === `tenant_${item?.tenant?.code}`}
                                                fallback={
                                                    <div class="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                                                        <Icon name="heroicons-outline:arrow-top-right-on-square" class="w-4 h-4" />
                                                        <span>{t('merchant.selectContext.newTabLabel')}</span>
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
                        <p class="text-gray-500 font-medium">{t('merchant.selectContext.emptyTitle')}</p>
                        <p class="text-gray-400 text-sm mt-1">{t('merchant.selectContext.emptyHint')}</p>
                    </div>
                </Show>

                {/* Logout */}
                <div class="mt-6 text-center">
                    <button
                        onClick={() => auth.logout(EAccountType.MERCHANT)}
                        class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {t('merchant.selectContext.logout')}
                    </button>
                </div>
            </div>
        </div>
    );
}
