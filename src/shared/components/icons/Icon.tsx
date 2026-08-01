import { IconifyIcon } from '@iconify-icon/solid';
import { BaseIcon, BaseIconProps } from '@core/components/icon/BaseIcon';
import { createTooltip } from '@core/components/tooltip/createTooltip';
import { mergeRef } from '@core/helpers/ref';
import { Ref, createEffect, splitProps } from 'solid-js';
import { IconVariant } from './iconVariants';

export interface IconProps
  extends Omit<BaseIconProps, 'name'>,
    IconVariantProps {
  name?: string | IconifyIcon;
  tooltip?: JSX.Element | string;
  placement?: Placement;
}
type IconVariantProps = Partial<{
  [K in keyof typeof IconVariant]: boolean | undefined;
}>;
export function Icon(props: IconProps) {
  let ref: Ref<HTMLElement>;

  createEffect(() => {
    if (props.tooltip) {
      createTooltip(ref!, props.tooltip, {
        placement: props.placement,
      });
    }
  });

  const [local, rest] = splitProps(
    props,
    Object.keys(IconVariant) as readonly (keyof typeof IconVariant)[],
  );

  const name = () =>
    rest.name ||
    Object.keys(local)
      .filter(Boolean)
      .slice(0, 1)
      .reduce(
        (_, variant) => IconVariant[variant as keyof typeof IconVariant],
        '',
      );
  return (
    <BaseIcon
      {...rest}
      name={name()}
      ref={mergeRef(props.ref, (el) => (ref = el))}
    ></BaseIcon>
  );
}
