import {
  $, fragment, query, mutation, GetOutput,
  HeaderPreset,
  CreateHeaderPresetInput,
  UpdateHeaderPresetInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import type { PaginationCursor } from '@/core/api/types';
import type { AnimationLayer } from '@/modules/cms/cms.types';

export interface NavLink { label: string; href: string }

// `navLinks`/`animation` are the Mixed scalar (free-form JSON) — typed-graphql-builder
// doesn't recognize the custom scalar and generates `string` instead of `any` for it (see
// the same documented limitation in cms.types.ts). Override here, the one cast point for
// this service, rather than casting at each call site.
type RawHeaderPresetDTO = GetOutput<typeof HeaderPresetService.fragment>;
export type HeaderPresetDTO = Omit<RawHeaderPresetDTO, 'navLinks' | 'animation'> & {
  navLinks?: NavLink[];
  animation?: AnimationLayer[];
};

export class HeaderPresetService extends CrudService {
  static apiName = 'headerPreset' as const;
  static displayName = 'HeaderPreset';

  static fragment = fragment(HeaderPreset, (i) => [
    i.name,
    i.isDefault,
    i.logoText,
    i.navLinks,
    // Menu Manager (Task 4/5, Phase 3) — khi có giá trị, SiteHeader ưu tiên render cây Menu
    // này THAY navLinks cũ (fallback nếu để trống, xem SiteHeader.tsx).
    i.headerMenuId,
    i.animation,
    i.id,
    i.createdAt,
    i.updatedAt,
  ]);

  static getAllHeaderPresets = async () => {
    const res = await this.queryApi({
      document: query("getAllHeaderPresets", (root) => [
        root.getAllHeaderPresets(() => this.fragment),
      ]),
      variables: {},
    });
    return (res.getAllHeaderPresets || []).filter(Boolean) as HeaderPresetDTO[];
  };

  /** Bọc danh sách phẳng thành shape cursor giả — HeaderPreset không cần phân trang
   * thật (số lượng preset luôn nhỏ), nhưng generateDatatable() cần shape edges/pageInfo
   * để tái dùng nguyên bộ khung Datatable (search/CRUD modal/...) đồng nhất với các
   * màn quản trị CMS khác, thay vì tự viết lại UI list riêng (xem SectionService
   * getAllPageSections() cho cùng pattern này). */
  static getAllHeaderPresetsCursor = async (): Promise<PaginationCursor<HeaderPresetDTO>> => {
    const items = await this.getAllHeaderPresets();
    return {
      edges: items.map((node) => ({ node, cursor: node.id! })),
      pageInfo: { hasNextPage: false, hasPreviousPage: false, totalCount: items.length, totalPage: 1, limit: items.length },
    };
  };

  static getOneHeaderPreset = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneHeaderPreset", (root) => [
        root.getOneHeaderPreset({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneHeaderPreset as HeaderPresetDTO;
  };

  static createHeaderPreset = async (args: { data: CreateHeaderPresetInput }) => {
    const res = await this.mutationApi({
      document: mutation("createHeaderPreset", (root) => [
        root.createHeaderPreset({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createHeaderPreset as HeaderPresetDTO;
  };

  static updateHeaderPreset = async (args: { id: string, data: UpdateHeaderPresetInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateHeaderPreset", (root) => [
        root.updateHeaderPreset({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateHeaderPreset as HeaderPresetDTO;
  };

  static deleteHeaderPreset = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteHeaderPreset", (root) => [
        root.deleteHeaderPreset({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteHeaderPreset;
  };

  static setDefaultHeaderPreset = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("setDefaultHeaderPreset", (root) => [
        root.setDefaultHeaderPreset({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.setDefaultHeaderPreset as HeaderPresetDTO;
  };
}
