// export interface RowProps<T extends any> { }

export interface TableRowProps extends BaseProps//, RowProps<T> 
{
  center?: boolean;
  right?: boolean;
  top?: boolean;
  bottom?: boolean;
  width?: number;
  colSpan?: number;
}
export function TableRow(props: TableRowProps) {
  return { isTableRow: true, ...props } as unknown as JSX.Element;
}
