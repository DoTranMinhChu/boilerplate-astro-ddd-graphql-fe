// @core/components/table/DatatableContext.ts
//
// Mở rộng so với bản gốc:
//   + isMobile signal (từ useBreakpoint)
//   + cardViewChildren: lưu render function của <Datatable.CardView> nếu dev khai báo
//
// Tất cả sub-components (Table, Header, Toolbar, Formlog, ...) đều đọc
// isMobile từ đây — không cần prop drilling.

import { Accessor, createContext, JSX, Setter, useContext } from 'solid-js';
import { SearchQueryInput, SortQueryInput } from './types';
import { BaseService } from '@core/services/base.service';

export interface DatatableContextValue {
  id: string;
  service: typeof BaseService;

  // ── Data ──────────────────────────────────────────────────────────────────
  items: Accessor<any[] | undefined>;
  refresh: () => any;
  loaded: Accessor<boolean>;
  loading: Accessor<boolean>;
  totalCount: Accessor<number>;

  // ── Pagination ────────────────────────────────────────────────────────────
  limit: Accessor<number>;
  changeLimit: (limit: number) => any;
  page: Accessor<number>;
  changePage: (page: number) => any;

  // ── Query ─────────────────────────────────────────────────────────────────
  search: Accessor<SearchQueryInput | undefined>;
  setSearch: Setter<SearchQueryInput | undefined>;
  setFilter: Setter<any>;
  /** Dùng bởi DatatableSideFilter — không xung đột với setFilter (toolbar) */
  setSideFilter: Setter<any>;
  setOrder: (order: SortQueryInput | undefined) => any;

  // ── Formlog ───────────────────────────────────────────────────────────────
  isFormlogOpen: Accessor<boolean | MouseEvent | undefined>;
  setIsFormlogOpen: (val?: boolean | MouseEvent) => any;
  formlogItem: Accessor<any>;
  setFormlogItem: (val?: any) => any;
  /** True khi mở formlog ở chế độ chỉ xem (CellButtonView) */
  isFormlogReadOnly: Accessor<boolean>;
  setIsFormlogReadOnly: Setter<boolean>;

  // ── Selection ─────────────────────────────────────────────────────────────
  selectable: Accessor<boolean>;
  selectedItems: Accessor<{ [id: string]: any }>;
  setSelectedItems: (items: { [id: string]: any }) => any;

  // ── Responsive (NEW) ──────────────────────────────────────────────────────
  /** True khi viewport < 768px */
  isMobile: Accessor<boolean>;
  /** True khi viewport < 1024px (mobile hoặc tablet) */
  isCompact: Accessor<boolean>;

  // ── CardView registry (NEW) ───────────────────────────────────────────────
  /**
   * Nếu developer khai báo <Datatable.CardView>, render function được lưu ở đây.
   * Datatable.Table sẽ dùng nó thay vì auto-card khi isMobile.
   */
  cardViewChildren: Accessor<((item: any, index: () => number) => JSX.Element) | undefined>;
  setCardViewChildren: Setter<((item: any, index: () => number) => JSX.Element) | undefined>;
}

export const DatatableContext = createContext<DatatableContextValue>();

export function useDatatable() {
  const ctx = useContext(DatatableContext);
  if (!ctx) throw new Error('useDatatable must be used inside <Datatable>');
  return ctx;
}