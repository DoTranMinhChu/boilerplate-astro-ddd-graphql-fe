// src/app/App.tsx

import { loadIcons } from '@iconify-icon/solid';
import { setBaseConfig } from '@core/components/config/BaseConfig';
import { BaseIconVariant } from '@core/components/icon/baseIconVariant';
import { IconVariant } from '@shared/components/icons/iconVariants';
import { AppProvider } from '@shared/contexts/app/AppProvider';
import { onMount, createSignal, Show, Suspense, ErrorBoundary } from 'solid-js';

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
          {/* Task 11 (perf/scale) converted all 54 route imports to lazy() — final whole-branch
              review Important I2: with no ErrorBoundary above the lazy route tree, a single
              failed chunk load (e.g. a stale chunk URL after a rolling deploy) re-throws during
              render and crashes the ENTIRE admin SPA with no recovery UI for a long-lived
              session. ErrorBoundary must sit OUTSIDE Suspense (same principle as
              NodeRenderer.tsx/Modal.tsx's own ErrorBoundary usage) — Suspense only pauses
              rendering for a pending promise, it does not catch thrown errors, so anything
              Suspense can't resolve still propagates up to the nearest ErrorBoundary ancestor.
              Fallback is a simple full-screen message + "Tải lại trang" (Reload) button — a
              fresh page load re-fetches the current chunk manifest, which is the actual fix for
              the stale-chunk case this guards against. */}
          <ErrorBoundary
            fallback={(err) => {
              console.error('[App] Lỗi khi tải route:', err);
              return (
                <div class="flex items-center justify-center min-h-screen bg-gray-50">
                  <div class="text-center">
                    <p class="text-gray-800 font-medium">Đã xảy ra lỗi khi tải trang.</p>
                    <p class="text-gray-500 text-sm mt-1">Vui lòng tải lại trang để tiếp tục.</p>
                    <button
                      type="button"
                      class="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                      onClick={() => window.location.reload()}
                    >
                      Tải lại trang
                    </button>
                  </div>
                </div>
              );
            }}
          >
            <Suspense
              fallback={
                <div class="flex items-center justify-center min-h-screen bg-gray-50">
                  <div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent" />
                </div>
              }
            >
              <AppRoutes />
            </Suspense>
          </ErrorBoundary>
        </AppProvider>
      </MetaProvider>
    </Show>
  );
}