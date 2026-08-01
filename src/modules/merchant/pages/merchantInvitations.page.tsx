// src/modules/merchant/pages/MerchantInvitationsPage.tsx
// Merchant xem danh sách lời mời nhận được (getMyInvitations)
// và thực hiện Accept / Reject từng lời mời
//
// Đặc điểm:
//   - Datatable read-only (không có create/update/delete)
//   - PENDING card: gradient strip + footer action nổi bật trên mobile
//   - Desktop: Accept/Reject là 2 text button inline trong column cuối
//   - Filter theo type (Agency / Tenant) và status
//   - triggerRefresh sau khi accept/reject để cập nhật danh sách

import { createSignal, Show } from 'solid-js';
import { generateDatatable, PagingArgsInput } from '@/core/components/table/GeneratedDatatable';
import { Card } from '@core/components/utilities/Card';
import { Select } from '@core/components/control/Select';
import { Icon } from '@shared/components/icons/Icon';
import { formatDatetime } from '@/core/helpers/date';

import {
    MerchantInvitationDTO,
    MerchantInvitationService,
} from '@/shared/services/merchantInvitation/merchantInvitation.service';

import { InvitationActions } from '../components/InvitationActions';
import {
    INVITATION_STATUS_CONFIG,
    INVITATION_TYPE_CONFIG,
} from '../merchant.constants';
import { EInvitationStatus, EInvitationType, ERole } from '@/shared/generated/typed-graphql';
import { InvitationStatusBadge, InvitationStatusBadgeMini } from '../components/invitationStatusBadge';
import { RoleBadgeList } from '../components/roleBadge';

export function MerchantInvitationsPage() {
    const [filterStatus, setFilterStatus] = createSignal<EInvitationStatus | null>(null);
    const [filterType, setFilterType] = createSignal<EInvitationType | null>(null);

    const { Datatable, triggerRefresh } = generateDatatable<
        PagingArgsInput,
        MerchantInvitationDTO,
        MerchantInvitationDTO,
        MerchantInvitationDTO,
        never,
        never
    >({
        service: MerchantInvitationService,
        // getMyInvitations — merchantId inject từ token, chỉ thấy lời mời của mình
        paginatedQuery: MerchantInvitationService.getMyInvitations,
        queryInput: {
            sort: { createdAt: 'DESC' },
            get filter() {
                const f: Record<string, any> = {};
                if (filterStatus()) f.status = filterStatus();
                if (filterType()) f.type = filterType();
                return Object.keys(f).length ? f : undefined;
            },
        },
    });

    // Org name + code helper
    const orgInfo = (item: MerchantInvitationDTO) =>
        item.type === EInvitationType.TENANT_MEMBER
            || item.type === EInvitationType.AGENCY_TO_TENANT
            || item.type === EInvitationType.TENANT_JOIN_REQUEST
            ? { name: item.tenant?.name, code: item.tenant?.code }
            : { name: item.agency?.name, code: item.agency?.code };

    // Lời xin làm nhân sự do CHÍNH merchant gửi đi → merchant không tự duyệt,
    // chỉ chờ đơn vị xử lý. Ẩn nút Accept/Reject cho loại này.
    const isOutgoingRequest = (item: MerchantInvitationDTO) =>
        item.type === EInvitationType.TENANT_JOIN_REQUEST;

    return (
        <div class="space-y-6 animate-in">

            {/* ── Filter Bar ──────────────────────────────────────────────── */}
            <Card class="p-4 border-none shadow-sm bg-white">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 sm:flex-wrap">
                    <span class="text-sm font-bold text-gray-500 uppercase tracking-wider flex-none">
                        Lọc:
                    </span>

                    <div class="w-full sm:w-48">
                        <Select
                            placeholder="Tất cả loại"
                            clearable
                            value={filterType()}
                            onChange={(v) => setFilterType(v as EInvitationType)}
                            options={[
                                { label: 'Agency', value: EInvitationType.AGENCY_MEMBER },
                                { label: 'Agency → Tenant', value: EInvitationType.AGENCY_TO_TENANT },
                                { label: 'Tenant', value: EInvitationType.TENANT_MEMBER },
                            ]}
                            prefix={<Icon name="heroicons-outline:briefcase" class="w-4 h-4 text-gray-400" />}
                        />
                    </div>

                    <div class="w-full sm:w-52">
                        <Select
                            placeholder="Tất cả trạng thái"
                            clearable
                            value={filterStatus()}
                            onChange={(v) => setFilterStatus(v as EInvitationStatus)}
                            options={Object.entries(INVITATION_STATUS_CONFIG).map(([v, c]) => ({
                                label: c.label, value: v,
                            }))}
                            prefix={<Icon name="heroicons-outline:filter" class="w-4 h-4 text-gray-400" />}
                        />
                    </div>

                    <Show when={filterStatus() || filterType()}>
                        <button
                            class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 w-fit"
                            onClick={() => { setFilterStatus(null); setFilterType(null); }}
                        >
                            <Icon name="heroicons-solid:x" class="w-3.5 h-3.5" />
                            Xoá bộ lọc
                        </button>
                    </Show>
                </div>
            </Card>

            {/* ── Datatable ───────────────────────────────────────────────── */}
            <Card class="border-none shadow-sm">
                <Datatable id="MyInvitationsTable">

                    <Datatable.Header>
                        <Datatable.Title
                            title="Lời mời làm nhân viên"
                            description="Các lời mời từ Agency và Tenant gửi đến bạn"
                        />
                        <Datatable.Buttons>
                            <Datatable.ButtonRefresh />
                        </Datatable.Buttons>
                    </Datatable.Header>

                    <Datatable.Toolbar>
                        <Datatable.Search />
                    </Datatable.Toolbar>

                    {/* ── Desktop Table ──────────────────────────────────── */}
                    <Datatable.Table>

                        <Datatable.Column title="Tổ chức mời">
                            {(item) => {
                                const typeCfg = INVITATION_TYPE_CONFIG[item.type as EInvitationType];
                                const org = orgInfo(item);
                                return (
                                    <div class="flex items-center gap-3">
                                        <div class={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0
                                            ${typeCfg?.bg ?? 'bg-gray-50'} ${typeCfg?.border ?? 'border-gray-200'}`}>
                                            <Icon
                                                name={typeCfg?.icon ?? 'heroicons-outline:users'}
                                                class={`w-4 h-4 ${typeCfg?.color ?? 'text-gray-500'}`}
                                            />
                                        </div>
                                        <div>
                                            <p class="font-semibold text-sm text-neutral-900">
                                                {org.name ?? '—'}
                                            </p>
                                            <p class="text-xs text-gray-400">{org.code ?? ''}</p>
                                        </div>
                                    </div>
                                );
                            }}
                        </Datatable.Column>

                        <Datatable.Column title="Loại">
                            {(item) => {
                                const typeCfg = INVITATION_TYPE_CONFIG[item.type as EInvitationType];
                                return typeCfg ? (
                                    <span class={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border
                                        ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}>
                                        <Icon name={typeCfg.icon} class="w-3.5 h-3.5" />
                                        {typeCfg.label}
                                    </span>
                                ) : null;
                            }}
                        </Datatable.Column>

                        <Datatable.Column title="Vai trò được gán">
                            {(item) => <RoleBadgeList roles={item.roles as ERole[]} />}
                        </Datatable.Column>

                        <Datatable.Column title="Trạng thái">
                            {(item) => <InvitationStatusBadge status={item.status as EInvitationStatus} />}
                        </Datatable.Column>

                        <Datatable.Column title="Ngày nhận · Hết hạn">
                            {(item) => (
                                <div class="space-y-0.5">
                                    <p class="text-xs text-gray-600">{formatDatetime(item.createdAt, 'date')}</p>
                                    <p class="text-xs text-gray-400">
                                        {item.expiresAt ? `HH: ${formatDatetime(item.expiresAt, 'date')}` : '—'}
                                    </p>
                                </div>
                            )}
                        </Datatable.Column>

                        {/* Cột cuối: Accept / Reject — InvitationActions tự ẩn khi không PENDING */}
                        <Datatable.Column right fitContent>
                            {(item) => (
                                <Show
                                    when={!isOutgoingRequest(item)}
                                    fallback={
                                        <Show when={item.status === EInvitationStatus.PENDING}>
                                            <span class="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                                                <Icon name="heroicons-outline:clock" class="w-3.5 h-3.5" />
                                                Chờ đơn vị duyệt
                                            </span>
                                        </Show>
                                    }
                                >
                                    <InvitationActions
                                        inviteCode={item.inviteCode!}
                                        status={item.status as EInvitationStatus}
                                        onDone={triggerRefresh}
                                    />
                                </Show>
                            )}
                        </Datatable.Column>

                    </Datatable.Table>

                    {/* ── Mobile CardView ─────────────────────────────────── */}
                    {/*
                        Layout PENDING vs Non-PENDING khác nhau rõ:
                          PENDING   → viền indigo nhạt + gradient strip + footer action
                          Còn lại   → viền neutral bình thường, không có footer
                    */}
                    <Datatable.CardView>
                        {(item) => {
                            const typeCfg = INVITATION_TYPE_CONFIG[item.type as EInvitationType];
                            const org = orgInfo(item);
                            const isPending = item.status === EInvitationStatus.PENDING;

                            return (
                                <div class={`rounded-xl border overflow-hidden bg-white
                                    ${isPending
                                        ? 'border-indigo-200 shadow-sm shadow-indigo-50'
                                        : 'border-neutral-200'
                                    }`}>

                                    {/* Gradient strip — chỉ PENDING */}
                                    <Show when={isPending}>
                                        <div class="h-0.5 bg-linear-to-r from-indigo-500 via-violet-500 to-indigo-400" />
                                    </Show>

                                    <div class="p-4 space-y-3">

                                        {/* Hàng 1: icon + org + status */}
                                        <div class="flex items-start gap-3">
                                            <div class={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0
                                                ${typeCfg?.bg ?? 'bg-gray-50'} ${typeCfg?.border ?? 'border-gray-200'}`}>
                                                <Icon
                                                    name={typeCfg?.icon ?? 'heroicons-outline:users'}
                                                    class={`w-5 h-5 ${typeCfg?.color ?? 'text-gray-500'}`}
                                                />
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <p class="font-semibold text-sm text-neutral-900 truncate">
                                                    {org.name ?? '—'}
                                                </p>
                                                <p class="text-xs text-gray-400 mt-0.5">
                                                    {typeCfg?.label ?? ''}
                                                    <Show when={org.code}>
                                                        <span class="mx-1">·</span>{org.code}
                                                    </Show>
                                                </p>
                                            </div>
                                            <InvitationStatusBadgeMini status={item.status as EInvitationStatus} />
                                        </div>

                                        {/* Roles */}
                                        <RoleBadgeList roles={item.roles as ERole[]} />

                                        {/* Dates */}
                                        <div class="grid grid-cols-2 gap-x-4">
                                            <div class="flex flex-col gap-0.5">
                                                <span class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                                    Ngày nhận
                                                </span>
                                                <span class="text-sm text-neutral-700">
                                                    {formatDatetime(item.createdAt, 'date')}
                                                </span>
                                            </div>
                                            <div class="flex flex-col gap-0.5">
                                                <span class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                                    Hết hạn
                                                </span>
                                                <span class="text-sm text-neutral-700">
                                                    {item.expiresAt ? formatDatetime(item.expiresAt, 'date') : '—'}
                                                </span>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Footer action — chỉ PENDING, nền indigo-50 */}
                                    <Show when={isPending}>
                                        <div class="border-t border-indigo-100 bg-indigo-50 px-4 py-3">
                                            <InvitationActions
                                                inviteCode={item.inviteCode!}
                                                status={item.status as EInvitationStatus}
                                                compact
                                                onDone={triggerRefresh}
                                            />
                                        </div>
                                    </Show>

                                </div>
                            );
                        }}
                    </Datatable.CardView>

                    <Datatable.Pagination />

                </Datatable>
            </Card>
        </div>
    );
}