import IMask, { type FactoryArg, type InputMask } from 'imask';
import { createEffect, onCleanup, splitProps } from 'solid-js';

// TODO can `directive` be reused here?
// TODO personally hate JSX in libs but seems no way out for solid

const MaskedInput =
  <
    Opts extends FactoryArg,
    Value = {
      typedValue: InputMask<Opts>['typedValue'];
      value: InputMask<Opts>['value'];
      unmaskedValue: InputMask<Opts>['unmaskedValue'];
    },
  >(
    mask: Opts,
  ) =>
  (
    props: Omit<
      JSX.InputHTMLAttributes<HTMLInputElement>,
      'type' | 'value' | 'onChange' | 'onchange'
    > & {
      onAccept?: (
        value: Value,
        maskRef: InputMask<Opts>,
        e?: InputEvent,
      ) => void;
      onComplete?: (
        value: Value,
        maskRef: InputMask<Opts>,
        e?: InputEvent,
      ) => void;
      value?: InputMask<Opts>['value'];
      unmaskedValue?: InputMask<Opts>['unmaskedValue'];
    },
  ) => {
    const [maskProps, inputProps] = splitProps(props, [
      'ref',
      'onAccept',
      'onComplete',
      'value',
      'unmaskedValue',
    ]);
    let m: InputMask<Opts>;

    createEffect(() => {
      m.unmaskedValue = maskProps.unmaskedValue || '';
    });

    createEffect(() => {
      m.value = maskProps.value || '';
    });

    onCleanup(() => {
      m.destroy();
    });

    return (
      <input
        {...inputProps}
        ref={(el) => {
          m = IMask(el, mask);
          m.on('complete', (e?: InputEvent) => {
            maskProps.onComplete?.(
              {
                typedValue: m.typedValue,
                value: m.value,
                unmaskedValue: m.unmaskedValue,
              } as unknown as Value,
              m,
              e,
            );
          });
          m.on('accept', (e?: InputEvent) => {
            maskProps.onAccept?.(
              {
                typedValue: m.typedValue,
                value: m.value,
                unmaskedValue: m.unmaskedValue,
              } as unknown as Value,
              m,
              e,
            );
          });
          (maskProps.ref as any)?.(el);
        }}
        type="string"
      ></input>
    );
  };
export { IMask, MaskedInput };
