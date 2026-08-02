import { createSignal, createEffect, untrack } from "solid-js";
import type {
  PaginationCursor,
  PaginationArgsInput,
} from "@core/api/types";
import type { PageInfo } from "@/shared/generated/typed-graphql";
import { GraphQL } from "@/core/api/graphql";

export interface CreateDataProps<
  QueryInput,
  ListItemType,
  TransformedItemType
> {
  paginatedQuery: ({
    input,
  }: {
    input: QueryInput;
  }) => Promise<PaginationCursor<ListItemType> | null>;


  page?: number;
  limit?: number;
  queryInput?: Partial<any>;
  queryContext?: any;
  onError?: (err: Error) => void;
  transformItem?: (item: ListItemType) => TransformedItemType | any;
  onQueryRefresh?: () => void;
  onRefresh?: () => void;
  loadMode?: "page" | "cursor";
}

export function createData<
  QueryInput,
  ListItemType,
  TransformedItemType extends ListItemType = ListItemType
>(props: CreateDataProps<QueryInput, ListItemType, TransformedItemType>) {
  const [items, setItems] = createSignal<TransformedItemType[] | undefined>();
  const [loading, setLoading] = createSignal(false);
  const [loaded, setLoaded] = createSignal(false);
  const [limit, setLimit] = createSignal(props.limit || 10);
  const [page, setPage] = createSignal(props.page || 1);
  const [totalCount, setTotalCount] = createSignal(0);
  const [pageInfo, setPageInfo] = createSignal<PageInfo | null>(null);
  const [queryInput, setQueryInput] = createSignal<Partial<QueryInput>>(
    props.queryInput || {}
  );

  // ✅ THÊM: Stack lưu cursor theo từng page
  // index 0 = undefined (page 1 không cần cursor)
  // index 1 = cursor để fetch page 2
  // index N = cursor để fetch page N+1
  const [cursorStack, setCursorStack] = createSignal<(string | null)[]>([]);

  const loadMode = () => props.loadMode || "page";

  const fetchData = async () => {
    setLoading(true);
    try {
      const currentLimit = limit();
      const currentPage = page();

      const paginationInput: PaginationArgsInput = {
        ...(queryInput() as any),
        limit: currentLimit,
      };

      if (loadMode() === "page") {
        paginationInput.page = currentPage;
      } else {
        // ✅ Lấy cursor đúng cho page hiện tại từ stack
        // page 1 → stack[0] = undefined → không gửi after
        // page 2 → stack[1] = endCursor của page 1
        // page N → stack[N-1] = endCursor của page N-1
        const cursorForCurrentPage = cursorStack()[currentPage - 1];
        if (cursorForCurrentPage) {
          paginationInput.after = cursorForCurrentPage;
        }
      }

      const result = await props.paginatedQuery({
        input: paginationInput as QueryInput,
      });

      if (!result) {
        setItems([]);
        setLoaded(true);
        return;
      }

      const rawItems: ListItemType[] = [];
      if (result.edges && Array.isArray(result.edges)) {
        for (const edge of result.edges) {
          if (edge?.node) rawItems.push(edge.node);
        }
      }

      const transformedItems = props.transformItem
        ? rawItems.map((item) => props.transformItem!(item))
        : (rawItems as unknown as TransformedItemType[]);

      setItems(transformedItems);
      setPageInfo(result.pageInfo || null);
      setTotalCount(result.pageInfo?.totalCount || 0);
      setLoaded(true);

      // ✅ Lưu endCursor vào stack để dùng cho page tiếp theo
      // Ví dụ sau khi fetch page 2 (index=1), lưu cursor vào stack[2] để dùng cho page 3
      if (loadMode() === "cursor" && result.pageInfo?.endCursor) {
        const endCursor = result.pageInfo.endCursor as string;
        setCursorStack((prev) => {
          const next = [...prev];
          next[currentPage] = endCursor; // stack[currentPage] = cursor cho page currentPage+1
          return next;
        });
      }
    } catch (err) {
      props.onError?.(err as Error);
      setItems(undefined);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Reset hoàn toàn stack khi thay đổi filter hoặc limit
  const resetPagination = () => {
    setCursorStack([]);
    setPageInfo(null);
    setPage(1);
  };

  const refresh = async () => {
    GraphQL.resetClient();
    props.onQueryRefresh?.();
    await fetchData();
    props.onRefresh?.();
  };

  const changeLimit = (limitVal: number | ((prev: number) => number)) => {
    const newLimit =
      typeof limitVal === "function" ? limitVal(limit()) : limitVal;
    setLimit(newLimit);
    resetPagination(); // ✅ reset toàn bộ cursor stack
  };

  const changePage = (newPage: number) => {
    setPage(newPage); // stack đã có cursor sẵn nếu đã navigate qua page đó rồi
  };

  const changeQueryInput = (newInput: Partial<QueryInput>) => {
    setQueryInput(newInput as any);
    resetPagination(); // ✅ reset toàn bộ cursor stack
  };

  createEffect(() => {
    limit();
    page();
    queryInput();

    untrack(() => {
      fetchData();
    });
  });

  return {
    items,
    refresh,
    limit,
    changeLimit,
    page,
    changePage,
    changeQueryInput,
    totalCount,
    loaded,
    loading,
    pageInfo,
  };
}
