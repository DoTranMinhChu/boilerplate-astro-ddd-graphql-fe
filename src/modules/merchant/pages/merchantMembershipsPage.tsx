// src/modules/merchant/pages/MerchantMembershipsPage.tsx
// Merchant xem danh sách các tổ chức mình đang là thành viên
//   Tab 1 — Tổ chức đang làm việc  (getMyAgencyAccounts)
//   Tab 2 — Đơn vị đang làm việc  (getMyTenantAccounts)
//
// Chức năng: xem danh sách + rời khỏi (không có tạo/sửa vì đây là chiều nhận)

import { createSignal, Show } from 'solid-js';
import { generateDatatable, PagingArgsInput } from '@/shared/components/table/GeneratedDatatable';
import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';
import { formatDatetime } from '@/core/helpers/date';

import {
    AgencyAccountDTO,
    AgencyAccountService,
} from '@/shared/services/agencyAccount/agencyAccount.service';
import {
    TenantAccountDTO,
    TenantAccountService,
} from '@/shared/services/tenantAccount/tenantAccount.service';
import { ERole } from '@/shared/generated/typed-graphql';
import { RoleBadgeList } from '../components/roleBadge';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { toast } from '@/core/components/toast/ToastProvider';
import { t } from '@/shared/i18n/t';


// ─── Active status badge ──────────────────────────────────────────────────────

function ActiveBadge(props: { active?: boolean }) {
    return (
        <span class={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0
            ${props.active
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}>
            <span class={`w-1.5 h-1.5 rounded-full ${props.active ? 'bg-green-500' : 'bg-gray-400'}`} />
            {props.active ? t('merchant.memberships.statusActive') : t('merchant.memberships.statusLocked')}
        </span>
    );
}

// ─── Tab type ────────────────────────────────────────────────────────────────

type ActiveTab = 'agency' | 'tenant';

// ─── Page ────────────────────────────────────────────────────────────────────

export function MerchantMembershipsPage() {
    const [activeTab, setActiveTab] = createSignal<ActiveTab>('agency');
    const auth = useAuth();
    const [loading, setLoading] = createSignal<string | null>(null);
    const handleSelectAgency = async (agencyCode: string, _agencyName: string) => {
        setLoading(`agency_${agencyCode}`);
        try {
            // switchContext tự mở tab mới bên trong (xem AuthProvider.switchContext)
            const ok = await auth.switchContext('AGENCY', agencyCode);
            if (!ok) {
                toast().danger(t('merchant.memberships.cannotAccessAgency'));
            }
        } finally {
            setLoading(null);
        }
    };

    // Gọi switch API → nhận token → mở tab mới /tenant/login?token=
    const handleSelectTenant = async (tenantCode: string, _tenantName: string) => {
        setLoading(`tenant_${tenantCode}`);
        try {
            // switchContext tự mở tab mới bên trong (xem AuthProvider.switchContext)
            const ok = await auth.switchContext('TENANT', tenantCode);
            if (!ok) {
                toast().danger(t('merchant.memberships.cannotAccessTenant'));
            }
        } finally {
            setLoading(null);
        }
    };
    // ── Agency Datatable ──────────────────────────────────────────────────────
    const { Datatable: AgencyDT } = generateDatatable<
        PagingArgsInput,
        AgencyAccountDTO,
        AgencyAccountDTO,
        AgencyAccountDTO,
        never,
        never
    >({
        service: AgencyAccountService,
        paginatedQuery: AgencyAccountService.getAllAgencyAccount,
        queryInput: { sort: { createdAt: 'DESC' } },

    });

    // ── Tenant Datatable ──────────────────────────────────────────────────────
    const { Datatable: TenantDT } = generateDatatable<
        PagingArgsInput,
        TenantAccountDTO,
        TenantAccountDTO,
        TenantAccountDTO,
        never,
        never
    >({
        service: TenantAccountService,
        paginatedQuery: TenantAccountService.getAllTenantAccount,
        queryInput: { sort: { createdAt: 'DESC' } },
    });

    return (
        <div class="space-y-6 animate-in">

            {/* ── Tab Switcher ─────────────────────────────────────────────── */}
            <div class="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                <button
                    class={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                        ${activeTab() === 'agency'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('agency')}
                >
                    <Icon name="heroicons-outline:briefcase" class="w-4 h-4" />
                    <span>{t('merchant.memberships.tabAgency')}</span>
                </button>
                <button
                    class={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                        ${activeTab() === 'tenant'
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('tenant')}
                >
                    <Icon name="heroicons-outline:office-building" class="w-4 h-4" />
                    <span>{t('merchant.memberships.tabTenant')}</span>
                </button>
            </div>

            {/* ── Agency Tab ───────────────────────────────────────────────── */}
            <Show when={activeTab() === 'agency'}>
                <Card class="border-none shadow-sm">
                    <AgencyDT id="MyAgencyAccountsTable">

                        <AgencyDT.Header>
                            <AgencyDT.Title
                                title={t('merchant.memberships.agencyTitle')}
                                description={t('merchant.memberships.agencyDescription')}
                            />
                            <AgencyDT.Buttons>
                                <AgencyDT.ButtonRefresh />
                            </AgencyDT.Buttons>
                        </AgencyDT.Header>

                        <AgencyDT.Toolbar>
                            <AgencyDT.Search />
                        </AgencyDT.Toolbar>

                        {/* ── Desktop Table ─────────────────────────────── */}
                        <AgencyDT.Table>

                            <AgencyDT.Column title={t('merchant.memberships.columns.agency')}>
                                {(item) => (
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                            <Icon name="heroicons-outline:briefcase" class="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p class="font-semibold text-sm text-neutral-900">
                                                {item.agency?.name ?? '—'}
                                            </p>
                                            <p class="text-xs text-gray-400">{item.agency?.code ?? ''}</p>
                                        </div>
                                    </div>
                                )}
                            </AgencyDT.Column>

                            <AgencyDT.Column title={t('merchant.memberships.columns.roles')}>
                                {(item) => <RoleBadgeList roles={item.roles as ERole[]} variant="agency" />}
                            </AgencyDT.Column>

                            <AgencyDT.Column title={t('merchant.memberships.columns.joinedFrom')}>
                                {(item) => (
                                    <span class="text-sm text-gray-500">
                                        {formatDatetime(item.createdAt!, 'date')}
                                    </span>
                                )}
                            </AgencyDT.Column>

                            <AgencyDT.Column title={t('merchant.memberships.columns.status')}>
                                {(item) => <ActiveBadge active={item.isActivated!} />}
                            </AgencyDT.Column>

                            <AgencyDT.Column right fitContent>
                                {(item) => (
                                    <button
                                        onClick={() => handleSelectAgency(item?.agency?.code!, item?.agency?.name!)}
                                        disabled={!item.isActivated || !!loading()}
                                        class={`
                                                                             w-full flex items-center gap-4 p-4 rounded-2xl border-2
                                                                             bg-white text-left transition-all
                                                                             ${item.isActivated
                                                ? 'border-transparent hover:border-violet-300 hover:shadow-md cursor-pointer'
                                                : 'border-gray-100 opacity-50 cursor-not-allowed'
                                            }
                                                                         `}
                                    >

                                        <Show
                                            when={loading() === `agency_${item?.agency?.code}`}
                                            fallback={
                                                <div class="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                                                    <Icon name="heroicons-outline:arrow-top-right-on-square" class="w-4 h-4" />
                                                    <span>{t('merchant.memberships.accessLabel')}</span>
                                                </div>
                                            }
                                        >
                                            <Icon name="svg-spinners:ring-resize" class="w-5 h-5 text-violet-500 shrink-0" />
                                        </Show>
                                    </button>
                                )}
                            </AgencyDT.Column>

                        </AgencyDT.Table>

                        {/* ── Mobile CardView ───────────────────────────── */}
                        <AgencyDT.CardView>
                            {(item) => (
                                <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                                    <div class="p-4 space-y-3">

                                        {/* Agency info + active badge */}
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                                <Icon name="heroicons-outline:briefcase" class="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <p class="font-semibold text-sm text-neutral-900 truncate">
                                                    {item.agency?.name ?? '—'}
                                                </p>
                                                <p class="text-xs text-gray-400">{item.agency?.code ?? ''}</p>
                                            </div>
                                            <ActiveBadge active={item.isActivated!} />
                                        </div>

                                        {/* Roles */}
                                        <RoleBadgeList roles={item.roles as ERole[]} variant="agency" />

                                        {/* Join date */}
                                        <div class="flex flex-col gap-0.5">
                                            <span class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                                {t('merchant.memberships.columns.joinedFrom')}
                                            </span>
                                            <span class="text-sm text-neutral-700">
                                                {formatDatetime(item.createdAt!, 'date')}
                                            </span>
                                        </div>

                                    </div>

                                    <div class="border-t border-neutral-100 bg-neutral-50 px-4 py-2.5 flex justify-end">
                                        <AgencyDT.CellButtons>
                                            <button
                                                onClick={() => handleSelectAgency(item?.agency?.code!, item?.agency?.name!)}
                                                disabled={!item.isActivated || !!loading()}
                                                class={`
                                                                             w-full flex items-center gap-4 p-4 rounded-2xl border-2
                                                                             bg-white text-left transition-all
                                                                             ${item.isActivated
                                                        ? 'border-transparent hover:border-violet-300 hover:shadow-md cursor-pointer'
                                                        : 'border-gray-100 opacity-50 cursor-not-allowed'
                                                    }
                                                                         `}
                                            >

                                                <Show
                                                    when={loading() === `agency_${item?.agency?.code}`}
                                                    fallback={
                                                        <div class="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                                                            <Icon name="heroicons-outline:arrow-top-right-on-square" class="w-4 h-4" />
                                                            <span>{t('merchant.memberships.accessLabel')}</span>
                                                        </div>
                                                    }
                                                >
                                                    <Icon name="svg-spinners:ring-resize" class="w-5 h-5 text-violet-500 shrink-0" />
                                                </Show>
                                            </button>
                                        </AgencyDT.CellButtons>
                                    </div>
                                </div>
                            )}
                        </AgencyDT.CardView>

                        <AgencyDT.Pagination />

                    </AgencyDT>
                </Card>
            </Show>

            {/* ── Tenant Tab ───────────────────────────────────────────────── */}
            <Show when={activeTab() === 'tenant'}>
                <Card class="border-none shadow-sm">
                    <TenantDT id="MyTenantAccountsTable">

                        <TenantDT.Header>
                            <TenantDT.Title
                                title={t('merchant.memberships.tenantTitle')}
                                description={t('merchant.memberships.tenantDescription')}
                            />
                            <TenantDT.Buttons>
                                <TenantDT.ButtonRefresh />
                            </TenantDT.Buttons>
                        </TenantDT.Header>

                        <TenantDT.Toolbar>
                            <TenantDT.Search />
                        </TenantDT.Toolbar>

                        {/* ── Desktop Table ─────────────────────────────── */}
                        <TenantDT.Table>

                            <TenantDT.Column title={t('merchant.memberships.columns.tenant')}>
                                {(item) => (
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                            <Icon name="heroicons-outline:office-building" class="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p class="font-semibold text-sm text-neutral-900">
                                                {item.tenant?.name ?? '—'}
                                            </p>
                                            <p class="text-xs text-gray-400">{item.tenant?.code ?? ''}</p>
                                        </div>
                                    </div>
                                )}
                            </TenantDT.Column>

                            <TenantDT.Column title={t('merchant.memberships.columns.origin')}>
                                {(item) => (
                                    <Show
                                        when={item.agencyId}
                                        fallback={
                                            <span class="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                {t('merchant.memberships.directInvite')}
                                            </span>
                                        }
                                    >
                                        <span class="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 flex items-center gap-1 w-fit">
                                            <Icon name="heroicons-outline:switch-vertical" class="w-3.5 h-3.5" />
                                            {t('merchant.memberships.fromAgency')}
                                        </span>
                                    </Show>
                                )}
                            </TenantDT.Column>

                            <TenantDT.Column title={t('merchant.memberships.columns.roles')}>
                                {(item) => <RoleBadgeList roles={item.roles as ERole[]} variant="tenant" />}
                            </TenantDT.Column>

                            <TenantDT.Column title={t('merchant.memberships.columns.joinedFrom')}>
                                {(item) => (
                                    <span class="text-sm text-gray-500">
                                        {formatDatetime(item.createdAt!, 'date')}
                                    </span>
                                )}
                            </TenantDT.Column>

                            <TenantDT.Column title={t('merchant.memberships.columns.status')}>
                                {(item) => <ActiveBadge active={item.isActivated!} />}
                            </TenantDT.Column>

                            <TenantDT.Column right fitContent>
                                {(item) => (
                                    <button
                                        onClick={() => handleSelectTenant(item?.tenant?.code!, item?.tenant?.name!)}
                                        disabled={!item.isActivated || !!loading()}
                                        class={`
                                                                             w-full flex items-center gap-4 p-4 rounded-2xl border-2
                                                                             bg-white text-left transition-all
                                                                             ${item.isActivated
                                                ? 'border-transparent hover:border-violet-300 hover:shadow-md cursor-pointer'
                                                : 'border-gray-100 opacity-50 cursor-not-allowed'
                                            }
                                                                         `}
                                    >

                                        <Show
                                            when={loading() === `tenant_${item?.tenant?.code}`}
                                            fallback={
                                                <div class="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                                                    <Icon name="heroicons-outline:arrow-top-right-on-square" class="w-4 h-4" />
                                                    <span>{t('merchant.memberships.accessLabel')}</span>
                                                </div>
                                            }
                                        >
                                            <Icon name="svg-spinners:ring-resize" class="w-5 h-5 text-violet-500 shrink-0" />
                                        </Show>
                                    </button>
                                )}
                            </TenantDT.Column>

                        </TenantDT.Table>

                        {/* ── Mobile CardView ───────────────────────────── */}
                        <TenantDT.CardView>
                            {(item) => (
                                <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                                    <div class="p-4 space-y-3">

                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                                <Icon name="heroicons-outline:office-building" class="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <p class="font-semibold text-sm text-neutral-900 truncate">
                                                    {item.tenant?.name ?? '—'}
                                                </p>
                                                <p class="text-xs text-gray-400">{item.tenant?.code ?? ''}</p>
                                            </div>
                                            <ActiveBadge active={item.isActivated!} />
                                        </div>

                                        {/* Source badge */}
                                        <Show when={item.agencyId}>
                                            <span class="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 flex items-center gap-1 w-fit">
                                                <Icon name="heroicons-outline:switch-vertical" class="w-3.5 h-3.5" />
                                                {t('merchant.memberships.fromAgency')}
                                            </span>
                                        </Show>

                                        <RoleBadgeList roles={item.roles as ERole[]} variant="tenant" />

                                        <div class="flex flex-col gap-0.5">
                                            <span class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                                {t('merchant.memberships.columns.joinedFrom')}
                                            </span>
                                            <span class="text-sm text-neutral-700">
                                                {formatDatetime(item.createdAt!, 'date')}
                                            </span>
                                        </div>

                                    </div>

                                    <div class="border-t border-neutral-100 bg-neutral-50 px-4 py-2.5 flex justify-end">
                                        <TenantDT.CellButtons>
                                            <button
                                                onClick={() => handleSelectTenant(item?.tenant?.code!, item?.tenant?.name!)}
                                                disabled={!item.isActivated || !!loading()}
                                                class={`
                                                                             w-full flex items-center gap-4 p-4 rounded-2xl border-2
                                                                             bg-white text-left transition-all
                                                                             ${item.isActivated
                                                        ? 'border-transparent hover:border-violet-300 hover:shadow-md cursor-pointer'
                                                        : 'border-gray-100 opacity-50 cursor-not-allowed'
                                                    }
                                                                         `}
                                            >

                                                <Show
                                                    when={loading() === `tenant_${item?.tenant?.code}`}
                                                    fallback={
                                                        <div class="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                                                            <Icon name="heroicons-outline:arrow-top-right-on-square" class="w-4 h-4" />
                                                            <span>{t('merchant.memberships.accessLabel')}</span>
                                                        </div>
                                                    }
                                                >
                                                    <Icon name="svg-spinners:ring-resize" class="w-5 h-5 text-violet-500 shrink-0" />
                                                </Show>
                                            </button>
                                        </TenantDT.CellButtons>
                                    </div>
                                </div>
                            )}
                        </TenantDT.CardView>

                        <TenantDT.Pagination />

                    </TenantDT>
                </Card>
            </Show>

        </div>
    );
}
