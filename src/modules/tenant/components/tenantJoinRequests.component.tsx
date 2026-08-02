// src/modules/tenant/components/tenantJoinRequests.component.tsx
//
// Danh sách "lời xin làm nhân sự" (TENANT_JOIN_REQUEST) đang chờ duyệt — dùng
// Datatable của core. Chủ/Quản lý đơn vị DUYỆT (tạo TenantAccount + cấp vai trò/
// quyền mặc định) hoặc TỪ CHỐI ngay tại đây.

import { Show } from 'solid-js';
import {
    generateDatatable,
    PagingArgsInput,
} from '@/core/components/table/GeneratedDatatable';
import { Card } from '@core/components/utilities/Card';
import { Avatar } from '@core/components/utilities/Avatar';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { formatDatetime } from '@/core/helpers/date';
import {
    MerchantInvitationDTO,
    MerchantInvitationService,
} from '@/shared/services/merchantInvitation/merchantInvitation.service';
import { EInvitationType, EInvitationStatus } from '@shared/generated/typed-graphql';
import { t } from '@/shared/i18n/t';

export function TenantJoinRequestsPanel() {
    const { Datatable, triggerRefresh } = generateDatatable<
        PagingArgsInput,
        MerchantInvitationDTO,
        MerchantInvitationDTO,
        MerchantInvitationDTO,
        never,
        never
    >({
        service: MerchantInvitationService,
        paginatedQuery: MerchantInvitationService.getTenantInvitations,
        queryInput: {
            sort: { createdAt: 'DESC' },
            filter: {
                type: EInvitationType.TENANT_JOIN_REQUEST,
                status: EInvitationStatus.PENDING,
            },
        },
        // Từ chối = xử lý như xoá (có hộp thoại xác nhận, tự refresh)
        deleteMutation: (item) =>
            MerchantInvitationService.rejectJoinRequest({ id: item.id! }),
    });

    const displayName = (item: MerchantInvitationDTO) =>
        item.merchant?.fullname || item.email || t('tenant.joinRequests.unknownUser');

    const approve = async (item: MerchantInvitationDTO) => {
        try {
            await MerchantInvitationService.approveJoinRequest({ id: item.id! });
            toast().success(t('tenant.joinRequests.approveSuccess', { name: displayName(item) }));
            triggerRefresh();
        } catch (e: any) {
            toast().danger(e?.message ?? t('tenant.joinRequests.approveError'));
        }
    };

    return (
        <Card class="border-none shadow-sm">
            <Datatable id="TenantJoinRequestsTable">
                <Datatable.Header>
                    <Datatable.Title
                        title={t('tenant.joinRequests.title')}
                        description={t('tenant.joinRequests.description')}
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
                    <Datatable.Column title={t('tenant.joinRequests.column.applicant')}>
                        {(item) => (
                            <div class="flex items-center gap-3">
                                <Show
                                    when={item.merchant?.fullname}
                                    fallback={
                                        <div class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                                            <Icon name="heroicons-outline:user" class="w-4 h-4 text-amber-400" />
                                        </div>
                                    }
                                >
                                    <Avatar text={item.merchant!.fullname} size="small" />
                                </Show>
                                <div>
                                    <p class="font-medium text-sm text-neutral-900">{displayName(item)}</p>
                                    <p class="text-xs text-gray-500">
                                        {item.email}
                                        <Show when={item.merchant?.phone}> · {item.merchant!.phone}</Show>
                                    </p>
                                </div>
                            </div>
                        )}
                    </Datatable.Column>

                    <Datatable.Column title={t('tenant.joinRequests.column.sentDate')}>
                        {(item) => (
                            <span class="text-sm text-gray-500">
                                {formatDatetime(item.createdAt, 'date')}
                            </span>
                        )}
                    </Datatable.Column>

                    <Datatable.Column right fitContent>
                        {(item) => (
                            <Datatable.CellButtons>
                                <Datatable.CellButton
                                    icon={<Icon name="heroicons-outline:check" />}
                                    label={t('tenant.joinRequests.approveButton')}
                                    class="text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                    onClick={() => approve(item)}
                                />
                                <Datatable.CellButtonDelete
                                    item={item}
                                    itemName={displayName(item)}
                                    deleteConfirmSubmitLabel={t('tenant.joinRequests.rejectButton')}
                                    deleteConfirmTitle={t('tenant.joinRequests.rejectConfirmTitle')}
                                />
                            </Datatable.CellButtons>
                        )}
                    </Datatable.Column>
                </Datatable.Table>

                {/* ── Mobile CardView ────────────────────────────────── */}
                <Datatable.CardView>
                    {(item) => (
                        <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                            <div class="p-4 flex items-center gap-3">
                                <Show
                                    when={item.merchant?.fullname}
                                    fallback={
                                        <div class="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                                            <Icon name="heroicons-outline:user" class="w-4 h-4 text-amber-400" />
                                        </div>
                                    }
                                >
                                    <Avatar text={item.merchant!.fullname} size="small" />
                                </Show>
                                <div class="min-w-0 flex-1">
                                    <p class="font-semibold text-sm text-neutral-900 truncate">{displayName(item)}</p>
                                    <p class="text-xs text-gray-500 truncate">{item.email}</p>
                                </div>
                                <span class="text-xs text-gray-400 shrink-0">
                                    {formatDatetime(item.createdAt, 'date')}
                                </span>
                            </div>
                            <div class="border-t border-neutral-100 bg-neutral-50 px-4 py-2.5 flex justify-end">
                                <Datatable.CellButtons>
                                    <Datatable.CellButton
                                        icon={<Icon name="heroicons-outline:check" />}
                                        label="Duyệt"
                                        class="text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                        onClick={() => approve(item)}
                                    />
                                    <Datatable.CellButtonDelete
                                        item={item}
                                        itemName={displayName(item)}
                                        deleteConfirmSubmitLabel="Từ chối"
                                        deleteConfirmTitle="Từ chối yêu cầu xin làm nhân sự này?"
                                    />
                                </Datatable.CellButtons>
                            </div>
                        </div>
                    )}
                </Datatable.CardView>

                <Datatable.Pagination />
            </Datatable>
        </Card>
    );
}
