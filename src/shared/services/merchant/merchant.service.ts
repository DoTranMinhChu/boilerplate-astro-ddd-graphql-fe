import {
  $, fragment, query, mutation, GetOutput,
  Merchant,
  PaginationArgsInput,
  CreateMerchantInput,
  UpdateMerchantInput,
  MerchantLoginInput,
  RegisterMerchantInput,
  SwitchAgencyInput,
  SwitchTenantInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  ForgotPasswordResetInput
} from '@shared/generated/typed-graphql';

// registerByInvite/registerAndJoinTenant (+ input type) không tồn tại ở backend
// "kept modules" hiện tại (module merchantInvitation đã bị lược bỏ có chủ đích —
// xem merchant.resolver.ts backend) -> không thể build qua typed builder. Định
// nghĩa input tạm cục bộ để 2 method bên dưới vẫn biên dịch, throw rõ ràng khi gọi.
export interface RegisterByInviteInput { inviteCode: string; username: string; password: string; fullname?: string; phone?: string; }
export interface RegisterAndJoinTenantInput { tenantCode: string; username: string; password: string; fullname?: string; email?: string; phone?: string; }
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';
import { AgencyService } from '../agency/agency.service';
import { AgencyAccountDTO, AgencyAccountService } from '../agencyAccount/agencyAccount.service';
import { TenantService } from '../tenant/tenant.service';
import { TenantAccountDTO, TenantAccountService } from '../tenantAccount/tenantAccount.service';
import { GraphQL } from '@/core/api/graphql';

export type MerchantDTO = GetOutput<typeof MerchantService.fragment>;
export type MerchantPaginationCursor = PaginationCursor<MerchantDTO>;
export type MerchantAssignmentDTO = {
  agencies: AgencyAccountDTO[];
  tenants: TenantAccountDTO[];
}
export class MerchantService extends CrudService {
  static apiName = 'merchant' as const;
  static displayName = 'Merchant';

  static fragment = fragment(Merchant, (i) => [
    i.fullname,
    i.username,
    i.email,
    i.phone,
    i.isActivated,
    i.lastLoginAt,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);


  static getOneMerchant = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneMerchant", (root) => [
        root.getOneMerchant({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneMerchant as MerchantDTO;
  };

  static getAllMerchant = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllMerchant", (root) => [
        root.getAllMerchant({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllMerchant as MerchantPaginationCursor;
  };

  static merchantGetMe = async (token?: string) => {
    const res = await this.queryApi({
      document: query("merchantGetMe", (root) => [
        root.merchantGetMe(() => this.fragment),
      ]),

    }, {
      fetchOptions: {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...GraphQL.defaultHeaders,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
      },
    });
    return res.merchantGetMe as MerchantDTO;
  };

  static createMerchant = async (args: { data: CreateMerchantInput }) => {
    const res = await this.mutationApi({
      document: mutation("createMerchant", (root) => [
        root.createMerchant({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createMerchant as MerchantDTO;
  };

  static updateMerchant = async (args: { id: string, data: UpdateMerchantInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateMerchant", (root) => [
        root.updateMerchant({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateMerchant as MerchantDTO;
  };


  static myAssignments = async () => {
    const res = await this.queryApi({
      document: query("myAssignments", (root) => [
        root.myAssignments((i) => [i.agencies(_a => AgencyService.fragment), i.tenants(_t => TenantService.fragment)]),
      ])
    });
    return res.myAssignments;
  };




  static registerMerchant = async (args: { input: RegisterMerchantInput }) => {
    const res = await this.mutationApi({
      document: mutation("registerMerchant", (root) => [
        root.registerMerchant({ input: $('input') }, (i) => [i.merchant(_m => this.fragment), i.token]),
      ]),
      variables: args,
    });
    return res.registerMerchant;
  };

  static merchantLogin = async (args: { input: MerchantLoginInput }) => {
    const res = await this.mutationApi({
      document: mutation("merchantLogin", (root) => [
        root.merchantLogin({ input: $('input') }, (i) => [i.merchant(_m => this.fragment), i.token]),
      ]),
      variables: args,
    });
    return res.merchantLogin;
  };

  static registerByInvite = async (_args: { input: RegisterByInviteInput }): Promise<{ merchant: MerchantDTO; token: string }> => {
    throw new Error('MerchantService.registerByInvite: backend hiện tại chưa có module merchantInvitation.');
  };

  /**
   * Đăng ký tài khoản Merchant ngay tại trang login của một Tenant, đồng thời tự
   * gửi lời xin làm nhân sự cho Tenant đó (nếu Tenant có bật cho tự đăng ký).
   * joinStatus: APPROVED (auto-duyệt) | PENDING (chờ duyệt) | NOT_ALLOWED (chưa bật).
   */
  static registerAndJoinTenant = async (
    _args: { input: RegisterAndJoinTenantInput },
  ): Promise<{ merchant: MerchantDTO; token: string; joinStatus: string; joinMessage: string }> => {
    throw new Error('MerchantService.registerAndJoinTenant: backend hiện tại chưa có module merchantInvitation.');
  };

  static switchToAgency = async (args: { input: SwitchAgencyInput }) => {
    const res = await this.mutationApi({
      document: mutation("switchToAgency", (root) => [
        root.switchToAgency({ input: $('input') }, (i) => [i.agency(_a => AgencyService.fragment), i.agencyAccount(_a => AgencyAccountService.fragment), i.roles, i.token]),
      ]),
      variables: args,
    });
    return res.switchToAgency;
  };

  static switchToTenant = async (args: { input: SwitchTenantInput }) => {
    const res = await this.mutationApi({
      document: mutation("switchToTenant", (root) => [
        root.switchToTenant({ input: $('input') }, (i) => [i.agency(_a => AgencyService.fragment), i.tenant(_t => TenantService.fragment), i.roles, i.source, i.tenantAccount(_a => TenantAccountService.fragment), i.token]),
      ]),
      variables: args,
    });
    return res.switchToTenant;
  };
  static getMyAssignments = async () => {
    const res = await this.queryApi({
      document: query("myAssignments", (root) => [
        root.myAssignments((i) => [i.agencies(_a => AgencyAccountService.fragment), i.tenants(_t => TenantAccountService.fragment)]),
      ]),
    });
    return res.myAssignments as MerchantAssignmentDTO;
  };

  static merchantChangePassword = async (args: { input: ChangePasswordInput }) => {
    const res = await this.mutationApi({
      document: mutation("merchantChangePassword", (root) => [
        root.merchantChangePassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.merchantChangePassword;
  };

  static merchantForgotPassword = async (args: { input: ForgotPasswordInput }) => {
    const res = await this.mutationApi({
      document: mutation("merchantForgotPassword", (root) => [
        root.merchantForgotPassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.merchantForgotPassword;
  };

  static merchantResetPassword = async (args: { input: ForgotPasswordResetInput }) => {
    const res = await this.mutationApi({
      document: mutation("merchantResetPassword", (root) => [
        root.merchantResetPassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.merchantResetPassword;
  };

}