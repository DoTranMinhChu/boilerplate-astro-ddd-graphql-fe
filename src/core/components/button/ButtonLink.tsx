import { Button, ButtonProps } from '@core/components/button/Button';
import { mergeClass } from '@core/helpers/class';
import { splitProps } from 'solid-js';

export interface ButtonLinkProps extends ButtonProps {
  strong?: boolean;
  underline?: boolean;
}
export function ButtonLink(props: ButtonLinkProps) {
  const [local, rest] = splitProps(props, [
    'strong',
    'class',
    'underline',
    'labelClass',
    'targetBlank',
  ]);
  const targetBlank = () => local.targetBlank ?? props.href?.includes('http');
  const buttonClass = () =>
    mergeClass(
      local.class,
      props.strong
        ? `text-info hover:text-info-700 font-semibold`
        : `hover:text-info`,
      `px-0 visited:text-sub hover:visited:text-sub-700`,
    );
  const labelClass = () =>
    mergeClass(
      `${local.underline ? 'underline' : ''} hover:underline px-0`,
      local.labelClass,
    );

  return (
    <Button
      transparent
      flat
      {...rest}
      targetBlank={targetBlank()}
      class={buttonClass()}
      labelClass={labelClass()}
    />
  );
}
