// @core/components/table/Datatable.tsx
// Thay đổi so với bản gốc:
//   1. Import useBreakpoint
//   2. Thêm [cardViewChildren, setCardViewChildren] signal
//   3. Expose isMobile, isCompact, cardViewChildren, setCardViewChildren vào context
// Phần còn lại GIỮ NGUYÊN.

import type { FilterQueryInput, SortInput, ESort } from '@core/api/types';
import { mergeClass } from '@core/helpers/class';
import { Util, generateId } from '@core/helpers/util';
import { BaseService, LOAD_ALL_LIMIT } from '@core/services/base.service';
import { JSX, createEffect, createSignal, splitProps, untrack } from 'solid-js';
import { CreateDataProps, createData } from '../../api/createData';
import { toast } from '../toast/ToastProvider';
import { useBreakpoint } from '../../hooks/useBreakpoint'; // NEW
import { DatatableContext } from './DatatableContext';
import { PagingArgsInput } from './GeneratedDatatable';
import { agencyActingTenantId } from '@/shared/contexts/agency/agencyActingTenant';

export interface SearchQueryInput {
  query?: string;
  fields?: string[];
}

export interface SortQueryInput {
  field: string;
  direction: ESort | 'ASC' | 'DESC';
}

export interface DatatableProps<
  QueryInput extends PagingArgsInput,
  ListItemType,
  TransformedItemType extends ListItemType = ListItemType,
> extends BaseProps,
  CreateDataProps<QueryInput, ListItemType, TransformedItemType> {
  service: typeof BaseService;
  onQueryInputChange?: (queryInput: QueryInput) => any;
  onItemsChange?: (items: ListItemType[] | TransformedItemType[] | undefined) => any;
  loadAll?: boolean;
  defaultQueryInput?: Partial<QueryInput>;
  refreshTrigger?: number;
  onRefresh?: () => any;
  selectable?: boolean;
  loadMode?: 'page' | 'cursor';
}

export function Datatable<
  QueryInput extends PagingArgsInput,
  ListItemType,
  TransformedItemType extends ListItemType = ListItemType,
>(props: DatatableProps<QueryInput, ListItemType, TransformedItemType>) {
  const id = props.id || generateId();
  const selectable = () => props.selectable || false;

  const [isFormlogOpen, setIsFormlogOpen] = createSignal<boolean | MouseEvent>();
  const [formlogItem, setFormlogItem] = createSignal<null | any>();
  const [isFormlogReadOnly, setIsFormlogReadOnly] = createSignal<boolean>(false);
  const [order, setOrder] = createSignal<SortQueryInput | undefined>();
  const [search, setSearch] = createSignal<SearchQueryInput>();
  const [filter, setFilter] = createSignal<FilterQueryInput>();
  const [sideFilter, setSideFilter] = createSignal<FilterQueryInput>(); // NEW: từ DatatableSideFilter
  const [selectedItems, setSelectedItems] = createSignal<{ [id in string]: ListItemType }>({});

  // NEW: Responsive
  const { isMobile, isCompact } = useBreakpoint();

  // NEW: CardView registry
  const [cardViewChildren, setCardViewChildren] = createSignal<
    ((item: any, index: () => number) => JSX.Element) | undefined
  >();

  const sort = (): SortInput | undefined => {
    const currentOrder = order();
    if (currentOrder) return { [currentOrder.field]: currentOrder.direction };
    return (props.defaultQueryInput as any)?.sort;
  };

  const queryInput: () => QueryInput = () => {
    // Merge: defaultFilter ← toolbarFilter ← sideFilter (sideFilter có độ ưu tiên cao nhất)
    const baseFilter = Util.assign(
      (props.defaultQueryInput as any)?.filter || {},
      filter() || {},
    );
    let currentFilter = sideFilter()
      ? Util.assign(baseFilter, sideFilter()!)
      : baseFilter;
    // Parase 2 — Agency đang chọn 1 tổ chức ở thanh "Thao tác với tổ chức":
    // lọc danh sách theo đúng tổ chức đó (ghi đè mọi filter tenantId khác).
    // Tenant thường: signal luôn null → không ảnh hưởng.
    const actingTenant = agencyActingTenantId();
    if (actingTenant) currentFilter = { ...currentFilter, tenantId: actingTenant };
    const currentSearch = search();
    return {
      sort: sort(),
      search: currentSearch?.query,
      searchFields: currentSearch?.fields,
      filter: Object.keys(currentFilter).length ? currentFilter : undefined,
    } as QueryInput;
  };

  const [dataProps] = splitProps(props, [
    'paginatedQuery', 'page', 'limit', 'queryInput',
    'queryContext', 'onError', 'transformItem', 'loadMode',
  ]);

  const {
    items, refresh, limit, changeLimit, page,
    changePage, changeQueryInput, totalCount, loaded, loading,
  } = createData({
    ...dataProps,
    queryInput: queryInput(),
    ...(props.loadAll ? { limit: LOAD_ALL_LIMIT } : {}),
    onError: (err: Error) => {
      toast().danger(err.message);
      dataProps.onError?.(err);
    },
    onQueryRefresh: () => { setSelectedItems({}); },
    onRefresh: () => { props.onRefresh?.(); },
  });

  createEffect(() => {
    const input = queryInput();
    untrack(() => { changeQueryInput(input as Partial<QueryInput>); });
  });

  createEffect(() => { if (props.refreshTrigger) refresh(); });

  createEffect(() => {
    const newItems = items();
    if (newItems) props.onItemsChange?.(newItems as any);
  });

  const datatableClass = () => mergeClass('gap-2 flex-column h-full', props.class);

  return (
    <DatatableContext.Provider
      value={{
        id,
        service: props.service,
        items,
        refresh,
        isFormlogOpen,
        setIsFormlogOpen,
        formlogItem,
        setFormlogItem,
        isFormlogReadOnly,
        setIsFormlogReadOnly,
        setOrder,
        loaded,
        loading,
        search,
        setSearch,
        setFilter: setFilter as any,
        setSideFilter: setSideFilter as any,
        limit,
        changeLimit,
        page,
        changePage,
        totalCount,
        selectable,
        selectedItems,
        setSelectedItems,
        isMobile,
        isCompact,
        cardViewChildren,
        setCardViewChildren,
      }}
    >
      <div id={id} class={datatableClass()}>
        {props.children}
      </div>
    </DatatableContext.Provider>
  );
}