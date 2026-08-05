import { Route, Router } from '@solidjs/router';
import { Routes } from '@core/components/routes/Routes';
import { None } from '@core/components/utilities/None';

// ── Admin ─────────────────────────────────────────────────────────────────────
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoginAdminPage } from '@/modules/admin/pages/loginAdmin.page';
import { ForgotPasswordAdminPage } from '@/modules/admin/pages/forgotPasswordAdmin.page';
import { DefaultAdminPage } from '@/modules/admin/pages/defaultAdmin.page';
import { ManageEmailConfigPage } from '@/modules/admin/pages/manageEmailConfig.page';
import { ManageSystemConfigPage } from '@/modules/admin/pages/manageSystemConfig.page';
import { ManageBrandsPage } from '@/modules/admin/pages/manageBrands.page';
import { ManageAdminsPage } from '@/modules/admin/pages/manageAdmins.page';
import { ChangePasswordAdminPage } from '@/modules/admin/pages/changePasswordAdmin.page';
import { ManageAgenciesPage } from '@/modules/agency/pages/manageAgencies.page';
import { ManageTenantsPage } from '@/modules/tenant/pages/manageTenants.page';
import { AgencyDetailPage } from '@/modules/agency/pages/agencyDetail.page';
import TenantDetailPage from '@/modules/tenant/pages/tenantDetail.page';
import { ManageMerchantsPage } from '@/modules/merchant/pages/manageMerchants.page';
import { ManageCmsPagesPage } from '@/modules/cms/admin/manageCmsPages.page';
import { ManageCmsSectionsPage } from '@/modules/cms/admin/manageCmsSections.page';
import { ManageContentTypesPage } from '@/modules/cms/admin/manageContentTypes.page';
import { ManageContentEntriesPage } from '@/modules/cms/admin/manageContentEntries.page';
import { ManageRedirectsPage } from '@/modules/cms/admin/manageRedirects.page';
import { PreviewCmsPage } from '@/modules/cms/admin/previewCmsPage.page';
import { PageBuilderPage } from '@/modules/cms/admin/builder/PageBuilder.page';

// ── Tenant ────────────────────────────────────────────────────────────────────
import { TenantLayout } from '@/layouts/tenant/TenantLayout';
import { TenantDashboardPage } from '@/modules/tenant/pages/dashboard/dashboard.page';
import { LoginTenantPage } from '@/modules/tenant/pages/auth/login.page';
import { RegisterStaffPage } from '@/modules/tenant/pages/auth/registerStaff.page';
import { ChangePasswordTenantPage } from '@/modules/tenant/pages/auth/changePasswordTenant.page';
import { TenantAccountPage } from '@/modules/tenant/pages/tenantAccount/tenantAccount.page';
import { TenantAccountProfilePage } from '@/modules/tenant/pages/tenantAccount/tenantAccountProfile.page';
import { ManageTenantBusinessRolesPage } from '@/modules/tenant/pages/organization/manageTenantBusinessRoles.page';
import { ActivityLogPage } from '@/modules/tenant/pages/organization/activityLog.page';
import { TenantInviteMerchantPage } from '@/modules/merchant/pages/tenantInviteMerchant.page';
import { CodeConfigPage } from '@/modules/codeConfig/codeConfig.page';
import { ManageUnitPage } from '@/modules/unit/manageUnit.page';

// ── Merchant ──────────────────────────────────────────────────────────────────
import { LoginMerchantPage } from '@/modules/merchant/auth/loginMerchant.page';
import { MerchantLayout } from '@/layouts/merchant/merchantLayout';
import { RegisterByInvitePage } from '@/modules/merchant/auth/registerByInvite.page';
import { RegisterMerchantPage } from '@/modules/merchant/auth/registerMerchant.page';
import { ForgotPasswordMerchantPage } from '@/modules/merchant/auth/forgotPasswordMerchant.page';
import { MerchantSelectContextPage } from '@/modules/merchant/auth/merchantSelectContext.page';
import { MerchantMembershipsPage } from '@/modules/merchant/pages/merchantMembershipsPage';
import { MerchantInvitationsPage } from '@/modules/merchant/pages/merchantInvitations.page';
import { ChangePasswordMerchantPage } from '@/modules/merchant/pages/changePasswordMerchant.page';

// ── Agency ────────────────────────────────────────────────────────────────────
import { AgencyLayout } from '@/layouts/agency/AgencyLayout';
import { LoginAgencyPage } from '@/modules/agency/pages/login.page';
import { ChangePasswordAgencyPage } from '@/modules/agency/pages/changePasswordAgency.page';

// ── Public / auth ─────────────────────────────────────────────────────────────
import { ResetPasswordPage } from '@/modules/auth/resetPassword.page';
import { HomePage } from './HomePage';
import { RoutesProvider } from '@/shared/contexts/routes/RoutesProvider';

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
      cmsSections: { path: '/cms/sections', page: ManageCmsSectionsPage },
      cmsContentTypes: { path: '/cms/content-types', page: ManageContentTypesPage },
      cmsContentEntries: { path: '/cms/content-entries', page: ManageContentEntriesPage },
      cmsRedirects: { path: '/cms/redirects', page: ManageRedirectsPage },
      cmsPreview: { path: '/cms/preview', page: PreviewCmsPage },
      cmsBuilder: { path: '/cms/builder', page: PageBuilderPage },
    },
  },

  // ── Tenant ────────────────────────────────────────────────────────────────────
  tenantAuth: {
    layout: None,
    path: '/tenant',
    routes: {
      login: { path: '/login', page: LoginTenantPage },
      register: { path: '/register', page: RegisterStaffPage },
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
