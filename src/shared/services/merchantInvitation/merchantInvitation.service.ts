import {
  $, fragment, query, mutation, GetOutput,
  MerchantInvitation,
  PaginationArgsInput,
  CreateMerchantInvitationInput,
  UpdateMerchantInvitationInput,
  AssignMerchantToTenantInput,
  InviteInput,
  ERole
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type MerchantInvitationDTO = GetOutput<typeof MerchantInvitationService.fragment>;
export type MerchantInvitationPaginationCursor = PaginationCursor<MerchantInvitationDTO>;

export class MerchantInvitationService extends CrudService {
  static apiName = 'merchantInvitation' as const;
  static displayName = 'MerchantInvitation';

  static fragment = fragment(MerchantInvitation, (i) => [
    i.inviteCode,
    i.email,
    i.merchantId,
    i.type,
    i.agencyId,
    i.tenantId,
    i.tenant((t) => [t.id, t.name, t.code]),
    i.roles,
    i.source,
    i.status,
    i.expiresAt,
    i.acceptedAt,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
    i.agency(a => [a.id, a.code, a.name]),
    i.tenant(t => [t.id, t.code, t.name]),
    i.merchant(m => [m.id, m.fullname, m.email, m.phone])
  ]);


  static getOneMerchantInvitation = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneMerchantInvitation", (root) => [
        root.getOneMerchantInvitation({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneMerchantInvitation as MerchantInvitationDTO;
  };

  static getAllMerchantInvitation = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllMerchantInvitation", (root) => [
        root.getAllMerchantInvitation({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllMerchantInvitation as MerchantInvitationPaginationCursor;
  };

  static getAgencyInvitations = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAgencyInvitations", (root) => [
        root.getAgencyInvitations({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAgencyInvitations as MerchantInvitationPaginationCursor;
  };

  static getTenantInvitations = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getTenantInvitations", (root) => [
        root.getTenantInvitations({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getTenantInvitations as MerchantInvitationPaginationCursor;
  };

  static getMyInvitations = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getMyInvitations", (root) => [
        root.getMyInvitations({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getMyInvitations as MerchantInvitationPaginationCursor;
  };

  static getInvitationByCode = async (args: { inviteCode: string }) => {
    const res = await this.queryApi({
      document: query("getInvitationByCode", (root) => [
        root.getInvitationByCode({ inviteCode: $('inviteCode') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getInvitationByCode as MerchantInvitationDTO;
  };

  static validateInviteCode = async (args: { inviteCode: string }) => {
    const res = await this.queryApi({
      document: query("validateInviteCode", (root) => [
        root.validateInviteCode({ inviteCode: $('inviteCode') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.validateInviteCode as MerchantInvitationDTO;
  };

  static createMerchantInvitation = async (args: { input: CreateMerchantInvitationInput }) => {
    const res = await this.mutationApi({
      document: mutation("createMerchantInvitation", (root) => [
        root.createMerchantInvitation({ input: $('input'), domain: $('domain') }, () => this.fragment),
      ]),
      // domain: để backend build đúng link đăng nhập/kích hoạt trong email (brand-aware white-label)
      variables: { ...args, domain: window.location.origin },
    });
    return res.createMerchantInvitation as MerchantInvitationDTO;
  };

  /** Tenant DUYỆT một lời xin làm nhân sự (TENANT_JOIN_REQUEST). roles optional → override vai trò mặc định. */
  static approveJoinRequest = async (args: { id: string, roles?: ERole[] }) => {
    const res = await this.mutationApi({
      document: mutation("approveJoinRequest", (root) => [
        root.approveJoinRequest({ id: $('id'), roles: $('roles') }, (n) => [n.message]),
      ]),
      // roles rỗng = dùng vai trò mặc định theo cấu hình tổ chức (BE bỏ qua khi length=0)
      variables: { id: args.id, roles: args.roles ?? [] },
    });
    return res.approveJoinRequest;
  };

  /** Tenant TỪ CHỐI một lời xin làm nhân sự. */
  static rejectJoinRequest = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("rejectJoinRequest", (root) => [
        root.rejectJoinRequest({ id: $('id') }, (n) => [n.message]),
      ]),
      variables: args,
    });
    return res.rejectJoinRequest;
  };

  static updateMerchantInvitation = async (args: { id: string, input: UpdateMerchantInvitationInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateMerchantInvitation", (root) => [
        root.updateMerchantInvitation({ id: $('id'), input: $('input') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateMerchantInvitation as MerchantInvitationDTO;
  };
  static acceptInvite = async (args: { input: InviteInput }) => {
    const res = await this.mutationApi({
      document: mutation("acceptInvite", (root) => [
        root.acceptInvite({ input: $('input') }, (n) => [n.message]),
      ]),
      variables: args,
    });
    return res.acceptInvite;
  };
  static rejectInvite = async (args: { input: InviteInput }) => {
    const res = await this.mutationApi({
      document: mutation("rejectInvite", (root) => [
        root.rejectInvite({ input: $('input') }, (n) => [n.message]),
      ]),
      variables: args,
    });
    return res.rejectInvite;
  };
  static revokeMerchantInvitation = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("revokeMerchantInvitation", (root) => [
        root.revokeMerchantInvitation({ id: $('id') }, (n) => [n.message]),
      ]),
      variables: args,
    });
    return res.revokeMerchantInvitation;
  };

  static resendMerchantInvitation = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("resendMerchantInvitation", (root) => [
        root.resendMerchantInvitation({ id: $('id'), domain: $('domain') }, (n) => [n.message]),
      ]),
      // domain: cần để backend build đúng link kích hoạt (giống forgot-password) —
      // lấy tự động từ trình duyệt, không cần các trang gọi phải tự truyền.
      variables: { ...args, domain: window.location.origin },
    });
    return res.resendMerchantInvitation;
  };

  static deleteMerchantInvitation = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteMerchantInvitation", (root) => [
        root.deleteMerchantInvitation({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteMerchantInvitation;
  };

  static assignMerchantToTenant = async (args: { input: AssignMerchantToTenantInput }) => {
    const res = await this.mutationApi({
      document: mutation("assignMerchantToTenant", (root) => [
        root.assignMerchantToTenant({ input: $('input') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.assignMerchantToTenant as MerchantInvitationDTO;
  };


}