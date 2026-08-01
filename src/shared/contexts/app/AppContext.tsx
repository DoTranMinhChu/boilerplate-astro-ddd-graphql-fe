// src/shared/contexts/app/AppContext.ts
import { Accessor, createContext, useContext } from 'solid-js';
import { EAccountType } from '@/shared/types/auth.type';

export type AppMode = EAccountType | 'PUBLIC';

export const AppContext = createContext<{
  appMode: Accessor<AppMode>;
  tenantId: Accessor<string>;
  tenantCode: Accessor<string>;
  // Hàm chuyển đổi môi trường khi di chuyển giữa các Layout
  switchMode: (mode: AppMode, context?: { id?: string; accountId?: string; code?: string }) => void;
}>();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};