import { mergeClass } from '@core/helpers/class';
import { mergeRef } from '@core/helpers/ref';
import { FocusEventHandler } from '@core/types/jsx';
import { For, Ref, createSignal, splitProps } from 'solid-js';
import { baseConfig } from '../config/BaseConfig';
import { InputWrapper, InputWrapperProps } from './InputWrapper';
import { createControl } from './createControl';

export interface InputMultiProps
  extends FormControlProps<string[]>,
  Omit<InputWrapperProps, 'onClear'> {
  /**The class for the input inside. */
  inputClass?: string;
  /** The class for the chip */
  chipClass?: string;
  chipRemoveClass?: string;
  iconRemove?: JSX.Element;
  /**Prevent user to input or paste more than the character required.  */
  maxLength?: number;
  /**Autofocus the input when it appears (on a page or a form) */
  autoFocus?: boolean;
  /**The input element reference */
  inputRef?: Ref<HTMLInputElement>;
  /**Base instruction placeholder text */
  instructionPlaceholder?: string;
}
export function InputMulti(props: InputMultiProps) {
  let inputRef: Ref<HTMLInputElement>;
  const [wrapperProps, _inputProps] = splitProps(props, [
    'class',
    'prefix',
    'prefixClass',
    'icon',
    'iconClass',
    'suffix',
    'suffixClass',
    'endIcon',
    'endIconClass',
    'ref',
    'onWrapperFocus',
    'onWrapperBlur',
  ]);
  const { id, name, value, onChange, readOnly, error } = createControl<
    string[]
  >('array', props);
  const [focused, setFocused] = createSignal(false);
  const placeholder = () =>
    props.placeholder || (focused() ? instructionPlaceholder() : '');
  const [inputValue, setInputValue] = createSignal('');
  const focusInput = () => {
    (inputRef as HTMLInputElement).focus();
  };
  const handleAddItem = (val: string) => {
    onChange([...(value() || []), val]);
  };
  const handleRemoveItem = (index: number) => {
    const newValue = [...value()];
    newValue.splice(index, 1);
    onChange(newValue);
  };
  const handleFocus: FocusEventHandler<HTMLInputElement, FocusEvent> = (e) => {
    setFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur: FocusEventHandler<HTMLInputElement, FocusEvent> = (e) => {
    setFocused(false);
    props.onBlur?.(e);
  };

  const chipClass = () =>
    mergeClass(
      'flex group items-center relative h-8 px-2 rounded-xs bg-lightest border border-lighter text-sm',
      props.chipClass,
    );
  const chipRemoveClass = () =>
    mergeClass(
      'text-base absolute -top-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 flex-center cursor-pointer text-neutral-400 hover:text-neutral',
      props.chipRemoveClass,
    );
  const inputClass = () =>
    mergeClass(
      'flex-1 w-full px-1 h-8 bg-transparent font-normal text-base rounded-inherit focus:outline-hidden min-w-0',
      props.inputClass,
    );
  const inputMultiClass = () =>
    mergeClass('flex w-full flex-wrap gap-1 p-1 pr-8', props.class);

  const iconRemove = () => props.iconRemove || baseConfig().iconClear();
  const instructionPlaceholder = () =>
    props.instructionPlaceholder ||
    baseConfig()?.inputMultiInstructionPlaceholder;

  return (
    <InputWrapper
      {...wrapperProps}
      error={error()}
      readOnly={readOnly()}
      maxLength={props.maxLength}
      clearable={!!value().length}
      onClear={() => {
        onChange([]);
        setInputValue('');
        focusInput();
      }}
    >
      <div
        class={inputMultiClass()}
        onClick={(_e) => {
          focusInput();
        }}
      >
        <For each={value()}>
          {(item, index) => (
            <div
              class={chipClass()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              {item}
              <div
                class={chipRemoveClass()}
                onClick={(e) => {
                  handleRemoveItem(index());
                  focusInput();
                  e.stopPropagation();
                }}
              >
                {iconRemove()}
              </div>
            </div>
          )}
        </For>
        <input
          placeholder={placeholder()}
          maxLength={props.maxLength}
          class={inputClass()}
          tabIndex={props.skipTabIndex ? -1 : 0}
          name={name()}
          ref={mergeRef(props.inputRef, (el) => (inputRef = el))}
          id={id()}
          readOnly={readOnly()}
          autofocus={props.autoFocus}
          value={inputValue()}
          onInput={(e) => {
            setInputValue(e.target.value);
          }}
          onKeyDown={(e) => {
            switch (e.key) {
              case 'Backspace': {
                if (!inputValue() && value().length) {
                  handleRemoveItem(value().length - 1);
                }
                break;
              }
              case 'Enter': {
                if (inputValue()) {
                  handleAddItem(inputValue());
                  setInputValue('');
                }
                e.preventDefault();
                break;
              }
            }
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {props.children}
      </div>
    </InputWrapper>
  );
}
