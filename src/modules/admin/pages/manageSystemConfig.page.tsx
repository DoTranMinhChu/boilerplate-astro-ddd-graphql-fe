import { createEffect, createSignal, For, onMount } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Icon } from '@shared/components/icons/Icon';
import { toast } from '@core/components/toast/ToastProvider';
import { SystemConfigService, SystemConfigDTO } from '@/shared/services/systemConfig/systemConfig.service';
import { clearSystemConfigCache, useSystemConfig } from '@/shared/contexts/systemConfig/SystemConfigContext';
import { Toggle } from '@core/components/control/Toggle';
import { Button } from '@core/components/button/Button';

interface FlagMeta {
  key: keyof Omit<SystemConfigDTO, 'id' | 'updatedAt'>;
  label: string;
  description: string;
  defaultWarning?: string;
}

const FLAG_GROUPS: Array<{
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  flags: FlagMeta[];
}> = [
  {
    title: 'Nông dân',
    subtitle: 'Quyền truy cập của người dùng trên Cổng Nông dân',
    icon: 'heroicons-outline:user',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    flags: [
      {
        key: 'allowFarmerSelfRegister',
        label: 'Nông dân tự đăng ký tài khoản',
        description: 'Cho phép nông dân vào trang đăng ký và tự tạo tài khoản. Khi tắt, trang đăng ký bị chặn và chuyển về trang đăng nhập.',
      },
      {
        key: 'allowFarmerCreateFarm',
        label: 'Nông dân tự thêm điểm sản xuất',
        description: 'Hiển thị nút "Thêm mới" trong phần Điểm sản xuất trên Cổng Nông dân. Khi tắt, nông dân chỉ xem danh sách, không thể tạo mới.',
      },
      {
        key: 'allowFarmerEditFarm',
        label: 'Nông dân chỉnh sửa điểm sản xuất',
        description: 'Cho phép nông dân cập nhật thông tin điểm sản xuất của mình. Khi tắt, thông tin chỉ được xem, không thể thay đổi.',
      },
      {
        key: 'allowFarmerCultivationLog',
        label: 'Nông dân nhập nhật ký canh tác',
        description: 'Hiển thị nút ghi nhật ký trong phần Điểm sản xuất và Nhật ký. Khi tắt, nông dân chỉ xem lịch sử, không thể ghi mới.',
      },
      {
        key: 'allowFarmerSelfUnlink',
        label: 'Nông dân chủ động hủy liên kết vùng trồng',
        description: 'Cho phép nông dân tự hủy liên kết với điểm sản xuất đang quản lý. Khi tắt, việc hủy liên kết phải do tổ chức thực hiện.',
        defaultWarning: 'Mặc định TẮT — chỉ bật khi thực sự cần thiết.',
      },
    ],
  },
  {
    title: 'Cổng Truy Xuất Nguồn Gốc Quốc Gia',
    subtitle: 'Quyền tự đăng ký Nhà Sản Xuất của Nông dân trên Cổng TXNG',
    icon: 'heroicons-outline:badge-check',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    flags: [
      {
        key: 'allowFarmerSelfRegisterNtProducer',
        label: 'Nông dân tự đăng ký Nhà Sản Xuất',
        description: 'Hiển thị nút "Tự đăng ký nhà sản xuất" trong Hồ sơ trên Cổng Nông dân (ZMA). Khi tắt, farmer chỉ được đăng ký thay mặt qua Tổ chức/Admin.',
        defaultWarning: 'Mặc định TẮT',
      },
      {
        key: 'requireAdminApprovalForNtProducerRegistration',
        label: 'Yêu cầu Admin duyệt nội bộ trước khi gửi Cổng Quốc Gia',
        description: 'Khi bật, hồ sơ farmer tự đăng ký sẽ chờ Admin xem xét (trang "Duyệt đăng ký NSX") trước khi hệ thống thật sự gửi lên Cổng Quốc Gia. Khi tắt, hồ sơ gửi thẳng lên Cổng Quốc Gia ngay khi farmer bấm gửi.',
      },
    ],
  },
  {
    title: 'Nhân sự',
    subtitle: 'Quyền truy cập của nhân sự làm việc trong tổ chức / đối tác',
    icon: 'heroicons-outline:briefcase',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    flags: [
      {
        key: 'allowMerchantSelfRegister',
        label: 'Nhân sự tự đăng ký tài khoản',
        description: 'Cho phép nhân sự tự tạo tài khoản qua trang đăng ký công khai. Khi tắt, tài khoản nhân sự chỉ được cấp qua lời mời từ đối tác.',
      },
    ],
  },
  {
    title: 'Đối tác',
    subtitle: 'Quyền quản trị của đối tác (Agency) đối với các tổ chức trực thuộc',
    icon: 'heroicons-outline:office-building',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    flags: [
      {
        key: 'allowAgencyCreateTenant',
        label: 'Đối tác tạo tổ chức (HTX) mới',
        description: 'Hiển thị nút "Thêm tổ chức" trong cổng Đối tác. Khi tắt, chỉ Quản trị viên cấp cao mới được phép tạo tổ chức mới.',
      },
      {
        key: 'allowAgencyCreateTenantAccount',
        label: 'Đối tác cấp tài khoản nhân viên cho tổ chức',
        description: 'Cho phép đối tác tạo tài khoản nhân viên bên trong các tổ chức trực thuộc. Khi tắt, tổ chức tự quản lý nhân sự nội bộ.',
      },
    ],
  },
];

export function ManageSystemConfigPage() {
  const { config, reload } = useSystemConfig();
  const [values, setValues] = createSignal<Record<string, boolean>>({});
  const [saving, setSaving] = createSignal(false);
  const [dirty, setDirty] = createSignal(false);

  // Reactive sync: mỗi khi config() thay đổi (từ cache hoặc API) thì tự cập nhật
  // values() — chỉ skip khi user đang có thay đổi chưa lưu (dirty)
  createEffect(() => {
    const cfg = config();
    if (!cfg || dirty()) return;
    const init: Record<string, boolean> = {};
    FLAG_GROUPS.forEach(g => g.flags.forEach(f => {
      init[f.key] = (cfg as any)[f.key] ?? true;
    }));
    setValues(init);
  });

  // Admin luôn force-refresh để không bao giờ thấy config cũ từ cache
  onMount(() => { reload(true); });

  const handleToggle = (key: string, val: boolean) => {
    setValues(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await SystemConfigService.updateSystemConfig(values() as any);
      clearSystemConfigCache();
      await reload(true);  // cập nhật config() → createEffect tự sync values()
      setDirty(false);     // dirty = false → createEffect chạy lại → values() đúng
      toast().success('Đã lưu cấu hình hệ thống');
    } catch (e: any) {
      toast().danger(e?.message ?? 'Có lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="space-y-6 animate-in max-w-3xl">

      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Cấu hình hệ thống</h1>
          <p class="text-sm text-gray-500 mt-1">
            Bật/tắt tính năng cho từng nhóm người dùng. Thay đổi có hiệu lực ngay sau khi lưu.
          </p>
        </div>
        <Button
          main
          label="Lưu thay đổi"
          loading={saving()}
          disabled={!dirty() || saving()}
          onClick={handleSave}
          class="shrink-0 h-10 px-5 rounded-xl font-semibold"
        />
      </div>

      <For each={FLAG_GROUPS}>
        {(group) => (
          <Card class="border border-gray-100 shadow-sm p-0 overflow-hidden">
            <div class={`flex items-center gap-3 px-5 py-4 ${group.bg} border-b ${group.border}`}>
              <div class={`w-9 h-9 rounded-xl flex items-center justify-center ${group.bg} border ${group.border}`}>
                <Icon name={group.icon} class={`w-5 h-5 ${group.color}`} />
              </div>
              <div>
                <p class={`text-sm font-bold ${group.color}`}>{group.title}</p>
                <p class="text-[11px] text-gray-400 mt-0.5">{group.subtitle}</p>
              </div>
            </div>

            <div class="divide-y divide-gray-50">
              <For each={group.flags}>
                {(flag) => (
                  <div class="flex items-start gap-4 px-5 py-4">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-semibold text-gray-800">{flag.label}</p>
                        {flag.defaultWarning && (
                          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Mặc định TẮT
                          </span>
                        )}
                      </div>
                      <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">{flag.description}</p>
                    </div>
                    <div class="shrink-0 mt-0.5">
                      <Toggle
                        value={values()[flag.key] ?? true}
                        onChange={(val) => handleToggle(flag.key, val)}
                      />
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Card>
        )}
      </For>

      {dirty() && (
        <div class="fixed bottom-6 right-6 z-50">
          <Button
            main
            label="Lưu thay đổi"
            loading={saving()}
            onClick={handleSave}
            class="h-11 px-6 rounded-xl font-bold shadow-lg shadow-blue-200"
          />
        </div>
      )}
    </div>
  );
}
