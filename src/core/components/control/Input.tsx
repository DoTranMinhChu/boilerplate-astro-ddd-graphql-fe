import { mergeClass } from '@core/helpers/class';
import { mergeRef } from '@core/helpers/ref';
import { Ref, splitProps } from 'solid-js';
import { InputWrapper, InputWrapperProps } from './InputWrapper';
import { createControl } from './createControl';

export interface InputProps<T = string | number>
  extends FormControlProps<T>,
  Omit<InputWrapperProps, 'onClear'> {
  /** The class for the input inside. */
  inputClass?: string;
  /**
   * Default: "text"
   */
  type?: 'text' | 'email' | 'tel' | 'url' | 'color' | 'password' | 'number';

  // --- Props cho Number ---
  min?: number | string;
  max?: number | string;
  step?: number | string;
  // ------------------------

  lowercase?: boolean;
  uppercase?: boolean;
  transformValue?: (val: string) => string;
  /** Clear the input immediately and focus afterwards */
  clearable?: boolean;
  /** Prevent user to input or paste more than the character required.  */
  maxLength?: number;
  /** Autofocus the input when it appears (on a page or a form) */
  autoFocus?: boolean;
  /** Autocomplete field. Value: 'off' | 'on' or a string dertermine the autocomplete field name*/
  autoComplete?: 'off' | 'on' | (string & {});
  /** The input element reference */
  inputRef?: Ref<HTMLInputElement>;
  onPaste?: (e: ClipboardEvent) => any;
}

export function Input<T extends string | number = string>(props: InputProps<T>) {
  let inputRef: Ref<HTMLInputElement>;

  const [wrapperProps, inputProps] = splitProps(props, [
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

  const type = () => props.type || 'text';

  // Với type="number", mặc định nullable=true để input rỗng → null (không phải 0).
  // Dùng Proxy để giữ nguyên tính reactive của inputProps.
  const controlInputProps = () => {
    if (type() !== 'number') return inputProps;
    return new Proxy(inputProps as any, {
      get(target: any, key: string) {
        if (key === 'nullable') return target.nullable ?? true;
        return target[key];
      },
    }) as typeof inputProps;
  };

  // Khởi tạo control với đúng kiểu dữ liệu (number hoặc text)
  const { id, name, value, onChange, readOnly, error } = createControl<T>(
    type() === 'number' ? 'number' : 'text',
    controlInputProps(),
  );

  const clearable = () =>
    props.clearable && (value() !== '' && value() !== null && value() !== undefined);

  const inputClass = () =>
    mergeClass(
      'flex-1 w-full h-auto px-2 bg-transparent font-normal text-base rounded-inherit focus:outline-none min-w-0',
      inputProps.inputClass,
    );

  const handleInput = (e: InputEvent & { currentTarget: HTMLInputElement; target: HTMLInputElement }) => {
    let rawVal = e.target.value ?? null;

    if (type() === 'number') {
      // Nếu input trống, trả về null cho hệ thống
      if (rawVal === '') {
        onChange(null as any);
        return;
      }

      const parsedVal = parseFloat(rawVal);

      // Chỉ cập nhật nếu là số hợp lệ, ngược lại giữ nguyên text thô (để cho phép gõ dấu trừ, dấu chấm)
      if (!isNaN(parsedVal)) {
        onChange(parsedVal as any);
      } else {
        onChange(rawVal as any);
      }
    } else {
      // XỬ LÝ TEXT
      if (props.lowercase) {
        rawVal = rawVal.toLowerCase();
      } else if (props.uppercase) {
        rawVal = rawVal.toUpperCase();
      }

      if (props.transformValue) {
        rawVal = props.transformValue(rawVal);
        e.target.value = rawVal;
      }

      onChange(rawVal as any);
    }
  };

  return (
    <InputWrapper
      {...wrapperProps}
      // Đảm bảo không hiển thị chữ "null" ra giao diện khi value là null
      textValue={value() === null || value() === undefined ? '' : String(value())}
      error={error()}
      readOnly={readOnly()}
      maxLength={props.maxLength}
      clearable={clearable()}
      onClear={() => {
        // Khi nhấn xóa nhanh, trả về null nếu là kiểu number
        onChange(type() === 'number' ? null as any : ('' as any));
        (inputRef as HTMLElement | undefined)?.focus();
      }}
    >
      <input
        maxLength={props.maxLength}
        class={inputClass()}
        tabIndex={props.skipTabIndex ? -1 : 0}
        name={name()}
        ref={mergeRef(props.inputRef, (ref) => (inputRef = ref))}
        id={id()}
        type={type()}

        // Number Props
        min={props.min}
        max={props.max}
        step={props.step}

        autofocus={props.autoFocus}
        autocomplete={props.autoComplete}
        placeholder={props.placeholder}

        // Chuyển đổi giá trị null/undefined thành chuỗi rỗng để hiển thị trên input HTML
        value={value() === null || value() === undefined ? '' : (value() as any)}

        onInput={handleInput}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        onKeyDown={props.onKeyDown}
        onPaste={props.onPaste}
        {...(readOnly() ? { readOnly: true } : {})}
      />
      {props.children}
    </InputWrapper>
  );
}