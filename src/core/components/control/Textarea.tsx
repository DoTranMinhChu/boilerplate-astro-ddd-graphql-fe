import { mergeClass } from '@core/helpers/class';
import { mergeRef } from '@core/helpers/ref';
import { CSSProperties } from '@core/types/jsx';
import { Accessor, Ref, createEffect, createSignal } from 'solid-js';
import { createControl } from './createControl';

export interface TextareaProps extends FormControlProps<string> {
  ref?: Ref<HTMLTextAreaElement>;
  rows?: number;
  maxRows?: number;
  onKeyPress?: (e: KeyboardEvent) => void;
}
export function Textarea(props: TextareaProps) {
  let ref: Ref<HTMLTextAreaElement>;
  const [height, setHeight] = createSignal<string>('');
  const rows = () => props.rows || 2;
  const { id, name, value, onChange, readOnly, error } = createControl<string>(
    'text',
    props,
  );

  const textareaStyle: Accessor<CSSProperties> = () => ({
    'min-height': rows() ? 1 + rows() * 1.5 + 'rem' : undefined,
    'max-height': props.maxRows ? 1 + props.maxRows * 1.5 + 'rem' : undefined,
    height: height(),
    ...props.style,
  });

  const textareaClass = () =>
    mergeClass(
      'p-2 bg-white border rounded-sm border-neutral-300 hover:border-neutral-400',
      'focus:border-main focus:ring-1 focus:ring-main focus:outline-hidden scrollbar-custom',
      readOnly() &&
        'bg-lightest border-neutral-200 hover:border-neutral-300 focus-within:border-neutral-300 focus-within:ring-0',
      error() &&
        'border-danger hover:border-danger-600 focus-within:border-danger-600 focus-within:ring-danger-600',
      //  'resize-none',
      props.class,
    );

  createEffect(() => {
    if (value() !== undefined) {
      const el = ref as HTMLTextAreaElement;
      setHeight('0rem');
      setHeight((el.scrollHeight + 2) / 16 + 'rem');
    }
  });

  return (
    <>
      <textarea
        ref={mergeRef(props.ref, (el) => (ref = el))}
        rows={rows()}
        id={id()}
        class={textareaClass()}
        style={textareaStyle()}
        tabIndex={props.skipTabIndex ? -1 : 0}
        name={name()}
        readOnly={readOnly()}
        value={value()}
        placeholder={props.placeholder}
        onInput={(e) => onChange(e.target.value)}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        {...(!!props.onKeyPress && { onKeyPress: props.onKeyPress })}
      ></textarea>
    </>
  );
}
