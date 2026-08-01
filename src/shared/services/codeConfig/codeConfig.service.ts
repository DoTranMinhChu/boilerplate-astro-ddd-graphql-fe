import {
  $, fragment, query, mutation, GetOutput,
  CodeConfig,
  PaginationArgsInput,
  CreateCodeConfigInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';
import { GraphQL } from '@/core/api/graphql';

export type CodeConfigDTO = GetOutput<typeof CodeConfigService.fragment>;
export type CodeConfigPaginationCursor = PaginationCursor<CodeConfigDTO>;

export class CodeConfigService extends CrudService {
  static apiName = 'codeConfig' as const;
  static displayName = 'CodeConfig';

  static fragment = fragment(CodeConfig, (i) => [
    i.entityType,
    i.prefix,
    i.separator,
    i.includeYear,
    i.sequenceLength,
    i.currentSequence,
    i.customPattern,
    i.tenantId,
    i.tenant((t) => [t.id, t.name, t.code]),
    i.createdByTenantAccountId,
    i.agencyId,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
  ]);


  static getOneCodeConfig = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneCodeConfig", (root) => [
        root.getOneCodeConfig({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneCodeConfig as CodeConfigDTO;
  };

  static getAllCodeConfig = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllCodeConfig", (root) => [
        root.getAllCodeConfig({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllCodeConfig as CodeConfigPaginationCursor;
  };

  static getMyCodeConfigs = async () => {
    // Agency đang chọn tổ chức → đọc cấu hình mã CỦA tổ chức đó (gửi header acting-tenant).
    const res = await this.queryApi({
      document: query("getMyCodeConfigs", (root) => [
        root.getMyCodeConfigs(() => this.fragment),
      ]),
    }, GraphQL.actingTenantContext);
    return res.getMyCodeConfigs as CodeConfigDTO[];
  };

  static upsertCodeConfig = async (args: { data: CreateCodeConfigInput }) => {
    const res = await this.mutationApi({
      document: mutation("upsertCodeConfig", (root) => [
        root.upsertCodeConfig({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.upsertCodeConfig as CodeConfigDTO;
  };
}