import { mergeClass } from '@core/helpers/class';
import { Show, createEffect, createSignal } from 'solid-js';

export interface FormMessageProps extends BaseProps {
  main?: boolean;
  sub?: boolean;
  accent?: boolean;
  danger?: boolean;
  success?: boolean;
  info?: boolean;
  warning?: boolean;
  text?: string | JSX.Element;
}
export function FormMessage(props: FormMessageProps) {
  const [formMessageEl, setFormMessageEl] = createSignal<HTMLDivElement>();

  const formMessageClass = () =>
    mergeClass(
      `border rounded-sm p-3 font-medium text-base col-span-full`,
      props.danger
        ? `bg-danger-50 border-danger text-danger-700`
        : props.success
          ? `bg-success-50 border-success text-success-700`
          : props.info
            ? `bg-info-50 border-info text-info-700`
            : props.warning
              ? `bg-warning-50 border-warning text-warning-700`
              : props.main
                ? `bg-main-50 border-main text-main-700`
                : props.sub
                  ? `bg-sub-50 border-sub text-sub-700`
                  : props.accent
                    ? `bg-accent-50 border-accent text-accent-700`
                    : `bg-neutral-50 border-neutral text-neutral-700`,
      props.class,
    );

  createEffect(() => {
    const el = formMessageEl();
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  });

  return (
    <>
      <Show when={props.text}>
        <div ref={setFormMessageEl} class={formMessageClass()}>
          {props.text}
        </div>
      </Show>
    </>
  );
}
