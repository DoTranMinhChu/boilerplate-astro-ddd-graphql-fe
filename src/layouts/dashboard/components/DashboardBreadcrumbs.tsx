
import { useLocation, A } from '@solidjs/router';
import { For, Show } from 'solid-js';
import { t } from '@/shared/i18n/t';

export function DashboardBreadcrumbs() {
  const location = useLocation();

  const pathMap: Record<string, string> = {
    home: t('layout.breadcrumbs.home'),
    admin: t('layout.breadcrumbs.admin'),
    agency: t('layout.breadcrumbs.agency'),
    agencies: t('layout.breadcrumbs.agencies'),
    tenant: t('layout.breadcrumbs.tenant'),
    tenants: t('layout.breadcrumbs.tenants'),
    users: t('layout.breadcrumbs.users'),
    customer: t('layout.breadcrumbs.customer'),
    brands: t('layout.breadcrumbs.brands'),
    appearance: t('layout.breadcrumbs.appearance'),
    merchant: t('layout.breadcrumbs.merchant'),
    memberShip: t('layout.breadcrumbs.memberShip'),
    invitation: t('layout.breadcrumbs.invitation'),
    inviteMerchant: t('layout.breadcrumbs.inviteMerchant'),
    staff: t('layout.breadcrumbs.staff'),
    'organization-roles': t('layout.breadcrumbs.organizationRoles'),
    stats: t('layout.breadcrumbs.stats'),
    profile: t('layout.breadcrumbs.profile'),
    unit: t('layout.breadcrumbs.unit'),
    codeConfig: t('layout.breadcrumbs.codeConfig'),
    emailConfig: t('layout.breadcrumbs.emailConfig'),
    systemConfig: t('layout.breadcrumbs.systemConfig'),
    'activity-log': t('layout.breadcrumbs.activityLog'),
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
