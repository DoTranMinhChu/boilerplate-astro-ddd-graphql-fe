import { mergeClass } from '@core/helpers/class';
import { formatNumber } from '@core/helpers/number';
import { splitProps } from 'solid-js';
import { baseConfig } from '../config/BaseConfig';
import { Select } from '../control/Select';
import { Pagination, PaginationProps } from '../pagination/Pagination';
import { useDatatable } from './DatatableContext';

export const DEFAULT_LIMITS = [10, 25, 50, 100];
export interface DatatablePaginationProps
  extends BaseProps,
  Omit<PaginationProps, 'limit' | 'page' | 'totalCount' | 'onPageClick'> {
  paginationClass?: string;
  limitOptions?: Option<number>[];
}
export function DatatablePagination(props: DatatablePaginationProps) {
  const [datatablePaginationProps, paginationProps] = splitProps(props, [
    'class',
    'children',
  ]);
  const { limit, changeLimit, totalCount, page, changePage, isMobile } = useDatatable();

  const defaultLimits = [
    ...DEFAULT_LIMITS,
    ...(!DEFAULT_LIMITS.includes(limit()) ? [limit()] : []),
  ].sort((a, b) => a - b);

  const limitOptions = () =>
    props.limitOptions ||
    defaultLimits.map((limit) => ({
      value: limit,
      label: `${limit.toString()} ${baseConfig().datatableRowLabel}`,
    }));

  const datatablePaginationClass = () =>
    mergeClass(`w-full flex flex-1 items-end`, datatablePaginationProps.class);
  return (
    <div class={datatablePaginationClass()}>
      <Select
        class="h-8"
        selectClass="text-sm"
        native
        value={limit()}
        onChange={(val) => changeLimit(Number(val))}
        options={limitOptions()}
      />

      <div class="h-8 px-2 text-sm font-medium flex-center">
        {formatNumber(totalCount())} {!isMobile() ? baseConfig().datatableResultLabel : ""}
      </div>
      {props.children}
      <Pagination
        class={`ml-auto ${props.paginationClass}`}
        {...paginationProps}
        visiblePages={paginationProps.visiblePages || isMobile() ? 2 : undefined}
        limit={limit()}
        page={page()}
        totalCount={totalCount()}
        onPageClick={changePage}
        buttonProps={{ sm: true }}
      />
    </div>
  );
}
