import { A } from '@solidjs/router';
import { createMemo, Show, Suspense } from 'solid-js';
import { useDashboard } from '../DashboardContext';
import { Img } from '@/core/components/utilities/Img';
import { Scrollbar } from '@/core/components/utilities/Scrollbar';
import { Skeleton } from '@/core/components/utilities/Skeleton';
import { mergeClass } from '@/core/helpers/class';
import { createScreen } from '@/core/helpers/screen';
import { PublicAsset } from '@/shared/helpers/assets';
import { Icon } from '@/shared/components/icons/Icon';
import { SidebarMenu, SidebarSubMenu } from '@/shared/common/app/SidebarMenus';
import { getBrandFaviconUrl, getBrandLogoUrl, useBrand } from '@/shared/contexts/brand/BrandContext';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { usePermission } from '@/shared/contexts/permission/PermissionContext';
import { EAccountType } from '@/shared/types/auth.type';
import { useFeature } from '@/shared/contexts/feature/FeatureContext';
import { useTenantRoles } from '@/shared/contexts/tenantRoles/TenantRolesContext';
import { ETenantBusinessRole } from '@/shared/generated/localEnums';


export function DashboardMainSidebar(_props: BaseProps) {
  const { sidebarMenus, accountType } = useDashboard();
  const { brand } = useBrand();
  const fullLogoUrl = createMemo(() => getBrandLogoUrl(brand()) || PublicAsset.logo);
  const iconLogoUrl = createMemo(() => getBrandFaviconUrl(brand()) || PublicAsset.logoIcon);
  const brandName = createMemo(() => brand()?.name || 'AgriBase');

  const { authAccount } = useAuth()
  // ── Lọc menu theo permission ──────────────────────────────────────────────
  // Chỉ TENANT cần filter — Admin/Agency giữ nguyên
  // Chưa load permissions → show hết (tránh sidebar nhảy)
  const filteredMenus = createMemo(() => {
    const menus = sidebarMenus() as SidebarMenu<string>[];

    if (accountType() !== EAccountType.TENANT) return menus;
    const { canAccessResource, isLoaded } = usePermission();
    const { hasFeature, isLoaded: featureLoaded } = useFeature();
    const { hasAnyRole, hasConfiguredRoles } = useTenantRoles();
    if (!isLoaded() || !featureLoaded()) return menus;

    // Gate theo vai trò nghiệp vụ (cấp tổ chức, áp dụng cho mọi tài khoản kể cả owner).
    // Chỉ gate khi tổ chức ĐÃ cấu hình vai trò — chưa cấu hình thì hiện hết.
    const passesRoleGate = (item: SidebarSubMenu<string>): boolean => {
      const req = item.requiredBusinessRole;
      if (!req || !hasConfiguredRoles()) return true;
      const list = (Array.isArray(req) ? req : [req]) as ETenantBusinessRole[];
      return hasAnyRole(...list);
    };

    return menus
      .map(group => ({
        ...group,
        subMenus: group.subMenus.filter(item => {
          if (item.requiredFeature && !hasFeature(item.requiredFeature)) return false;
          if (!passesRoleGate(item as SidebarSubMenu<string>)) return false;
          if (authAccount()?.roles.find(role => role.includes("OWNER") || role.includes("MANAGER") || role.includes("ADMIN"))) return true
          const required = (item as SidebarSubMenu<string> & { requiredResource?: string }).requiredResource;
          if (!required) return true;                    // luôn hiển thị
          return canAccessResource(required);
        }),
      }))
      .filter(group => group.subMenus.length > 0);           // ẩn group rỗng
  });

  const { fromXl } = createScreen();
  const baseMenuItemClass = `mb-1 flex cursor-pointer justify-center gap-2 rounded-sm p-2 xl:w-full xl:justify-start`;

  return (
    <div class="border-lighter flex-column sticky top-0 z-10 h-screen w-20 shrink-0 items-center border-r bg-white text-center shadow-lg xl:w-64 xl:items-start xl:text-left">
      <A href="/" class="px-3 py-2.5 xl:px-4 xl:py-3">
        {fromXl() ? (
          <Img
            src={fullLogoUrl()}
            alt={brandName()}
            contain
            freeform
            lazyload={false}
            class="h-12 w-full p-1"
          />
        ) : (
          <Img
            src={iconLogoUrl()}
            alt={brandName()}
            contain
            square
            lazyload={false}
            class="h-12 w-full p-1"
          />
        )}
      </A>
      <Scrollbar
        options={{
          overflow: {
            x: 'visible',
            y: 'scroll',
          },
        }}
        class="flex-column flex w-full flex-1 items-center p-2 xl:items-stretch xl:p-3"
      >
        <Suspense
          fallback={
            <>
              {Array.from([1, 2, 3]).map(() => (
                <Skeleton.Col class="mb-6">
                  <Skeleton.Block class="mb-1.5 h-6 w-12 xl:w-32" />
                  <Skeleton.Block class="mb-1 h-9 w-full" />
                  <Skeleton.Block class="mb-1 h-9 w-full" />
                  <Skeleton.Block class="mb-1 h-9 w-full" />
                </Skeleton.Col>
              ))}
            </>
          }
        >

          {filteredMenus().map((menu) => (
            <div
              class={`mb-2 w-16 xl:mb-4 xl:w-auto`}
            >
              <Show when={menu.title}>
                <div class="text-2xs text-neutral mb-1 inline-block max-w-full min-w-full truncate rounded-sm p-1 font-semibold uppercase xl:text-xs">
                  {menu.title}
                </div>
              </Show>
              {menu.subMenus.map((subMenu) => (
                <A
                  href={subMenu.href}
                  activeClass={mergeClass(
                    baseMenuItemClass,
                    `bg-main-100 text-main-600 hover:bg-main-200`,
                  )}
                  inactiveClass={mergeClass(
                    baseMenuItemClass,
                    `group hover:bg-main-50 hover:text-main`,
                  )}
                >
                  <Icon
                    tooltip={fromXl() ? '' : subMenu.title}
                    placement="right"
                    class={`flex-center h-6 w-6 text-xl`}
                    name={subMenu.icon}
                  />
                  <div class="hidden text-base font-medium xl:block">
                    {subMenu.title}
                  </div>
                </A>
              ))}
            </div>
          ))}
        </Suspense>
      </Scrollbar>
    </div>
  );
}
