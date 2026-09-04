// src/modules/merchant/pages/AgencyInviteMerchantPage.tsx
// Agency mời Merchant vào làm nhân viên Agency (AGENCY_MEMBER)
// hoặc cử xuống giám sát Tenant (AGENCY_TO_TENANT)
//
// API sử dụng: createMerchantInvitation, updateMerchantInvitation,
//              revokeMerchantInvitation, resendMerchantInvitation,
//              getAllMerchantInvitation (filter agencyId từ token)

import { createSignal, Show } from 'solid-js';
import { generateDatatable, PagingArgsInput } from '@/shared/components/table/GeneratedDatatable';
import { Card } from '@core/components/utilities/Card';
import { Input } from '@core/components/control/Input';
import { Select } from '@core/components/control/Select';
import { Icon } from '@shared/components/icons/Icon';
import { Avatar } from '@core/components/utilities/Avatar';
import { formatDatetime } from '@/core/helpers/date';

import {
    CreateMerchantInvitationInput,
    MerchantInvitationDTO,
    MerchantInvitationService,
    UpdateMerchantInvitationInput,
} from '@/shared/services/merchantInvitation/merchantInvitation.service';
import { ERole } from '@/shared/generated/typed-graphql';
import { TenantService } from '@/shared/services/tenant/tenant.service';

import {
    AGENCY_ROLE_OPTIONS,
    EInvitationStatus,
    INVITATION_STATUS_CONFIG,
    RESENDABLE_STATUSES,
} from '../merchant.constants';
import { InvitationStatusBadge, InvitationStatusBadgeMini } from '../components/invitationStatusBadge';
import { RoleBadgeList } from '../components/roleBadge';
import { InputNumber } from '@/core/components/control/InputNumber';
import { t } from '@/shared/i18n/t';

export function AgencyInviteMerchantPage() {
    // Filter trạng thái trên toolbar
    const [filterStatus, setFilterStatus] = createSignal<EInvitationStatus | null>(null);

    const { Datatable } = generateDatatable<
        PagingArgsInput,
        MerchantInvitationDTO,
        MerchantInvitationDTO,
        MerchantInvitationDTO,
        CreateMerchantInvitationInput,
        UpdateMerchantInvitationInput
    >({
        service: MerchantInvitationService,
        // Dùng getAgencyInvitations thay vì getAllMerchantInvitation
        // → agencyId tự inject từ token, client không thể query của agency khác
        paginatedQuery: MerchantInvitationService.getAgencyInvitations,
        queryInput: {
            sort: { createdAt: 'DESC' },
            get filter() {
                return filterStatus() ? { status: filterStatus() } : undefined;
            },
        },
        itemQuery: (item) => MerchantInvitationService.getOneMerchantInvitation({ id: item.id! }),
        createMutation: (input) => MerchantInvitationService.createMerchantInvitation({ input }),
        updateMutation: (id, input) => MerchantInvitationService.updateMerchantInvitation({ id, input }),
        // delete = revoke (không xóa cứng)
        deleteMutation: (item) => MerchantInvitationService.revokeMerchantInvitation({ id: item.id! }),
    });

    return (
        <div class="space-y-6 animate-in">

            {/* ── Filter Bar ──────────────────────────────────────────────── */}
            <Card class="p-4 border-none shadow-sm bg-white">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <span class="text-sm font-bold text-gray-500 uppercase tracking-wider flex-none">
                        {t('merchant.agencyInvite.filterStatusLabel')}
                    </span>
                    <div class="w-full sm:w-64">
                        <Select
                            placeholder={t('merchant.agencyInvite.statusPlaceholder')}
                            clearable
                            value={filterStatus()}
                            onChange={(v) => setFilterStatus(v as EInvitationStatus)}
                            options={Object.entries(INVITATION_STATUS_CONFIG).map(([v, c]) => ({
                                label: c.label, value: v,
                            }))}
                            prefix={<Icon name="heroicons-outline:filter" class="w-4 h-4 text-gray-400" />}
                        />
                    </div>
                    <Show when={filterStatus()}>
                        <div class="text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 flex items-center gap-1 w-fit">
                            <Icon name="heroicons-solid:filter" class="w-3 h-3" />
                            {t('merchant.agencyInvite.filteringBadge')}
                        </div>
                    </Show>
                </div>
            </Card>

            {/* ── Datatable ───────────────────────────────────────────────── */}
            <Card class="border-none shadow-sm">
                <Datatable id="AgencyInvitationsTable">

                    <Datatable.Header>
                        <Datatable.Title
                            title={t('merchant.agencyInvite.title')}
                            description={t('merchant.agencyInvite.description')}
                        />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                            <Datatable.ButtonCreate label={t('merchant.agencyInvite.createButtonLabel')} />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    {/* ── Desktop Table ──────────────────────────────────── */}
                    <Datatable.Table>

                        <Datatable.Column title={t('merchant.agencyInvite.invitedMerchantColumn')}>
                            {(item) => (
                                <div class="flex items-center gap-3">
                                    <Show
                                        when={item.merchant?.fullname}
                                        fallback={
                                            <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                <Icon name="heroicons-outline:user" class="w-4 h-4 text-gray-400" />
                                            </div>
                                        }
                                    >
                                        <Avatar text={item.merchant!.fullname} size="small" />
                                    </Show>
                                    <div>
                                        <p class="font-medium text-sm text-neutral-900">
                                            {item.merchant?.fullname
                                                ?? <span class="italic text-gray-400">{t('merchant.agencyInvite.noAccountYet')}</span>
                                            }
                                        </p>
                                        <p class="text-xs text-gray-500">{item.email}</p>
                                    </div>
                                </div>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title={t('merchant.agencyInvite.typeColumn')}>
                            {(item) => (
                                <Show
                                    when={item.tenantId}
                                    fallback={
                                        <span class="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                            {t('merchant.agencyInvite.agencyMemberBadge')}
                                        </span>
                                    }
                                >
                                    <span class="text-xs text-violet-600 font-medium bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 flex items-center gap-1 w-fit">
                                        <Icon name="heroicons-outline:switch-vertical" class="w-3.5 h-3.5" />
                                        {t('merchant.agencyInvite.assignToTenantBadge')}
                                    </span>
                                </Show>
                            )}
                        </Datatable.Column>

                        <Datatable.Column title={t('merchant.agencyInvite.rolesColumn')}>
                            {(item) => <RoleBadgeList roles={item.roles as ERole[]} variant="agency" />}
                        </Datatable.Column>

                        <Datatable.Column title={t('merchant.agencyInvite.statusColumn')}>
                            {(item) => <InvitationStatusBadge status={item.status as EInvitationStatus} />}
                        </Datatable.Column>

                        <Datatable.Column title={t('merchant.agencyInvite.datesColumn')}>
                            {(item) => (
                                <div class="space-y-0.5">
                                    <p class="text-xs text-gray-600">{formatDatetime(item.createdAt, 'date')}</p>
                                    <p class="text-xs text-gray-400">
                                        {item.expiresAt ? t('merchant.agencyInvite.expiresShortLabel', { date: formatDatetime(item.expiresAt, 'date') }) : t('merchant.agencyInvite.noLimit')}
                                    </p>
                                </div>
                            )}
                        </Datatable.Column>

                        <Datatable.Column right fitContent>
                            {(item) => (
                                <Datatable.CellButtons>
                                    {/* Gửi lại — chỉ PENDING hoặc EXPIRED */}
                                    <Datatable.CellButton
                                        visible={RESENDABLE_STATUSES.includes(item.status as EInvitationStatus)}
                                        icon={<Icon name="heroicons-outline:paper-airplane" />}
                                        label={t('merchant.agencyInvite.resendButton')}
                                        onClick={() => MerchantInvitationService.resendMerchantInvitation({ id: item.id! })}
                                    />
                                    {/* Chỉ cho sửa khi PENDING */}
                                    <Datatable.CellButtonUpdate
                                        visible={item.status === EInvitationStatus.PENDING}
                                        item={item}
                                    />
                                    {/* Thu hồi = delete trong datatable */}
                                    <Datatable.CellButtonDelete
                                        visible={item.status === EInvitationStatus.PENDING}
                                        item={item}
                                        itemName={item.email}
                                        deleteConfirmSubmitLabel={t('merchant.agencyInvite.revokeButton')}
                                        deleteConfirmTitle={t('merchant.agencyInvite.revokeConfirmTitle')}
                                    />
                                </Datatable.CellButtons>
                            )}
                        </Datatable.Column>

                    </Datatable.Table>

                    {/* ── Mobile CardView ─────────────────────────────────── */}
                    <Datatable.CardView>
                        {(item) => (
                            <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                                <div class="p-4 space-y-3">

                                    {/* Avatar + email + status */}
                                    <div class="flex items-start gap-3">
                                        <Show
                                            when={item.merchant?.fullname}
                                            fallback={
                                                <div class="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                                    <Icon name="heroicons-outline:user" class="w-4 h-4 text-indigo-400" />
                                                </div>
                                            }
                                        >
                                            <Avatar text={item.merchant!.fullname} size="small" />
                                        </Show>
                                        <div class="min-w-0 flex-1">
                                            <p class="font-semibold text-sm text-neutral-900 truncate">
                                                {item.merchant?.fullname ?? t('merchant.agencyInvite.noAccountYet')}
                                            </p>
                                            <p class="text-xs text-gray-500 truncate">{item.email}</p>
                                        </div>
                                        <InvitationStatusBadgeMini status={item.status as EInvitationStatus} />
                                    </div>

                                    {/* Loại + roles */}
                                    <div class="space-y-1.5">
                                        <Show when={item.tenantId}>
                                            <span class="text-xs text-violet-600 font-medium bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 flex items-center gap-1 w-fit">
                                                <Icon name="heroicons-outline:switch-vertical" class="w-3.5 h-3.5" />
                                                {t('merchant.agencyInvite.assignToTenantBadge')}
                                            </span>
                                        </Show>
                                        <RoleBadgeList roles={item.roles as ERole[]} variant="agency" />
                                    </div>

                                    {/* Dates */}
                                    <div class="grid grid-cols-2 gap-x-4">
                                        <div class="flex flex-col gap-0.5">
                                            <span class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{t('merchant.agencyInvite.sentDateLabel')}</span>
                                            <span class="text-sm text-neutral-700">{formatDatetime(item.createdAt, 'date')}</span>
                                        </div>
                                        <div class="flex flex-col gap-0.5">
                                            <span class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{t('merchant.agencyInvite.expiresLabel')}</span>
                                            <span class="text-sm text-neutral-700">
                                                {item.expiresAt ? formatDatetime(item.expiresAt, 'date') : '—'}
                                            </span>
                                        </div>
                                    </div>

                                </div>

                                <Show
                                    when={
                                        RESENDABLE_STATUSES.includes(item.status as EInvitationStatus) ||
                                        item.status === EInvitationStatus.PENDING
                                    }
                                >
                                    <div class="border-t border-neutral-100 bg-neutral-50 px-4 py-2.5 flex justify-end">
                                        <Datatable.CellButtons>
                                            <Datatable.CellButton
                                                visible={RESENDABLE_STATUSES.includes(item.status as EInvitationStatus)}
                                                icon={<Icon name="heroicons-outline:paper-airplane" />}
                                                label={t('merchant.agencyInvite.resendButton')}
                                                onClick={() => MerchantInvitationService.resendMerchantInvitation({ id: item.id! })}
                                            />
                                            <Datatable.CellButtonUpdate
                                                visible={item.status === EInvitationStatus.PENDING}
                                                item={item}
                                            />
                                            <Datatable.CellButtonDelete
                                                visible={item.status === EInvitationStatus.PENDING}
                                                item={item}
                                                itemName={item.email}
                                                deleteConfirmSubmitLabel={t('merchant.agencyInvite.revokeButton')}
                                                deleteConfirmTitle={t('merchant.agencyInvite.revokeConfirmTitle')}
                                            />
                                        </Datatable.CellButtons>
                                    </div>
                                </Show>
                            </div>
                        )}
                    </Datatable.CardView>

                    <Datatable.Pagination />

                    {/* ── Form tạo / sửa lời mời ───────────────────────── */}
                    <Datatable.Formlog viewMode="modal" class="w-full max-w-[640px]">
                        {(item) => (
                            <div class="col-span-full grid grid-cols-1 sm:grid-cols-12 gap-5 p-4 sm:p-6">

                                {/* Thông tin người nhận */}
                                <div class="col-span-full bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-12 gap-4">
                                    <p class="col-span-full text-[11px] font-bold text-indigo-600 uppercase tracking-widest">
                                        {t('merchant.agencyInvite.formSectionRecipient')}
                                    </p>
                                    <div class="col-span-full sm:col-span-7">
                                        <Datatable.Field name="email" label={t('merchant.agencyInvite.emailFieldLabel')} required>
                                            <Input
                                                type="email"
                                                placeholder="merchant@example.com"
                                                disabled={!!item}
                                            />
                                        </Datatable.Field>
                                    </div>
                                    <div class="col-span-full sm:col-span-5">
                                        <Datatable.Field name="expiresInDays" label={t('merchant.agencyInvite.expiresInDaysLabel')}>
                                            <InputNumber defaultValue={14} min={1} max={90} placeholder="7" />
                                        </Datatable.Field>
                                    </div>
                                </div>

                                {/* Assign xuống tenant (tuỳ chọn) */}
                                <div class="col-span-full">
                                    <Datatable.Field
                                        name="tenantId"
                                        label={t('merchant.agencyInvite.assignTenantLabel')}
                                        hint={t('merchant.agencyInvite.assignTenantHint')}
                                    >
                                        <Select
                                            nullable
                                            clearable
                                            placeholder={t('merchant.agencyInvite.assignTenantPlaceholder')}
                                            optionsQuery={{
                                                query: (input) => TenantService.getAllTenant(input.input),
                                                option: (t: any) => ({ label: t.name, value: t.id }),
                                            }}
                                            prefix={<Icon name="heroicons-outline:office-building" class="w-4 h-4 text-gray-400" />}
                                        />
                                    </Datatable.Field>
                                </div>

                                {/* Roles */}
                                <div class="col-span-full">
                                    <Datatable.Field name="roles" label={t('merchant.agencyInvite.rolesFieldLabel')} required>
                                        <Select
                                            multi
                                            placeholder={t('merchant.agencyInvite.rolesPlaceholder')}
                                            options={AGENCY_ROLE_OPTIONS}
                                        />
                                    </Datatable.Field>
                                </div>

                                {/* Info note */}
                                <div class="col-span-full bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-start gap-2">
                                    <Icon name="heroicons-outline:information-circle" class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                    <p class="text-xs text-indigo-700 leading-relaxed">
                                        {t('merchant.agencyInvite.infoNote')}
                                    </p>
                                </div>

                            </div>
                        )}
                    </Datatable.Formlog>

                </Datatable>
            </Card>
        </div>
    );
}