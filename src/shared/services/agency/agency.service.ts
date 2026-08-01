import {
  $, fragment, query, mutation, GetOutput,
  Agency,
  PaginationArgsInput,
  CreateAgencyInput,
  UpdateAgencyInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';
import { MediaService } from '../media/media.service';

export type AgencyDTO = GetOutput<typeof AgencyService.fragment>;
export type AgencyPaginationCursor = PaginationCursor<AgencyDTO>
export class AgencyService extends CrudService {
  static apiName = 'agency' as const;
  static displayName = 'Đối tác';

  static fragment = fragment(Agency, (i) => [
    i.name,
    i.code,
    i.logoMedia(() => MediaService.shortFragment),
    i.website,
    i.contactEmail,
    i.taxCode,
    i.isActivated,
    i.deploymentMode,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);


  static getOneAgency = async (id: string) => {
    const res = await this.queryApi({
      document: query("getOneAgency", (root) => [
        root.getOneAgency({ id: $('id') }, () => this.fragment),
      ]),
      variables: {
        id
      },
    });
    return res.getOneAgency as AgencyDTO;
  };

  static getAllAgency = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllAgency", (root) => [
        root.getAllAgency({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: { input: args.input ?? {} },
    });
    return res.getAllAgency as AgencyPaginationCursor;
  };

  static createAgency = async (data: CreateAgencyInput) => {
    const res = await this.mutationApi({
      document: mutation("createAgency", (root) => [
        root.createAgency({ data: $('data') }, () => this.fragment),
      ]),
      variables: { data },
    });
    return res.createAgency;
  };

  static updateAgency = async (args: { id: string, data: UpdateAgencyInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateAgency", (root) => [
        root.updateAgency({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateAgency;
  };

  static deleteAgency = async (id: string) => {
    const res = await this.mutationApi({
      document: mutation("deleteAgency", (root) => [
        root.deleteAgency({ id: $('id') }),
      ]),
      variables: { id },
    });
    return res.deleteAgency;
  };
}