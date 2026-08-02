// src/modules/merchant/pages/TenantInviteMerchantPage.tsx
// Tenant mời Merchant vào làm nhân viên (Đơn vị) (TENANT_MEMBER)
//
// API sử dụng: createMerchantInvitation, updateMerchantInvitation,
//              revokeMerchantInvitation, resendMerchantInvitation,
//              getTenantInvitations (tenantId inject từ token)

import { createSignal, Show } from "solid-js";
import {
  generateDatatable,
  PagingArgsInput,
} from "@/core/components/table/GeneratedDatatable";
import { Card } from "@core/components/utilities/Card";
import { Input } from "@core/components/control/Input";
import { Select } from "@core/components/control/Select";
import { Icon } from "@shared/components/icons/Icon";
import { Avatar } from "@core/components/utilities/Avatar";
import { formatDatetime } from "@/core/helpers/date";

import {
  MerchantInvitationDTO,
  MerchantInvitationService,
} from "@/shared/services/merchantInvitation/merchantInvitation.service";
import {
  CreateMerchantInvitationInput,
  EInvitationStatus,
  EInvitationType,
  ERole,
  UpdateMerchantInvitationInput,
} from "@/shared/generated/typed-graphql";

import {
  TENANT_ROLE_OPTIONS,
  INVITATION_STATUS_CONFIG,
  RESENDABLE_STATUSES,
} from "../merchant.constants";
import {
  InvitationStatusBadge,
  InvitationStatusBadgeMini,
} from "../components/invitationStatusBadge";
import { RoleBadgeList } from "../components/roleBadge";
import { InputNumber } from "@/core/components/control/InputNumber";
import { Toggle } from "@core/components/control/Toggle";
import { Tabs } from "@core/components/tab/Tabs";
import { TenantStaffSettingsPanel } from "@/modules/tenant/components/tenantStaffSettings.component";
import { TenantJoinRequestsPanel } from "@/modules/tenant/components/tenantJoinRequests.component";
import { t } from "@/shared/i18n/t";

export function TenantInviteMerchantPage() {
  const [filterStatus, setFilterStatus] =
    createSignal<EInvitationStatus | null>(null);

  const { Datatable } = generateDatatable<
    PagingArgsInput,
    MerchantInvitationDTO,
    MerchantInvitationDTO,
    MerchantInvitationDTO,
    CreateMerchantInvitationInput,
    UpdateMerchantInvitationInput
  >({
    service: MerchantInvitationService,
    paginatedQuery: MerchantInvitationService.getTenantInvitations,
    queryInput: {
      sort: { createdAt: "DESC" },
      get filter() {
        // Ẩn các "lời xin làm nhân sự" khỏi bảng lời mời — chúng được duyệt
        // ở panel riêng phía trên.
        const base: any = {
          type: { $ne: EInvitationType.TENANT_JOIN_REQUEST },
        };
        if (filterStatus()) base.status = filterStatus();
        return base;
      },
    },
    itemQuery: (item) =>
      MerchantInvitationService.getOneMerchantInvitation({ id: item.id! }),
    createMutation: (input) =>
      MerchantInvitationService.createMerchantInvitation({ input }),
    updateMutation: (id, input) =>
      MerchantInvitationService.updateMerchantInvitation({ id, input }),
    deleteMutation: (item) =>
      MerchantInvitationService.revokeMerchantInvitation({ id: item.id! }),
  });

  return (
    <div class="animate-in">
      <Tabs id="TenantStaffTabs" contentClass="mt-4">

      {/* ══ Tab 1: Lời mời nhân viên ═══════════════════════════════════ */}
      <Tabs.Tab
        label={t('merchant.tenantInvite.tab1Label')}
        icon={<Icon name="heroicons-outline:paper-airplane" class="w-4 h-4" />}
      >
      <div class="space-y-6">
      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <Card class="p-4 border-none shadow-sm bg-white">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <span class="text-sm font-bold text-gray-500 uppercase tracking-wider flex-none">
            {t('merchant.tenantInvite.filterStatusLabel')}
          </span>
          <div class="w-full sm:w-64">
            <Select
              placeholder={t('merchant.tenantInvite.statusPlaceholder')}
              clearable
              value={filterStatus()}
              onChange={(v) => setFilterStatus(v as EInvitationStatus)}
              options={Object.entries(INVITATION_STATUS_CONFIG).map(
                ([v, c]) => ({
                  label: c.label,
                  value: v,
                })
              )}
              prefix={
                <Icon
                  name="heroicons-outline:filter"
                  class="w-4 h-4 text-gray-400"
                />
              }
            />
          </div>
          <Show when={filterStatus()}>
            <div class="text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1 w-fit">
              <Icon name="heroicons-solid:filter" class="w-3 h-3" />
              {t('merchant.tenantInvite.filteringBadge')}
            </div>
          </Show>
        </div>
      </Card>

      {/* ── Datatable ───────────────────────────────────────────────── */}
      <Card class="border-none shadow-sm">
        <Datatable id="TenantInvitationsTable">
          <Datatable.Header>
            <Datatable.Title
              title={t('merchant.tenantInvite.title')}
              description={t('merchant.tenantInvite.description')}
            />
            <Datatable.Buttons>
              <Datatable.ButtonRefresh />
              <Datatable.ButtonCreate label={t('merchant.tenantInvite.createButtonLabel')} />
            </Datatable.Buttons>
          </Datatable.Header>

          <Datatable.Toolbar>
            <Datatable.Search />
          </Datatable.Toolbar>

          {/* ── Desktop Table ──────────────────────────────────── */}
          <Datatable.Table>
            <Datatable.Column title={t('merchant.tenantInvite.invitedMerchantColumn')}>
              {(item) => (
                <div class="flex items-center gap-3">
                  <Show
                    when={item.merchant?.fullname}
                    fallback={
                      <div class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <Icon
                          name="heroicons-outline:user"
                          class="w-4 h-4 text-emerald-400"
                        />
                      </div>
                    }
                  >
                    <Avatar text={item.merchant!.fullname} size="small" />
                  </Show>
                  <div>
                    <p class="font-medium text-sm text-neutral-900">
                      {item.merchant?.fullname ?? (
                        <span class="italic text-gray-400">
                          {t('merchant.tenantInvite.noAccountYet')}
                        </span>
                      )}
                    </p>
                    <p class="text-xs text-gray-500">{item.email}</p>
                  </div>
                </div>
              )}
            </Datatable.Column>

            <Datatable.Column title={t('merchant.tenantInvite.rolesColumn')}>
              {(item) => (
                <RoleBadgeList roles={item.roles as ERole[]} variant="tenant" />
              )}
            </Datatable.Column>

            <Datatable.Column title={t('merchant.tenantInvite.statusColumn')}>
              {(item) => (
                <InvitationStatusBadge
                  status={item.status as EInvitationStatus}
                />
              )}
            </Datatable.Column>

            <Datatable.Column title={t('merchant.tenantInvite.datesColumn')}>
              {(item) => (
                <div class="space-y-0.5">
                  <p class="text-xs text-gray-600">
                    {formatDatetime(item.createdAt, "date")}
                  </p>
                  <p class="text-xs text-gray-400">
                    {item.expiresAt
                      ? t('merchant.tenantInvite.expiresShortLabel', { date: formatDatetime(item.expiresAt, "date") })
                      : t('merchant.tenantInvite.noLimit')}
                  </p>
                </div>
              )}
            </Datatable.Column>

            <Datatable.Column right fitContent>
              {(item) => (
                <Datatable.CellButtons>
                  <Show
                    when={RESENDABLE_STATUSES.includes(
                      item.status as EInvitationStatus
                    )}
                  >
                    <Datatable.CellButton
                      icon={<Icon name="heroicons-outline:paper-airplane" />}
                      label={t('merchant.tenantInvite.resendButton')}
                      onClick={() =>
                        MerchantInvitationService.resendMerchantInvitation({
                          id: item.id!,
                        })
                      }
                    />
                  </Show>
                  <Show when={item.status === EInvitationStatus.PENDING}>
                    <Datatable.CellButtonUpdate item={item} />
                    <Datatable.CellButtonDelete
                      item={item}
                      itemName={item.email}
                      deleteConfirmSubmitLabel={t('merchant.tenantInvite.revokeButton')}
                      deleteConfirmTitle={t('merchant.tenantInvite.revokeConfirmTitle')}
                    />
                  </Show>
                </Datatable.CellButtons>
              )}
            </Datatable.Column>
          </Datatable.Table>

          {/* ── Mobile CardView ─────────────────────────────────── */}
          <Datatable.CardView>
            {(item) => (
              <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <div class="p-4 space-y-3">
                  <div class="flex items-start gap-3">
                    <Show
                      when={item.merchant?.fullname}
                      fallback={
                        <div class="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <Icon
                            name="heroicons-outline:user"
                            class="w-4 h-4 text-emerald-400"
                          />
                        </div>
                      }
                    >
                      <Avatar text={item.merchant!.fullname} size="small" />
                    </Show>
                    <div class="min-w-0 flex-1">
                      <p class="font-semibold text-sm text-neutral-900 truncate">
                        {item.merchant?.fullname ?? t('merchant.tenantInvite.noAccountYet')}
                      </p>
                      <p class="text-xs text-gray-500 truncate">{item.email}</p>
                    </div>
                    <InvitationStatusBadgeMini
                      status={item.status as EInvitationStatus}
                    />
                  </div>

                  <RoleBadgeList
                    roles={item.roles as ERole[]}
                    variant="tenant"
                  />

                  <div class="grid grid-cols-2 gap-x-4">
                    <div class="flex flex-col gap-0.5">
                      <span class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        {t('merchant.tenantInvite.sentDateLabel')}
                      </span>
                      <span class="text-sm text-neutral-700">
                        {formatDatetime(item.createdAt, "date")}
                      </span>
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <span class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        {t('merchant.tenantInvite.expiresLabel')}
                      </span>
                      <span class="text-sm text-neutral-700">
                        {item.expiresAt
                          ? formatDatetime(item.expiresAt, "date")
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="border-t border-neutral-100 bg-neutral-50 px-4 py-2.5 flex justify-end">
                  <Datatable.CellButtons>
                    <Show
                      when={RESENDABLE_STATUSES.includes(
                        item.status as EInvitationStatus
                      )}
                    >
                      <Datatable.CellButton
                        icon={<Icon name="heroicons-outline:paper-airplane" />}
                        label={t('merchant.tenantInvite.resendButton')}
                        onClick={() =>
                          MerchantInvitationService.resendMerchantInvitation({
                            id: item.id!,
                          })
                        }
                      />
                    </Show>
                    <Show when={item.status === EInvitationStatus.PENDING}>
                      <Datatable.CellButtonUpdate item={item} />
                      <Datatable.CellButtonDelete
                        item={item}
                        itemName={item.email}
                        deleteConfirmSubmitLabel={t('merchant.tenantInvite.revokeButton')}
                        deleteConfirmTitle={t('merchant.tenantInvite.revokeConfirmTitle')}
                      />
                    </Show>
                  </Datatable.CellButtons>
                </div>
              </div>
            )}
          </Datatable.CardView>

          <Datatable.Pagination />

          {/* ── Form ──────────────────────────────────────────── */}
          <Datatable.Formlog viewMode="modal" class="w-full max-w-[560px]">
            {(item) => (
              <div class="col-span-full grid grid-cols-1 sm:grid-cols-12 gap-5 p-4 sm:p-6">
                <div class="col-span-full bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <p class="col-span-full text-[11px] font-bold text-emerald-600 uppercase tracking-widest">
                    {t('merchant.tenantInvite.formSectionRecipient')}
                  </p>
                  <div class="col-span-full sm:col-span-7">
                    <Datatable.Field
                      name="email"
                      label={t('merchant.tenantInvite.emailFieldLabel')}
                      required
                    >
                      <Input
                        type="email"
                        placeholder="merchant@example.com"
                        disabled={!!item}
                      />
                    </Datatable.Field>
                  </div>
                  <div class="col-span-full sm:col-span-5">
                    <Datatable.Field
                      name="expiresInDays"
                      label={t('merchant.tenantInvite.expiresInDaysLabel')}
                    >
                      <InputNumber
                        defaultValue={14}
                        min={1}
                        max={90}
                        placeholder="7"
                      />
                    </Datatable.Field>
                  </div>
                </div>

                <div class="col-span-full">
                  <Datatable.Field
                    name="roles"
                    label={t('merchant.tenantInvite.rolesFieldLabel')}
                    required
                  >
                    <Select
                      multi
                      placeholder={t('merchant.tenantInvite.rolesPlaceholder')}
                      options={TENANT_ROLE_OPTIONS}
                    />
                  </Datatable.Field>
                </div>

                {/* Mời & thêm luôn — chỉ khi tạo mới */}
                <Show when={!item}>
                  <div class="col-span-full flex items-center justify-between gap-4 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-blue-800">
                        {t('merchant.tenantInvite.autoAcceptTitle')}
                      </p>
                      <p class="text-xs text-blue-600/80">
                        {t('merchant.tenantInvite.autoAcceptDesc')}
                      </p>
                    </div>
                    <Datatable.Field name="autoAccept">
                      <Toggle />
                    </Datatable.Field>
                  </div>
                </Show>

                <div class="col-span-full bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-start gap-2">
                  <Icon
                    name="heroicons-outline:information-circle"
                    class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                  />
                  <p class="text-xs text-emerald-700 leading-relaxed">
                    {t('merchant.tenantInvite.infoNote')}
                  </p>
                </div>
              </div>
            )}
          </Datatable.Formlog>
        </Datatable>
      </Card>
      </div>
      </Tabs.Tab>

      {/* ══ Tab 2: Yêu cầu xin làm nhân sự ═════════════════════════════ */}
      <Tabs.Tab
        label={t('merchant.tenantInvite.tab2Label')}
        icon={<Icon name="heroicons-outline:hand-raised" class="w-4 h-4" />}
      >
        <TenantJoinRequestsPanel />
      </Tabs.Tab>

      {/* ══ Tab 3: Cấu hình tự đăng ký ═════════════════════════════════ */}
      <Tabs.Tab
        label={t('merchant.tenantInvite.tab3Label')}
        icon={<Icon name="heroicons-outline:cog-6-tooth" class="w-4 h-4" />}
      >
        <TenantStaffSettingsPanel />
      </Tabs.Tab>

      </Tabs>
    </div>
  );
}
