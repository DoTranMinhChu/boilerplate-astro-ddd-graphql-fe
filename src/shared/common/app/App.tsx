// src/app/App.tsx

import { loadIcons } from '@iconify-icon/solid';
import { setBaseConfig } from '@core/components/config/BaseConfig';
import { BaseIconVariant } from '@core/components/icon/baseIconVariant';
import { IconVariant } from '@shared/components/icons/iconVariants';
import { AppProvider } from '@shared/contexts/app/AppProvider';
import { onMount, createSignal, Show, Suspense } from 'solid-js';

import '@/styles/app.css';
import '@/styles/dashboard.css';
import 'leaflet/dist/leaflet.css';

import { eventConfig } from '../config/EventConfig';
import { iconConfig } from '../config/IconConfig';
import { mediaConfig } from '../config/MediaConfig';
import { textConfig } from '../config/TextConfig';
import { AppRoutes } from './AppRoutes';
import { ConfirmProvider } from '@/core/components/dialog/ConfirmProvider';
import { ModalProvider } from '@/core/components/modal/ModalProvider';
import { ToastProvider } from '@/core/components/toast/ToastProvider';
import { MetaProvider } from '@solidjs/meta';

interface AppProps {
  tenantCode?: string;
}

export function App(props: AppProps) {
  const [isClientReady, setIsClientReady] = createSignal(false);

  onMount(async () => {
    try {
      setBaseConfig({
        ...iconConfig,
        ...textConfig,
        ...mediaConfig,
        ...eventConfig,
      });

      loadIcons(
        Object.values({
          ...BaseIconVariant,
          ...IconVariant,
        }),
      );

      setTimeout(() => setIsClientReady(true), 10);
    } catch (error) {
      console.error('App initialization failed:', error);
      setIsClientReady(true);
    }
  });

  return (
    <Show
      when={isClientReady()}
      fallback={
        <div class="flex items-center justify-center min-h-screen bg-gray-50">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent" />
            <p class="text-gray-600 font-medium mt-4">Đang tải ứng dụng...</p>
          </div>
        </div>
      }
    >
      <MetaProvider>
        <AppProvider initialTenantCode={props.tenantCode}>
          <ModalProvider />
          <ConfirmProvider />
          <ToastProvider />
          <Suspense
            fallback={
              <div class="flex items-center justify-center min-h-screen bg-gray-50">
                <div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent" />
              </div>
            }
          >
            <AppRoutes />
          </Suspense>
        </AppProvider>
      </MetaProvider>
    </Show>
  );
}