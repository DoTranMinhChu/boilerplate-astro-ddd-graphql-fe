import { mergeClass } from '@core/helpers/class';
import { createEffect } from 'solid-js';
import { generateTable } from '../table/GeneratedTable';
import { TableProps } from '../table/Table';
import { ColumnProps } from '../table/TableColumn';

export interface InfoRow {
  label: string | JSX.Element;
  content: string | JSX.Element;
}
export interface InfoListProps extends TableProps<InfoRow> {
  items: InfoRow[];
  type?: 'light' | 'outline';
  hideLabel?: boolean;
  labelColumnProps?: ColumnProps<InfoRow>;
  contentColumnProps?: ColumnProps<InfoRow>;
}
export function InfoList(props: InfoListProps) {
  const { Table, mutateItems } = generateTable({
    items: props.items,
  });
  const type = () => props.type || 'light';

  const tableClass = () =>
    mergeClass(type() == 'light' && `border-none`, props.class);

  createEffect(() => {
    mutateItems(props.items);
  });

  return (
    <>
      <Table
        {...props}
        class={tableClass()}
        bodyCellClass={(data) =>
          `${type() == 'light' ? 'bg-neutral-50' : ''} ${props.bodyCellClass?.(data)} `
        }
        noHeader
      >
        {!props.hideLabel && (
          <Table.Column
            fitContent
            {...props.labelColumnProps}
            class={`${type() == 'light' ? 'border-neutral-100' : 'border-neutral-100'}`}
          >
            {(item) => <div class="font-semibold">{item.label}</div>}
          </Table.Column>
        )}
        <Table.Column
          {...props.contentColumnProps}
          class={`${type() == 'light' ? 'border-neutral-100' : props.hideLabel ? '' : 'border-l border-neutral-100'}`}
        >
          {(item) => <div>{item.content}</div>}
        </Table.Column>
      </Table>
    </>
  );
}
