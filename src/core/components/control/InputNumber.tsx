import { mergeClass } from '@core/helpers/class';
import { formatNumber, parseStringToNumber } from '@core/helpers/number';
import { EventHandler, FocusEventHandler } from '@core/types/jsx';
import { Ref, createEffect, createSignal, splitProps } from 'solid-js';
import { InputWrapper, InputWrapperProps } from './InputWrapper';
import { MaskedInput } from './MaskedInput';
import { createControl } from './createControl';
import { Slider } from './Slider';

export interface InputNumberProps
  extends FormControlProps<number | null>,
  Omit<InputWrapperProps, 'onClear'> {
  /**
   * The class for the input inside.
   */
  inputClass?: string;
  /**
   * Default: false
   * If turn on, it will open the number input keyboard on mobile device. Strictly use for this purpose only.
   */
  native?: boolean;
  /**
   * Unit is a postfix value after number currency such as đ, l, kg,...
   * In general case, it's better to use suffix because it's less of a hassle to edit
   */
  unit?: string | boolean;
  /**An element put before the number text, often be the minus sign or currency. */
  numberPrefix?: string;
  /** Allow user to input floating number */
  decimal?: boolean;
  /** Default: 2
   * How many number after decimal can the user be allowed to input */
  decimalLimit?: number;
  /**
   * Change the input value to percentage and output into fractional value
   */
  percentage?: boolean;
  /** Default: "comma"
   * Determines which decimal symbol to use,
   */
  decimalSeparator?: 'period' | 'comma';
  /** Allow negative input. Only works when min is set to a negative number. */
  negative?: boolean;
  /**The maximum length of number that can be input, ignore decimal */
  maxLength?: number;
  /** Min & max value */
  min?: number;
  max?: number;
  /** Autocomplete field. Value: 'off' | 'on' or a string dertermine the autocomplete field name*/
  autoComplete?: 'off' | 'on' | (string & {});
  /**Autofocus the input when it appears (on a page or a form) */
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  scaling?: number;
  /**
   * When present, renders a drag Slider to the LEFT of the number box on the same
   * row, for naturally-bounded fields (opacity, rotation, font-weight). Omit for
   * unbounded fields (position, size, padding, duration, ...) — default behavior
   * (no slider) is completely unchanged.
   */
  slider?: {
    min: number;
    max: number;
    step: number;
    /**
     * Final whole-branch review (Important): what the slider's thumb should show
     * when the underlying value is `null` (unset). Defaults to `min` when omitted
     * for backward compatibility, but `min` is frequently NOT what actually
     * renders for an unset value (e.g. rotation renders at 0, not -180) — callers
     * for whom that matters should pass the value that matches the real rendered
     * default.
     */
    nullValue?: number;
  };
}
export function InputNumber(props: InputNumberProps) {
  const scaling = () => props.scaling || 1;
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

  const autocomplete = () => props.autoComplete || 'off';

  const { id, name, value, onChange, readOnly, error } = createControl<
    number | null
  >('number', props);

  const inputClass = () =>
    mergeClass(
      'flex-1 w-full h-auto px-2 bg-transparent font-normal text-base rounded-inherit focus:outline-hidden min-w-0 focus-visible:ring-2 focus-visible:ring-nb-accent',
      inputProps.inputClass,
    );

  const [valueText, setValueText] = createSignal<string>('');
  const [isFocusing, setIsFocusing] = createSignal(false);

  const decimalSeparator = () => props.decimalSeparator || 'comma';

  createEffect(() => {
    const currentValue = value();
    changeValueText(currentValue);
  });

  const changeValueText = (value: number | null) => {
    let valueText: string;
    if (value === null) {
      valueText = '';
    } else {
      const displayValue = props.percentage ? value * 100 : value / scaling();

      if (props.native) {
        valueText = displayValue.toString();
      } else {
        if (value === 0 && isFocusing() && !props.nullable) {
          valueText = '';
        } else {
          valueText = formatNumber(displayValue);
        }
      }
    }
    setValueText(valueText);
  };

  const sliderDisplayValue = () => {
    const v = value();
    if (v === null) return props.slider?.nullValue ?? props.slider?.min ?? 0;
    return props.percentage ? v * 100 : v / scaling();
  };

  const NumberInput = MaskedInput({
    mask: Number, // enable number mask
    scale: props.decimal ? props.decimalLimit || 2 : 0, // digits after point, 0 for integers
    thousandsSeparator: decimalSeparator() == 'comma' ? '.' : ',', // any single char
    radix: decimalSeparator() == 'comma' ? ',' : '.', // fractional delimiter
    mapToRadix: [decimalSeparator() == 'comma' ? '.' : ','], // symbols to process as radix
    padFractionalZeros: false, // if true, then pads zeros at end to the length of scale
    normalizeZeros: true, // appends or removes zeros at ends
    // Only pass min/max when actually provided. imask merges these options as
    // `{...MaskedNumber.DEFAULTS, ...opts}`, so explicitly passing `max: undefined`
    // (or `min: undefined`) overrides imask's own sane defaults (MIN/MAX_SAFE_INTEGER)
    // with `undefined`. When `min` is very negative and `max` ends up `undefined` this
    // way, imask's `allowPositive` getter evaluates to false, which makes
    // `MaskedNumber.doPrepareChar` auto-prepend a '-' sign on every fresh keystroke
    // typed into an emptied field (e.g. after selecting all text and overtyping it) -
    // silently reviving a stale negative sign the user never typed. Omitting the key
    // entirely when unset lets imask's built-in Number.MAX_SAFE_INTEGER/MIN_SAFE_INTEGER
    // defaults apply instead, which keeps allowPositive/allowNegative correctly balanced.
    ...(props.min !== undefined ? { min: props.min } : {}),
    ...(props.max !== undefined ? { max: props.max } : {}),
  });

  const onFocus: FocusEventHandler<HTMLInputElement, FocusEvent> = (e) => {
    if (value() === 0 && !props.nullable) {
      setValueText('');
    }
    setIsFocusing(true);
    props.onFocus?.(e);
    if (readOnly()) return;
  };
  const onBlur: FocusEventHandler<HTMLInputElement, FocusEvent> = (e) => {
    const currentValue = value();
    changeValueText(currentValue);
    setIsFocusing(false);
    props.onBlur?.(e);
    if (readOnly()) return;
  };
  const onKeyDown: EventHandler<HTMLInputElement, KeyboardEvent> = (e) => {
    if (
      (readOnly() && /^[0-9,.-]$/i.test(e.key)) ||
      ['e', 'E', '+', '.', '_', ...(props.negative ? [] : ['-'])].includes(
        e.key,
      )
    ) {
      e.preventDefault();
    }
    props.onKeyDown?.(e);
  };
  const onPaste: EventHandler<HTMLInputElement, ClipboardEvent> = (e) => {
    if (readOnly()) {
      e.preventDefault();
      return;
    }
    let pasteData = e.clipboardData?.getData('text');
    if (pasteData) {
      pasteData = pasteData.replace(/[eE_+.]/g, '');
      e.preventDefault();
      changeValue(
        parseStringToNumber(pasteData, {
          decimalSeparator: decimalSeparator(),
        }),
      );
    }
  };

  const changeValue = (value: number | null) => {
    onChange(
      value
        ? props.percentage
          ? parseFloat((value / 100).toFixed(4))
          : value * scaling()
        : value,
    );
  };

  const numberBox = () => (
    <InputWrapper {...wrapperProps} error={error()} readOnly={readOnly()} class={props.slider ? 'w-24 shrink-0' : wrapperProps.class}>
      {props.native ? (
        <input
          class={inputClass()}
          name={name()}
          id={id()}
          ref={inputProps.inputRef}
          type="number"
          inputMode="numeric"
          autocomplete={autocomplete()}
          readOnly={readOnly()}
          autofocus={props.autoFocus}
          placeholder={props.placeholder}
          tabIndex={props.skipTabIndex ? -1 : 0}
          maxLength={props.maxLength}
          min={props.min}
          max={props.max}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={onFocus}
          onBlur={onBlur}
          value={valueText()}
          onInput={(e) => {
            if (readOnly()) {
              e.preventDefault();
              return;
            }
            let newValue = e.target.value;
            if (props.maxLength && newValue.length > props.maxLength) {
              newValue = newValue.slice(0, props.maxLength);
            }
            changeValue(
              parseStringToNumber(newValue, {
                decimalSeparator: decimalSeparator(),
              }),
            );
          }}
        />
      ) : (
        <NumberInput
          class={inputClass()}
          ref={inputProps.inputRef}
          id={id()}
          inputMode="numeric"
          autocomplete={autocomplete()}
          readOnly={readOnly()}
          autofocus={props.autoFocus}
          placeholder={props.placeholder}
          tabIndex={props.skipTabIndex ? -1 : 0}
          maxLength={props.maxLength}
          min={props.min}
          max={props.max}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={onFocus}
          onBlur={onBlur}
          value={valueText()}
          onComplete={(value, _maskRef, e) => {
            if (e) {
              let newValue = value.value;
              if (props.maxLength && newValue.length > props.maxLength) {
                newValue = newValue.slice(0, props.maxLength);
              }
              // imask fires 'complete' on every accepted keystroke for a number
              // mask (its `isComplete` is unconditionally `true`), not just when
              // editing is actually finished. A lone sign character (typing '-'
              // into an empty/cleared field, before any digit follows) is such
              // an in-progress state: it has no digits yet, so
              // `parseStringToNumber` can only fall back to `0`. Committing that
              // `0` here would round-trip through `changeValueText` (which blanks
              // a focused, non-nullable `0`) and back into this mask via
              // `MaskedInput`'s controlled `value` effect, silently erasing the
              // '-' the user just typed before their next keystroke arrives.
              // Skip the commit while the mask holds only sign/separator
              // characters and no digit - let it keep showing '-' untouched
              // until there's an actual number to report.
              if (newValue !== '' && !/\d/.test(newValue)) return;
              changeValue(
                newValue === ''
                  ? props.nullable
                    ? null
                    : 0
                  : parseStringToNumber(newValue, {
                    decimalSeparator: decimalSeparator(),
                  }),
              );
            }
          }}
        />
      )}
    </InputWrapper>
  );

  return props.slider ? (
    <div class="flex items-center gap-2">
      <Slider
        value={sliderDisplayValue()}
        min={props.slider.min}
        max={props.slider.max}
        step={props.slider.step}
        onChange={changeValue}
        class="flex-1"
      />
      {numberBox()}
    </div>
  ) : (
    numberBox()
  );
}
