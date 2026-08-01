import { writeClipboard } from '@solid-primitives/clipboard';
import { Input } from '@core/components/control/Input';
import { InputPassword } from '@core/components/control/InputPasssword';
import { Select } from '@core/components/control/Select';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { toast } from '@core/components/toast/ToastProvider';
import { Avatar } from '@core/components/utilities/Avatar';
import { Card } from '@core/components/utilities/Card';;
import { formatDatetimeToNow } from '@core/helpers/date';
import { generatePassword } from '@core/helpers/util';
import { Icon } from '@shared/components/icons/Icon';
import { ERole, CreateAdminInput, UpdateAdminInput } from '@shared/generated/typed-graphql';
import { AdminDTO, AdminService } from '@/shared/services/admin/admin.service';
import { Show, For } from 'solid-js';
import { generateDatatable, PagingArgsInput } from '@/core/components/table/GeneratedDatatable';
import { Toggle } from '@/core/components/control/Toggle';


export function ManageAdminsPage() {
  const { Datatable } = generateDatatable<
    PagingArgsInput, AdminDTO, AdminDTO & { fullName: string }, AdminDTO, CreateAdminInput, UpdateAdminInput
  >({
    service: AdminService,
    paginatedQuery: AdminService.getAllAdmin,
    queryInput: { sort: { createdAt: 'DESC' } },
    loadMode: 'page',
    limit: 15,
    itemQuery: (item) => AdminService.getOneAdmin(item?.id!),
    createMutation: (data) => AdminService.createAdmin(data),
    updateMutation: (id, data) => AdminService.updateAdmin({ id, data }),
    deleteMutation: (item) => AdminService.deleteAdmin(item?.id!),
    transformItem: (item: AdminDTO) => ({
      ...item,
      fullName: `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'N/A',
    }),
  });

  return (
    <div class="space-y-6 animate-in">
      <Card class="border-none shadow-sm">
        <Datatable id="AdminMainDatatable" selectable={true}>
          <Datatable.Header class="mb-6">
            <Datatable.Title
              title="Quản trị viên"
              description="Quản lý danh sách nhân sự vận hành hệ thống AI Enterprise"
            />
            <Datatable.Buttons>
              <Datatable.ButtonRefresh />
              <Datatable.ButtonCreate label="Thêm nhân sự" />
            </Datatable.Buttons>
          </Datatable.Header>

          <Datatable.Toolbar class="bg-gray-50/50 p-4 rounded-xl mb-4 border border-gray-100">
            <Datatable.Search class="max-w-md" />
            <Datatable.Filter>
              <Datatable.FilterField name="isActivated">
                <Select
                  nullable clearable placeholder="Lọc trạng thái"
                  options={[
                    { value: true, label: 'Đang hoạt động' },
                    { value: false, label: 'Đã bị khóa' },
                  ]}
                />
              </Datatable.FilterField>
            </Datatable.Filter>
          </Datatable.Toolbar>

          <Datatable.Table>
            {/* Cột 1: Thông tin định danh (Quan trọng nhất) */}
            <Datatable.Column title="Người dùng" sortable="username" class="min-w-[250px]">
              {(item) => (
                <div class="flex items-center gap-3">
                  <Avatar text={item.fullName} class="bg-gray-100 text-gray-700 rounded-lg h-10 w-10 border border-gray-200" />
                  <div class="flex flex-col">
                    <span class="font-bold text-gray-900 leading-tight">{item.username}</span>
                    <span class="text-xs text-gray-500">{item.fullName}</span>
                  </div>
                </div>
              )}
            </Datatable.Column>

            {/* Cột 2: Email */}
            <Datatable.Column title="Email" class="hidden lg:table-cell">
              {(item) => <span class="text-sm font-medium text-gray-600">{item.email}</span>}
            </Datatable.Column>

            {/* Cột 3: Phân quyền */}
            <Datatable.Column title="Quyền hạn">
              {(item) => (
                <div class="flex flex-wrap gap-1">
                  <For each={item.roles}>
                    {(role) => (
                      <span class={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${role === ERole.SUPER_ADMIN
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                        {role?.replace('_', ' ')}
                      </span>
                    )}
                  </For>
                </div>
              )}
            </Datatable.Column>

            {/* Cột 4: Trạng thái (Center & Fit) */}
            <Datatable.Column title="Trạng thái" center fitContent>
              {(item) => (
                <Show
                  when={item.isActivated}
                  fallback={<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700">Đã khóa</span>}
                >
                  <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">Hoạt động</span>
                </Show>
              )}
            </Datatable.Column>

            {/* Cột 5: Đăng nhập cuối */}
            <Datatable.Column title="Truy cập cuối" class="text-gray-400">
              {(item) => (
                <span class="text-xs italic">
                  {item.lastLoginAt ? formatDatetimeToNow(item.lastLoginAt as any, { addSuffix: true }) : 'N/A'}
                </span>
              )}
            </Datatable.Column>

            {/* Cột 6: Thao tác */}
            <Datatable.Column right fitContent>
              {(item) => (
                <Datatable.CellButtons>
                  <Datatable.CellButton
                    icon={<Icon name="heroicons-outline:key" class="w-4 h-4" />}
                    onClick={async () => {
                      const result = await confirmAction().question(`Reset mật khẩu cho ${item.username}?`);
                      if (result) {
                        const newPass = generatePassword(12);
                        await toast().api(async () => {
                          await AdminService.updateAdmin({ id: item.id!, data: { password: newPass } });
                          await writeClipboard(newPass);
                        }, { successMessage: 'Đã copy mật khẩu mới!' });
                      }
                    }}
                  />
                  <Datatable.CellButtonUpdate item={item} />
                  <Datatable.CellButtonDelete item={item} itemName={item.username!} />
                </Datatable.CellButtons>
              )}
            </Datatable.Column>
          </Datatable.Table>

          <Datatable.Pagination class="border-t border-gray-100 p-4" />

          {/* Formlog Modal đã được căn chỉnh grid */}


          <Datatable.Formlog
            class='min-w-3xl'
            viewMode='modal'
            modalType='dialog'
            transformUpdateInitialValues={(item) => ({
              ...item,

              roles: (Array.isArray(item.roles) ? item.roles.map(r => r?.toString()) : []) as ERole[],
              isActivated: !!item.isActivated
            })}
          >
            {(item) => (
              /* ✅ PHẢI CÓ col-span-full ở đây */
              <div class="col-span-full grid grid-cols-12 gap-x-6 gap-y-8 p-8 ">

                {/* Khối 1: Thông tin định danh */}
                <div class="col-span-full bg-blue-50/50 p-6 rounded-2xl border border-blue-100 grid grid-cols-12 gap-5">
                  <p class="col-span-full text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-1">Thông tin truy cập</p>

                  <div classList={{ "col-span-12": !!item, "col-span-6": !item }}>
                    <Datatable.Field name="username" label="Tên tài khoản" required>
                      <Input readOnly={!!item} placeholder="nva_admin" class="bg-white" />
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

                {/* Khối 2: Thông tin cá nhân */}
                <div class="col-span-full grid grid-cols-12 gap-5">
                  <p class="col-span-full text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Thông tin cá nhân</p>

                  <div class="col-span-6">
                    <Datatable.Field name="firstName" label="Họ & tên đệm" required>
                      <Input placeholder="Nguyễn Văn" />
                    </Datatable.Field>
                  </div>
                  <div class="col-span-6">
                    <Datatable.Field name="lastName" label="Tên" required>
                      <Input placeholder="An" />
                    </Datatable.Field>
                  </div>
                  <div class="col-span-full">
                    <Datatable.Field name="email" label="Địa chỉ Email" required>
                      <Input placeholder="an.nguyen@company.com" />
                    </Datatable.Field>
                  </div>
                </div>

                {/* Khối 3: Quyền hạn & Trạng thái */}
                <div class="col-span-full border-t border-dashed border-gray-200 pt-8 grid grid-cols-12 gap-5 items-end">
                  <div class="col-span-8">
                    <Datatable.Field name="roles" label="Quyền hạn hệ thống" required>
                      <Select
                        multi
                        type="array"
                        options={[
                          { value: "ADMIN", label: 'Quản trị viên (Admin)' },
                          { value: "SUPER_ADMIN", label: 'Quản trị cấp cao (Super)' },
                        ]}
                      />
                    </Datatable.Field>
                  </div>
                  <div class="col-span-4">

                    <Datatable.Field name="isActivated" label="Kích hoạt">
                      <Toggle />
                    </Datatable.Field>

                  </div>
                </div>
              </div>
            )}
          </Datatable.Formlog>
        </Datatable>
      </Card>
    </div>
  );
}