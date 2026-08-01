import {
  $, fragment, query, mutation, GetOutput,
  Customer,
  PaginationArgsInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';
import { SearchableFieldOptions } from '@/core/services/base.service';

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



}