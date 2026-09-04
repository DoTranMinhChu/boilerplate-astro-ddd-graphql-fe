import { ButtonColor, ButtonType } from '@core/components/button/Button';
import { baseConfig } from '@core/components/config/BaseConfig';
import {
  DatatableButton,
  DatatableButtonProps,
} from '@core/components/table/DatatableButton';
import { useDatatable } from '@core/components/table/DatatableContext';
import { useIsAgencyView } from '@/shared/hooks/useIsAgencyView';
import { agencyActingTenantId } from '@/shared/contexts/agency/agencyActingTenant';
import { toast } from '@core/components/toast/ToastProvider';

export interface DatatableButtonCreateProps extends DatatableButtonProps {}
export function DatatableButtonCreate(props: DatatableButtonCreateProps) {
  const { setFormlogItem, setIsFormlogOpen } = useDatatable();
  const isAgency = useIsAgencyView();
  let ref: HTMLDivElement;

  const icon = () => props.icon || baseConfig().iconCreate();
  const label = () => props.label || baseConfig().datatableCreateNewLabel;
  const color: () => ButtonColor = () => props.color || 'main';
  const type: () => ButtonType = () => props.type || 'solid';
  const onClick: (e: MouseEvent) => void = async (e) => {
    // Parase 2: Agency phải chọn tổ chức trước khi tạo dữ liệu (tránh mở form rồi bị từ chối).
    if (isAgency() && !agencyActingTenantId()) {
      toast().warning(
        'Vui lòng chọn một tổ chức ở thanh "Thao tác với tổ chức" trước khi tạo dữ liệu.',
      );
      return;
    }
    if (props.onClick) {
      await props.onClick?.(e);
    } else {
      setFormlogItem(null);
      setIsFormlogOpen(e);
    }
  };

  return (
    <DatatableButton
      ref={ref!}
      {...props}
      icon={icon()}
      label={label()}
      color={color()}
      type={type()}
      onClick={onClick}
    />
  );
}
