import { Floating, FloatingProps } from '@core/components/floating/Floating';
import { mergeClass } from '@core/helpers/class';
import { splitProps } from 'solid-js';

export interface TooltipProps extends FloatingProps {
  content: JSX.Element | string;
}
export function Tooltip(props: TooltipProps) {
  const [local, rest] = splitProps(props, ['class', 'content']);
  const tooltipClass = () =>
    mergeClass(
      'rounded-sm bg-darker px-2.5 py-1.5 text-sm text-white',
      local.class,
    );

  if (!props.reference) return;
  return (
    <Floating
      trigger="hover"
      arrow

      arrowAfterClass={({ side }) => {
        switch (side) {
          case 'bottom':
            return 'after:border-b-darker';
          case 'top':
            return 'after:border-t-darker';
          case 'right':
            return 'after:border-r-darker';
          case 'left':
            return 'after:border-l-darker';
          default:
            return '';
        }
      }}
      animationDuration={200}
      delayEnter={50}
      delayLeave={150}
      inactiveClass={({ side }) => {
        return `transition ease-in-out translate-x-0 translate-y-0 scale-75 opacity-0 ${side == 'top'
            ? 'origin-bottom translate-y-1'
            : side == 'bottom'
              ? 'origin-top -translate-y-1'
              : side == 'left'
                ? 'origin-right translate-x-1'
                : 'origin-left -translate-x-1'
          }`;
      }}
      activeClass={({ side: _side }) => {
        return `opacity-100 scale-100 translate-x-0 translate-y-0`;
      }}
      strategy="fixed"
      {...rest}
      class={tooltipClass()}
    >
      {local.content}
    </Floating>
  );
}
