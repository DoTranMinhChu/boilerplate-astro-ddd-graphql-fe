// Pre-warms `agencyAccount.service.ts` before anything else in this file gets a chance to import
// `merchant.service.ts` directly. These two service files import each other (a genuine circular
// dependency, pre-existing and unrelated to this task): `agencyAccount.service.ts`'s own static
// `fragment` field eagerly reads `MerchantService.fragment` at class-definition time. Whichever of
// the pair a fresh module graph reaches FIRST determines safety — entering via
// `agencyAccount.service.ts` resolves cleanly (verified), entering via `merchant.service.ts` first
// does not (the nested, still-initializing `agencyAccount.service.ts` reads `MerchantService`
// before `merchant.service.ts`'s own class body has run, throwing "Cannot read properties of
// undefined (reading 'fragment')").
//
// Before this task, ALL ~69 page/layout modules were statically imported above `RoutesProvider`
// (and thus above `AuthProvider`, which needs both services) in one synchronous block, so some
// earlier page's own import chain always warmed `agencyAccount.service.ts` first, by accident,
// before `AuthProvider` ever ran — this was never a problem in practice. Converting those ~69
// imports to `lazy()` removes that accidental safety net: the only static imports left in this
// file are `ResetPasswordPage`, which imports `MerchantService` directly (unsafe entry order) —
// exposing the pre-existing landmine as a hard crash on every single page load. This one-line,
// side-effect-only import restores the safe ordering without touching the two service files
// themselves (out of scope for this task) or re-introducing eager page imports.
import '@/shared/services/agencyAccount/agencyAccount.service';

import { lazy } from 'solid-js';
import { Route, Router } from '@solidjs/router';
import { Routes } from '@core/components/routes/Routes';
import { None } from '@core/components/utilities/None';

// ── Public / auth (kept static — tiny, already on the critical first-paint path) ─
import { ResetPasswordPage } from '@/modules/auth/resetPassword.page';
import { HomePage } from './HomePage';
import { RoutesProvider } from '@/shared/contexts/routes/RoutesProvider';

// ── Admin ─────────────────────────────────────────────────────────────────────
const AdminLayout = lazy(() => import('@/layouts/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const LoginAdminPage = lazy(() => import('@/modules/admin/pages/loginAdmin.page').then((m) => ({ default: m.LoginAdminPage })));
const ForgotPasswordAdminPage = lazy(() => import('@/modules/admin/pages/forgotPasswordAdmin.page').then((m) => ({ default: m.ForgotPasswordAdminPage })));
const DefaultAdminPage = lazy(() => import('@/modules/admin/pages/defaultAdmin.page').then((m) => ({ default: m.DefaultAdminPage })));
const ManageEmailConfigPage = lazy(() => import('@/modules/admin/pages/manageEmailConfig.page').then((m) => ({ default: m.ManageEmailConfigPage })));
const ManageSystemConfigPage = lazy(() => import('@/modules/admin/pages/manageSystemConfig.page').then((m) => ({ default: m.ManageSystemConfigPage })));
const ManageBrandsPage = lazy(() => import('@/modules/admin/pages/manageBrands.page').then((m) => ({ default: m.ManageBrandsPage })));
const ManageAdminsPage = lazy(() => import('@/modules/admin/pages/manageAdmins.page').then((m) => ({ default: m.ManageAdminsPage })));
const ChangePasswordAdminPage = lazy(() => import('@/modules/admin/pages/changePasswordAdmin.page').then((m) => ({ default: m.ChangePasswordAdminPage })));
const ManageAgenciesPage = lazy(() => import('@/modules/agency/pages/manageAgencies.page').then((m) => ({ default: m.ManageAgenciesPage })));
const ManageTenantsPage = lazy(() => import('@/modules/tenant/pages/manageTenants.page').then((m) => ({ default: m.ManageTenantsPage })));
const AgencyDetailPage = lazy(() => import('@/modules/agency/pages/agencyDetail.page').then((m) => ({ default: m.AgencyDetailPage })));
const TenantDetailPage = lazy(() => import('@/modules/tenant/pages/tenantDetail.page')); // the one default export
const ManageMerchantsPage = lazy(() => import('@/modules/merchant/pages/manageMerchants.page').then((m) => ({ default: m.ManageMerchantsPage })));
const ManageCmsPagesPage = lazy(() => import('@/modules/cms/admin/manageCmsPages.page').then((m) => ({ default: m.ManageCmsPagesPage })));
const ManageComponentsPage = lazy(() => import('@/modules/cms/admin/manageComponents.page').then((m) => ({ default: m.ManageComponentsPage })));
const ManageContentTypesPage = lazy(() => import('@/modules/cms/admin/manageContentTypes.page').then((m) => ({ default: m.ManageContentTypesPage })));
const ManageFormsPage = lazy(() => import('@/modules/cms/admin/manageForms.page').then((m) => ({ default: m.ManageFormsPage })));
const ManageTaxonomiesPage = lazy(() => import('@/modules/cms/admin/manageTaxonomies.page').then((m) => ({ default: m.ManageTaxonomiesPage })));
const ManageContentEntriesPage = lazy(() => import('@/modules/cms/admin/manageContentEntries.page').then((m) => ({ default: m.ManageContentEntriesPage })));
const ManageRedirectsPage = lazy(() => import('@/modules/cms/admin/manageRedirects.page').then((m) => ({ default: m.ManageRedirectsPage })));
const ManageHeaderPresetsPage = lazy(() => import('@/modules/cms/admin/manageHeaderPresets.page').then((m) => ({ default: m.ManageHeaderPresetsPage })));
const ManageFooterPresetsPage = lazy(() => import('@/modules/cms/admin/manageFooterPresets.page').then((m) => ({ default: m.ManageFooterPresetsPage })));
const ManageThemesPage = lazy(() => import('@/modules/cms/admin/manageThemes.page').then((m) => ({ default: m.ManageThemesPage })));
const ManageMenusPage = lazy(() => import('@/modules/cms/admin/manageMenus.page').then((m) => ({ default: m.ManageMenusPage })));
const ManageSiteLocaleSettingsPage = lazy(() => import('@/modules/cms/admin/manageSiteLocaleSettings.page').then((m) => ({ default: m.ManageSiteLocaleSettingsPage })));
const PreviewCmsPage = lazy(() => import('@/modules/cms/admin/previewCmsPage.page').then((m) => ({ default: m.PreviewCmsPage })));
const NodeBuilderPage = lazy(() => import('@/modules/cms/admin/nodeBuilder/NodeBuilder.page').then((m) => ({ default: m.NodeBuilderPage })));

// ── Tenant ────────────────────────────────────────────────────────────────────
const TenantLayout = lazy(() => import('@/layouts/tenant/TenantLayout').then((m) => ({ default: m.TenantLayout })));
const TenantDashboardPage = lazy(() => import('@/modules/tenant/pages/dashboard/dashboard.page').then((m) => ({ default: m.TenantDashboardPage })));
const LoginTenantPage = lazy(() => import('@/modules/tenant/pages/auth/login.page').then((m) => ({ default: m.LoginTenantPage })));
const ForgotPasswordTenantPage = lazy(() => import('@/modules/tenant/pages/auth/forgotPasswordTenant.page').then((m) => ({ default: m.ForgotPasswordTenantPage })));
const RegisterStaffPage = lazy(() => import('@/modules/tenant/pages/auth/registerStaff.page').then((m) => ({ default: m.RegisterStaffPage })));
const ChangePasswordTenantPage = lazy(() => import('@/modules/tenant/pages/auth/changePasswordTenant.page').then((m) => ({ default: m.ChangePasswordTenantPage })));
const TenantAccountPage = lazy(() => import('@/modules/tenant/pages/tenantAccount/tenantAccount.page').then((m) => ({ default: m.TenantAccountPage })));
const TenantAccountProfilePage = lazy(() => import('@/modules/tenant/pages/tenantAccount/tenantAccountProfile.page').then((m) => ({ default: m.TenantAccountProfilePage })));
const ManageTenantBusinessRolesPage = lazy(() => import('@/modules/tenant/pages/organization/manageTenantBusinessRoles.page').then((m) => ({ default: m.ManageTenantBusinessRolesPage })));
const ActivityLogPage = lazy(() => import('@/modules/tenant/pages/organization/activityLog.page').then((m) => ({ default: m.ActivityLogPage })));
const TenantInviteMerchantPage = lazy(() => import('@/modules/merchant/pages/tenantInviteMerchant.page').then((m) => ({ default: m.TenantInviteMerchantPage })));
const CodeConfigPage = lazy(() => import('@/modules/codeConfig/codeConfig.page').then((m) => ({ default: m.CodeConfigPage })));
const ManageUnitPage = lazy(() => import('@/modules/unit/manageUnit.page').then((m) => ({ default: m.ManageUnitPage })));

// ── Merchant ──────────────────────────────────────────────────────────────────
const LoginMerchantPage = lazy(() => import('@/modules/merchant/auth/loginMerchant.page').then((m) => ({ default: m.LoginMerchantPage })));
const MerchantLayout = lazy(() => import('@/layouts/merchant/merchantLayout').then((m) => ({ default: m.MerchantLayout })));
const RegisterByInvitePage = lazy(() => import('@/modules/merchant/auth/registerByInvite.page').then((m) => ({ default: m.RegisterByInvitePage })));
const RegisterMerchantPage = lazy(() => import('@/modules/merchant/auth/registerMerchant.page').then((m) => ({ default: m.RegisterMerchantPage })));
const ForgotPasswordMerchantPage = lazy(() => import('@/modules/merchant/auth/forgotPasswordMerchant.page').then((m) => ({ default: m.ForgotPasswordMerchantPage })));
const MerchantSelectContextPage = lazy(() => import('@/modules/merchant/auth/merchantSelectContext.page').then((m) => ({ default: m.MerchantSelectContextPage })));
const MerchantMembershipsPage = lazy(() => import('@/modules/merchant/pages/merchantMembershipsPage').then((m) => ({ default: m.MerchantMembershipsPage })));
const MerchantInvitationsPage = lazy(() => import('@/modules/merchant/pages/merchantInvitations.page').then((m) => ({ default: m.MerchantInvitationsPage })));
const ChangePasswordMerchantPage = lazy(() => import('@/modules/merchant/pages/changePasswordMerchant.page').then((m) => ({ default: m.ChangePasswordMerchantPage })));

// ── Agency ────────────────────────────────────────────────────────────────────
const AgencyLayout = lazy(() => import('@/layouts/agency/AgencyLayout').then((m) => ({ default: m.AgencyLayout })));
const LoginAgencyPage = lazy(() => import('@/modules/agency/pages/login.page').then((m) => ({ default: m.LoginAgencyPage })));
const ForgotPasswordAgencyPage = lazy(() => import('@/modules/agency/pages/forgotPasswordAgency.page').then((m) => ({ default: m.ForgotPasswordAgencyPage })));
const ChangePasswordAgencyPage = lazy(() => import('@/modules/agency/pages/changePasswordAgency.page').then((m) => ({ default: m.ChangePasswordAgencyPage })));

// ─────────────────────────────────────────────────────────────────────────────

export const APP_ROUTES = {

  // ── Admin ─────────────────────────────────────────────────────────────────────
  adminAuth: {
    layout: None,
    path: '/admin',
    routes: {
      login: { path: '/login', page: LoginAdminPage },
      forgotPassword: { path: '/forgotPassword', page: ForgotPasswordAdminPage },
    },
  },
  adminDashboard: {
    layout: AdminLayout,
    path: '/admin',
    routes: {
      default: { path: '/', page: DefaultAdminPage },
      users: { path: '/users', page: ManageAdminsPage },
      merchants: { path: '/merchant', page: ManageMerchantsPage },
      agencies: { path: '/agencies', page: ManageAgenciesPage },
      agencyDetail: { path: '/agencies/detail', page: AgencyDetailPage },
      tenants: { path: '/tenants', page: ManageTenantsPage },
      tenantDetail: { path: '/tenants/detail', page: TenantDetailPage },
      emailConfig: { path: '/emailConfig', page: ManageEmailConfigPage },
      systemConfig: { path: '/systemConfig', page: ManageSystemConfigPage },
      brands: { path: '/brands', page: ManageBrandsPage },
      changePassword: { path: '/changePassword', page: ChangePasswordAdminPage },
      cmsPages: { path: '/cms/pages', page: ManageCmsPagesPage },
      cmsComponents: { path: '/cms/components', page: ManageComponentsPage },
      cmsContentTypes: { path: '/cms/content-types', page: ManageContentTypesPage },
      cmsForms: { path: '/cms/forms', page: ManageFormsPage },
      cmsTaxonomies: { path: '/cms/taxonomies', page: ManageTaxonomiesPage },
      cmsContentEntries: { path: '/cms/content-entries', page: ManageContentEntriesPage },
      cmsRedirects: { path: '/cms/redirects', page: ManageRedirectsPage },
      cmsHeaderPresets: { path: '/cms/header-presets', page: ManageHeaderPresetsPage },
      cmsFooterPresets: { path: '/cms/footer-presets', page: ManageFooterPresetsPage },
      cmsThemes: { path: '/cms/themes', page: ManageThemesPage },
      cmsMenus: { path: '/cms/menus', page: ManageMenusPage },
      cmsSiteLocaleSettings: { path: '/cms/site-locale-settings', page: ManageSiteLocaleSettingsPage },
      cmsPreview: { path: '/cms/preview', page: PreviewCmsPage },
      cmsNodeBuilder: { path: '/cms/node-builder', page: NodeBuilderPage },
    },
  },

  // ── Tenant ────────────────────────────────────────────────────────────────────
  tenantAuth: {
    layout: None,
    path: '/tenant',
    routes: {
      login: { path: '/login', page: LoginTenantPage },
      register: { path: '/register', page: RegisterStaffPage },
      forgotPassword: { path: '/forgotPassword', page: ForgotPasswordTenantPage },
    },
  },
  tenantDashboard: {
    layout: TenantLayout,
    path: '/tenant',
    routes: {
      default: { path: '/', page: TenantAccountProfilePage },
      home: { path: '/home', page: TenantDashboardPage },
      staff: { path: '/staff', page: TenantAccountPage },
      profile: { path: '/profile', page: TenantAccountProfilePage },
      inviteMerchant: { path: '/inviteMerchant', page: TenantInviteMerchantPage },
      changePassword: { path: '/changePassword', page: ChangePasswordTenantPage },
      unit: { path: '/unit', page: ManageUnitPage },
      codeConfig: { path: '/codeConfig', page: CodeConfigPage },
      organizationRoles: { path: '/organization-roles', page: ManageTenantBusinessRolesPage },
      activityLog: { path: '/activity-log', page: ActivityLogPage },
    },
  },

  // ── Merchant ──────────────────────────────────────────────────────────────────
  merchantAuth: {
    layout: None,
    path: '/merchant',
    routes: {
      login: { path: '/login', page: LoginMerchantPage },
      register: { path: '/register', page: RegisterMerchantPage },
      registerByInvite: { path: '/registerByInvite', page: RegisterByInvitePage },
      forgotPassword: { path: '/forgotPassword', page: ForgotPasswordMerchantPage },
      selectContext: { path: '/selectContext', page: MerchantSelectContextPage },
    },
  },
  merchantDashboard: {
    layout: MerchantLayout,
    path: '/merchant',
    routes: {
      default: { path: '/', page: MerchantMembershipsPage },
      memberShip: { path: '/memberShip', page: MerchantMembershipsPage },
      invitation: { path: '/invitation', page: MerchantInvitationsPage },
      changePassword: { path: '/changePassword', page: ChangePasswordMerchantPage },
    },
  },

  // ── Agency ────────────────────────────────────────────────────────────────────
  agencyAuth: {
    layout: None,
    path: '/agency',
    routes: {
      login: { path: '/login', page: LoginAgencyPage },
      forgotPassword: { path: '/forgotPassword', page: ForgotPasswordAgencyPage },
    },
  },
  agencyDashboard: {
    layout: AgencyLayout,
    path: '/agency',
    routes: {
      default: { path: '/', page: TenantDashboardPage },
      home: { path: '/home', page: TenantDashboardPage },
      tenants: { path: '/tenants', page: ManageTenantsPage },
      tenantDetail: { path: '/tenants/detail', page: TenantDetailPage },
      changePassword: { path: '/changePassword', page: ChangePasswordAgencyPage },
    },
  },

  // ── Public ────────────────────────────────────────────────────────────────────
  default: {
    layout: None,
    path: '/',
    routes: {
      default: { path: '/', page: HomePage },
      resetPassword: { path: '/reset-password', page: ResetPasswordPage },
    },
  },

} as const satisfies Routes;

// ─────────────────────────────────────────────────────────────────────────────

export function AppRoutes() {
  return (
    <Router>
      <Route path="/" component={RoutesProvider}>
        {Object.values(APP_ROUTES).map(({ layout, path, routes }) => (
          <Route path={path || '/'} {...(layout ? { component: layout } : {})}>
            {Object.values(routes).map(({ path, page }) => (
              <Route path={path} component={page} />
            ))}
          </Route>
        ))}
      </Route>
    </Router>
  );
}
