import {
  $, fragment, query, mutation, GetOutput,
  TenantAccount,
  PaginationArgsInput,
  CreateTenantAccountInput,
  UpdateTenantAccountInput,
  LoginInput,
  ChangePasswordInput,
  ForgotPasswordInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';
import { GraphQL } from '@/core/api/graphql';


export type TenantAccountDTO = GetOutput<typeof TenantAccountService.fragment>;
export type TenantAccountPaginationCursor = PaginationCursor<TenantAccountDTO>
export class TenantAccountService extends CrudService {
  static apiName = 'tenantAccount' as const;
  static displayName = 'Tài khoản tổ chức';

  static fragment = fragment(TenantAccount, (i) => [
    i.fullname,
    i.username,
    i.email,
    i.phone,
    i.roles,
    i.isActivated,
    i.lastLoginAt,
    i.tenantId,
    i.tenant((t) => [t.id, t.name, t.code]),
    i.agencyId,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
    i.source,
    i.merchantId,
    i.merchant(m => [m.id, m.username, m.fullname]),
    i.tenant(t => [t.id, t.code, t.name]),
    i.agency(a => [a.id, a.code, a.name])
  ]);

  static loginTenantAccount = async (args: { data: LoginInput }) => {

    const res = await this.mutationApi({
      document: mutation("loginTenantAccount", (root) => [
        root.loginTenantAccount({ data: $('data') }, (n) => [n.tenantAccount(() => this.fragment), n.token]),
      ]),
      variables: args
    });
    return res.loginTenantAccount;
  };

  static generateTokenTenantAccount = async (args: { tenantAccountId: string }) => {
    const res = await this.queryApi({
      document: query("generateTokenTenantAccount", (root) => [
        root.generateTokenTenantAccount({ tenantAccountId: $('tenantAccountId') }, (n) => [n.tenantAccount(() => this.fragment), n.token]),
      ]),
      variables: args
    });
    return res.generateTokenTenantAccount;
  };

  static getMyTenantAccount = async () => {
    const res = await this.queryApi({
      document: query("getMyTenantAccount", (root) => [
        root.getMyTenantAccount(() => this.fragment),
      ]),

    });
    return res.getMyTenantAccount as TenantAccountDTO;
  };

  static getOneTenantAccount = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneTenantAccount", (root) => [
        root.getOneTenantAccount({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneTenantAccount as TenantAccountDTO;
  };

  static getAllTenantAccount = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllTenantAccount", (root) => [
        root.getAllTenantAccount({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllTenantAccount as TenantAccountPaginationCursor;
  };

  static tenantAccountGetMe = async (token?: string) => {
    const res = await this.queryApi({
      document: query("tenantAccountGetMe", (root) => [
        root.tenantAccountGetMe(() => this.fragment),
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
    return res.tenantAccountGetMe as TenantAccountDTO;
  };

  static createTenantAccount = async (args: { data: CreateTenantAccountInput }) => {
    const res = await this.mutationApi({
      document: mutation("createTenantAccount", (root) => [
        root.createTenantAccount({ data: $('data') }, () => this.fragment),
      ]),
      variables: args
    });
    return res.createTenantAccount as TenantAccountDTO;
  };

  static updateTenantAccount = async (args: { id: string, data: UpdateTenantAccountInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateTenantAccount", (root) => [
        root.updateTenantAccount({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateTenantAccount as TenantAccountDTO;
  };

  static deleteTenantAccount = async (id: string) => {
    const res = await this.mutationApi({
      document: mutation("deleteTenantAccount", (root) => [
        root.deleteTenantAccount({ id: $('id') }),
      ]),
      variables: { id },
    });
    return res.deleteTenantAccount;
  };

  static tenantAccountChangePassword = async (args: { input: ChangePasswordInput }) => {
    const res = await this.mutationApi({
      document: mutation("tenantAccountChangePassword", (root) => [
        root.tenantAccountChangePassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.tenantAccountChangePassword;
  };

  static tenantAccountForgotPassword = async (args: { input: ForgotPasswordInput }) => {
    const res = await this.mutationApi({
      document: mutation("tenantAccountForgotPassword", (root) => [
        root.tenantAccountForgotPassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.tenantAccountForgotPassword;
  };
}