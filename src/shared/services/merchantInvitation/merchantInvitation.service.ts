import { ERole } from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';
import { EInvitationStatus, EInvitationType } from '@/modules/merchant/merchant.constants';

// Backend "kept modules" hiện tại KHÔNG có module merchantInvitation (invite-code
// registration) — xem comment ở ddd-graphql-be merchant.resolver.ts:113-118, đã bị
// lược bỏ có chủ đích. generated typed-graphql.ts vì vậy không export type/mutation
// nào liên quan, không thể build query qua typed builder. Giữ nguyên shape DTO +
// method signature để UI (trang quản lý lời mời) vẫn biên dịch được; mọi method
// throw rõ ràng khi gọi thay vì sập lúc import.

export interface MerchantInvitationDTO {
  id: string;
  inviteCode: string;
  email?: string;
  merchantId?: string;
  type: EInvitationType;
  agencyId?: string;
  tenantId?: string;
  tenant?: { id: string; name: string; code: string };
  roles: ERole[];
  source?: string;
  status: EInvitationStatus;
  expiresAt?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  agency?: { id: string; code: string; name: string };
  merchant?: { id: string; fullname: string; email: string; phone?: string };
}
export type MerchantInvitationPaginationCursor = PaginationCursor<MerchantInvitationDTO>;

export interface CreateMerchantInvitationInput {
  email?: string;
  type: EInvitationType;
  tenantId?: string;
  roles?: ERole[];
  expiresInDays?: number;
  autoAccept?: boolean;
}
export type UpdateMerchantInvitationInput = Partial<CreateMerchantInvitationInput>;
export interface AssignMerchantToTenantInput {
  merchantId: string;
  tenantId: string;
  roles?: ERole[];
}
export interface InviteInput {
  inviteCode: string;
}

const NOT_SUPPORTED = 'MerchantInvitationService: backend hiện tại chưa có module merchantInvitation.';

export class MerchantInvitationService extends CrudService {
  static apiName = 'merchantInvitation' as const;
  static displayName = 'MerchantInvitation';

  static getOneMerchantInvitation = async (_args: { id: string }): Promise<MerchantInvitationDTO> => {
    throw new Error(NOT_SUPPORTED);
  };

  static getAllMerchantInvitation = async (_args: { input: any }): Promise<MerchantInvitationPaginationCursor> => {
    throw new Error(NOT_SUPPORTED);
  };

  static getAgencyInvitations = async (_args: { input: any }): Promise<MerchantInvitationPaginationCursor> => {
    throw new Error(NOT_SUPPORTED);
  };

  static getTenantInvitations = async (_args: { input: any }): Promise<MerchantInvitationPaginationCursor> => {
    throw new Error(NOT_SUPPORTED);
  };

  static getMyInvitations = async (_args: { input: any }): Promise<MerchantInvitationPaginationCursor> => {
    throw new Error(NOT_SUPPORTED);
  };

  static getInvitationByCode = async (_args: { inviteCode: string }): Promise<MerchantInvitationDTO> => {
    throw new Error(NOT_SUPPORTED);
  };

  static validateInviteCode = async (_args: { inviteCode: string }): Promise<MerchantInvitationDTO> => {
    throw new Error(NOT_SUPPORTED);
  };

  static createMerchantInvitation = async (_args: { input: CreateMerchantInvitationInput }): Promise<MerchantInvitationDTO> => {
    throw new Error(NOT_SUPPORTED);
  };

  /** Tenant DUYỆT một lời xin làm nhân sự (TENANT_JOIN_REQUEST). */
  static approveJoinRequest = async (_args: { id: string, roles?: ERole[] }) => {
    throw new Error(NOT_SUPPORTED);
  };

  /** Tenant TỪ CHỐI một lời xin làm nhân sự. */
  static rejectJoinRequest = async (_args: { id: string }) => {
    throw new Error(NOT_SUPPORTED);
  };

  static updateMerchantInvitation = async (_args: { id: string, input: UpdateMerchantInvitationInput }): Promise<MerchantInvitationDTO> => {
    throw new Error(NOT_SUPPORTED);
  };

  static acceptInvite = async (_args: { input: InviteInput }) => {
    throw new Error(NOT_SUPPORTED);
  };

  static rejectInvite = async (_args: { input: InviteInput }) => {
    throw new Error(NOT_SUPPORTED);
  };

  static revokeMerchantInvitation = async (_args: { id: string }) => {
    throw new Error(NOT_SUPPORTED);
  };

  static resendMerchantInvitation = async (_args: { id: string }) => {
    throw new Error(NOT_SUPPORTED);
  };

  static deleteMerchantInvitation = async (_args: { id: string }) => {
    throw new Error(NOT_SUPPORTED);
  };

  static assignMerchantToTenant = async (_args: { input: AssignMerchantToTenantInput }): Promise<MerchantInvitationDTO> => {
    throw new Error(NOT_SUPPORTED);
  };
}
