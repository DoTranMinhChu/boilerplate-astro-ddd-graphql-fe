// 0. Enum Filter Operator — dùng trong SideFilter và bất kỳ filter nào cần chỉ định operator
export enum EFilterOperator {
  EQUALS = '$eq',
  NOT_EQUALS = '$ne',
  GREATER_THAN = '$gt',
  GREATER_THAN_OR_EQUAL = '$gte',
  LESS_THAN = '$lt',
  LESS_THAN_OR_EQUAL = '$lte',
  IN = '$in',
  NOT_IN = '$nin',
  LIKE = '$like',
  ILIKE = '$ilike',
  STARTS_WITH = '$sw',
  ENDS_WITH = '$ew',
  BETWEEN = '$between',
  IS_NULL = '$null',
  NOT_NULL = '$notNull',
}

// 1. Enum Sort đồng bộ 100% với Backend ESort
export enum ESort {
  ASC = 'ASC',
  ASC_NULLS_FIRST = 'ASC_NULLS_FIRST',
  ASC_NULLS_LAST = 'ASC_NULLS_LAST',
  DESC = 'DESC',
  DESC_NULLS_FIRST = 'DESC_NULLS_FIRST',
  DESC_NULLS_LAST = 'DESC_NULLS_LAST',
}

// 2. Định nghĩa Filter (Toán tử chuẩn)
export type FilterInput<T> = AtLeastOne<{
  $eq?: T;
  $ne?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $in?: T[];
  $nin?: T[];
  $like?: string;
  $ilike?: string;
  $null?: boolean;
  $notNull?: boolean;
}>;

export type FilterQueryInput = {
  [key: string]: FilterInput<any> | any;
};

// 3. Cấu trúc Sort đầu vào (Object Record thay vì Array)
export type SortInput = Record<string, ESort | 'ASC' | 'DESC'>;

// 4. Tham số phân trang Cursor chuẩn Backend
export type PaginationArgsInput = {
  after?: string;
  before?: string;
  limit?: number;
  page?: number; // Dùng cho meta info
  filter?: any;
  search?: string;
  searchFields?: string[];
  sort?: any | SortInput;
};

// 5. Cấu trúc PaginationCursor (Relay Spec)

/** Relay-spec cursor pagination info — hand-written so core/ doesn't depend on the
 * app-specific generated GraphQL schema. */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

export type DeepNonNullable<T> = T extends object
  ? { [K in keyof T]-?: DeepNonNullable<NonNullable<T[K]>> }
  : NonNullable<T>;

export type Edge<T> = {
  node: T | null;
  cursor: string | null;
}

export type PaginationCursor<T = any> = {
  edges: Edge<T>[] | any;
  pageInfo: PageInfo | any;

};

export type IPaginatedResult<T> = PaginationCursor<T>;