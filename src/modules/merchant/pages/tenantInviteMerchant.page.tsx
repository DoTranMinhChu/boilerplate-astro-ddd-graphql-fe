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
        label="Lời mời nhân viên"
        icon={<Icon name="heroicons-outline:paper-airplane" class="w-4 h-4" />}
      >
      <div class="space-y-6">
      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <Card class="p-4 border-none shadow-sm bg-white">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <span class="text-sm font-bold text-gray-500 uppercase tracking-wider flex-none">
            Lọc trạng thái:
          </span>
          <div class="w-full sm:w-64">
            <Select
              placeholder="Tất cả trạng thái"
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
              Đang lọc theo trạng thái
            </div>
          </Show>
        </div>
      </Card>

      {/* ── Datatable ───────────────────────────────────────────────── */}
      <Card class="border-none shadow-sm">
        <Datatable id="TenantInvitationsTable">
          <Datatable.Header>
            <Datatable.Title
              title="Lời mời nhân viên (Đơn vị)"
              description="Gửi lời mời để chuyên viên tham gia làm việc tại đơn vị  của bạn"
            />
            <Datatable.Buttons>
              <Datatable.ButtonRefresh />
              <Datatable.ButtonCreate label="Gửi lời mời mới" />
            </Datatable.Buttons>
          </Datatable.Header>

          <Datatable.Toolbar>
            <Datatable.Search />
          </Datatable.Toolbar>

          {/* ── Desktop Table ──────────────────────────────────── */}
          <Datatable.Table>
            <Datatable.Column title="Merchant được mời">
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
                          Chưa có tài khoản
                        </span>
                      )}
                    </p>
                    <p class="text-xs text-gray-500">{item.email}</p>
                  </div>
                </div>
              )}
            </Datatable.Column>

            <Datatable.Column title="Vai trò">
              {(item) => (
                <RoleBadgeList roles={item.roles as ERole[]} variant="tenant" />
              )}
            </Datatable.Column>

            <Datatable.Column title="Trạng thái">
              {(item) => (
                <InvitationStatusBadge
                  status={item.status as EInvitationStatus}
                />
              )}
            </Datatable.Column>

            <Datatable.Column title="Ngày gửi · Hết hạn">
              {(item) => (
                <div class="space-y-0.5">
                  <p class="text-xs text-gray-600">
                    {formatDatetime(item.createdAt, "date")}
                  </p>
                  <p class="text-xs text-gray-400">
                    {item.expiresAt
                      ? `HH: ${formatDatetime(item.expiresAt, "date")}`
                      : "Không giới hạn"}
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
                      label="Gửi lại"
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
                      deleteConfirmSubmitLabel="Thu hồi"
                      deleteConfirmTitle="Bạn có chắc muốn thu hồi lời mời này không?"
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
                        {item.merchant?.fullname ?? "Chưa có tài khoản"}
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
                        Ngày gửi
                      </span>
                      <span class="text-sm text-neutral-700">
                        {formatDatetime(item.createdAt, "date")}
                      </span>
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <span class="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        Hết hạn
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
                        label="Gửi lại"
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
                        deleteConfirmSubmitLabel="Thu hồi"
                        deleteConfirmTitle="Bạn có chắc muốn thu hồi lời mời này không?"
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
                    Người nhận lời mời
                  </p>
                  <div class="col-span-full sm:col-span-7">
                    <Datatable.Field
                      name="email"
                      label="Email Merchant"
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
                      label="Hết hạn sau (ngày)"
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
                    label="Vai trò trong Tenant"
                    required
                  >
                    <Select
                      multi
                      placeholder="Chọn ít nhất 1 vai trò..."
                      options={TENANT_ROLE_OPTIONS}
                    />
                  </Datatable.Field>
                </div>

                {/* Mời & thêm luôn — chỉ khi tạo mới */}
                <Show when={!item}>
                  <div class="col-span-full flex items-center justify-between gap-4 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-blue-800">
                        Thêm vào đơn vị ngay
                      </p>
                      <p class="text-xs text-blue-600/80">
                        Nếu người này đã có tài khoản: thêm thẳng làm nhân sự
                        (không cần họ bấm chấp nhận) và gửi email báo.
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
                    Nếu chưa có tài khoản, Merchant sẽ nhận email mã mời và tự
                    tạo tài khoản. Nếu đã có tài khoản, họ nhận email thông báo
                    được mời — hoặc được thêm thẳng nếu bật "Thêm vào đơn vị
                    ngay".
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
        label="Yêu cầu xin làm"
        icon={<Icon name="heroicons-outline:hand-raised" class="w-4 h-4" />}
      >
        <TenantJoinRequestsPanel />
      </Tabs.Tab>

      {/* ══ Tab 3: Cấu hình tự đăng ký ═════════════════════════════════ */}
      <Tabs.Tab
        label="Cấu hình"
        icon={<Icon name="heroicons-outline:cog-6-tooth" class="w-4 h-4" />}
      >
        <TenantStaffSettingsPanel />
      </Tabs.Tab>

      </Tabs>
    </div>
  );
}
