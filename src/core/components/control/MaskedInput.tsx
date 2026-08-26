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
    // `m` is created in the `ref` callback below, which only ever runs in a real DOM.
    // During Astro's SERVER render the callback never fires, yet Solid still runs this
    // component's `onCleanup` when it finishes the render (solid-js server `cleanNode`) —
    // so `m` is genuinely `undefined` there and every use of it must be guarded. An
    // unguarded `m.destroy()` threw from inside Solid's post-render flush promise, which
    // Astro reports as an UnhandledRejection: the HTTP response was truncated at that
    // point (dropping every node rendered after it) and the request then died with the
    // generic `"renderToString timed out"`. See MaskedInput.ssr.test.tsx.
    let m: InputMask<Opts> | undefined;

    createEffect(() => {
      // Effects never run during SSR, and on the client `ref` has already assigned `m`
      // by the time they do — the guard is here so the type stays honest, not to change
      // browser behaviour.
      const value = maskProps.unmaskedValue || '';
      if (m) m.unmaskedValue = value;
    });

    createEffect(() => {
      const value = maskProps.value || '';
      if (m) m.value = value;
    });

    onCleanup(() => {
      m?.destroy();
    });

    return (
      <input
        {...inputProps}
        ref={(el) => {
          // Held in a `const` as well as the outer `let` so the two listeners below close
          // over a value TypeScript knows is defined — `m` itself is now
          // `InputMask<Opts> | undefined` (see the comment on its declaration).
          const instance = IMask(el, mask);
          m = instance;
          instance.on('complete', (e?: InputEvent) => {
            maskProps.onComplete?.(
              {
                typedValue: instance.typedValue,
                value: instance.value,
                unmaskedValue: instance.unmaskedValue,
              } as unknown as Value,
              instance,
              e,
            );
          });
          instance.on('accept', (e?: InputEvent) => {
            maskProps.onAccept?.(
              {
                typedValue: instance.typedValue,
                value: instance.value,
                unmaskedValue: instance.unmaskedValue,
              } as unknown as Value,
              instance,
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
