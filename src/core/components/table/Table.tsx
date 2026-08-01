import { ESort } from '@core/api/types';
import { Skeleton } from '@core/components/utilities/Skeleton';
import { joinClass, mergeClass } from '@core/helpers/class';
import {
  For,
  Index,
  Show,
  children,
  createEffect,
  createSignal,
} from 'solid-js';
import { Button } from '../button/Button';
import { baseConfig } from '../config/BaseConfig';
import { Checkbox } from '../control/Checkbox';
import { Empty } from '../utilities/Empty';
import { TableColumnProps } from './TableColumn';
import { TableRowProps } from './TableRow';

export interface SortQueryInput {
  field: string;
  direction: ESort | 'ASC' | 'DESC';
}

export interface TableProps<T> extends BaseProps {
  headerRowClass?: string;
  headerCellClass?: ({
    isFirstColumn,
    isLastColumn,
  }: {
    isFirstColumn: boolean;
    isLastColumn: boolean;
  }) => string;
  bodyRowClass?: ({
    isFirstRow,
    isLastRow,
  }: {
    isFirstRow: boolean;
    isLastRow: boolean;
  }) => string;
  bodyCellClass?: ({
    isFirstColumn,
    isLastColumn,
    isFirstRow,
    isLastRow,
  }: {
    isFirstColumn: boolean;
    isLastColumn: boolean;
    isFirstRow: boolean;
    isLastRow: boolean;
  }) => string;
  items?: T[] | undefined;
  tableStyle?: 'open' | 'closed';
  emptyRow?: string | JSX.Element;
  loading?: boolean;
  showSkeleton?: boolean;
  skeletonRowCount?: number;
  selectable?: boolean;
  selectedItems?: { [id in string]: T };
  noHeader?: boolean;
  onSelectedItemsChange?: (items: { [id in string]: T }) => any;
  onOrder?: (order: SortQueryInput | undefined) => any;
}

export function Table<T>(props: TableProps<T>) {
  const tableStyle = () => props.tableStyle || 'closed';
  const [order, setOrder] = createSignal<SortQueryInput | undefined>();
  const skeletonRowCount = () => props.skeletonRowCount || 10;
  const [selectedItems, setSelectedItems] = createSignal<{ [id in string]: T }>(
    props.selectedItems || {},
  );

  const isItemsSelected = () => {
    if (props.selectable && props.items?.length) {
      return props.items?.every(
        (item) => !!selectedItems()?.[(item as any)?.id],
      );
    }
    return false;
  };

  createEffect(() => {
    if (props.selectable && props.selectedItems) {
      setSelectedItems(props.selectedItems);
    }
  });

  const resolvedChildren = children(() => props.children);
  const columns = () =>
    [
      ...(props.selectable && props.items?.length
        ? [
          {
            fitContent: true,
            title: (
              <>
                <Checkbox
                  class="min-h-0 p-1"
                  value={isItemsSelected()}
                  onChange={(val) => {
                    if (val !== isItemsSelected()) {
                      setSelectedItems((selectedItems) => {
                        if (val) {
                          return {
                            ...selectedItems,
                            ...props.items?.reduce(
                              (obj, item) => ({
                                ...obj,
                                [(item as any)?.id]: item,
                              }),
                              {},
                            ),
                          };
                        } else {
                          const unselectedIds = props.items?.map(
                            (item) => (item as any)?.id,
                          );
                          return (
                            Object.keys(selectedItems)
                              .filter((id) => !unselectedIds?.includes(id))
                              .reduce(
                                (obj, id) => ({
                                  ...obj,
                                  [id]: selectedItems[id],
                                }),
                                {},
                              ) || {}
                          );
                        }
                      });
                      props.onSelectedItemsChange?.(selectedItems());
                    }
                  }}
                />
              </>
            ),
            children: (item) => (
              <Checkbox
                class="min-h-0 p-1"
                value={!!selectedItems()?.[(item as any)?.id]}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onChange={(val) => {
                  if (val !== !!selectedItems()?.[(item as any)?.id]) {
                    setSelectedItems((items) => {
                      if (val) {
                        return {
                          ...items,
                          [(item as any)?.id]: item,
                        };
                      } else {
                        const {
                          [(item as any)?.id]: unselectedItem,
                          ...rest
                        } = selectedItems();
                        return rest;
                      }
                    });
                    props.onSelectedItemsChange?.(selectedItems());
                  }
                }}
              />
            ),
          } as TableColumnProps<T>,
        ]
        : []),
      ...resolvedChildren.toArray().filter((item: any) => item != null && item.isTableColumn),
    ] as TableColumnProps<T>[];

  const rows = () =>
    resolvedChildren
      .toArray()
      .filter((item: any) => item != null && item.isTableRow) as unknown as TableRowProps[];

  const tableClass = () =>
    mergeClass(
      `relative w-full border-separate border-spacing-0`,
      (props.items === undefined || props.loading) &&
      'pointer-events-none animate-pulse-fade',
      props.loading && `animate-pulse-fade`,
      tableStyle() == 'closed' && `border rounded-lg border-light`,
      props.class,
    );

  const headerRowClass = () => mergeClass(props.headerRowClass);
  const headerCellClass = ({
    isFirstColumn,
    isLastColumn,
  }: {
    isFirstColumn: boolean;
    isLastColumn: boolean;
  }) =>
    joinClass(
      `p-2.5 text-left font-medium text-base`,
      `bg-neutral-50 border-neutral-100`,
      tableStyle() == 'closed' ? `border-b` : `border-t border-b`,
      isFirstColumn &&
      `rounded-tl-lg pl-3 ${tableStyle() == 'open' && `border-l rounded-l-lg`}`,
      isLastColumn &&
      `rounded-tr-lg pr-3 ${tableStyle() == 'open' && `border-r rounded-r-lg`}`,
      props.headerCellClass?.({ isFirstColumn, isLastColumn }),
    );

  const bodyRowClass = ({
    isFirstRow,
    isLastRow,
  }: {
    isFirstRow: boolean;
    isLastRow: boolean;
  }) =>
    mergeClass(
      `bg-white hover:bg-lightest`,
      props.bodyRowClass?.({ isFirstRow, isLastRow }),
    );

  const bodyCellClass = ({
    isFirstColumn,
    isLastColumn,
    isFirstRow,
    isLastRow,
  }: {
    isFirstColumn: boolean;
    isLastColumn: boolean;
    isFirstRow: boolean;
    isLastRow: boolean;
  }) =>
    joinClass(
      `p-2.5 text-left font-normal text-base border-b border-lighter max-w-(--breakpoint-xs)`,
      isFirstColumn &&
      `pl-3 ${isLastRow ? `rounded-bl-lg` : ''} ${isFirstRow && props.noHeader ? `rounded-tl-lg` : ``}`,
      isLastColumn &&
      `pr-3 ${isLastRow ? `rounded-br-lg` : ''} ${isFirstRow && props.noHeader ? `rounded-tr-lg` : ``}`,
      isFirstColumn && tableStyle() == 'open' && 'border-l-0 rounded-none',
      isLastColumn && tableStyle() == 'open' && 'border-r-0 rounded-none',
      props.bodyCellClass?.({
        isFirstColumn,
        isLastColumn,
        isFirstRow,
        isLastRow,
      }),
    );

  createEffect(() => {
    props.onOrder?.(order());
  });

  const OrderButton = (col: TableColumnProps<T>) => (
    <Button
      class={`translate-y-0.5 py-0 ${order()?.field == col.sortable ? 'text-main hover:text-main-700' : 'text-neutral-300 hover:text-neutral'}`}
      flat
      compact
      icon={
        order()?.field == col.sortable
          ? order()?.direction == 'ASC' || order()?.direction == ESort.ASC
            ? baseConfig().iconOrderUp()
            : baseConfig().iconOrderDown()
          : baseConfig().iconOrder()
      }
      onClick={() => {
        if (order()?.field == col.sortable) {
          if (order()?.direction == 'ASC' || order()?.direction == ESort.ASC) {
            setOrder({
              direction: 'DESC',
              field: col.sortable!,
            });
          } else {
            setOrder();
          }
        } else {
          setOrder({
            direction: 'ASC',
            field: col.sortable!,
          });
        }
      }}
    />
  );

  return (
    <table class={tableClass()}>
      <thead class={props.noHeader ? `hidden` : ``}>
        <tr class={headerRowClass()}>
          <For each={columns()}>
            {(col, colIndex) => (
              <th
                class={mergeClass(
                  headerCellClass({
                    isFirstColumn: colIndex() == 0,
                    isLastColumn: colIndex() == columns().length - 1,
                  }),
                  col.center && `text-center`,
                  col.right && `text-right`,
                  col.top && `align-top`,
                  col.bottom && `align-bottom`,
                  col.fitContent && `w-1 whitespace-nowrap`,
                  col.class,
                )}
              >
                <Show when={col.sortable && col.right}>
                  <OrderButton {...col} />
                </Show>
                {col.title}
                <Show when={col.sortable && !col.right}>
                  <OrderButton {...col} />
                </Show>
              </th>
            )}
          </For>
        </tr>
      </thead>
      <tbody>
        {props.items && !props.showSkeleton ? (
          !!props.items.length || !!rows().length ? (
            <>
              <For each={props.items}>
                {(item, index) => {
                  const isFirstRow = index() == 0;
                  const isLastRow = rows().length
                    ? false
                    : index() == props.items!.length - 1;
                  return (
                    <tr class={bodyRowClass({ isFirstRow, isLastRow })}>
                      <For each={columns()}>
                        {(col, colIndex) => (
                          <td
                            class={mergeClass(
                              bodyCellClass({
                                isFirstColumn: colIndex() == 0,
                                isLastColumn:
                                  colIndex() == columns().length - 1,
                                isFirstRow,
                                isLastRow,
                              }),
                              col.center && `justify-center text-center`,
                              col.right && `justify-end text-right`,
                              col.top && `align-top`,
                              col.bottom && `align-bottom`,
                              col.fitContent && `w-1 whitespace-nowrap`,
                              col.class,
                            )}
                          >
                            {col.children(item, index, col)}
                          </td>
                        )}
                      </For>
                    </tr>
                  );
                }}
              </For>
              <For each={rows()}>
                {(row, index) => (
                  <tr
                    class={bodyRowClass({
                      isFirstRow: false,
                      isLastRow: index() == rows().length - 1,
                    })}
                  >
                    <td
                      colSpan={row.colSpan || 100}
                      class={mergeClass(
                        bodyCellClass({
                          isFirstColumn: true,
                          isLastColumn: true,
                          isFirstRow: false,
                          isLastRow: index() == rows().length - 1,
                        }),
                        row.center && `justify-center text-center`,
                        row.right && `justify-end text-right`,
                        row.top && `align-top`,
                        row.bottom && `align-bottom`,
                        row.class,
                      )}
                    >
                      {row.children}
                    </td>
                  </tr>
                )}
              </For>
            </>
          ) : (
            <tr
              class={props.bodyRowClass?.({
                isFirstRow: true,
                isLastRow: true,
              })}
            >
              <td
                colSpan={columns().length}
                class={mergeClass(
                  props.bodyCellClass?.({
                    isFirstColumn: true,
                    isLastColumn: true,
                    isFirstRow: true,
                    isLastRow: true,
                  }),
                )}
              >
                {props.emptyRow || <Empty />}
              </td>
            </tr>
          )
        ) : (
          <Index each={[...Array(skeletonRowCount()).keys()]}>
            {(index) => {
              const isFirstRow = index() == 0;
              const isLastRow = index() == (props.items?.length || 0) - 1;
              return (
                <tr class={props.bodyRowClass?.({ isFirstRow, isLastRow })}>
                  <For each={columns()}>
                    {(col, colIndex) => (
                      <td
                        class={mergeClass(
                          bodyCellClass({
                            isFirstColumn: colIndex() == 0,
                            isLastColumn: colIndex() == columns().length - 1,
                            isFirstRow,
                            isLastRow,
                          }),
                          col.center && `text-center`,
                          col.right && `text-right`,
                          col.top && `align-top`,
                          col.bottom && `align-bottom`,
                        )}
                      >
                        {col.skeleton ? (
                          col.skeleton()
                        ) : (
                          <Skeleton.Block
                            class={`h-6 w-3/4 min-w-10 ${col.center ? 'mx-auto' : col.right ? 'ml-auto' : ''}`}
                          />
                        )}
                      </td>
                    )}
                  </For>
                </tr>
              );
            }}
          </Index>
        )}
      </tbody>
    </table>
  );
}