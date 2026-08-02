import { Toggle } from '@core/components/control/Toggle';
import { confirmAction } from '@core/components/dialog/ConfirmProvider';
import { useDatatable } from '@core/components/table/DatatableContext';
import { toast } from '@core/components/toast/ToastProvider';
import { t } from '@/shared/i18n/t';

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
              toast().success(t('shared.controls.enabledToggle.disableSuccess'));
              refresh();
            } catch (err: any) {
              toast().danger(t('shared.controls.enabledToggle.disableError'), err?.message);
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
              toast().success(t('shared.controls.enabledToggle.enableSuccess'));
              refresh();
            } catch (err: any) {
              toast().danger(t('shared.controls.enabledToggle.enableError'), err?.message);
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
