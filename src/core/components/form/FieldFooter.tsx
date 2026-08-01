import { mergeClass } from '@core/helpers/class';
import { For, Show } from 'solid-js';

export interface FieldFooterProps extends BaseProps {
  hint?: string | JSX.Element;
  /** When you want to list hint with bullet */
  hints?: (string | JSX.Element)[];
  hintBullet?: string | JSX.Element;
  hintClass?: string;
  error?: string | string[];
  errorClass?: string;
}
export function FieldFooter(props: FieldFooterProps) {
  const fieldFooterClass = () => mergeClass('text-xsm px-1', props.class);
  const errorClass = () =>
    mergeClass('text-danger font-semibold gap-1 pt-1', props.errorClass);
  const hintClass = () =>
    mergeClass('font-medium text-xs whitespace-pre-line pt-1', props.hintClass);

  const errors = () =>
    typeof props.error == 'string' ? [props.error] : props.error;

  return (
    <div class={fieldFooterClass()}>
      <Show when={props.error}>
        <div class={errorClass()}>
          <For each={errors()}>{(error) => <div>{error}</div>}</For>
        </div>
      </Show>
      <Show when={props.hint || props.hints?.length}>
        <div class={hintClass()}>
          <Show when={props.hints?.length}>
            <For each={props.hints}>
              {(item) => (
                <div>
                  <span>{props.hintBullet || '•'}</span> {item}
                </div>
              )}
            </For>
          </Show>
          <Show when={props.hint}>{props.hint}</Show>
        </div>
      </Show>
    </div>
  );
}
