import { useDatatable } from './DatatableContext';

export interface DatatableSelectionProps<ListItemType> extends BaseProps {
  children?: ({
    items,
    count,
    refresh,
  }: {
    items: () => ListItemType[];
    count: () => number;
    refresh: () => Promise<any>;
  }) => JSX.Element;
}
export function DatatableSelection<ListItemType>(
  props: DatatableSelectionProps<ListItemType>,
) {
  const { selectedItems, refresh } = useDatatable();
  const items = () => Object.values(selectedItems() || {}) as ListItemType[];
  const count = () => Object.keys(selectedItems() || {}).length;

  return (
    <div class="flex w-full gap-2">
      <div
        class={`flex flex-1 items-center rounded-md px-2 py-2 ${count() ? `bg-main-100` : `bg-lighter`}`}
      >
        <span class={`px-1 ${count() ? `font-semibold text-main` : ``}`}>
          {count()}
        </span>{' '}
        sản phẩm đã chọn
      </div>
      {props.children ? (
        <div class="ml-auto">{props.children({ items, count, refresh })}</div>
      ) : (
        <></>
      )}
    </div>
  );
}
