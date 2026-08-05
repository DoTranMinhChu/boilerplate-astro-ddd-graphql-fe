// src/modules/merchant/merchant.constants.ts
//
// EInvitationStatus/EInvitationType định nghĩa LOCAL (không import từ
// @shared/generated/typed-graphql) — backend "kept modules" hiện tại đã lược bỏ
// module merchantInvitation gốc (xem comment trong merchant.resolver.ts), nên
// GraphQL schema thật không còn 2 enum này -> import từ generated sẽ vỡ lúc
// build (không có export đó). Giữ lại enum ở đây để các trang UI liên quan vẫn
// biên dịch được; các API gọi thật (MerchantInvitationService) sẽ báo lỗi rõ
// ràng khi gọi vì backend chưa hỗ trợ, thay vì làm sập toàn bộ app lúc import.

import { ERole } from "@/shared/generated/typed-graphql";

export enum EInvitationStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED',
    REVOKED = 'REVOKED',
}

export enum EInvitationType {
    AGENCY_MEMBER = 'AGENCY_MEMBER',
    AGENCY_TO_TENANT = 'AGENCY_TO_TENANT',
    TENANT_MEMBER = 'TENANT_MEMBER',
    TENANT_JOIN_REQUEST = 'TENANT_JOIN_REQUEST',
}

// ─── Invitation status display config ────────────────────────────────────────

export const INVITATION_STATUS_CONFIG: Record<
    EInvitationStatus,
    { label: string; bg: string; text: string; border: string; dot: string; icon: string }
> = {
    [EInvitationStatus.PENDING]: {
        label: 'Chờ xác nhận',
        bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400',
        icon: 'heroicons-outline:clock',
    },
    [EInvitationStatus.ACCEPTED]: {
        label: 'Đã chấp nhận',
        bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500',
        icon: 'heroicons-solid:check-circle',
    },
    [EInvitationStatus.REJECTED]: {
        label: 'Đã từ chối',
        bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500',
        icon: 'heroicons-solid:x-circle',
    },
    [EInvitationStatus.EXPIRED]: {
        label: 'Hết hạn',
        bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400',
        icon: 'heroicons-outline:ban',
    },
    [EInvitationStatus.REVOKED]: {
        label: 'Đã thu hồi',
        bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400',
        icon: 'heroicons-outline:minus-circle',
    },
};

// ─── Invitation type display config ──────────────────────────────────────────

export const INVITATION_TYPE_CONFIG: Record<
    EInvitationType,
    { label: string; color: string; bg: string; border: string; icon: string }
> = {
    [EInvitationType.AGENCY_MEMBER]: {
        label: 'Nhân viên Agency',
        color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100',
        icon: 'heroicons-outline:briefcase',
    },
    [EInvitationType.AGENCY_TO_TENANT]: {
        label: 'Cử xuống Tenant',
        color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100',
        icon: 'heroicons-outline:switch-vertical',
    },
    [EInvitationType.TENANT_MEMBER]: {
        label: 'Nhân viên (Đơn vị)',
        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100',
        icon: 'heroicons-outline:office-building',
    },
    [EInvitationType.TENANT_JOIN_REQUEST]: {
        label: 'Xin làm nhân sự',
        color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100',
        icon: 'heroicons-outline:hand-raised',
    },
};

// ─── Role labels ──────────────────────────────────────────────────────────────

export const ROLE_LABELS: Partial<Record<ERole, string>> = {
    [ERole.AGENCY_OWNER]: 'Chủ Agency',
    [ERole.AGENCY_MANAGER]: 'Quản lý Agency',
    [ERole.AGENCY_STAFF]: 'Nhân viên Agency',

    [ERole.TENANT_OWNER]: 'Chủ Tenant',
    [ERole.TENANT_MANAGER]: 'Quản lýTenant',

    [ERole.TENANT_STAFF]: 'Nhân viên (Đơn vị)',

};

export const AGENCY_ROLE_OPTIONS = [
    { label: 'Quản lý Agency', value: ERole.AGENCY_MANAGER },
    { label: 'Nhân viên Agency', value: ERole.AGENCY_STAFF },
];

export const TENANT_ROLE_OPTIONS = [
    { label: 'Quản lý Tenant', value: ERole.TENANT_MANAGER },
    { label: 'Nhân viên (Đơn vị)', value: ERole.TENANT_STAFF },
];

// Statuses mà FE cho phép gửi lại email
export const RESENDABLE_STATUSES: EInvitationStatus[] = [
    EInvitationStatus.PENDING,
    EInvitationStatus.EXPIRED,
];
