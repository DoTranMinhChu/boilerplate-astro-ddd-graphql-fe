import { writeClipboard } from '@solid-primitives/clipboard';
import { mergeClass } from '@core/helpers/class';

import { Show, createSignal } from 'solid-js';
import { Button } from '../button/Button';
import { baseConfig } from '../config/BaseConfig';
import { toast } from '../toast/ToastProvider';
import { Icon } from '../icons/Icon';

export interface ValueProps extends BaseProps {
  copyable?: boolean | string;
  masked?: boolean | string;
}
export function Value(props: ValueProps) {
  const [isMasked, setIsMaked] = createSignal(true);
  const maskedChar = () =>
    typeof props.masked == 'string' ? props.masked : '•';
  const valueClass = () => mergeClass('flex items-center gap-2', props.class);
  const children = () => {
    const isString = typeof props.children == 'string';
    if (isString) {
      const text = props.children as string;
      if (isMasked() && props.masked)
        return text.replaceAll(/./g, maskedChar());
      else return text;
    }
    return props.children;
  };

  return (
    <div class={valueClass()}>
      {children()}
      <Show when={props.masked}>
        <Button
          compact
          flat
          lg
          icon={
            isMasked() ? baseConfig().iconEyeOn() : baseConfig().iconEyeOff()
          }
          onClick={() => {
            setIsMaked((val) => !val);
          }}
        />
      </Show>
      <Show when={props.copyable}>
        <Button
          tooltip="Sao chép"
          placement="right"
          compact
          light
          lg
          icon={baseConfig().iconCopy()}
          onClick={() => {
            if (
              (typeof props.children == 'string' && props.children) ||
              (typeof props.copyable == 'string' && props.copyable)
            ) {
              writeClipboard(
                typeof props.copyable == 'string'
                  ? props.copyable
                  : props.children,
              );
              toast().show('Đã sao chép', '', {
                icon: <Icon check />,
                id: undefined,
                duration: undefined,
                position: undefined,
                unmountDelay: undefined
              });
            } else {
              toast().danger('Không có dữ liệu để sao chép');
            }
          }}
        />
      </Show>
    </div>
  );
}
