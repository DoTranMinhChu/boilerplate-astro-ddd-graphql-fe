import { mergeClass } from '@core/helpers/class';
import { Show } from 'solid-js';

export interface FieldsetProps extends BaseProps {
  grid?: boolean;
  title?: string | JSX.Element;
  titleClass?: string;
  hasTopDivider?: boolean;
  hasBottomPadding?: boolean;
}
export function Fieldset(props: FieldsetProps) {
  const grid = () => props.grid ?? true;
  const hasBottomPadding = () => props.hasBottomPadding ?? true;
  const fieldsetClass = () =>
    mergeClass(
      grid() && `w-full grid grid-cols-12 gap-4 col-span-full`,
      hasBottomPadding() && `pb-4`,
      props.class,
    );

  const hasTopDivider = () => props.hasTopDivider;

  const titleClass = () =>
    mergeClass(
      `col-span-full font-semibold capitalize text-main text-lg -mb-2 pt-1`,
      hasTopDivider() && `border-t border-lighter pt-3`,
      props.titleClass,
    );

  return (
    <fieldset class={fieldsetClass()}>
      <Show when={props.title}>
        <div class={titleClass()}>{props.title}</div>
      </Show>
      {props.children}
    </fieldset>
  );
}
