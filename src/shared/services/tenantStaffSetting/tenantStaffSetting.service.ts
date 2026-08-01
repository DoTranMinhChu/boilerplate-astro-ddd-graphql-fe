import {
  $, fragment, query, mutation, GetOutput,
  TenantStaffSetting,
  PublicTenantStaffSetting,
  UpsertTenantStaffSettingInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';

export type TenantStaffSettingDTO = GetOutput<typeof TenantStaffSettingService.fragment>;
export type PublicTenantStaffSettingDTO = GetOutput<typeof TenantStaffSettingService.publicFragment>;

/**
 * Cấu hình tự-đăng-ký & khởi tạo nhân sự của một Tenant:
 *  - allowSelfRegistration: cho phép nhân sự tự đăng ký ở trang login tenant
 *  - autoApproveJoinRequests: tự động duyệt lời xin làm nhân sự
 *  - defaultRoles / defaultPermissions: vai trò & quyền cấp lúc khởi tạo
 */
export class TenantStaffSettingService extends CrudService {
  static apiName = 'tenantStaffSetting' as const;
  static displayName = 'TenantStaffSetting';

  static fragment = fragment(TenantStaffSetting, (i) => [
    i.id,
    i.tenantId,
    i.allowSelfRegistration,
    i.autoApproveJoinRequests,
    i.defaultRoles,
    i.defaultPermissions,
  ]);

  static publicFragment = fragment(PublicTenantStaffSetting, (i) => [
    i.tenantId,
    i.tenantName,
    i.allowSelfRegistration,
  ]);

  /** Cấu hình của Tenant đang đăng nhập (tự tạo bản ghi mặc định nếu chưa có). */
  static getMyTenantStaffSetting = async () => {
    const res = await this.queryApi(
      {
        document: query('getMyTenantStaffSetting', (root) => [
          root.getMyTenantStaffSetting(() => this.fragment),
        ]),
      },
      { requestPolicy: 'network-only' },
    );
    return res.getMyTenantStaffSetting as TenantStaffSettingDTO;
  };

  static upsertMyTenantStaffSetting = async (args: { data: UpsertTenantStaffSettingInput }) => {
    const res = await this.mutationApi({
      document: mutation('upsertMyTenantStaffSetting', (root) => [
        root.upsertMyTenantStaffSetting({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.upsertMyTenantStaffSetting as TenantStaffSettingDTO;
  };

  /** Thông tin công khai cho trang login tenant (không cần đăng nhập). */
  static getPublicTenantStaffSetting = async (args: { tenantCode: string }) => {
    const res = await this.queryApi(
      {
        document: query('getPublicTenantStaffSetting', (root) => [
          root.getPublicTenantStaffSetting({ tenantCode: $('tenantCode') }, () => this.publicFragment),
        ]),
        variables: args,
      },
      { requestPolicy: 'network-only' },
    );
    return res.getPublicTenantStaffSetting as PublicTenantStaffSettingDTO | null;
  };
}
