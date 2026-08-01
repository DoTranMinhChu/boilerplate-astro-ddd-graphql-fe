import { mergeClass } from '@core/helpers/class';
import { OverlayScrollbars, PartialOptions } from 'overlayscrollbars';
import 'overlayscrollbars/overlayscrollbars.css';
import { onMount, splitProps } from 'solid-js';

export interface ScrollbarProps extends BaseProps {
  options?: PartialOptions;
}
export function Scrollbar(props: ScrollbarProps) {
  let ref: HTMLElement;

  onMount(() => {
    OverlayScrollbars(ref);
    OverlayScrollbars(
      ref,
      {
        scrollbars: {
          theme: 'os-theme-default',
          autoHide: 'leave',
          autoHideDelay: 600,
          autoHideSuspend: false,
        },
        ...props.options,
      },
      {},
    );
  });

  const scrollbarClass = () => mergeClass(``, props.class);
  const [, divProps] = splitProps(props, ['options']);

  return (
    <div class="w-full" ref={(el) => (ref = el)}>
      <div {...divProps} class={scrollbarClass()}></div>
    </div>
  );
}
