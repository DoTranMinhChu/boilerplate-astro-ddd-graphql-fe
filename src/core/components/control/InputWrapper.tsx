import { mergeClass } from '@core/helpers/class';
import { FocusEventHandler } from '@core/types/jsx';
import { Ref } from 'solid-js';
import { Button } from '../button/Button';
import { baseConfig } from '../config/BaseConfig';

export interface InputWrapperProps extends BaseProps {
  prefix?: string | JSX.Element;
  prefixClass?: string;
  suffix?: string | JSX.Element;
  suffixClass?: string;
  icon?: JSX.Element;
  iconClass?: string;
  endIcon?: JSX.Element;
  endIconClass?: string;
  error?: string;
  readOnly?: boolean;
  maxLength?: number;
  clearable?: boolean;
  iconClear?: JSX.Element;
  onClear?: () => any;
  onWrapperFocus?: FocusEventHandler<HTMLDivElement, FocusEvent>;
  onWrapperBlur?: FocusEventHandler<HTMLDivElement, FocusEvent>;
  ref?: Ref<HTMLDivElement>;
  buttonComponent?: typeof Button;
  textValue?: string;
}

export function InputWrapper(props: InputWrapperProps) {
  const iconClear = () => props.iconClear || baseConfig().iconClear();

  const wrapperClass = () =>
    mergeClass(
      'relative flex w-auto h-10 border bg-lightest rounded-sm border-neutral-200',
      !props.readOnly &&
      !props.error &&
      ' focus-within:bg-white hover:border-neutral-300 focus-within:border-main hover:focus-within:border-main focus-within:ring-1 focus-within:ring-main',
      props.readOnly &&
      'bg-lighter border-light hover:border-neutral-200 focus-within:ring-0',
      props.error &&
      'bg-danger-50 border-danger hover:border-danger-600 focus-within:border-danger-600 focus-within:ring-danger-600 hover:focus-within:border-danger',
      props.class,
    );

  const prefixClass = () =>
    mergeClass(
      'bg-neutral-50 flex-center px-3 font-medium text-sm rounded-inherit rounded-r-none border-r border-neutral-100 whitespace-nowrap',
      props.prefixClass,
    );
  const iconClass = () =>
    mergeClass('w-8 flex-center pl-2 text-xl', props.iconClass);

  const suffixClass = () =>
    mergeClass(
      'flex-center pr-2 font-semibold text-sm whitespace-nowrap',
      props.suffixClass,
    );
  const endIconClass = () =>
    mergeClass(
      'bg-inherit hover:bg-neutral-50 w-8 h-8 mr-1 absolute right-0 self-center max-h-full',
      (!props.clearable || props.readOnly) && 'pointer-events-none',
      props.readOnly && 'opacity-80',
      props.endIconClass,
    );

  return (
    <div
      ref={props.ref}
      class={wrapperClass()}
      onFocus={props.onWrapperFocus}
      onBlur={props.onWrapperBlur}
    >
      {props.prefix && <div class={prefixClass()}>{props.prefix}</div>}
      {props.icon && <div class={iconClass()}>{props.icon}</div>}
      <div class="rounded-inherit relative flex h-auto w-full bg-inherit">
        {props.children}
        {((props.clearable && !props.readOnly) || props.endIcon) && (
          <Button
            flat
            compact
            focusable={false}
            class={endIconClass()}
            icon={
              props.clearable && !props.readOnly ? iconClear() : props.endIcon
            }
            iconClass={'text-xl'}
            onClick={
              props.clearable && !props.readOnly
                ? () => props.onClear?.()
                : null
            }
          />
        )}
        {props.maxLength && props.textValue !== undefined && (
          <div class="flex-center absolute right-2 -bottom-2.5 rounded bg-neutral-100 px-1 py-0.5 text-xs font-medium shadow">
            {props.textValue.length}/{props.maxLength}
          </div>
        )}
      </div>
      {props.suffix && <div class={suffixClass()}>{props.suffix}</div>}
    </div>
  );
}
