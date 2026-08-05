import { CrudService } from '../crud.service';

// Backend "kept modules" hiện tại KHÔNG có module tenantStaffSetting — generated
// typed-graphql.ts không export type/query/mutation nào liên quan, không thể build
// query qua typed builder. Giữ nguyên shape DTO để UI vẫn biên dịch được; method
// throw rõ ràng khi gọi thay vì sập lúc import.

export interface TenantStaffSettingDTO {
  id: string;
  tenantId: string;
  allowSelfRegistration: boolean;
  autoApproveJoinRequests: boolean;
  defaultRoles: string[];
  defaultPermissions: string[];
}

export interface PublicTenantStaffSettingDTO {
  tenantId: string;
  tenantName: string;
  allowSelfRegistration: boolean;
}

export type UpsertTenantStaffSettingInput = Partial<Omit<TenantStaffSettingDTO, 'id' | 'tenantId'>>;

const NOT_SUPPORTED = 'TenantStaffSettingService: backend hiện tại chưa có module tenantStaffSetting.';

/**
 * Cấu hình tự-đăng-ký & khởi tạo nhân sự của một Tenant:
 *  - allowSelfRegistration: cho phép nhân sự tự đăng ký ở trang login tenant
 *  - autoApproveJoinRequests: tự động duyệt lời xin làm nhân sự
 *  - defaultRoles / defaultPermissions: vai trò & quyền cấp lúc khởi tạo
 */
export class TenantStaffSettingService extends CrudService {
  static apiName = 'tenantStaffSetting' as const;
  static displayName = 'TenantStaffSetting';

  /** Cấu hình của Tenant đang đăng nhập (tự tạo bản ghi mặc định nếu chưa có). */
  static getMyTenantStaffSetting = async (): Promise<TenantStaffSettingDTO> => {
    throw new Error(NOT_SUPPORTED);
  };

  static upsertMyTenantStaffSetting = async (_args: { data: UpsertTenantStaffSettingInput }): Promise<TenantStaffSettingDTO> => {
    throw new Error(NOT_SUPPORTED);
  };

  /** Thông tin công khai cho trang login tenant (không cần đăng nhập). */
  static getPublicTenantStaffSetting = async (_args: { tenantCode: string }): Promise<PublicTenantStaffSettingDTO | null> => {
    throw new Error(NOT_SUPPORTED);
  };
}
