import { baseConfig } from '@core/components/config/BaseConfig';
import { CellButton, CellButtonProps } from '@core/components/table/CellButton';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { MODAL_DURATION } from '@core/components/modal/ModalProvider';
import { toast } from '@core/components/toast/ToastProvider';
import { useDatatable } from '@core/components/table/DatatableContext';
import { useIsAgencyView } from '@/shared/hooks/useIsAgencyView';
import { agencyActingTenantId, setAgencyActingTenantId } from '@/shared/contexts/agency/agencyActingTenant';

export interface CellButtonDeleteProps<ListItemType> extends CellButtonProps {
  item: ListItemType;
  deleteMutation?: (item: ListItemType) => Promise<string>;
  deleteConfirmTitle?: string;
  deleteConfirmContent?: JSX.Element;
  deleteConfirmSubmitLabel?: string;
  itemName?: string | null;
  errorMode?: 'toast' | 'dialog';
}
export function CellButtonDelete<ListItemType>(
  props: CellButtonDeleteProps<ListItemType>,
) {
  const { refresh, service } = useDatatable();
  const isAgency = useIsAgencyView();
  const icon = () => props.icon || baseConfig().iconDelete();
  const errorMode = () => props.errorMode || 'toast';

  const onClick: (e: MouseEvent) => void = async (e) => {
    // Parase 2: Agency xóa bản ghi nào → tự đặt "tổ chức đang thao tác" = tổ chức của bản ghi đó.
    if (isAgency()) {
      const tid = (props.item as any)?.tenantId;
      if (tid && tid !== agencyActingTenantId()) setAgencyActingTenantId(tid);
    }
    if (props.onClick) {
      await props.onClick?.(e);
    } else {
      const actionName =
        props.deleteConfirmTitle ||
        baseConfig().datatableDeleteItemLabel(service.displayName);
      const res = await confirmAction().danger(() => actionName + '?', {
        content: () =>
          props.deleteConfirmContent ||
          baseConfig().datatableDeleteItemContent(
            service.displayName,
            props.itemName || '',
          ),
        submitLabel:
          props.deleteConfirmSubmitLabel ||
          baseConfig().datatableDeleteItemLabel(service.displayName),
        position: 'right',
        e,
      });
      if (res) {
        if (props.deleteMutation) {
          try {
            await props.deleteMutation(props.item);
            toast().success(baseConfig().taskSuccessText(actionName));
            refresh();
          } catch (err: any) {
            if (errorMode() == 'toast') {
              toast().danger(
                baseConfig().taskFailureText(actionName),
                err?.message,
              );
            } else {
              setTimeout(() => {
                confirmAction().error(
                  baseConfig().taskFailureText(actionName),
                  {
                    content: err?.message,
                    position: 'right',
                    e,
                  },
                );
              }, MODAL_DURATION);
            }
          }
        } else {
          toast().warning('Require deleteMutation implementation!');
        }
      }
    }
  };

  return (
    <CellButton {...props} interactDanger icon={icon()} onClick={onClick} />
  );
}
