import {
  $, fragment, query, mutation, GetOutput,
  Tenant,
  PaginationArgsInput,
  CreateTenantInput,
  UpdateTenantInput,
  EFeature,
  ETenantBusinessRole,
  SetTenantBusinessRolesInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';
import { MediaService } from '../media/media.service';

export type TenantDTO = GetOutput<typeof TenantService.fragment>;
export type TenantPaginationCursor = PaginationCursor<TenantDTO>


export type FeatureOption = Option<EFeature>;

export const FEATURE_OPTIONS: FeatureOption[] = [
  {
    label: 'Tổng quan',
    value: EFeature.CORE,
    subText: 'Dashboard, thống kê',
    group: 'Hệ thống',
    color: 'neutral', // Màu trung tính cho hệ thống chung
  },
  {
    label: 'Người dùng & nhân sự',
    value: EFeature.USER,
    subText: 'Hồ sơ, quản lý nhân sự',
    group: 'Hệ thống',
    color: 'blue', // Màu xanh dương cho con người
  },
  {
    label: 'Vùng sản xuất',
    value: EFeature.FARM,
    subText: 'Vùng sản xuất, điểm sản xuất, thành viên',
    group: 'Nông nghiệp',
    color: 'green', // Màu xanh lá cho nông nghiệp
  },
  {
    label: 'Canh tác',
    value: EFeature.FARM_PROCESS,
    subText: 'Quy trình, nhật ký, vật tư, sâu bệnh',
    group: 'Nông nghiệp',
    color: 'lime', // Màu xanh chuối cho quy trình tăng trưởng
  },
  {
    label: 'Sản phẩm',
    value: EFeature.PRODUCT,
    subText: 'Nông sản / hàng hóa',
    group: 'Danh mục',
    color: 'orange', // Màu cam cho hàng hóa
  },
  {
    label: 'Đánh giá',
    value: EFeature.QUALITY,
    subText: 'Mẫu đánh giá, kết quả đánh giá',
    group: 'Chất lượng',
    color: 'cyan', // Màu xanh lơ cho đánh giá
  },
  {
    label: 'Kiểm nghiệm',
    value: EFeature.LAB,
    subText: 'Phòng LAB, mẫu kiểm nghiệm',
    group: 'Chất lượng',
    color: 'teal', // Màu xanh mòng két cho phòng LAB
  },
  {
    label: 'Nhà máy',
    value: EFeature.FACTORY,
    subText: 'Kho, lô hàng, vận chuyển, nhập/xuất',
    group: 'Nhà máy',
    color: 'purple', // Màu tím cho công nghiệp/nhà máy
  },
  {
    label: 'QR Truy xuất nguồn gốc',
    value: EFeature.TRACEABILITY,
    subText: 'QR, truy xuất lô hàng',
    group: 'Truy xuất',
    color: 'rose', // Màu đỏ hồng cho truy xuất/mã QR
  },
  {
    label: 'Đối tác',
    value: EFeature.PARTNER,
    subText: 'Quản lý đối tác',
    group: 'Hệ thống',
    color: 'indigo', // Màu xanh chàm cho đối tác bên ngoài
  },
  {
    label: 'Tài liệu & cấu hình',
    value: EFeature.DOCUMENT,
    subText: 'Trường dữ liệu, mẫu tài liệu',
    group: 'Hệ thống',
    color: 'slate', // Màu xám đá cho cấu hình/tài liệu
  },
];
export class TenantService extends CrudService {
  static apiName = 'tenant' as const;
  static displayName = 'tổ chức';

  static fragment = fragment(Tenant, (i) => [
    i.name,
    i.code,
    i.agencyId,
    i.logoMediaId,
    i.logoMedia(() => MediaService.shortFragment),
    i.website,
    i.contactEmail,
    i.taxCode,
    i.id,
    i.createdAt,
    i.updatedAt,
    i.deletedAt,
    i.subscribedFeatures,
    i.businessRoles,
    i.agency((i) => [i.id, i.code, i.name])
  ]);

  static getMyTenant = async () => {
    const res = await this.queryApi({
      document: query("getMyTenant", (root) => [
        root.getMyTenant(() => this.fragment),
      ]),

    });
    return res.getMyTenant as TenantDTO;
  };

  static getOneTenant = async (id: string) => {
    const res = await this.queryApi({
      document: query("getOneTenant", (root) => [
        root.getOneTenant({ id: $('id') }, () => this.fragment),
      ]),
      variables: { id },
    });
    return res.getOneTenant as TenantDTO;
  };

  static getAllTenant = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("getAllTenant", (root) => [
        root.getAllTenant({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.getAllTenant as TenantPaginationCursor;
  };

  static createTenant = async (data: CreateTenantInput) => {
    const res = await this.mutationApi({
      document: mutation("createTenant", (root) => [
        root.createTenant({ data: $('data') }, () => this.fragment),
      ]),
      variables: { data },
    });
    return res.createTenant as TenantDTO;
  };

  static updateTenant = async (args: { id: string, data: UpdateTenantInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateTenant", (root) => [
        root.updateTenant({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateTenant as TenantDTO;
  };

  static deleteTenant = async (id: string) => {
    const res = await this.mutationApi({
      document: mutation("deleteTenant", (root) => [
        root.deleteTenant({ id: $('id') }),
      ]),
      variables: { id },
    });
    return res.deleteTenant;
  };

  /** Đặt lại vai trò nghiệp vụ của tổ chức (đa vai). Server đồng bộ vai trò TXNG. */
  static setMyTenantBusinessRoles = async (roles: ETenantBusinessRole[]) => {
    const data: SetTenantBusinessRolesInput = { roles };
    const res = await this.mutationApi({
      document: mutation("setMyTenantBusinessRoles", (root) => [
        root.setMyTenantBusinessRoles({ data: $('data') }, () => this.fragment),
      ]),
      variables: { data },
    });
    return res.setMyTenantBusinessRoles as TenantDTO;
  };

  static farmerGetMyLinkedTenants = async (args: { input: PaginationArgsInput }) => {
    const res = await this.queryApi({
      document: query("farmerGetMyLinkedTenants", (root) => [
        root.farmerGetMyLinkedTenants({ input: $('input') }, (n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]),
      ]),
      variables: args,
    });
    return res.farmerGetMyLinkedTenants as TenantPaginationCursor;
  };
}