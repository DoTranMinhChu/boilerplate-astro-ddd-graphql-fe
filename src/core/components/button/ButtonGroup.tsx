import {
  Button,
  ButtonProps,
  ButtonSizeProps,
} from '@core/components/button/Button';
import { mergeClass } from '@core/helpers/class';
import { Show } from 'solid-js';

export interface ButtonGroupProps extends BaseProps, ButtonSizeProps {
  type?:
    | 'neutral'
    | 'info'
    | 'success'
    | 'warning'
    | 'danger'
    | 'main'
    | 'error'
    | 'caution'
    | 'question'
    | 'sub'
    | 'accent'
    | 'brand'
    | 'special';
  displayStyle?: 'default' | 'dialog' | 'fill';
  isStrong?: boolean;
  reverse?: boolean;
  submitLabel?: JSX.Element | string;
  cancelLabel?: JSX.Element | string;
  submitClass?: string;
  cancelClass?: string;
  submitProps?: ButtonProps;
  cancelProps?: ButtonProps;
  submitLoading?: boolean;
  cancelLoading?: boolean;
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
  onSubmit?: (e?: MouseEvent) => any;
  onCancel?: (e?: MouseEvent) => any;
}
export function ButtonGroup(props: ButtonGroupProps) {
  const displayStyle = () => props.displayStyle ?? 'default';
  const isStrong = () => props.isStrong ?? true;
  const size = () => props.size || (props.lg ? 'lg' : props.sm ? 'sm' : 'md');
  const submitClass = () =>
    mergeClass('', displayStyle() == 'fill' ? 'flex-1' : '', props.submitClass);
  const cancelClass = () =>
    mergeClass(
      props.reverse ? 'mr-auto' : 'ml-auto',
      displayStyle() == 'fill' ? 'grow-0 shrink-0' : '',
      props.cancelClass,
    );
  const buttonGroupClass = () => {
    let groupClass = 'rounded-lg ';

    switch (displayStyle()) {
      case 'dialog': {
        groupClass += 'p-2 ';
        switch (props.type) {
          case 'info': {
            groupClass += 'bg-info-50';
            break;
          }
          case 'success': {
            groupClass += 'bg-success-50';
            break;
          }
          case 'warning':
          case 'caution': {
            groupClass += 'bg-warning-50';
            break;
          }
          case 'danger':
          case 'error': {
            groupClass += 'bg-danger-50';
            break;
          }
          case 'main':
          case 'question': {
            groupClass += 'bg-main-50';
            break;
          }
          case 'sub': {
            groupClass += 'bg-sub-50';
            break;
          }
          case 'accent': {
            groupClass += 'bg-accent-50';
            break;
          }
          case 'brand': {
            groupClass += 'bg-brand-50';
            break;
          }
          case 'special': {
            groupClass += 'bg-special-50';
            break;
          }
          default: {
            groupClass += 'bg-lightest';
            break;
          }
        }
        break;
      }
      case 'fill': {
        groupClass += 'pt-2 ';
        break;
      }
      default:
      case 'default': {
        groupClass += 'pt-2 ';
      }
    }
    return mergeClass(
      groupClass,
      'flex gap-2 col-span-full',
      props.reverse ? 'flex-row-reverse' : '',
      props.class,
    );
  };

  const color: () => SemanticColor = () =>
    props.type == 'error'
      ? 'danger'
      : props.type == 'caution'
        ? 'warning'
        : props.type == 'question'
          ? 'main'
          : props.type || 'neutral';

  return (
    <div class={buttonGroupClass()} style={props.style}>
      <Show when={props.submitLabel}>
        <Button
          wide
          submit
          main
          solid={isStrong()}
          light={!isStrong()}
          color={color()}
          size={size()}
          {...props.submitProps}
          loading={props.submitLoading}
          disabled={props.submitDisabled}
          class={submitClass()}
          label={props.submitLabel}
          onClick={async (e: MouseEvent) => {
            await props.onSubmit?.(e);
          }}
        />
      </Show>
      {props.children}
      <Show when={props.cancelLabel}>
        <Button
          flat
          outline={displayStyle() == 'fill'}
          color={color()}
          size={size()}
          {...props.cancelProps}
          loading={props.cancelLoading}
          disabled={props.cancelDisabled}
          label={props.cancelLabel}
          class={cancelClass()}
          onClick={async (e: MouseEvent) => {
            await props.onCancel?.(e);
          }}
        />
      </Show>
    </div>
  );
}
