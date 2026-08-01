import { IconifyIcon, Icon as SolidIcon, addCollection } from '@iconify-icon/solid';
import { mergeClass } from '@core/helpers/class';
import { Ref, splitProps } from 'solid-js';
import { BaseIconVariant } from './baseIconVariant';
import heroiconsOutline from '@iconify-json/heroicons-outline/icons.json';
import heroiconsSolid from '@iconify-json/heroicons-solid/icons.json';

// Bundle icon offline: icon luôn hiển thị kể cả khi không truy cập được api.iconify.design
if (typeof window !== 'undefined') {
  try {
    addCollection(heroiconsOutline as any);
    addCollection(heroiconsSolid as any);
  } catch { /* ignore */ }
}

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type BaseIconVariantProps = Partial<{
  [K in keyof typeof BaseIconVariant]: boolean | undefined;
}>;
export interface BaseIconProps extends BaseProps, BaseIconVariantProps {
  name?: string | IconifyIcon;
  ref?: Ref<HTMLElement>;
  size?: IconSize;
  xs?: boolean;
  sm?: boolean;
  md?: boolean;
  lg?: boolean;
  xl?: boolean;
  xxl?: boolean;
}
export function BaseIcon(props: BaseIconProps) {
  const size = () =>
    props.size ||
    (props.md
      ? 'md'
      : props.lg
        ? 'lg'
        : props.xl
          ? 'xl'
          : props.xxl
            ? '2xl'
            : props.sm
              ? 'sm'
              : props.xs
                ? 'xs'
                : '');

  const iconClass = () => {
    let iconClass = 'inline-flex justify-center items-center ';
    switch (size()) {
      case 'xs': {
        iconClass += 'w-3 h-3 text-xs ';
        break;
      }
      case 'sm': {
        iconClass += 'w-3.5 h-3.5 text-sm ';
        break;
      }
      case 'md': {
        iconClass += 'w-4 h-4 text-base ';
        break;
      }
      case 'lg': {
        iconClass += 'w-4.5 h-4.5 text-lg ';
        break;
      }
      case 'xl': {
        iconClass += 'w-5 h-5 text-xl ';
        break;
      }
      case '2xl': {
        iconClass += 'w-6 h-6 text-2xl ';
        break;
      }
    }
    return mergeClass(iconClass, props.class);
  };
  const [local, rest] = splitProps(
    props,
    Object.keys(BaseIconVariant) as readonly (keyof typeof BaseIconVariant)[],
  );
  const name = () =>
    rest.name ||
    Object.keys(local)
      .filter(Boolean)
      .slice(0, 1)
      .reduce(
        (_, variant) =>
          BaseIconVariant[variant as keyof typeof BaseIconVariant],
        '',
      );
  if (!name()) return <></>;
  return (
    <span class={iconClass()} ref={props.ref}>
      <SolidIcon icon={name()}>{props.children}</SolidIcon>
    </span>
  );
}
