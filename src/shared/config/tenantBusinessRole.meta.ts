// src/shared/config/tenantBusinessRole.meta.ts
//
// Mô tả & hướng dẫn cho từng vai trò nghiệp vụ của tổ chức (Tenant).
// Dùng cho trang "Vai trò tổ chức" và component <RoleGuide />.
// (Song song với TENANT_BUSINESS_ROLE_META ở backend — FE không import được BE.)

import { ETenantBusinessRole, ENtTenantRole } from '@shared/generated/typed-graphql';

/**
 * Ánh xạ vai trò nghiệp vụ (app) → vai trò TXNG (gateway). Khớp với
 * TENANT_BUSINESS_ROLE_TO_NT_ROLE ở backend. Dùng để tra readiness TXNG theo vai trò.
 */
export const BUSINESS_ROLE_TO_NT_ROLE: Record<ETenantBusinessRole, ENtTenantRole> = {
    [ETenantBusinessRole.COOPERATIVE]: ENtTenantRole.PRODUCER,
    [ETenantBusinessRole.AGRIBUSINESS]: ENtTenantRole.BUSINESS,
    [ETenantBusinessRole.PACKING_FACILITY]: ENtTenantRole.PACKING_FACILITY,
    [ETenantBusinessRole.PROCESSING_FACTORY]: ENtTenantRole.FACTORY,
    [ETenantBusinessRole.WAREHOUSE_OPERATOR]: ENtTenantRole.WAREHOUSE,
    [ETenantBusinessRole.TRANSPORTER]: ENtTenantRole.TRANSPORTER,
};

export interface ITenantBusinessRoleMeta {
    role: ETenantBusinessRole;
    label: string;
    /** Một câu mô tả tổ chức này làm gì trong chuỗi truy xuất */
    description: string;
    icon: string;
    /** Lớp màu Tailwind cho chip/thẻ */
    accent: string;
    /** Các việc tổ chức này thường làm (gợi ý onboarding) */
    responsibilities: string[];
    /** Các bước trong chuỗi truy xuất quốc gia mà vai trò này phụ trách */
    txngSteps: string[];
}

export const TENANT_BUSINESS_ROLE_META: Record<ETenantBusinessRole, ITenantBusinessRoleMeta> = {
    [ETenantBusinessRole.COOPERATIVE]: {
        role: ETenantBusinessRole.COOPERATIVE,
        label: 'Hợp tác xã / Quản lý nông dân',
        description: 'Tổ chức quản lý nông dân và vùng trồng, ghi nhật ký canh tác và thu hoạch.',
        icon: 'heroicons-outline:user-group',
        accent: 'bg-green-50 text-green-700 border-green-200',
        responsibilities: [
            'Quản lý vùng sản xuất, điểm sản xuất và thành viên (nông dân)',
            'Ghi nhật ký canh tác và thu hoạch',
            'Đăng ký hồ sơ Nhà sản xuất để có mã vùng trồng',
        ],
        txngSteps: [
            'Đăng ký hồ sơ Nhà sản xuất (mã vùng trồng)',
            'Ghi & đồng bộ nhật ký canh tác',
            'Đồng bộ thu hoạch để liên kết với tem',
        ],
    },
    [ETenantBusinessRole.AGRIBUSINESS]: {
        role: ETenantBusinessRole.AGRIBUSINESS,
        label: 'Đơn vị kinh doanh nông sản',
        description: 'Doanh nghiệp thu mua, phân phối, xuất khẩu nông sản; sở hữu và kích hoạt tem.',
        icon: 'heroicons-outline:office-building',
        accent: 'bg-blue-50 text-blue-700 border-blue-200',
        responsibilities: [
            'Thu mua, bán hàng, quản lý lô và vận chuyển',
            'Đăng ký số lượng tem, nhận tem từ nhà in, bàn giao & kích hoạt tem',
            'Đăng ký hồ sơ Doanh nghiệp (mã số thuế)',
        ],
        txngSteps: [
            'Đăng ký hồ sơ Doanh nghiệp',
            'Đăng ký số lượng tem',
            'Nhận tem từ nhà in → Bàn giao cho nông hộ',
            'Kích hoạt tem',
        ],
    },
    [ETenantBusinessRole.PACKING_FACILITY]: {
        role: ETenantBusinessRole.PACKING_FACILITY,
        label: 'Cơ sở đóng gói',
        description: 'Đóng gói, phân loại và dán tem nông sản trước khi phân phối.',
        icon: 'heroicons-outline:archive',
        accent: 'bg-amber-50 text-amber-700 border-amber-200',
        responsibilities: [
            'Nhận nguyên liệu đầu vào theo nông hộ / QR',
            'Đóng gói và dán tem sản phẩm / tem đóng gói',
            'Đăng ký hồ sơ Cơ sở đóng gói (mã cơ sở in trên tem)',
        ],
        txngSteps: [
            'Đăng ký hồ sơ Cơ sở đóng gói',
            'Nhận tem bàn giao từ doanh nghiệp (305)',
            'Dán tem lên sản phẩm / kiện đóng gói',
        ],
    },
    [ETenantBusinessRole.PROCESSING_FACTORY]: {
        role: ETenantBusinessRole.PROCESSING_FACTORY,
        label: 'Nhà máy chế biến',
        description: 'Chuyển đổi nguyên liệu thô thành sản phẩm chế biến theo quy trình.',
        icon: 'heroicons-outline:cog',
        accent: 'bg-purple-50 text-purple-700 border-purple-200',
        responsibilities: [
            'Quản lý quy trình chế biến, lô đầu vào / đầu ra',
            'Quản lý nhà máy và kho',
        ],
        txngSteps: ['Quản lý lô chế biến', 'Đồng bộ thông tin chế biến vào chuỗi truy xuất'],
    },
    [ETenantBusinessRole.WAREHOUSE_OPERATOR]: {
        role: ETenantBusinessRole.WAREHOUSE_OPERATOR,
        label: 'Đơn vị vận hành kho',
        description: 'Lưu trữ, bảo quản và quản lý tồn kho nông sản.',
        icon: 'heroicons-outline:cube',
        accent: 'bg-slate-50 text-slate-700 border-slate-200',
        responsibilities: ['Quản lý kho và tồn kho', 'Theo dõi lô hàng nhập / xuất'],
        txngSteps: ['Theo dõi lô lưu kho trong chuỗi truy xuất'],
    },
    [ETenantBusinessRole.TRANSPORTER]: {
        role: ETenantBusinessRole.TRANSPORTER,
        label: 'Đơn vị vận chuyển',
        description: 'Vận chuyển nông sản giữa các điểm trong chuỗi cung ứng.',
        icon: 'heroicons-outline:truck',
        accent: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        responsibilities: ['Quản lý phương tiện, lệnh vận chuyển và nhật ký hành trình'],
        txngSteps: ['Ghi nhận hành trình vận chuyển (GPS checkpoint)', 'Đồng bộ vận chuyển vào chuỗi'],
    },
};

/** Thứ tự hiển thị các vai trò trong UI. */
export const TENANT_BUSINESS_ROLE_ORDER: ETenantBusinessRole[] = [
    ETenantBusinessRole.COOPERATIVE,
    ETenantBusinessRole.AGRIBUSINESS,
    ETenantBusinessRole.PACKING_FACILITY,
    ETenantBusinessRole.PROCESSING_FACTORY,
    ETenantBusinessRole.WAREHOUSE_OPERATOR,
    ETenantBusinessRole.TRANSPORTER,
];
