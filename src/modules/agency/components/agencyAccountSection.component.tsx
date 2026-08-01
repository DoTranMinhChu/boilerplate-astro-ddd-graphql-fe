import { generateDatatable, PagingArgsInput } from '@/core/components/table/GeneratedDatatable';
import { AgencyAccountDTO, AgencyAccountService } from '@/shared/services/agencyAccount/agencyAccount.service';
import { Card } from '@core/components/utilities/Card';
import { Avatar } from '@core/components/utilities/Avatar';
import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { Select } from '@core/components/control/Select';
import { Toggle } from '@core/components/control/Toggle';
import { CreateAgencyAccountInput, UpdateAgencyAccountInput, ERole } from '@shared/generated/typed-graphql';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { EAccountType } from '@/shared/types/auth.type';
import { Show, For } from 'solid-js';

interface Props {
  agencyId: string;
}

const CREATE_AGENCY_ACCOUNT_FIELDS = new Set([
  'fullname',
  'agencyId',
  'username',
  'password',
  'email',
  'phone',
  'roles',
  'isActivated',
]);

const UPDATE_AGENCY_ACCOUNT_FIELDS = new Set([
  'fullname',
  'email',
  'phone',
  'roles',
  'isActivated',
  'avatarMediaId',
]);

function normalizeAgencyAccountData(data: Record<string, any>, mode: 'create' | 'update') {
  const allowedFields = mode === 'create' ? CREATE_AGENCY_ACCOUNT_FIELDS : UPDATE_AGENCY_ACCOUNT_FIELDS;
  const out = { ...data };
  Object.keys(out).forEach((key) => {
    if (!allowedFields.has(key)) delete out[key];
  });
  return out;
}

export function AgencyAccountSection(props: Props) {
  const { impersonateOpenTab } = useAuth();

  // ── Truy cập nhanh (impersonate) — Admin mở tab login Agency với token ────
  const handleImpersonate = async (acc: AgencyAccountDTO) => {
    const ok = await impersonateOpenTab(
      EAccountType.ADMIN,
      () => AgencyAccountService.generateTokenAgencyAccount({ agencyAccountId: acc.id! }),
      `${window.location.origin}/agency/login`,
    );
    if (ok) toast().success(`Đang chuyển hướng đến ${acc.fullname}...`);
    else toast().danger('Không lấy được token truy cập.');
  };

  const { Datatable } = generateDatatable<
    PagingArgsInput,
    AgencyAccountDTO,
    AgencyAccountDTO,
    AgencyAccountDTO,
    CreateAgencyAccountInput,
    UpdateAgencyAccountInput
  >({
    service: AgencyAccountService,
    paginatedQuery: (input) => AgencyAccountService.getAllAgencyAccount(input),
    itemQuery: (item) => AgencyAccountService.getOneAgencyAccount({ id: item?.id! }),
    createMutation: (data) => AgencyAccountService.createAgencyAccount({
      data: normalizeAgencyAccountData({ ...data, agencyId: props?.agencyId! }, 'create') as CreateAgencyAccountInput,
    }),
    updateMutation: (id, data) => AgencyAccountService.updateAgencyAccount({
      id,
      data: normalizeAgencyAccountData(data as any, 'update') as UpdateAgencyAccountInput,
    }),
    deleteMutation: (item) => AgencyAccountService.deleteAgencyAccount({ id: item?.id! }),
    queryInput: {
      sort: { createdAt: 'DESC' },
      get filter() { return { agencyId: { $eq: props.agencyId } }; }
    },

  });

  return (
    <Card class="mt-6 border-none shadow-sm">
      <Datatable id="AgencyDetailAccountTable">
        <Datatable.Header>
          <Datatable.Title title="Nhân sự đối tác" description="Tài khoản quản trị viên của Agency" />
          <Datatable.Buttons>
            <Datatable.ButtonRefresh />
            <Datatable.ButtonCreate label="Cấp tài khoản" />
          </Datatable.Buttons>
        </Datatable.Header>

        <Datatable.Toolbar>
          <Datatable.Search />
        </Datatable.Toolbar>

        <Datatable.Table>
          <Datatable.Column title="Nhân sự" sortable="fullname">
            {(item) => (
              <div class="flex items-center gap-3">
                <Avatar text={item.fullname || item.merchant?.fullname || ''} class="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-700 font-bold" />
                <div class="flex flex-col">
                  <span class="font-bold text-gray-900 leading-none">{item.fullname || item.merchant?.fullname || '(Chưa cập nhật tên)'}</span>
                  <span class="text-xs text-gray-400 mt-1">@{item.username || item.merchant?.username}</span>
                </div>
              </div>
            )}
          </Datatable.Column>

          <Datatable.Column title="Quyền hạn">
            {(item) => (
              <div class="flex flex-wrap gap-1">
                <For each={item.roles}>
                  {(role) => (
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                      {role?.replace('AGENCY_', '')}
                    </span>
                  )}
                </For>
              </div>
            )}
          </Datatable.Column>

          <Datatable.Column title="Trạng thái" center fitContent>
            {(item) => (
              <div class={`h-2 w-2 rounded-full ${item.isActivated ? 'bg-green-500' : 'bg-red-500'} ring-4 ring-opacity-20 ${item.isActivated ? 'ring-green-100' : 'ring-red-100'}`} />
            )}
          </Datatable.Column>

          <Datatable.Column right fitContent>
            {(item) => (
              <Datatable.CellButtons>
                <Datatable.CellButton
                  icon={<Icon name="heroicons-outline:login" />}
                  label="Truy cập"
                  class="text-purple-600 bg-purple-50 hover:bg-purple-100"
                  onClick={() => handleImpersonate(item)}
                />
                <Datatable.CellButtonUpdate item={item} />
                <Datatable.CellButtonDelete item={item} itemName={item.fullname!} />
              </Datatable.CellButtons>
            )}
          </Datatable.Column>
        </Datatable.Table>

        <Datatable.Pagination />

        <Datatable.Formlog
          viewMode='modal' class="w-full max-w-[800px]"
          transformUpdateInitialValues={(item) => ({
            ...item,

          })}

        >
          {(item) => (
            <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-6 p-8">
              <div class="col-span-full bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 grid grid-cols-12 gap-4">
                <p class="col-span-full text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Thông tin đăng nhập</p>
                <div class="col-span-6">
                  <Datatable.Field name="username" label="Username" required>
                    <Input readOnly={!!item} placeholder="nva_agency" class="bg-white" />
                  </Datatable.Field>
                </div>
                <Show when={!item}>
                  <div class="col-span-6">
                    <Datatable.Field name="password" label="Mật khẩu" required>
                      <InputPassword placeholder="••••••••" class="bg-white" />
                    </Datatable.Field>
                  </div>
                </Show>
              </div>

              <div class="col-span-7 grid grid-cols-1 gap-4">
                <Datatable.Field name="fullname" label="Họ và tên" required>
                  <Input placeholder="Nguyễn Văn A" />
                </Datatable.Field>
                <Datatable.Field name="email" label="Email">
                  <Input placeholder="email@agency.com" />
                </Datatable.Field>
              </div>

              <div class="col-span-5 grid grid-cols-1 gap-4">
                <Datatable.Field name="roles" label="Vai trò" required>
                  <Select
                    multi
                    options={[
                      { value: ERole.AGENCY_OWNER, label: 'Chủ sở hữu (Owner)' },
                      { value: ERole.AGENCY_MANAGER, label: 'Quản lý (Manager)' },
                    ]}
                  />
                </Datatable.Field>
                <div class="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200 h-[42px] mt-6">
                  <span class="text-sm font-semibold text-gray-700">Kích hoạt</span>
                  <Datatable.Field name="isActivated">
                    <Toggle />
                  </Datatable.Field>
                </div>
              </div>
            </div>
          )}
        </Datatable.Formlog>
      </Datatable>
    </Card >
  );
}
