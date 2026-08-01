// src/modules/tenant/pages/staff/TenantAccountSection.tsx

import { Show, For, createSignal } from "solid-js";
import {
  generateDatatable,
  PagingArgsInput,
} from "@/core/components/table/GeneratedDatatable";
import {
  TenantAccountDTO,
  TenantAccountService,
} from "@/shared/services/tenantAccount/tenantAccount.service";
import { Avatar } from "@core/components/utilities/Avatar";
import { Input } from "@core/components/control/Input";
import { InputPassword } from "@core/components/control/InputPasssword";
import { Select } from "@core/components/control/Select";
import { Toggle } from "@core/components/control/Toggle";
import {
  CreateTenantAccountInput,
  UpdateTenantAccountInput,
  ERole,
  EPermission,
} from "@shared/generated/typed-graphql";
import { Icon } from "@shared/components/icons/Icon";
import { toast } from "@core/components/toast/ToastProvider";
import { usePermission } from "@/shared/contexts/permission/PermissionContext";
import { useAuth } from "@/shared/contexts/auth/AuthContext";
import { EAccountType } from "@/shared/types/auth.type";
import { PermissionModal } from "../pages/tenantAccount/staff/permissionModal";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /**
   * tenantId để filter danh sách account theo tenant.
   * Khi dùng trong TenantDetailPage (admin/agency view) thì truyền vào.
   * Khi dùng trong TenantLayout (tenant self-view) thì để undefined — BE tự lọc.
   */
  tenantId?: string;

  /**
   * true  = đang xem từ phía Tenant (TenantAccountPage)
   *         → áp dụng permission check (can(STAFF_VIEW), can(STAFF_CREATE), ...)
   *         → ẩn nút "Truy cập" (impersonate)
   *
   * false = đang xem từ Admin / Agency (TenantDetailPage)
   *         → full access (FALLBACK_FULL_ACCESS)
   *         → hiện nút "Truy cập"
   */
  isTenantView?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TenantAccountSection(props: Props) {
  const { isAdmin, impersonateOpenTab } = useAuth();
  const { can } = usePermission();

  // Target account để mở PermissionModal
  const [permTarget, setPermTarget] = createSignal<TenantAccountDTO | null>(
    null
  );

  // Xác định account type hiện tại (Admin hoặc Agency) để restore token sau impersonate
  const currentAccountType = () =>
    isAdmin() ? EAccountType.ADMIN : EAccountType.AGENCY;

  // ── Impersonate (Admin/Agency only) ───────────────────────────────────────

  const handleImpersonate = async (tenantAccount: TenantAccountDTO) => {
    const ok = await impersonateOpenTab(
      currentAccountType(),
      () =>
        TenantAccountService.generateTokenTenantAccount({
          tenantAccountId: tenantAccount.id!,
        }),
      `${window.location.origin}/tenant/login`
    );

    if (ok) {
      toast().success(`Đang chuyển hướng đến ${tenantAccount.fullname}...`);
    } else {
      toast().danger("Không lấy được token truy cập.");
    }
  };

  // ── Permission guards ─────────────────────────────────────────────────────

  /** Có thể xóa account này không? OWNER không được xóa. */
  const canDelete = (item: TenantAccountDTO) => {
    if (!props.isTenantView) return true; // Admin/Agency: luôn được
    if (item.roles?.includes(ERole.TENANT_OWNER)) return false; // OWNER: không bao giờ xóa được
    return can(EPermission.STAFF_DELETE);
  };

  /** Có thể mở modal phân quyền không? */
  const canManagePermission = () =>
    !props.isTenantView || can(EPermission.STAFF_PERMISSION_MANAGE);

  /**
   * Chỉ hiện nút Phân quyền với TENANT_STAFF thuần.
   * OWNER và MANAGER có quyền mặc định theo role → không cần phân quyền dynamic.
   */
  const shouldShowPermButton = (item: TenantAccountDTO) => {
    if (!canManagePermission()) return false;
    const roles = item.roles ?? [];
    return (
      roles.length === 0 ||
      (roles.length === 1 && roles.includes(ERole.TENANT_STAFF))
    );
  };

  // ── Datatable ─────────────────────────────────────────────────────────────

  const { Datatable } = generateDatatable<
    PagingArgsInput,
    TenantAccountDTO,
    TenantAccountDTO,
    TenantAccountDTO,
    CreateTenantAccountInput,
    UpdateTenantAccountInput
  >({
    service: TenantAccountService,
    paginatedQuery: (input) => TenantAccountService.getAllTenantAccount(input),
    itemQuery: (item) =>
      TenantAccountService.getOneTenantAccount({ id: item?.id! }),
    createMutation: (data) =>
      TenantAccountService.createTenantAccount({
        data: { ...data, tenantId: props.tenantId! },
      }),
    updateMutation: (id, data) =>
      TenantAccountService.updateTenantAccount({ id, data }),
    deleteMutation: (item) =>
      TenantAccountService.deleteTenantAccount(item?.id!),
    queryInput: {
      sort: { createdAt: "DESC" },
      get filter() {
        return props.tenantId
          ? { tenantId: { $eq: props.tenantId } }
          : undefined;
      },
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Datatable container ── */}
      <div>
        <Datatable id="TenantDetailAccountTable">
          <Datatable.Header>
            <Datatable.Title
              title={
                props.isTenantView
                  ? "Danh sách nhân viên"
                  : "Nhân viên tổ chức"
              }
              description="Quản lý tài khoản truy cập hệ thống"
            />
            <Datatable.Buttons>
              <Datatable.ButtonRefresh />
              <Show when={!props.isTenantView || can(EPermission.STAFF_CREATE)}>
                <Datatable.ButtonCreate label="Cấp tài khoản" />
              </Show>
            </Datatable.Buttons>
          </Datatable.Header>

          <Datatable.Toolbar>
            <Datatable.Search />
          </Datatable.Toolbar>

          <Datatable.Table>
            <Datatable.Column title="Nhân viên">
              {(item) => (
                <div class="flex items-center gap-3">
                  <Avatar
                    text={item.fullname || item.merchant?.fullname || ''}
                    class="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 font-bold shrink-0"
                  />
                  <div class="flex flex-col min-w-0">
                    <span class="font-bold text-blue-900 leading-none truncate">
                      {item.fullname || item.merchant?.fullname || '(Chưa cập nhật tên)'}
                    </span>
                    <span class="text-xs text-gray-400 mt-1 italic truncate">
                      {item.username || item.merchant?.username}
                    </span>
                  </div>
                </div>
              )}
            </Datatable.Column>

            {/* Column: Vai trò */}
            <Datatable.Column title="Vai trò">
              {(item) => (
                <div class="flex flex-wrap gap-1">
                  <For each={item.roles}>
                    {(role) => (
                      <span
                        class={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap
                                                    ${role ===
                            ERole.TENANT_OWNER
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : role ===
                              ERole.TENANT_MANAGER
                              ? "bg-violet-50 text-violet-700 border-violet-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                      >
                        {role === ERole.TENANT_OWNER
                          ? "Chủ sở hữu"
                          : role === ERole.TENANT_MANAGER
                            ? "Quản lý"
                            : "Nhân viên"}
                      </span>
                    )}
                  </For>
                </div>
              )}
            </Datatable.Column>

            {/* Column: Trạng thái */}
            <Datatable.Column title="Trạng thái" center fitContent>
              {(item) => (
                <Show
                  when={item.isActivated}
                  fallback={
                    <span class="inline-flex items-center gap-1 text-[10px] text-red-500 font-bold uppercase">
                      <span class="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                      Khóa
                    </span>
                  }
                >
                  <span class="inline-flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase tracking-tighter">
                    <span class="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    Hoạt động
                  </span>
                </Show>
              )}
            </Datatable.Column>

            {/* Column: Actions */}
            <Datatable.Column right fitContent>
              {(item) => (
                <Datatable.CellButtons>
                  {/* Impersonate — chỉ Admin/Agency */}
                  <Show when={!props.isTenantView}>
                    <Datatable.CellButton
                      icon={<Icon name="heroicons-outline:login" />}
                      label="Truy cập"
                      class="text-purple-600 bg-purple-50 hover:bg-purple-100"
                      onClick={() => handleImpersonate(item)}
                    />
                  </Show>

                  {/* Phân quyền — chỉ TENANT_STAFF */}
                  <Show when={shouldShowPermButton(item)}>
                    <Datatable.CellButton
                      icon={<Icon name="heroicons-outline:shield-check" />}
                      label="Phân quyền"
                      class="text-blue-600 bg-blue-50 hover:bg-blue-100"
                      onClick={() => setPermTarget(item)}
                    />
                  </Show>

                  {/* Cập nhật */}
                  <Show
                    when={!props.isTenantView || can(EPermission.STAFF_UPDATE)}
                  >
                    <Datatable.CellButtonUpdate item={item} />
                  </Show>

                  {/* Xóa */}
                  <Show when={canDelete(item)}>
                    <Datatable.CellButtonDelete
                      item={item}
                      itemName={item.fullname!}
                    />
                  </Show>
                </Datatable.CellButtons>
              )}
            </Datatable.Column>
          </Datatable.Table>

          {/* Pagination */}
          <Datatable.Pagination />

          {/* Form tạo / cập nhật account */}
          <Datatable.Formlog
            viewMode="modal"
            class="w-full max-w-[800px]"
            transformCreateInitialValues={() => ({
              tenantId: props.tenantId || undefined,
              isActivated: true,
            })}
            transformUpdateInitialValues={(item) => ({
              ...item,
              isActivated: !!item.isActivated,
            })}
          >
            {(item) => (
              <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
                {/* Block: thông tin đăng nhập */}
                <div class="col-span-full bg-blue-50/50 p-5 rounded-2xl border border-blue-100 grid grid-cols-12 gap-4">
                  <p class="col-span-full text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                    Tài khoản truy cập
                  </p>
                  <div class="col-span-6">
                    <Datatable.Field
                      name="username"
                      label="Tên đăng nhập"
                      required
                    >
                      <Input
                        readOnly={!!item}
                        placeholder="user_tenant"
                        class="bg-white"
                      />
                    </Datatable.Field>
                  </div>
                  <Show when={!item}>
                    <div class="col-span-6">
                      <Datatable.Field
                        name="password"
                        label="Mật khẩu ban đầu"
                        required
                      >
                        <InputPassword
                          placeholder="••••••••"
                          class="bg-white"
                        />
                      </Datatable.Field>
                    </div>
                  </Show>
                </div>

                {/* Block: thông tin nhân viên */}
                <div class="col-span-full grid grid-cols-2 gap-4">
                  <Datatable.Field
                    name="fullname"
                    label="Tên nhân viên"
                    required
                  >
                    <Input placeholder="Họ và tên" />
                  </Datatable.Field>
                  <Datatable.Field
                    name="email"
                    label="Email công việc"
                    required
                  >
                    <Input placeholder="email@company.com" />
                  </Datatable.Field>
                </div>

                {/* Block: vai trò + trạng thái */}
                <div class="col-span-8">
                  <Datatable.Field
                    name="roles"
                    label="Vai trò hệ thống"
                    required
                  >
                    <Select
                      multi
                      type="array"
                      options={[
                        {
                          value: String(ERole.TENANT_OWNER),
                          label: "Chủ sở hữu",
                        },
                        {
                          value: String(ERole.TENANT_MANAGER),
                          label: "Quản lý vận hành",
                        },
                        {
                          value: String(ERole.TENANT_STAFF),
                          label: "Nhân viên vận hành",
                        },
                      ]}
                    />
                  </Datatable.Field>
                </div>

                <div class="col-span-4">
                  <div
                    class="flex items-center justify-between bg-gray-50 p-3
                                                rounded-xl border border-gray-200 h-[42px] mt-6"
                  >
                    <span class="text-sm font-semibold text-gray-700">
                      Trạng thái
                    </span>
                    <Datatable.Field name="isActivated">
                      <Toggle />
                    </Datatable.Field>
                  </div>
                </div>
              </div>
            )}
          </Datatable.Formlog>
        </Datatable>
      </div>

      {/* ── Permission Modal ── */}
      <Show when={permTarget() !== null}>
        <PermissionModal
          tenantAccount={permTarget()!}
          onClose={() => setPermTarget(null)}
        />
      </Show>
    </>
  );
}
