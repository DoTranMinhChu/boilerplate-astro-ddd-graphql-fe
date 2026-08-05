// src/shared/config/tenantBusinessRole.meta.ts
//
// Metadata cho từng vai trò nghiệp vụ của tổ chức (Tenant.businessRoles) — dùng cho
// trang "Vai trò tổ chức" và cho việc gate sidebar theo `requiredBusinessRole`
// (xem SidebarMenus.ts, DashboardMainSidebar.tsx, TenantRolesContext.tsx).
//
// Đây là ví dụ generic minh hoạ cơ chế multi-role tagging của một tổ chức trong hệ
// thống multi-tenant — thay bằng bộ vai trò thật của sản phẩm bạn.

import { ETenantBusinessRole } from '@/shared/generated/localEnums';

export interface ITenantBusinessRoleMeta {
    role: ETenantBusinessRole;
    label: string;
    /** Một câu mô tả tổ chức này làm gì */
    description: string;
    icon: string;
    /** Lớp màu Tailwind cho chip/thẻ */
    accent: string;
    /** Các việc tổ chức này thường làm (gợi ý onboarding) */
    responsibilities: string[];
}

export const TENANT_BUSINESS_ROLE_META: Record<ETenantBusinessRole, ITenantBusinessRoleMeta> = {
    [ETenantBusinessRole.PRIMARY]: {
        role: ETenantBusinessRole.PRIMARY,
        label: 'Tổ chức chính',
        description: 'Chủ sở hữu chính của dữ liệu — quản lý tài khoản, cấu hình và toàn bộ vòng đời nghiệp vụ.',
        icon: 'heroicons-outline:building-office',
        accent: 'bg-blue-50 text-blue-700 border-blue-200',
        responsibilities: [
            'Quản lý nhân sự và phân quyền nội bộ',
            'Cấu hình các tính năng đã đăng ký',
        ],
    },
    [ETenantBusinessRole.PARTNER]: {
        role: ETenantBusinessRole.PARTNER,
        label: 'Đối tác',
        description: 'Tổ chức hợp tác, có quyền truy cập giới hạn vào dữ liệu chia sẻ.',
        icon: 'heroicons-outline:user-group',
        accent: 'bg-green-50 text-green-700 border-green-200',
        responsibilities: ['Xem/khai thác dữ liệu được chia sẻ từ tổ chức chính'],
    },
    [ETenantBusinessRole.VENDOR]: {
        role: ETenantBusinessRole.VENDOR,
        label: 'Nhà cung cấp',
        description: 'Tổ chức cung cấp dịch vụ/sản phẩm cho tổ chức chính.',
        icon: 'heroicons-outline:truck',
        accent: 'bg-amber-50 text-amber-700 border-amber-200',
        responsibilities: ['Quản lý thông tin cung cấp và giao dịch liên quan'],
    },
};

/** Thứ tự hiển thị các vai trò trong UI. */
export const TENANT_BUSINESS_ROLE_ORDER: ETenantBusinessRole[] = [
    ETenantBusinessRole.PRIMARY,
    ETenantBusinessRole.PARTNER,
    ETenantBusinessRole.VENDOR,
];
