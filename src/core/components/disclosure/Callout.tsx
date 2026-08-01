import { Button, type ButtonProps } from '@core/components/button/Button';
import { baseConfig } from '@core/components/config/BaseConfig';
import { mergeClass } from '@core/helpers/class';
import { Index, Show, createSignal, splitProps } from 'solid-js';
import { produce } from 'solid-js/store';

export interface CalloutProps extends BaseProps, CalloutTypeProps {
  title: JSX.Element | string;
  content?: JSX.Element | string;
  icon?: JSX.Element;
  iconClass?: string;
  titleClass?: string;
  contentClass?: string;
  dismissable?: boolean;
  dismissClass?: string;
  dismissIcon?: JSX.Element;
  actions?: CalloutAction[];
  enterClass?: string;
  exitClass?: string;
  onDismiss?: () => any;
  neutral?: boolean;
  info?: boolean;
  success?: boolean;
  warning?: boolean;
  danger?: boolean;
  main?: boolean;
  sub?: boolean;
  accent?: boolean;
}
export interface CalloutAction extends ButtonProps {
  dismissAfterTask?: boolean;
}
interface CalloutTypeProps {
  type?: CalloutType;
}
export type CalloutType =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'main'
  | 'sub'
  | 'accent';

export function Callout(props: CalloutProps) {
  const [isVisible, setIsVisible] = createSignal(true);

  const type = () => {
    let type: CalloutType;
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
    } else if (local.main) {
      type = 'main';
    } else if (local.sub) {
      type = 'sub';
    } else if (local.accent) {
      type = 'accent';
    } else {
      type = 'neutral';
    }
    return type;
  };

  const calloutClass = () =>
    mergeClass(
      `flex gap-2 px-3 py-2 border rounded-sm`,
      type() == 'main'
        ? 'bg-white border-main'
        : type() == 'neutral'
          ? 'bg-neutral-50 border-neutral-600'
          : type() == 'info'
            ? 'bg-info-50 border-info-600'
            : type() == 'success'
              ? 'bg-success-50 border-success-600'
              : type() == 'warning'
                ? 'bg-warning-50 border-warning-600'
                : type() == 'danger'
                  ? 'bg-danger-50 border-danger-600'
                  : type() == 'sub'
                    ? 'bg-sub-50 border-sub-600'
                    : type() == 'accent'
                      ? 'bg-accent-50 border-accent-600'
                      : '',
      props.class,
    );

  const titleClass = () =>
    mergeClass(
      'font-medium text-base',
      type() == 'main'
        ? 'text-main'
        : type() == 'neutral'
          ? 'text-neutral-600'
          : type() == 'info'
            ? 'text-info-600'
            : type() == 'success'
              ? 'text-success-600'
              : type() == 'warning'
                ? 'text-warning-600'
                : type() == 'danger'
                  ? 'text-danger-600'
                  : type() == 'sub'
                    ? 'text-sub-600'
                    : type() == 'accent'
                      ? 'text-accent-600'
                      : '',
      // !props.content &&
      //   !actions().length &&
      //   'h-full flex items-center font-medium',
      props.titleClass,
    );

  const contentClass = () =>
    mergeClass(
      'font-normal text-sm text-neutral-700',
      type() == 'main'
        ? 'text-main-900'
        : type() == 'neutral'
          ? 'text-neutral-900'
          : type() == 'info'
            ? 'text-info-900'
            : type() == 'success'
              ? 'text-success-900'
              : type() == 'warning'
                ? 'text-warning-900'
                : type() == 'danger'
                  ? 'text-danger-900'
                  : type() == 'sub'
                    ? 'text-sub-900'
                    : type() == 'accent'
                      ? 'text-accent-900'
                      : '',
      props.contentClass,
    );

  const iconClass = () =>
    mergeClass(
      'text-xl leading-none pt-0.5',
      type() == 'main'
        ? 'text-main'
        : type() == 'neutral'
          ? 'text-neutral'
          : type() == 'info'
            ? 'text-info'
            : type() == 'success'
              ? 'text-success'
              : type() == 'warning'
                ? 'text-warning'
                : type() == 'danger'
                  ? 'text-danger'
                  : type() == 'sub'
                    ? 'text-sub'
                    : type() == 'accent'
                      ? 'text-accent'
                      : '',
      props.iconClass,
    );

  const dismissClass = () =>
    mergeClass(
      'transform translate-x-1.5 -translate-y-1 self-start',
      props.dismissClass,
    );

  const delineatorClass = () =>
    mergeClass(
      'inline-block h-1 w-1 rounded-full',
      type() == 'neutral'
        ? 'bg-neutral-200'
        : type() == 'main'
          ? 'bg-main-200'
          : type() == 'info'
            ? 'bg-info-200'
            : type() == 'success'
              ? 'bg-success-200'
              : type() == 'warning'
                ? 'bg-warning-200'
                : type() == 'danger'
                  ? 'bg-danger-200'
                  : type() == 'sub'
                    ? 'bg-sub-200'
                    : type() == 'accent'
                      ? 'bg-accent-200'
                      : '',
    );

  // const enterClass = () => props.enterClass || 'animate-slide-in-blurred-left';
  // const exitClass = () => props.exitClass || 'animate-fade-out-left';

  const [local, _rest] = splitProps(props, [
    'neutral',
    'info',
    'success',
    'warning',
    'danger',
    'main',
    'sub',
    'accent',
    'icon',
    'actions',
  ]);

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
    return produce((actions: CalloutAction[]) => {
      for (let i = 0; i < actions.length; i++) {
        actions[i] = {
          padding: 'compact',
          size: 'sm',
          type: 'outline',
          color: type(),
          ...actions[i],
        };
      }
    })(local.actions || []);
  };

  return (
    <Show when={isVisible()}>
      <div class={calloutClass()}>
        {import.meta.env.SSR ? (
          <i class={iconClass()}>{props.icon}</i>
        ) : (
          <Show when={icon()}>
            <i class={iconClass()}>{icon()}</i>
          </Show>
        )}
        <div class="flex-1">
          <div class={titleClass()}>{props.title}</div>
          <Show when={props.content}>
            <div class={contentClass()}>{props.content}</div>
          </Show>
          <Show when={actions().length}>
            <div class="flex flex-wrap items-center gap-2">
              <Index each={actions()}>
                {(action, index) => {
                  const [local, rest] = splitProps(action(), [
                    'dismissAfterTask',
                  ]);
                  return (
                    <>
                      <Button
                        {...rest}
                        onClick={async (e) => {
                          if (rest.onClick) {
                            await rest.onClick(e);
                          }
                          if (local.dismissAfterTask) {
                            setIsVisible(false);
                          }
                        }}
                      />
                      {index < (actions().length || 0) - 1 && (
                        <span class={delineatorClass()}></span>
                      )}
                    </>
                  );
                }}
              </Index>
            </div>
          </Show>
        </div>
        {props.dismissable && (
          <Button
            class={dismissClass()}
            icon={props.dismissIcon}
            sm
            flat
            compact
            onClick={() => {
              setIsVisible(false);
              if (props.onDismiss) {
                props.onDismiss();
              }
            }}
          />
        )}
      </div>
    </Show>
  );
}
