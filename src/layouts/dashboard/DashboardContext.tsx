import { Accessor, createContext, useContext } from 'solid-js';

import { SidebarMenu } from '@/shared/common/app/SidebarMenus';
import { AuthAccountDTO, EAccountType } from '@/shared/types/auth.type';
import { RoutePathsOf } from '@/core/components/routes/Routes';
import { APP_ROUTES } from '@/shared/common/app/AppRoutes';

export const DashboardContext = createContext<{
  accountType: Accessor<EAccountType | null>;
  sidebarMenus: Accessor<SidebarMenu<RoutePathsOf<typeof APP_ROUTES>>[]>;
  typeName: Accessor<string>; // "Hệ thống", "Đối tác", "Tổ chức"
  displayName: Accessor<string>;
  currentAuthAccount: Accessor<AuthAccountDTO | null>


}>();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw Error('useDashboard must be used within a Role-based Layout');
  return context;
};
