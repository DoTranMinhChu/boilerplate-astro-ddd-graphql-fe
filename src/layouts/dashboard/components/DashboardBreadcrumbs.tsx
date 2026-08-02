
import { useLocation, A } from '@solidjs/router';
import { For, Show } from 'solid-js';

export function DashboardBreadcrumbs() {
  const location = useLocation();

  const pathMap: Record<string, string> = {
    home: 'Trang chủ',
    admin: 'Hệ thống',
    agency: 'Đối tác',
    agencies: 'Đối tác',
    tenant: 'Tổ chức',
    tenants: 'Tổ chức',
    users: 'Tài khoản',
    customer: 'Khách hàng',
    brands: 'Thương hiệu',
    appearance: 'Giao diện và thương hiệu',
    merchant: 'Chuyên viên',
    memberShip: 'Tài khoản',
    invitation: 'Lời mời',
    inviteMerchant: 'Lời mời',
    staff: 'Nhân viên',
    'organization-roles': 'Vai trò tổ chức',
    stats: 'Thống kê',
    profile: 'Hồ sơ',
    unit: 'Đơn vị tính',
    codeConfig: 'Cấu hình mã',
    emailConfig: 'Cấu hình email',
    systemConfig: 'Cấu hình hệ thống',
    'activity-log': 'Nhật ký hoạt động',
  };

  const breadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => ({
      name: pathMap[path] || path,
      href: '/' + paths.slice(0, index + 1).join('/'),
      isLast: index === paths.length - 1
    }));
  };

  return (
    <nav class="flex text-[11px] font-medium text-neutral-400">
      <For each={breadcrumbs()}>
        {(crumb) => (
          <div class="flex items-center">
            <Show when={!crumb.isLast} fallback={<span class="text-main-600">{crumb.name}</span>}>
              <A href={crumb.href} class="hover:text-neutral-600 transition-colors">
                {crumb.name}
              </A>
              <span class="mx-1.5 text-neutral-300">/</span>
            </Show>
          </div>
        )}
      </For>
    </nav>
  );
}
