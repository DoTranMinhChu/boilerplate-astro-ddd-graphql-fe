// src/shared/types/auth.type.ts

import { EAccountSource, ERole } from "../generated/typed-graphql";

export const RoleTypeOptions = [
    { value: "OWNER", label: 'Quản lý' },
    { value: "MANAGER", label: 'Vận hành' },
    { value: "STAFF", label: 'Nhân viên' },
]


export const TenantRoleOptions = [
    { value: ERole.TENANT_OWNER, label: 'Quản lý - Đơn vị' },
    { value: ERole.TENANT_MANAGER, label: 'Vận hành - Đơn vị' },
    { value: ERole.TENANT_STAFF, label: 'Nhân viên - Đơn vị' },
]


export const AgencyRoleOptions = [
    { value: ERole.AGENCY_OWNER, label: 'Quản lý - Tổ chức' },
    { value: ERole.AGENCY_MANAGER, label: 'Vận hành - Tổ chức' },
    { value: ERole.AGENCY_STAFF, label: 'Nhân viên - Tổ chức' },
]


export const AdminRoleOptions = [
    { value: ERole.ADMIN, label: 'Admin' },
    { value: ERole.SUPER_ADMIN, label: 'Super Admin' }
]

export const RoleOptions = [
    ...TenantRoleOptions, ...AgencyRoleOptions, ...AdminRoleOptions
]

export enum EAccountType {
    ADMIN = 'ADMIN',
    MERCHANT = 'MERCHANT',   // ← mới: identity-only, chưa vào context
    AGENCY = 'AGENCY',
    TENANT = 'TENANT',
    CUSTOMER = 'CUSTOMER',
    ANONYMOUS = 'ANONYMOUS',
}

export interface AuthAccountDTO {
    account: {
        id: string;
        username: string;
        name: string;
        type: EAccountType;
    };
    roles: ERole[];
    accountId?: string;
    agencyId?: string;
    tenantId?: string;
    // Merchant-specific
    merchantId?: string;
    source?: EAccountSource;   // AGENCY | TENANT (khi ở tenant context)
}


export interface AgencyAssignmentDTO {
    agency: { id: string; name: string; code: string; };
    roles: string[];
    isActivated: boolean;
}

export interface TenantAssignmentDTO {
    tenant: { id: string; name: string; code: string; };
    agencyId?: string;
    source: string;
    roles: string[];
    isActivated: boolean;
}