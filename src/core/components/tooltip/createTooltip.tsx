import { Ref } from 'solid-js';
import { render } from 'solid-js/web';
import { Tooltip, TooltipProps } from './Tooltip';

export function createTooltip(
  reference: Ref<HTMLElement>,
  content: JSX.Element | string,
  options?: Omit<TooltipProps, 'reference' | 'content'>,
) {
  render(
    () => (
      <Tooltip
        {...options}
        content={content}
        reference={reference as HTMLElement}
      />
    ),
    reference as HTMLElement,
  );
}
