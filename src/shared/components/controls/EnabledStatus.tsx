import { Show } from 'solid-js';
import { Icon } from '../icons/Icon';
import { t } from '@/shared/i18n/t';

export function EnabledStatus(props: { enabled: boolean }) {
  return (
    <>
      <Show when={props.enabled}>
        <div class="gap-1 font-medium text-success-600 flex-center">
          <Icon enabled />
          <span>{t('shared.controls.enabledStatus.active')}</span>
        </div>
      </Show>
      <Show when={!props.enabled}>
        <div class="flex-medium gap-1 text-neutral-600 flex-center">
          <Icon disabled />
          <span>{t('shared.controls.enabledStatus.inactive')}</span>
        </div>
      </Show>
    </>
  );
}
