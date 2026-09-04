import { baseConfig } from '@core/components/config/BaseConfig';
import { CellButton, CellButtonProps } from '@core/components/table/CellButton';
import { toast } from '@core/components/toast/ToastProvider';
import { useDatatable } from '@core/components/table/DatatableContext';
import { useIsAgencyView } from '@/shared/hooks/useIsAgencyView';
import { agencyActingTenantId, setAgencyActingTenantId } from '@/shared/contexts/agency/agencyActingTenant';

export interface CellButtonUpdateProps<ListItemType, ItemType>
  extends CellButtonProps {
  item: ListItemType;
  itemQuery?: (item: ListItemType) => Promise<ItemType>;
  onItemLoaded?: (item: ItemType) => any;
}
export function CellButtonUpdate<ListItemType, ItemType>(
  props: CellButtonUpdateProps<ListItemType, ItemType>,
) {
  const { setIsFormlogOpen, setFormlogItem } = useDatatable();
  const isAgency = useIsAgencyView();
  const icon = () => props.icon || baseConfig().iconUpdate();

  const onClick: (e: MouseEvent) => void = async (e) => {
    // Parase 2: Agency sửa bản ghi nào → tự đặt "tổ chức đang thao tác" = tổ chức của bản ghi đó
    // (mutation sẽ scope đúng tổ chức, và danh sách đồng bộ theo). Bỏ qua nếu không xác định được.
    if (isAgency()) {
      const tid = (props.item as any)?.tenantId;
      if (tid && tid !== agencyActingTenantId()) setAgencyActingTenantId(tid);
    }
    if (props.onClick) {
      await props.onClick?.(e);
    } else {
      if (props.itemQuery) {
        try {
          const item = await props.itemQuery(props.item);
          setFormlogItem(item as any);
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
