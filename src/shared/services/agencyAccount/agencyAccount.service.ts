import {
  $, fragment, query, mutation, GetOutput,
  AgencyAccount,
  PaginationArgsInput,
  CreateAgencyAccountInput,
  UpdateAgencyAccountInput,
  LoginInput,
  ChangePasswordInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';
import { MerchantService } from '../merchant/merchant.service';
import { GraphQL } from '@/core/api/graphql';

export type AgencyAccountDTO = GetOutput<typeof AgencyAccountService.fragment>;
export type AgencyAccountPaginationCursor = PaginationCursor<AgencyAccountDTO>
export class AgencyAccountService extends CrudService {
  static apiName = 'agencyAccount' as const;
  static displayName = 'Tài khoản đối tác';

  static fragment = fragment(AgencyAccount, (i) => [
    i.fullname,
    i.username,
    i.email,
    i.phone,
    i.roles,
    i.isActivated,
    i.lastLoginAt,
    i.agencyId,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
    i.roles,
    i.merchantId,
    i.merchant(_m => MerchantService.fragment),
    i.agency((a) => [a.code, a.id, a.name])
  ]);

  static getOneAgencyAccount = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneAgencyAccount", (root) => [
        root.getOneAgencyAccount({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneAgencyAccount as AgencyAccountDTO;
  };

  static getAllAgencyAccount = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllAgencyAccount", (root) => [
        root.getAllAgencyAccount({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllAgencyAccount as AgencyAccountPaginationCursor;
  };

  static generateTokenAgencyAccount = async (args: { agencyAccountId: string }) => {
    const res = await this.queryApi({
      document: query("generateTokenAgencyAccount", (root) => [
        root.generateTokenAgencyAccount({ agencyAccountId: $('agencyAccountId') }, (n) => [n.agencyAccount(() => this.fragment), n.token]),
      ]),
      variables: args
    });
    return res.generateTokenAgencyAccount;
  };

  static loginAgencyAccount = async (args: { data: LoginInput }) => {
    const res = await this.mutationApi({
      document: mutation("loginAgencyAccount", (root) => [
        root.loginAgencyAccount({ data: $('data') }, (n) => [n.agencyAccount(() => this.fragment), n.token]),
      ]),
      variables: args
    });
    return res.loginAgencyAccount;
  };

  static agencyAccountGetMe = async (token?: string) => {
    const res = await this.queryApi({
      document: query("agencyAccountGetMe", (root) => [
        root.agencyAccountGetMe(() => this.fragment),
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
    return res.agencyAccountGetMe as AgencyAccountDTO;
  };

  static createAgencyAccount = async (args: { data: CreateAgencyAccountInput }) => {
    const res = await this.mutationApi({
      document: mutation("createAgencyAccount", (root) => [
        root.createAgencyAccount({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createAgencyAccount as AgencyAccountDTO;
  };

  static updateAgencyAccount = async (args: { id: string, data: UpdateAgencyAccountInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateAgencyAccount", (root) => [
        root.updateAgencyAccount({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateAgencyAccount as AgencyAccountDTO;
  };

  static deleteAgencyAccount = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteAgencyAccount", (root) => [
        root.deleteAgencyAccount({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteAgencyAccount;
  };

  static agencyAccountChangePassword = async (args: { input: ChangePasswordInput }) => {
    const res = await this.mutationApi({
      document: mutation("agencyAccountChangePassword", (root) => [
        root.agencyAccountChangePassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.agencyAccountChangePassword;
  };
}