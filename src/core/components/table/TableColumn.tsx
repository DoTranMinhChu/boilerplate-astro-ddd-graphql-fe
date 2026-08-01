import { Accessor } from 'solid-js';

export interface ColumnProps<T> {
  title?: string | JSX.Element;
  skeleton?: () => JSX.Element;
  sortable?: Extract<keyof T, string>;
  center?: boolean;
  right?: boolean;
  top?: boolean;
  bottom?: boolean;
  width?: number;
  fitContent?: boolean;
}

export interface TableColumnProps<T> extends BaseProps, ColumnProps<T> {
  children: (
    item: T,
    index: Accessor<number>,
    columnProps?: ColumnProps<T>,
  ) => JSX.Element;
}
export function TableColumn<T>(props: TableColumnProps<T>) {
  return { isTableColumn: true, ...props } as unknown as JSX.Element;
}
