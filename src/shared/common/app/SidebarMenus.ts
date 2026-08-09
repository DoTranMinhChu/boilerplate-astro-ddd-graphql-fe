// src/shared/common/app/SidebarMenus.ts

import { EAccountType } from '@/shared/types/auth.type';
import { IconVariant } from '@/shared/components/icons/iconVariants';
import { RoutePathsOf } from '@/core/components/routes/Routes';
import { APP_ROUTES } from './AppRoutes';
import { EFeature } from '@/shared/generated/typed-graphql';
import { ETenantBusinessRole } from '@/shared/generated/localEnums';

export type SidebarSubMenu<T extends string> = {
    title: string;
    href: T;
    icon: string | any;
    /**
     * camelCase resourceGroup từ PERMISSION_META.resourceGroup
     * - undefined → luôn hiển thị
     * - string    → ẩn nếu canAccessResource(requiredResource) = false
     */
    requiredResource?: string;
    requiredFeature?: EFeature;
    /**
     * Vai trò nghiệp vụ của tổ chức cần có để thấy mục này.
     * - undefined → không gate theo vai trò
     * - chỉ gate khi tổ chức ĐÃ cấu hình vai trò (businessRoles không rỗng);
     *   tổ chức chưa cấu hình → vẫn thấy hết (tránh ẩn nhầm).
     */
    requiredBusinessRole?: ETenantBusinessRole | ETenantBusinessRole[];
};

export type SidebarMenu<T extends string> = {
    title: string;
    subMenus: SidebarSubMenu<T>[];
};

// ─────────────────────────────────────────────────────────────────────────────
// TENANT sidebar
// ─────────────────────────────────────────────────────────────────────────────

export const TENANT_SIDEBAR_MENUS: SidebarMenu<
    RoutePathsOf<typeof APP_ROUTES, 'tenantDashboard'>
>[] = [
        {
            title: 'Tổng quan',
            subMenus: [
                {
                    title: 'Dashboard',
                    icon: 'heroicons-outline:home',
                    href: '/tenant/home',
                    requiredResource: 'dashboard',
                    requiredFeature: EFeature.CORE,
                },
            ],
        },
        {
            title: 'Quản trị',
            subMenus: [
                {
                    title: 'Hồ sơ cá nhân',
                    icon: IconVariant.stackFront,
                    href: '/tenant/profile',
                    requiredFeature: EFeature.USER_MANAGEMENT,
                },
                {
                    title: 'Nhân sự',
                    icon: IconVariant.usersGroup,
                    href: '/tenant/staff',
                    requiredResource: 'staff',
                    requiredFeature: EFeature.USER_MANAGEMENT,
                },
                {
                    title: 'Yêu cầu nhân sự',
                    icon: IconVariant.userPlus,
                    href: '/tenant/inviteMerchant',
                    requiredResource: 'staff',
                    requiredFeature: EFeature.USER_MANAGEMENT,
                },
                {
                    title: 'Vai trò tổ chức',
                    icon: IconVariant.adjustmentsHorizontal,
                    href: '/tenant/organization-roles',
                    requiredResource: 'staff',
                },
                {
                    title: 'Lịch sử hoạt động',
                    icon: 'heroicons-outline:clock',
                    href: '/tenant/activity-log',
                    requiredResource: 'activityLog',
                },
            ],
        },
        {
            title: 'Cài đặt',
            subMenus: [
                {
                    title: 'Đơn vị tính',
                    icon: IconVariant.adjustmentsHorizontal,
                    href: '/tenant/unit',
                    requiredResource: 'unit',
                },
                {
                    title: 'Cấu hình mã',
                    icon: IconVariant.adjustmentsHorizontal,
                    href: '/tenant/codeConfig',
                    requiredResource: 'codeConfig',
                },
            ],
        },
    ];

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN sidebar
// ─────────────────────────────────────────────────────────────────────────────

export const ADMIN_SIDEBAR_MENUS: SidebarMenu<
    RoutePathsOf<typeof APP_ROUTES, 'adminDashboard'>
>[] = [
        {
            title: 'Hệ thống',
            subMenus: [
                { title: 'Quản trị viên', href: '/admin/users', icon: IconVariant.admin },
                { title: 'Merchant', icon: IconVariant.userPlus, href: '/admin/merchant' },
                { title: 'Đối tác (Agency)', href: '/admin/agencies', icon: IconVariant.buildingSkyscraper },
                { title: 'Tổ chức (Tenant)', href: '/admin/tenants', icon: IconVariant.vendor },
            ],
        },
        {
            title: 'Thương hiệu',
            subMenus: [
                { title: 'Quản lý Brand', href: '/admin/brands', icon: 'heroicons-outline:globe-alt' },
            ],
        },
        {
            title: 'CMS',
            subMenus: [
                { title: 'Pages & Routes', href: '/admin/cms/pages', icon: 'heroicons-outline:document-text' },
                { title: 'Content Types', href: '/admin/cms/content-types', icon: 'heroicons-outline:squares-2x2' },
                { title: 'Danh mục & Thẻ', href: '/admin/cms/taxonomies', icon: 'heroicons-outline:tag' },
                { title: 'Redirects', href: '/admin/cms/redirects', icon: 'heroicons-outline:arrow-top-right-on-square' },
                { title: 'Bộ Header', href: '/admin/cms/header-presets', icon: 'heroicons-outline:bars-3' },
                { title: 'Bộ Footer', href: '/admin/cms/footer-presets', icon: 'heroicons-outline:view-columns' },
            ],
        },
        {
            title: 'Cài đặt',
            subMenus: [
                { title: 'Cấu hình hệ thống', href: '/admin/systemConfig', icon: 'heroicons-outline:cog' },
                { title: 'Cấu hình Email', href: '/admin/emailConfig', icon: 'heroicons-outline:envelope' },
            ],
        },
    ];

// ─────────────────────────────────────────────────────────────────────────────
// AGENCY sidebar
// ─────────────────────────────────────────────────────────────────────────────

export const AGENCY_SIDEBAR_MENUS: SidebarMenu<
    RoutePathsOf<typeof APP_ROUTES, 'agencyDashboard'>
>[] = [
        {
            title: 'Tổng quan',
            subMenus: [
                { title: 'Dashboard', icon: 'heroicons-outline:home', href: '/agency/home' },
            ],
        },
        {
            title: 'Quản trị',
            subMenus: [
                { title: 'Quản lý tổ chức', href: '/agency/tenants', icon: 'heroicons:building-office' },
            ],
        },
    ];

// ─────────────────────────────────────────────────────────────────────────────
// MERCHANT sidebar
// ─────────────────────────────────────────────────────────────────────────────

export const MERCHANT_SIDEBAR_MENUS: SidebarMenu<
    RoutePathsOf<typeof APP_ROUTES, 'merchantDashboard'>
>[] = [
        {
            title: 'Hệ thống',
            subMenus: [
                { title: 'Nơi làm việc', href: '/merchant/memberShip', icon: IconVariant.admin },
                { title: 'Lời mời', href: '/merchant/invitation', icon: IconVariant.buildingSkyscraper },
            ],
        },
    ];

// ─────────────────────────────────────────────────────────────────────────────

export const getSidebarMenus = (type?: EAccountType): SidebarMenu<string>[] => {
    switch (type) {
        case EAccountType.ADMIN: return ADMIN_SIDEBAR_MENUS;
        case EAccountType.AGENCY: return AGENCY_SIDEBAR_MENUS;
        case EAccountType.TENANT: return TENANT_SIDEBAR_MENUS;
        default: return [];
    }
};
