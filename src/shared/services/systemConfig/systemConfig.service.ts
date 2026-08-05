import { BaseService } from '@/core/services/base.service';

// Backend "kept modules" hiện tại KHÔNG có module systemConfig (không có
// entity/resolver trong ddd-graphql-be/src/modules) — generated typed-graphql.ts
// vì vậy không export type `SystemConfig`, không thể build query qua typed
// builder (builder validate theo đúng schema thật). Giữ interface + method rỗng
// để các trang UI liên quan (ManageSystemConfigPage) vẫn biên dịch được; throw
// rõ ràng khi thực sự gọi thay vì sập lúc import. Muốn dùng thật: build module
// systemConfig ở backend trước rồi chạy lại `npm run genservicegraph SystemConfig`.

export interface SystemConfigDTO {
  id: string;
  allowMerchantSelfRegister: boolean;
  allowAgencyCreateTenant: boolean;
  allowAgencyCreateTenantAccount: boolean;
  updatedAt: string;
}

export type UpdateSystemConfigInput = Partial<Omit<SystemConfigDTO, 'id' | 'updatedAt'>>;

export class SystemConfigService extends BaseService {
  static apiName = 'systemConfig' as const;

  static getSystemConfig = async (): Promise<SystemConfigDTO | undefined> => {
    throw new Error('SystemConfigService: backend hiện tại chưa có module systemConfig.');
  };

  static updateSystemConfig = async (_data: UpdateSystemConfigInput): Promise<SystemConfigDTO | undefined> => {
    throw new Error('SystemConfigService: backend hiện tại chưa có module systemConfig.');
  };
}
