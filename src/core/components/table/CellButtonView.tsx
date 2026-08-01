import { baseConfig } from '@core/components/config/BaseConfig';
import { CellButton, CellButtonProps } from '@core/components/table/CellButton';
import { toast } from '../toast/ToastProvider';
import { useDatatable } from './DatatableContext';

export interface CellButtonViewProps<ListItemType, ItemType>
  extends CellButtonProps {
  item: ListItemType;
  itemQuery?: (item: ListItemType) => Promise<ItemType>;
  onItemLoaded?: (item: ItemType) => any;
}

export function CellButtonView<ListItemType, ItemType>(
  props: CellButtonViewProps<ListItemType, ItemType>,
) {
  const { setIsFormlogOpen, setFormlogItem, setIsFormlogReadOnly } = useDatatable();
  const icon = () => props.icon || baseConfig().iconEyeOn();

  const onClick: (e: MouseEvent) => void = async (e) => {
    if (props.onClick) {
      await props.onClick?.(e);
    } else {
      if (props.itemQuery) {
        try {
          const item = await props.itemQuery(props.item);
          setFormlogItem(item as any);
          setIsFormlogReadOnly(true);
          setIsFormlogOpen(e);
          await props.onItemLoaded?.(item);
        } catch (err: any) {
          toast().danger(err.message);
        }
      } else {
        toast().warning('Require itemQuery implementation!');
      }
    }
  };

  return <CellButton {...props} icon={icon()} onClick={onClick} />;
}
