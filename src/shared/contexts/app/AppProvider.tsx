// src/shared/contexts/app/AppProvider.tsx
//
// QUAN TRỌNG: AppProvider CHỈ quản lý app state (mode, tenantId, tenantCode).
// KHÔNG can thiệp vào auth headers — đó là việc của AuthProvider.applyTokenForType().
// Việc có 2 nơi set headers (AppProvider + AuthProvider) gây ra race condition
// khiến token bị ghi đè sai khi mở nhiều tab với các account type khác nhau.

import { createSignal, batch } from 'solid-js';
import { AppContext, AppMode } from './AppContext';

interface AppProviderProps {
  children: any;
  initialTenantCode?: string;
}

export function AppProvider(props: AppProviderProps) {
  const [appMode, setAppMode] = createSignal<AppMode>('PUBLIC');
  const [tenantId, setTenantId] = createSignal('');
  const [tenantCode, setTenantCode] = createSignal(props.initialTenantCode || '');

  const switchMode = (mode: AppMode, context?: { id?: string; code?: string; accountId?: string }) => {
    batch(() => {
      setAppMode(mode);
      if (context?.id) setTenantId(context.id);
      if (context?.code) setTenantCode(context.code);
    });
  };

  return (
    <AppContext.Provider
      value={{
        appMode,
        tenantId,
        tenantCode,
        switchMode,
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
}