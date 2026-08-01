import { mergeClass } from '@core/helpers/class';
import { createEffect, For } from 'solid-js';
import { baseConfig } from '../config/BaseConfig';
import { Checkbox } from './Checkbox';
import { createControl } from './createControl';

export interface RadioProps extends FormControlProps {
  uncheckedIcon?: JSX.Element;
  checkedIcon?: JSX.Element;
  color?: 'main' | 'sub' | 'accent';
  radioClass?: string;
  iconClass?: string;
  textClass?: string;
  subTextClass?: string;
  options: Option[];
  col?: Col;
}
export function Radio(props: RadioProps) {
  const { id, value, onChange, readOnly, error, hasInited } =
    createControl<any>('mixed', props);
  const color = () => props.color || 'main';
  const options = () => props.options || [];

  const radioGroupClass = () =>
    mergeClass(
      'gap-x-6',
      props.col ? 'grid grid-cols-12' : 'flex flex-wrap',
      props.class,
    );

  const radioClass = () => mergeClass(props.radioClass);

  const checkedIcon = () =>
    props.checkedIcon || baseConfig().iconRadioChecked();
  const uncheckedIcon = () =>
    props.uncheckedIcon || baseConfig().iconRadioUnchecked();

  createEffect(() => {
    if (hasInited() && !value() && options().length) {
      const option = options().find((option) => !option.disabled);
      if (option) onChange(option.value);
    }
  });

  return (
    <div
      id={id()}
      class={radioGroupClass()}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
    >
      <For each={options()}>
        {(option, _index) => (
          <Checkbox
            fieldless
            checkedIcon={checkedIcon()}
            uncheckedIcon={uncheckedIcon()}
            text={option.label}
            subText={option.subText}
            col={option.col || props.col}
            class={radioClass()}
            textClass={props.textClass}
            iconClass={props.iconClass}
            readOnly={readOnly() || option.disabled}
            error={error()}
            color={color()}
            value={value() == option.value}
            onClick={() => {
              if (option.value !== value()) {
                onChange(option.value);
              }
            }}
            isControlled
          />
        )}
      </For>
    </div>
  );
}
