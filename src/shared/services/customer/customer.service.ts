import {
  $, fragment, query, mutation, GetOutput,
  Customer,
  PaginationArgsInput,
  RegisterCustomerInput,
  LoginCustomerInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';
import { SearchableFieldOptions } from '@/core/services/base.service';
import { GraphQL } from '@/core/api/graphql';

export type CustomerDTO = GetOutput<typeof CustomerService.fragment>;
export type CustomerPaginationCursor = PaginationCursor<CustomerDTO>;

export class CustomerService extends CrudService {
  static apiName = 'customer' as const;
  static displayName = 'Customer';
  static searchableFields: SearchableFieldOptions = [
    {
      label: "Tên khách hàng",
      type: "text",
      value: "name"
    },
    {
      label: "Số điện thoại",
      type: "phone",
      value: "phone"
    },
    {
      label: "Username",
      type: "text",
      value: "username"
    }
  ]
  static fragment = fragment(Customer, (i) => [
    i.fullname,
    i.email,
    i.phone,
    i.authProvider,
    i.isActivated,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);


  static getOneCustomer = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneCustomer", (root) => [
        root.getOneCustomer({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneCustomer as CustomerDTO;
  };

  static getAllCustomer = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllCustomer", (root) => [
        root.getAllCustomer({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllCustomer as CustomerPaginationCursor;
  };

  static deleteCustomer = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteCustomer", (root) => [
        root.deleteCustomer({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteCustomer;
  };

  // ── Auth Customer (Phase 4, mục 3) ─────────────────────────────────────────

  static registerCustomer = async (args: { data: RegisterCustomerInput }) => {
    const res = await this.mutationApi({
      document: mutation("registerCustomer", (root) => [
        root.registerCustomer({ data: $('data') }, (i) => [i.customer(_c => this.fragment), i.token]),
      ]),
      variables: args,
    });
    return res.registerCustomer;
  };

  static loginCustomer = async (args: { data: LoginCustomerInput }) => {
    const res = await this.mutationApi({
      document: mutation("loginCustomer", (root) => [
        root.loginCustomer({ data: $('data') }, (i) => [i.customer(_c => this.fragment), i.token]),
      ]),
      variables: args,
    });
    return res.loginCustomer;
  };

  static loginCustomerWithGoogle = async (args: { idToken: string }) => {
    const res = await this.mutationApi({
      document: mutation("loginCustomerWithGoogle", (root) => [
        root.loginCustomerWithGoogle({ idToken: $('idToken') }, (i) => [i.customer(_c => this.fragment), i.token]),
      ]),
      variables: args,
    });
    return res.loginCustomerWithGoogle;
  };

  static customerGetMe = async (token?: string) => {
    const res = await this.queryApi({
      document: query("customerGetMe", (root) => [
        root.customerGetMe(() => this.fragment),
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
    return res.customerGetMe as CustomerDTO;
  };

  // domain là required phía BE resolver (dùng build link reset password gửi email theo đúng
  // domain client gọi từ) dù schema generate ra optional — xem customer.resolver.ts.
  static requestCustomerPasswordReset = async (args: { email: string; domain: string }) => {
    const res = await this.mutationApi({
      document: mutation("requestCustomerPasswordReset", (root) => [
        root.requestCustomerPasswordReset({ email: $('email'), domain: $('domain') }),
      ]),
      variables: args,
    });
    return res.requestCustomerPasswordReset;
  };

  static resetCustomerPasswordByToken = async (args: { token: string; newPassword: string }) => {
    const res = await this.mutationApi({
      document: mutation("resetCustomerPasswordByToken", (root) => [
        root.resetCustomerPasswordByToken({ token: $('token'), newPassword: $('newPassword') }),
      ]),
      variables: args,
    });
    return res.resetCustomerPasswordByToken;
  };

}