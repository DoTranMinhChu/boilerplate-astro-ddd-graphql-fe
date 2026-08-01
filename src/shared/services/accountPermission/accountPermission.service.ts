// src/shared/services/accountPermission/accountPermission.service.ts

import {
  $,
  fragment,
  query,
  mutation,
  GetOutput,
  AccountPermissionSummary,
  AccountPermissionEntry,
  PermissionGroup,
  PermissionItem,
  PermissionItemMeta,
  ScopeRule,
  SetPermissionsInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export type AccountPermissionSummaryDTO = GetOutput<typeof AccountPermissionService.fragment>;
export type AccountPermissionEntryDTO = GetOutput<typeof AccountPermissionService.permissionEntryFragment>;
export type ScopeRuleDTO = GetOutput<typeof AccountPermissionService.scopeRuleFragment>;
export type PermissionGroupDTO = GetOutput<typeof AccountPermissionService.permissionGroupFragment>;
export type PermissionItemDTO = GetOutput<typeof AccountPermissionService.permissionItemFragment>;
export type AccountPermissionCursor = PaginationCursor<AccountPermissionSummaryDTO>;

// ─── Service ──────────────────────────────────────────────────────────────────

export class AccountPermissionService extends CrudService {
  static apiName = 'accountPermission' as const;
  static displayName = 'accountPermission';

  // ── scopeRuleFragment ────────────────────────────────────────────────────
  // ScopeRule có thể lồng nhau (rules[]: [ScopeRule]) nhưng GQL không hỗ trợ
  // recursive fragment. Lấy 2 cấp là đủ cho mọi case hiện tại:
  //   cấp 1: rule gốc (ALLOW_ALL / INCLUDE / EXCLUDE / SELF / OR / AND)
  //   cấp 2: rules[] bên trong OR / AND (chỉ là leaf rule, không lồng tiếp)

  static scopeRuleFragment = fragment(ScopeRule, (r) => [
    r.type,
    r.field,
    r.ids,
    // rules[] — cấp 2, chỉ lấy leaf fields (không lồng thêm)
    r.rules((sub) => [
      sub.type,
      sub.field,
      sub.ids,
    ]),
  ]);

  // ── permissionEntryFragment ───────────────────────────────────────────────
  // 1 permission entry: EPermission + ScopeRule

  static permissionEntryFragment = fragment(AccountPermissionEntry, (e) => [
    e.permission,
    e.scopeRule(() => AccountPermissionService.scopeRuleFragment),
  ]);

  // ── permissionItemMetaFragment ────────────────────────────────────────────
  // Metadata để FE build scope selector options trong PermRow

  static permissionItemMetaFragment = fragment(PermissionItemMeta, (m) => [
    m.byId,
    m.byParentField,
    m.byParentLabel,
    m.bySelf,
  ]);

  // ── permissionItemFragment ────────────────────────────────────────────────

  static permissionItemFragment = fragment(PermissionItem, (i) => [
    i.value,
    i.label,
    i.resourceGroup,
    i.meta(() => AccountPermissionService.permissionItemMetaFragment),
  ]);

  // ── permissionGroupFragment ───────────────────────────────────────────────

  static permissionGroupFragment = fragment(PermissionGroup, (g) => [
    g.key,
    g.label,
    g.description,
    g.permissions(() => AccountPermissionService.permissionItemFragment),
  ]);

  // ── fragment (AccountPermissionSummary) ───────────────────────────────────

  static fragment = fragment(AccountPermissionSummary, (s) => [
    s.tenantAccountId,
    s.permissions(() => AccountPermissionService.permissionEntryFragment),
  ]);

  // ── API methods ───────────────────────────────────────────────────────────

  /**
   * Lấy permissions của user hiện tại.
   * Gọi ngay sau login → lưu vào PermissionContext.
   */
  static getMyPermissions = async (): Promise<AccountPermissionSummaryDTO> => {
    const res = await this.queryApi({
      document: query('getMyPermissions', (root) => [
        root.getMyPermissions(() => AccountPermissionService.fragment),
      ]),
    });
    return res.getMyPermissions as AccountPermissionSummaryDTO;
  };

  /**
   * Lấy permissions của 1 account cụ thể.
   * Dùng trong PermissionModal khi load quyền hiện tại của nhân viên.
   */
  static getAccountPermissions = async (args: {
    tenantAccountId: string;
  }): Promise<AccountPermissionSummaryDTO> => {
    const res = await this.queryApi({
      document: query('getAccountPermissions', (root) => [
        root.getAccountPermissions(
          { tenantAccountId: $('tenantAccountId') },
          () => AccountPermissionService.fragment,
        ),
      ]),
      variables: args,
    });
    return res.getAccountPermissions as AccountPermissionSummaryDTO;
  };

  /**
   * Ghi đè toàn bộ permissions của 1 account.
   * Permissions không có trong list → tự động bị revoke.
   * Trả về summary mới nhất để FE cập nhật UI ngay.
   */
  static setAccountPermissions = async (args: {
    input: SetPermissionsInput;
  }): Promise<AccountPermissionSummaryDTO> => {
    const res = await this.mutationApi({
      document: mutation('setAccountPermissions', (root) => [
        root.setAccountPermissions(
          { input: $('input') },
          () => AccountPermissionService.fragment,
        ),
      ]),
      variables: args,
    });
    return res.setAccountPermissions as AccountPermissionSummaryDTO;
  };

  /**
   * Lấy danh sách permission groups + metadata scope fields.
   * Dùng để render PermissionModal — không cần hard-code trên FE.
   * Thêm EPermission mới trên BE → tự động xuất hiện trên UI.
   */
  static getPermissionGroups = async (): Promise<PermissionGroupDTO[]> => {
    const res = await this.queryApi({
      document: query('getPermissionGroups', (root) => [
        root.getPermissionGroups(() => AccountPermissionService.permissionGroupFragment),
      ]),
    });
    return res.getPermissionGroups as PermissionGroupDTO[];
  };
}