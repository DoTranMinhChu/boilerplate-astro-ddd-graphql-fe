import { getCol, mergeClass } from '@core/helpers/class';
import { baseConfig } from '../config/BaseConfig';
import { createControl } from './createControl';

export interface CheckboxProps extends FormControlProps<boolean> {
  uncheckedIcon?: JSX.Element;
  checkedIcon?: JSX.Element;
  iconClass?: string;
  text?: string | JSX.Element;
  textClass?: string;
  subText?: string | JSX.Element;
  subTextClass?: string;
  color?: 'main' | 'sub' | 'accent';
  col?: Col;
  onClick?: (e: MouseEvent | KeyboardEvent) => any;
  isControlled?: boolean;
  role?: 'checkbox' | 'radio';
}
export function Checkbox(props: CheckboxProps) {
  const { id, value, onChange, readOnly, error } = createControl<boolean>(
    'boolean',
    props,
  );
  const color = () => props.color || 'main';

  const checkboxClass = () =>
    mergeClass(
      'min-h-10 py-2 inline-flex self-start gap-1.5 cursor-pointer group ',
      readOnly() && 'pointer-events-none',
      getCol(props.col),
      props.class,
    );
  const textClass = () =>
    mergeClass(
      'text-neutral-700 group-hover:text-neutral-900 font-medium',
      readOnly() && 'text-neutral-300',
      !props.subText && 'mt-0.5',
      props.textClass,
    );
  const subTextClass = () =>
    mergeClass(
      'font-normal text-sm text-neutral group-hover:text-neutral-600 leading-tight',
      readOnly() && 'text-neutral-200',
      props.subTextClass,
    );
  const colorIconClass = () => {
    switch (color()) {
      case 'main': {
        return readOnly()
          ? 'text-main-200'
          : 'text-main group-hover:text-main-600';
      }
      case 'sub': {
        return readOnly()
          ? 'text-sub-200'
          : 'text-sub group-hover:text-sub-600';
      }
      case 'accent': {
        return readOnly()
          ? 'text-accent-200'
          : 'text-accent group-hover:text-accent-600';
      }
    }
  };
  const iconClass = () =>
    mergeClass(
      'text-2xl w-6 h-6 mt-0.5 flex-center',
      value()
        ? colorIconClass()
        : readOnly()
          ? 'text-neutral-200'
          : 'text-neutral-200 group-hover:text-neutral-300 group-hover:bg-lightest',
      error() && 'text-danger group-hover:text-danger-600',
      props.iconClass,
    );

  const checkedIcon = () =>
    props.checkedIcon || baseConfig().iconCheckboxChecked();

  const uncheckedIcon = () =>
    props.uncheckedIcon || baseConfig().iconCheckboxUnchecked();

  return (
    <div
      id={id()}
      role={props.role || 'checkbox'}
      aria-checked={value()}
      tabIndex={props.skipTabIndex || readOnly() ? -1 : 0}
      class={checkboxClass()}
      onClick={(e) => {
        if (readOnly()) return;
        props.onClick?.(e);
        if (!props.isControlled) onChange(!value());
      }}
      onKeyDown={(e) => {
        if (readOnly()) return;
        if (e.key == 'Enter' || e.key === ' ') {
          e.preventDefault();
          props.onClick?.(e);
          if (!props.isControlled) onChange(!value());
        }
      }}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
    >
      <div class={iconClass()}>{value() ? checkedIcon() : uncheckedIcon()}</div>
      {props.text && (
        <div class={textClass()}>
          {props.text}
          {props.subText && <div class={subTextClass()}>{props.subText}</div>}
        </div>
      )}
    </div>
  );
}
