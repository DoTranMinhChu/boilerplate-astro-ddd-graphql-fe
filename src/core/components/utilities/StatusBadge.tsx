import { mergeClass } from '@core/helpers/class';
import { Show } from 'solid-js';

export type StatusBadgeType = 'outline' | 'light' | 'flat' | 'solid';
export interface StatusBadgeProps<T> extends BaseProps {
  options: Option<T>[];
  value: T;
  flat?: boolean;
  light?: boolean;
  solid?: boolean;
  type?: StatusBadgeType;
  statusDotClass?: string;
  dotHidden?: boolean;
  onClick?: (e: MouseEvent) => any;
}
export function StatusBadge<T>(props: StatusBadgeProps<T>) {
  const option = () => props.options.find((x) => x.value == props.value);
  const color = () => option()?.color || 'neutral';
  const type: () => StatusBadgeType = () =>
    props.type ||
    (props.flat
      ? 'flat'
      : props.solid
        ? 'solid'
        : props.light
          ? 'light'
          : 'outline');
  const statusBadgeClass = () =>
    mergeClass(
      `inline-flex items-center gap-1.5 font-medium whitespace-nowrap`,
      props.onClick && `cursor-pointer hover:opacity-80`,
      type() == 'outline' &&
        `text-xsm border border-${color()}-200 bg-${color()}-50 text-${color()}-600`,
      type() == 'flat'
        ? `text-sm text-${color()}-600`
        : `px-2.5 py-0.75 rounded-lg`,
      type() == 'solid'
        ? `border border-${color()} text-xsm bg-${color()} text-${color()}-50`
        : ``,
      type() == 'light'
        ? `border border-${color()}-100 text-xsm bg-${color()}-100 text-${color()}-600`
        : ``,
      props.class,
    );

  const statusDotClass = () =>
    mergeClass(
      `inline-block w-2 h-2 shrink-0 grow-0 rounded-full`,
      type() == 'outline' ? `bg-${color()}` : ``,
      type() == 'flat' ? `bg-${color()}` : ``,
      type() == 'light' ? `bg-${color()}` : ``,
      type() == 'solid' ? `bg-${color()}-50` : ``,
      props.statusDotClass,
    );

  const dotHidden = () => props.dotHidden ?? false;

  return (
    <span class={statusBadgeClass()} onClick={props.onClick}>
      {option()?.icon || (
        <Show when={!dotHidden()}>
          <span class={statusDotClass()}></span>
        </Show>
      )}
      {option()?.label}
      {props.children}
    </span>
  );
}
