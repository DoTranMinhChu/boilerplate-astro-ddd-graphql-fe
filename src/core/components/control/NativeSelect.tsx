import { mergeClass } from '@core/helpers/class';
import { For, Ref } from 'solid-js';
import { OptionGroup } from './Select';

export interface NativeSelectProps extends BaseProps, FormControlProps<any> {
  options: Option[];
  optionGroups: OptionGroup[];
  placeholder?: string;
  clearable?: boolean;
  selectRef?: Ref<HTMLSelectElement>;
  emptyPlaceholder: string;
  multi?: boolean;
}

export function NativeSelect(props: NativeSelectProps) {
  const selectClass = () =>
    mergeClass(`flex-1 focus-visible:ring-2 focus-visible:ring-nb-accent`, props.class);

  return (
    <select
      id={props.id}
      name={props.name}
      tabIndex={props.readOnly || props.disabled || props.skipTabIndex ? -1 : 0}
      disabled={props.readOnly || props.disabled}
      multiple={props.multi}
      class={selectClass()}
      ref={el => {
          const r = props.selectRef;
          if (typeof r === 'function') r(el);
        }}
      value={props.value}
      onChange={(e) => {
        if (props.multi || e.currentTarget.multiple) {
          const selectedOptions = e.currentTarget.selectedOptions;
          const values = [];
          for (let i = 0; i < selectedOptions.length; i++) {
            values.push(selectedOptions[i].value);
          }
          props.onChange?.(values);
        } else {
          props.onChange?.(e.currentTarget.value);
        }
      }}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
    >
      {props.clearable && <option value={''}>{props.emptyPlaceholder}</option>}
      {props.optionGroups.length ? (
        <For each={props.optionGroups}>
          {(optGroup) => (
            <optgroup label={optGroup.group}>
              <For each={optGroup.options}>
                {(option) => (
                  <option value={option.value}>{option.label}</option>
                )}
              </For>
            </optgroup>
          )}
        </For>
      ) : (
        <For each={props.options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      )}
    </select>
  );
}