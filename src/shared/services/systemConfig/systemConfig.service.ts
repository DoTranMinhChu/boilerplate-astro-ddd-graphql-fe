import {
  $, fragment, query, mutation, GetOutput,
  SystemConfig,
  UpdateSystemConfigInput,
} from '@shared/generated/typed-graphql';
import { BaseService } from '@/core/services/base.service';

export type SystemConfigDTO = GetOutput<typeof SystemConfigService.fragment>;

export class SystemConfigService extends BaseService {
  static apiName = 'systemConfig' as const;

  static fragment = fragment(SystemConfig, (i) => [
    i.id,
    i.allowMerchantSelfRegister,
    i.allowAgencyCreateTenant,
    i.allowAgencyCreateTenantAccount,
    i.updatedAt,
  ]);

  static getSystemConfig = async () => {
    const res = await this.queryApi({
      document: query('getSystemConfig', (root) => [
        root.getSystemConfig(() => this.fragment),
      ]),
    });
    return res?.getSystemConfig;
  };

  static updateSystemConfig = async (data: UpdateSystemConfigInput) => {
    const res = await this.mutationApi({
      document: mutation('updateSystemConfig', (root) => [
        root.updateSystemConfig({ data: $('data') }, () => this.fragment),
      ]),
      variables: { data },
    });
    return res?.updateSystemConfig;
  };
}
