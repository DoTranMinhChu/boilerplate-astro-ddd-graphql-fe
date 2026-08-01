import { mergeClass } from '@core/helpers/class';
import { For } from 'solid-js';
import { Checkbox } from './Checkbox';
import { createControl } from './createControl';

export interface CheckboxMultiProps extends FormControlProps<string[]> {
  color?: 'main' | 'sub' | 'accent';
  col?: Col;
  options: Option[];
  checkboxClass?: string;
}
export function CheckboxMulti(props: CheckboxMultiProps) {
  const { id, value, onChange, readOnly, error } = createControl<string[]>(
    'array',
    props,
  );
  const color = () => props.color || 'main';
  const options = () => props.options || [];

  const checkboxMultiClass = () =>
    mergeClass(
      'gap-x-6',
      props.col ? 'grid grid-cols-12' : 'flex flex-wrap',
      props.class,
    );

  return (
    <div
      id={id()}
      class={checkboxMultiClass()}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
    >
      <For each={options()}>
        {(option) => (
          <Checkbox
            fieldless
            text={option.label}
            subText={option.subText}
            col={option.col || props.col}
            class={props.checkboxClass}
            readOnly={readOnly() || option.disabled}
            error={readOnly() || option.disabled ? '' : error()}
            color={color()}
            value={value().includes(option.value)}
            onChange={(val: any) => {
              const index = value().findIndex((x) => x == option.value);
              const newValues = [...value()];
              if (val && index < 0) {
                newValues.push(option.value);
                newValues.sort(
                  (a, b) =>
                    options().findIndex((option) => option.value === a) -
                    options().findIndex((option) => option.value === b),
                );
                onChange(newValues);
              } else if (!val && index >= 0) {
                newValues.splice(index, 1);
                onChange(newValues);
              }
            }}
          />
        )}
      </For>
    </div>
  );
}
