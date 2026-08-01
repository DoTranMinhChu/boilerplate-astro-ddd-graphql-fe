import { createStore } from 'solid-js/store';
import { Table as BaseTable, TableProps } from './Table';
import { TableColumn, TableColumnProps } from './TableColumn';
import { TableRow, TableRowProps } from './TableRow';

export function generateTable<ItemType>({
  items,
}: Pick<TableProps<ItemType>, 'items'>) {
  const [store, setStore] = createStore<{ items: ItemType[] }>({
    items: items || [],
  });

  const Table = (props: Omit<TableProps<ItemType>, 'items'>) => (
    <BaseTable {...props} items={store.items} />
  );

  Table.Column = (props: TableColumnProps<ItemType>) => (
    <TableColumn {...props} />
  );
  Table.Row = (props: TableRowProps) => <TableRow {...props} />;

  return {
    Table,
    mutateItems: (items: ItemType[]) => {
      if (store.items.length !== items.length) {
        setStore('items', [...items]);
      } else {
        items.forEach((item, i) => {
          setStore('items', i, item);
        });
      }
    },
  };
}
