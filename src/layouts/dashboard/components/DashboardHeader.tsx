import { useDashboard } from '../DashboardContext';
import { DashboardBreadcrumbs } from './DashboardBreadcrumbs';

import { Suspense } from 'solid-js';
import { Skeleton } from '@core/components/utilities/Skeleton';
import { DashboardAccount } from './DashboardAccount';
import { LocaleSwitcher } from '@/shared/components/LocaleSwitcher';
import { t } from '@/shared/i18n/t';

export function DashboardHeader() {
  const { typeName } = useDashboard();

  return (
    <header class="flex h-16 w-full items-center justify-between border-b border-lighter bg-white px-6 sticky top-0 z-20">
      <div class="flex items-center gap-4">
        <div class="flex-column">
          <h1 class="text-lg font-bold text-neutral-900 leading-tight">
            {t('layout.header.title', { typeName: typeName() })}
          </h1>
          <DashboardBreadcrumbs />
        </div>
      </div>

      <div class="flex items-center gap-4">
        <LocaleSwitcher />
        <Suspense fallback={<Skeleton.Circle class="h-10 w-10" />}>
          <DashboardAccount />
        </Suspense>
      </div>
    </header>
  );
}