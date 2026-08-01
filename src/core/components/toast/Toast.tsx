import { Button, ButtonProps } from '@core/components/button/Button';
import { dismissToast } from '@core/components/toast/ToastProvider';
import { mergeClass } from '@core/helpers/class';
import { checkMobileOrTablet } from '@core/helpers/device';
import { Index, Show, splitProps } from 'solid-js';
import { produce } from 'solid-js/store';
import type { Toast as ToastState } from 'solid-toast';
import { baseConfig } from '../config/BaseConfig';

// TODO: might replace solid-toast
export interface ToastProps extends BaseProps {
  t?: ToastState;
  title?: JSX.Element | string;
  content?: JSX.Element | string;
  type?: ToastType;
  icon?: JSX.Element;
  iconClass?: string;
  titleClass?: string;
  contentClass?: string;
  wrapperClass?: string;
  dismissable?: boolean;
  dismissClass?: string;
  dismissIcon?: JSX.Element;
  actions?: ToastAction[];
  enterClass?: string;
  exitClass?: string;
  onDismiss?: (e?: MouseEvent) => any;

  neutral?: boolean;
  info?: boolean;
  success?: boolean;
  warning?: boolean;
  danger?: boolean;
  special?: boolean;
  main?: boolean;
}
export interface ToastAction extends ButtonProps {
  dismissAfterTask?: boolean;
}
export type ToastType =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'special'
  | 'main';

export function Toast(props: ToastProps) {
  const visible = () => !!props.t?.visible;
  const toastClass = () => {
    let toastClass = `${visible()
      ? props.t?.position?.includes('top')
        ? 'animate-fade-in-top'
        : 'animate-fade-in-bottom'
      : props.t?.position?.includes('top')
        ? 'animate-fade-out-top'
        : 'animate-fade-out-bottom'
      } w-full py-3 px-2 rounded-lg shadow-md flex items-center text-left gap-1.5 `;
    switch (props.type) {
      case 'main': {
        toastClass += `bg-white border-neutral-100`;
        break;
      }
      case 'info': {
        toastClass += `bg-info`;
        break;
      }
      case 'success': {
        toastClass += `bg-success`;
        break;
      }
      case 'warning': {
        toastClass += `bg-warning`;
        break;
      }
      case 'danger': {
        toastClass += `bg-danger`;
        break;
      }
      case 'special': {
        toastClass += `bg-special`;
        break;
      }
      case 'neutral':
      default: {
        toastClass += `bg-neutral-600`;
      }
    }
    return mergeClass(toastClass, props.class);
  };
  const titleClass = () => {
    let titleClass = `text-sm font-semibold text-white leading-tight `;
    switch (props.type) {
      case 'main': {
        titleClass += `text-neutral-700`;
        break;
      }
    }
    return mergeClass(titleClass, props.titleClass);
  };
  const contentClass = () => {
    let contentClass = `font-normal text-xsm leading-tight line-clamp-2 `;
    switch (props.type) {
      case 'main': {
        contentClass += `text-neutral`;
        break;
      }
      case 'info': {
        contentClass += `text-info-50`;
        break;
      }
      case 'success': {
        contentClass += `text-success-50`;
        break;
      }
      case 'warning': {
        contentClass += `text-warning-50`;
        break;
      }
      case 'danger': {
        contentClass += `text-danger-50`;
        break;
      }
      case 'special': {
        contentClass += `text-special-50`;
        break;
      }
      case 'neutral':
      default: {
        contentClass += `text-neutral-50`;
      }
    }
    return mergeClass(contentClass, props.contentClass);
  };
  const iconClass = () => {
    let iconClass = `text-xl pl-0.5 self-start `;
    switch (props.type) {
      case 'main': {
        iconClass += `text-main`;
        break;
      }
      case 'info': {
        iconClass += `text-info-50`;
        break;
      }
      case 'success': {
        iconClass += `text-success-50`;
        break;
      }
      case 'warning': {
        iconClass += `text-warning-50`;
        break;
      }
      case 'danger': {
        iconClass += `text-danger-50`;
        break;
      }
      case 'special': {
        iconClass += `text-special-50`;
        break;
      }
      case 'neutral':
      default: {
        iconClass += `text-neutral-50`;
      }
    }
    return mergeClass(iconClass, props.contentClass);
  };
  const dismissClass = () => {
    const dismissClass = `transform translate-x-0.5 ${props.content ? `-translate-y-0.5` : ``
      } self-start`;
    return mergeClass(dismissClass, props.dismissClass);
  };
  const wrapperClass = () => {
    let wrapperClass = ``;
    if (props.actions?.length) wrapperClass += 'w-sm';
    else wrapperClass += 'w-xs';
    return mergeClass(wrapperClass, props.wrapperClass);
  };

  const [local,] = splitProps(props, [
    'neutral',
    'info',
    'success',
    'warning',
    'danger',
    'special',
    'main',
    'icon',
    'actions',
  ]);
  const type = () => {
    let type: ToastType;
    if (props.type) {
      type = props.type;
    } else if (local.info) {
      type = 'info';
    } else if (local.success) {
      type = 'success';
    } else if (local.warning) {
      type = 'warning';
    } else if (local.danger) {
      type = 'danger';
    } else if (local.special) {
      type = 'special';
    } else if (local.main) {
      type = 'main';
    } else {
      type = 'neutral';
    }
    return type;
  };
  const icon = () => {
    let icon = props.icon;
    if (!icon) {
      switch (type()) {
        case 'info': {
          icon = baseConfig().iconInfo();
          break;
        }
        case 'success': {
          icon = baseConfig().iconSuccess();
          break;
        }
        case 'warning': {
          icon = baseConfig().iconWarning();
          break;
        }
        case 'danger': {
          icon = baseConfig().iconDanger();
          break;
        }
        default: {
          icon = baseConfig().iconInfo();
        }
      }
    }
    return icon;
  };

  const actions = () => {
    return produce((actions: ToastAction[]) => {
      for (let i = 0; i < actions.length; i++) {
        actions[i] = {
          padding: 'compact',
          type: 'flat',
          color: type() == 'main' ? 'neutral' : 'white',
          ...actions[i],
        };
      }
    })(local.actions || []);
  };

  return (
    <div
      class={wrapperClass()}
      onClick={() => {
        if (props.id && checkMobileOrTablet()) {
          dismissToast(props.id);
        }
      }}
    >
      <div class={toastClass()}>
        <Show when={icon()}>
          <i class={iconClass()}>{icon()}</i>
        </Show>
        <div class="flex-1">
          <div class={titleClass()}>{props.title}</div>
          <Show when={props.content}>
            <div class={contentClass()}>{props.content}</div>
          </Show>
        </div>
        <Index each={actions()}>
          {(action) => (
            <Button
              {...action()}
              onClick={async (e: MouseEvent) => {
                await action().onClick?.(e);
                if (action().dismissAfterTask) {
                  props.onDismiss?.(e);
                }
              }}
            />
          )}
        </Index>
        <Show when={props.dismissable}>
          <Button
            flat
            compact
            color={props.type == 'main' ? 'neutral' : 'white'}
            icon={props.dismissIcon}
            class={dismissClass()}
            onClick={async (e) => {
              await props.onDismiss?.(e);
            }}
          />
        </Show>
      </div>
    </div>
  );
}
