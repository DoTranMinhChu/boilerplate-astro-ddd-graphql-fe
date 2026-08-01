import {
  $, fragment, query, mutation, GetOutput,
  EmailConfig,
  PaginationArgsInput,
  CreateEmailConfigInput,
  UpdateEmailConfigInput
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type EmailConfigDTO = GetOutput<typeof EmailConfigService.fragment>;
export type EmailConfigPaginationCursor = PaginationCursor<EmailConfigDTO>;

export class EmailConfigService extends CrudService {
  static apiName = 'emailConfig' as const;
  static displayName = 'Cấu hình Email';

  static fragment = fragment(EmailConfig, (i) => [
    i.id,
    i.name,
    i.domain,
    i.isDefault,
    i.isActive,
    i.smtpHost,
    i.smtpPort,
    i.smtpSecure,
    i.smtpUser,
    i.senderName,
    i.senderEmail,
    i.resetPasswordSubject,
    i.resetPasswordTemplate,
    i.createdAt,
    i.updatedAt,
  ]);

  static getOneEmailConfig = async (id: string) => {
    const res = await this.queryApi({
      document: query("getOneEmailConfig", (root) => [
        root.getOneEmailConfig({ id: $('id') }, () => this.fragment),
      ]),
      variables: { id },
    });
    return res?.getOneEmailConfig;
  };

  static getAllEmailConfig = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllEmailConfig", (root) => [
        root.getAllEmailConfig({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllEmailConfig as EmailConfigPaginationCursor;
  };

  static createEmailConfig = async (data: CreateEmailConfigInput) => {
    const res = await this.mutationApi({
      document: mutation("createEmailConfig", (root) => [
        root.createEmailConfig({ data: $('data') }, () => this.fragment),
      ]),
      variables: { data },
    });
    return res.createEmailConfig;
  };

  static updateEmailConfig = async (args: { id: string; data: UpdateEmailConfigInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateEmailConfig", (root) => [
        root.updateEmailConfig({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateEmailConfig;
  };

  static deleteEmailConfig = async (id: string) => {
    const res = await this.mutationApi({
      document: mutation("deleteEmailConfig", (root) => [
        root.deleteEmailConfig({ id: $('id') }),
      ]),
      variables: { id },
    });
    return res.deleteEmailConfig;
  };

  /** Gửi email thử nghiệm bằng cấu hình đã lưu. */
  static testEmailConfig = async (args: { id: string; to: string }) => {
    const res = await this.mutationApi({
      document: mutation("testEmailConfig", (root) => [
        root.testEmailConfig({ id: $('id'), to: $('to') }),
      ]),
      variables: args,
    });
    return res.testEmailConfig as unknown as { success: boolean; message: string };
  };
}
