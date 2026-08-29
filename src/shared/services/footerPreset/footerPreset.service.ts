import {
  $, fragment, query, mutation, GetOutput,
  FooterPreset,
  CreateFooterPresetInput,
  UpdateFooterPresetInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import type { PaginationCursor } from '@/core/api/types';
import type { AnimationLayer } from '@/modules/cms/cms.types';

export interface FooterColumn { title: string; lines: string[] }

// `footerColumns`/`animation` are the Mixed scalar (free-form JSON) — typed-graphql-builder
// doesn't recognize the custom scalar and generates `string` instead of `any` for it (see
// the same documented limitation in cms.types.ts). Override here, the one cast point for
// this service, rather than casting at each call site.
type RawFooterPresetDTO = GetOutput<typeof FooterPresetService.fragment>;
export type FooterPresetDTO = Omit<RawFooterPresetDTO, 'footerColumns' | 'animation' | 'variant'> & {
  footerColumns?: FooterColumn[];
  animation?: AnimationLayer[];
  // `variant` (Task 9 astro-check fix) — the underlying GraphQL field is a plain String (not a
  // GraphQL enum), so typed-graphql-builder generates `string`, not the literal union
  // `SiteFooter.tsx` actually accepts. Narrow here, same convention as `footerColumns`/`animation`
  // above, instead of casting at the CmsPageShell.astro call site.
  variant?: 'default' | 'minimal' | 'centered' | 'split-cta';
};

export class FooterPresetService extends CrudService {
  static apiName = 'footerPreset' as const;
  static displayName = 'FooterPreset';

  static fragment = fragment(FooterPreset, (i) => [
    i.name,
    i.isDefault,
    i.logoText,
    i.hotlineLabel,
    i.hotline,
    i.footerHeading,
    i.footerEmail,
    i.footerColumns,
    // Menu Manager (Task 4/5, Phase 3) — khi có giá trị, SiteFooter ưu tiên render cây Menu
    // này THAY footerColumns cũ (fallback nếu để trống, xem SiteFooter.tsx).
    i.footerMenuId,
    i.footerOutlineText,
    i.animation,
    i.variant,
    i.id,
    i.createdAt,
    i.updatedAt,
  ]);

  static getAllFooterPresets = async () => {
    const res = await this.queryApi({
      document: query("getAllFooterPresets", (root) => [
        root.getAllFooterPresets(() => this.fragment),
      ]),
      variables: {},
    });
    return (res.getAllFooterPresets || []).filter(Boolean) as FooterPresetDTO[];
  };

  /** Bọc danh sách phẳng thành shape cursor giả — cùng lý do/pattern với
   * HeaderPresetService.getAllHeaderPresetsCursor(). */
  static getAllFooterPresetsCursor = async (): Promise<PaginationCursor<FooterPresetDTO>> => {
    const items = await this.getAllFooterPresets();
    return {
      edges: items.map((node) => ({ node, cursor: node.id! })),
      pageInfo: { hasNextPage: false, hasPreviousPage: false, totalCount: items.length, totalPage: 1, limit: items.length },
    };
  };

  static getOneFooterPreset = async (args: { id: string }) => {
    const res = await this.queryApi({
      document: query("getOneFooterPreset", (root) => [
        root.getOneFooterPreset({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.getOneFooterPreset as FooterPresetDTO;
  };

  static createFooterPreset = async (args: { data: CreateFooterPresetInput }) => {
    const res = await this.mutationApi({
      document: mutation("createFooterPreset", (root) => [
        root.createFooterPreset({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createFooterPreset as FooterPresetDTO;
  };

  static updateFooterPreset = async (args: { id: string, data: UpdateFooterPresetInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateFooterPreset", (root) => [
        root.updateFooterPreset({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateFooterPreset as FooterPresetDTO;
  };

  static deleteFooterPreset = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteFooterPreset", (root) => [
        root.deleteFooterPreset({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteFooterPreset;
  };

  static setDefaultFooterPreset = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("setDefaultFooterPreset", (root) => [
        root.setDefaultFooterPreset({ id: $('id') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.setDefaultFooterPreset as FooterPresetDTO;
  };
}
