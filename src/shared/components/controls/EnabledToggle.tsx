import { Toggle } from '@core/components/control/Toggle';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { useDatatable } from '@core/components/table/DatatableContext';
import { toast } from '@core/components/toast/ToastProvider';

interface Props extends BaseProps {
  readOnly?: boolean;
  disableTitle: string;
  disableContent: JSX.Element;
  enableTitle: string;
  enableContent: JSX.Element;
  enabled: boolean;
  updateEnabled: (enabled: boolean) => Promise<any>;
}
export function EnabledToggle(props: Props) {
  const { refresh } = useDatatable();
  return (
    <Toggle
      readOnly={props.readOnly}
      value={props.enabled}
      onToggle={async () => {
        if (props.enabled) {
          const res = await confirmAction().danger(props.disableTitle, {
            position: 'right',
            content: () => props.disableContent,
          });
          if (res) {
            try {
              await props.updateEnabled(false);
              toast().success(`Ngừng hoạt động thành công`);
              refresh();
            } catch (err: any) {
              toast().danger(`Ngừng hoạt động thất bại`, err?.message);
              throw err;
            }
          } else {
            throw Error();
          }
        } else {
          const res = await confirmAction().question(props.enableTitle, {
            position: 'right',
            content: () => props.enableContent,
          });
          if (res) {
            try {
              await props.updateEnabled(true);
              toast().success(`Bật hoạt động thành công`);
              refresh();
            } catch (err: any) {
              toast().danger(`Bật hoạt động thất bại`, err?.message);
              throw err;
            }
          } else {
            throw Error();
          }
        }
      }}
    />
  );
}
