import {
  $, fragment, query, mutation, GetOutput,
  Menu,
  MenuItem,
  CreateMenuInput,
  UpdateMenuInput,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';

export type MenuDTO = GetOutput<typeof MenuService.fragment>;
export type MenuItemDTO = GetOutput<typeof MenuService.itemFragment>;

// Menu (1 cây menu độc lập, vd "Menu Header chính") — HeaderPreset/FooterPreset mỗi bản ghi
// tự trỏ tới 1 Menu riêng (headerMenuId/footerMenuId). MenuItem là sub-resource (menuId), xem
// MenuTreeEditor.tsx cho UI cây dựng từ getMenuItemsByMenu bên dưới — cùng khuôn TermTreeEditor
// (Taxonomy/Term), chỉ khác MenuItem không có slug và có targetType (PAGE/URL/ANCHOR/NONE) trỏ
// tới đúng 1 trong 3 field pageId/url/anchor thay vì chỉ là 1 nhãn phẳng.
export class MenuService extends CrudService {
  static apiName = 'menu' as const;
  static displayName = 'Menu';

  static fragment = fragment(Menu, (i) => [
    i.name,
    i.id,
    i.createdAt,
    i.updatedAt,
  ]);

  static itemFragment = fragment(MenuItem, (i) => [
    i.menuId,
    i.parentId,
    i.order,
    i.label,
    i.targetType,
    i.pageId,
    i.url,
    i.anchor,
    // Computed BE-side (không map cột DB — xem MenuItemEntity.pagePath phía BE), batch-resolve
    // từ pageId trong findByMenu(). SiteHeader/SiteFooter (Task 5) dùng field này để build href
    // của targetType=PAGE mà KHÔNG cần gọi thêm getOnePage (staff-only, không public).
    i.pagePath,
    i.id,
    i.createdAt,
    i.updatedAt,
  ]);

  // getAllMenu trả về danh sách phẳng (không phân trang — xem menu.resolver.ts phía BE),
  // đúng khuôn getAllHeaderPresets (headerPreset.service.ts).
  static getAllMenu = async () => {
    const res = await this.queryApi({
      document: query("getAllMenu", (root) => [
        root.getAllMenu(() => this.fragment),
      ]),
      variables: {},
    });
    return (res.getAllMenu || []).filter(Boolean) as MenuDTO[];
  };

  static createMenu = async (args: { data: CreateMenuInput }) => {
    const res = await this.mutationApi({
      document: mutation("createMenu", (root) => [
        root.createMenu({ data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.createMenu as MenuDTO;
  };

  static updateMenu = async (args: { id: string, data: UpdateMenuInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateMenu", (root) => [
        root.updateMenu({ id: $('id'), data: $('data') }, () => this.fragment),
      ]),
      variables: args,
    });
    return res.updateMenu as MenuDTO;
  };

  static deleteMenu = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteMenu", (root) => [
        root.deleteMenu({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteMenu;
  };

  // getMenuItemsByMenu cũng trả về danh sách phẳng (không phân trang — 1 Menu hiếm khi có quá
  // vài trăm mục), MenuTreeEditor tự dựng cây từ parentId (đúng khuôn getAllTerm ở
  // term.service.ts, nhưng ở đây BE trả thẳng array chứ không bọc edges/pageInfo).
  static getMenuItemsByMenu = async (args: { menuId: string }) => {
    const res = await this.queryApi({
      document: query("getMenuItemsByMenu", (root) => [
        root.getMenuItemsByMenu({ menuId: $('menuId') }, () => this.itemFragment),
      ]),
      variables: args,
    });
    return (res.getMenuItemsByMenu || []).filter(Boolean) as MenuItemDTO[];
  };

  static createMenuItem = async (args: { data: CreateMenuItemInput }) => {
    const res = await this.mutationApi({
      document: mutation("createMenuItem", (root) => [
        root.createMenuItem({ data: $('data') }, () => this.itemFragment),
      ]),
      variables: args,
    });
    return res.createMenuItem as MenuItemDTO;
  };

  static updateMenuItem = async (args: { id: string, data: UpdateMenuItemInput }) => {
    const res = await this.mutationApi({
      document: mutation("updateMenuItem", (root) => [
        root.updateMenuItem({ id: $('id'), data: $('data') }, () => this.itemFragment),
      ]),
      variables: args,
    });
    return res.updateMenuItem as MenuItemDTO;
  };

  static deleteMenuItem = async (args: { id: string }) => {
    const res = await this.mutationApi({
      document: mutation("deleteMenuItem", (root) => [
        root.deleteMenuItem({ id: $('id') }),
      ]),
      variables: args,
    });
    return res.deleteMenuItem;
  };
}
