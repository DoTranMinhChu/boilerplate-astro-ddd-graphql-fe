import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { useDashboard } from '../DashboardContext';
import { Dropdown } from '@core/components/disclosure/Dropdown';
import { Avatar } from '@core/components/utilities/Avatar';
import { Icon } from '@shared/components/icons/Icon';
import { Show, Switch, Match } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { EAccountType } from '@/shared/types/auth.type';

export function DashboardAccount() {
  let ref: HTMLDivElement;
  const { logout, isAdmin, isAgency, isTenant } = useAuth()!;
  const { displayName, currentAuthAccount, accountType } = useDashboard();
  const navigate = useNavigate();

  const getChangePasswordPath = () => {
    switch (accountType()) {
      case EAccountType.ADMIN: return '/admin/changePassword';
      case EAccountType.AGENCY: return '/agency/changePassword';
      case EAccountType.TENANT: return '/tenant/changePassword';
      case EAccountType.MERCHANT: return '/merchant/changePassword';
      default: return '/';
    }
  };

  return (
    <Show when={currentAuthAccount()}>
      <div
        ref={el => ref = el}
        class="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-1.5 hover:border-lighter hover:bg-neutral-50 transition-all"
      >
        <Avatar src="" text={displayName()} class="bg-main-600 text-white font-bold h-9 w-9 shadow-sm" />
        <div class="hidden md:flex flex-col">
          <span class="text-sm font-bold text-neutral-900 leading-none mb-1">{displayName()}</span>
          <div class="flex">
            <Switch>
              <Match when={isAdmin()}>
                <span class="bg-red-50 text-red-700 border-red-100 rounded text-[9px] px-1.5 font-black border uppercase">Hệ thống</span>
              </Match>
              <Match when={isAgency()}>
                <span class="bg-purple-50 text-purple-700 border-purple-100 rounded text-[9px] px-1.5 font-black border uppercase">Đối tác</span>
              </Match>
              <Match when={isTenant()}>
                <span class="bg-blue-50 text-blue-700 border-blue-100 rounded text-[9px] px-1.5 font-black border uppercase">Tổ chức</span>
              </Match>
            </Switch>
          </div>
        </div>
        <Icon name="heroicons-solid:chevron-down" class="text-neutral-400 text-xs" />
      </div>

      <Dropdown reference={ref!} placement="bottom-end" style={{ width: '200px' }}>
        <div class="p-1 flex flex-col gap-0.5">
          <div class="px-3 py-2 mb-1 border-b border-lighter">
            <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tài khoản</p>
            <p class="text-xs font-medium text-neutral-600 truncate">{currentAuthAccount()?.account.username}</p>
          </div>
          <Dropdown.Button
            label="Hồ sơ cá nhân"
            icon={<Icon name={'heroicons-outline:user-circle'} />}
            onClick={() => { }}
          />
          <Dropdown.Button
            label="Đổi mật khẩu"
            icon={<Icon name={'heroicons-outline:key'} />}
            onClick={() => navigate(getChangePasswordPath())}
          />
          <Dropdown.Button
            interactDanger
            label="Đăng xuất"
            icon={<Icon name={'tabler:logout'} />}
            onClick={() => logout(accountType() ?? undefined)}
          />
        </div>
      </Dropdown>
    </Show>
  );
}