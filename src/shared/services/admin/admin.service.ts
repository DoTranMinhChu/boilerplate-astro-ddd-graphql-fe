import {
  $, fragment, query, mutation, GetOutput,
  Admin,
  PaginationArgsInput,
  UpdateAdminInput,
  CreateAdminInput,
  LoginInput,
  ChangePasswordInput,
  ResetPasswordInput,
  ForgotPasswordInput,
  ForgotPasswordResetInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';
import { SearchableFieldOptions } from '@/core/services/base.service';
import { GraphQL } from '@/core/api/graphql';

export type AdminDTO = GetOutput<typeof AdminService.fragment>;
export type AdminPaginationCursor = PaginationCursor<AdminDTO>
export class AdminService extends CrudService {
  static apiName = 'admin' as const;
  static displayName = 'Admin';
  static searchableFields: SearchableFieldOptions = [
    { value: 'username', label: 'Người dùng', type: 'text' },
    { value: 'email', label: 'Email', type: 'text' },
  ];
  static fragment = fragment(Admin, (i) => [
    i.email,
    i.username,
    i.firstName,
    i.lastName,
    i.roles,
    i.isActivated,
    i.lastLoginAt,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);


  static getOneAdmin = async (id: string) => {
    const res = await this.queryApi({
      document: query("getOneAdmin", (root) => [
        root.getOneAdmin({ id: $('id') }, () => this.fragment),
      ]),
      variables: { id },
    });
    return res?.getOneAdmin
  };

  static getAllAdmin = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllAdmin", (root) => [
        root.getAllAdmin({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllAdmin as AdminPaginationCursor;
  };

  static adminGetMe = async (token?: string) => {
    const res = await this.queryApi({
      document: query("adminGetMe", (root) => [
        root.adminGetMe(() => this.fragment),
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
    return res.adminGetMe
  };


  static loginAdmin = async (args: { data: LoginInput }) => {
    const res = await this.mutationApi({
      document: mutation("loginAdmin", (root) => [
        root.loginAdmin({ data: $('data') }, (n) => [n.admin(() => this.fragment), n.token]),
      ]),
      variables: args,
    });
    return res.loginAdmin;
  };

  static updateAdmin = async (args: { id: string, data: UpdateAdminInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateAdmin", (root) => [
        root.updateAdmin({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateAdmin
  };

  static deleteAdmin = async (id: string) => {
    const res = await this.mutationApi({
      document: mutation("deleteAdmin", (root) => [
        root.deleteAdmin({ id: $('id') }),
      ]),
      variables: { id },
    });
    return res.deleteAdmin
  };

  static createAdmin = async (data: CreateAdminInput) => {
    const res = await this.mutationApi({
      document: mutation("createAdmin", (root) => [
        root.createAdmin({ data: $('data') }, () => this.fragment),
      ]),
      variables: { data },
    });
    return res.createAdmin
  };

  static adminChangePassword = async (args: { input: ChangePasswordInput }) => {
    const res = await this.mutationApi({
      document: mutation("adminChangePassword", (root) => [
        root.adminChangePassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.adminChangePassword;
  };

  static adminResetPassword = async (args: { input: ResetPasswordInput }) => {
    const res = await this.mutationApi({
      document: mutation("adminResetPassword", (root) => [
        root.adminResetPassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.adminResetPassword;
  };

  static adminResetMerchantPassword = async (args: { input: ResetPasswordInput }) => {
    const res = await this.mutationApi({
      document: mutation("adminResetMerchantPassword", (root) => [
        root.adminResetMerchantPassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.adminResetMerchantPassword;
  };

  static adminResetFarmerPassword = async (args: { input: ResetPasswordInput }) => {
    const res = await this.mutationApi({
      document: mutation("adminResetFarmerPassword", (root) => [
        root.adminResetFarmerPassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.adminResetFarmerPassword;
  };

  static adminForgotPassword = async (args: { input: ForgotPasswordInput }) => {
    const res = await this.mutationApi({
      document: mutation("adminForgotPassword", (root) => [
        root.adminForgotPassword({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.adminForgotPassword;
  };

  static adminResetPasswordByToken = async (args: { input: ForgotPasswordResetInput }) => {
    const res = await this.mutationApi({
      document: mutation("adminResetPasswordByToken", (root) => [
        root.adminResetPasswordByToken({ input: $('input') }),
      ]),
      variables: args,
    });
    return res.adminResetPasswordByToken;
  };
}