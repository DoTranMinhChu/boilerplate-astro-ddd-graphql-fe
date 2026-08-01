import {
  arrow,
  autoPlacement,
  autoUpdate,
  computePosition,
  flip,
  hide,
  inline,
  offset,
  OffsetOptions,
  Placement,
  shift,
  ShiftOptions,
  Side,
  size,
  Strategy,
} from '@floating-ui/dom';
import { createPointerListeners } from '@solid-primitives/pointer';
import { joinClass, mergeClass } from '@core/helpers/class';
import { Dom } from '@core/helpers/dom';
import { mergeRef } from '@core/helpers/ref';
import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Ref,
  Show,
  untrack,
} from 'solid-js';
import { Portal } from 'solid-js/web';

const FLOATING_INIT_DELAY = 300;
export type FloatingClass = ({
  placement,
  side,
}: {
  placement: Placement;
  side: Side;
}) => string;
export interface FloatingProps extends BaseProps {
  /** Source element */
  reference: Ref<HTMLElement>;
  /** Floating element */
  ref?: Ref<HTMLElement>;
  /** Position of the floating element relatively to the source element.
   * Auto placement if left empty. */
  placement?: Placement;
  /** Should only be used when placement is indicated */
  fallbackPlacements?: Placement[];
  /** Should only be used when no placement is indicated.
   * The allowed placement to have auto placement * */
  allowedPlacements?: Placement[];
  /** Floating element strategy.
   * Default: absolute */
  strategy?: Strategy;
  /** floating-ui offset options */
  offset?: OffsetOptions;
  /** floating-ui shift options  */
  shift?: ShiftOptions;
  /** Autosize when you want the display floating to have size
   * changed according to the available space. Ex: Select.
   */
  autoSize?: boolean;
  /** display arrow */
  arrow?: boolean;
  arrowClass?: string;
  arrowBeforeClass?: FloatingClass;
  arrowAfterClass?: FloatingClass;
  /* Condition for the floating to be active */
  trigger?: 'always' | 'hover' | 'click' | 'manual';
  open?: boolean;
  onOpen?: (active: boolean) => any;
  /** Keep the floating open when click on the reference element again */
  persistOnReferenceClick?: boolean;
  /** Keep the floating active when hovered on it.
   * If the floating is inside the reference element, this option isn't needed.  */
  persistOnFloatingHover?: boolean;
  animationDuration?: number;
  inactiveClass?: FloatingClass;
  activeClass?: FloatingClass;
  /** Use for trigger hover, delay when hovered in a reference */
  delayEnter?: number;
  /** Use for trigger hover, linger when the cursor left the reference */
  delayLeave?: number;
  /** id of the root div
   * Default: "floating"
   */
  root?: string;
}
export function Floating(props: FloatingProps) {
  let ref: HTMLElement;
  let boundingRef: HTMLElement;
  let arrowRef: HTMLDivElement;
  let cleanup: () => void;
  const [renderedPlacement, setRenderedPlacement] = createSignal<Placement>();
  const [floatingStyle, _setFloatingStyle] = createSignal({});

  // visibility
  const [active, setActive] = createSignal(
    props.open !== undefined
      ? props.open
      : props.trigger == 'always'
        ? true
        : false,
  );
  const [hidden, setHidden] = createSignal(false);
  const visible = () => active() && !hidden();
  const [delayedVisible, setDelayedVisible] = createSignal(visible());
  const isRendered = () => visible() || delayedVisible();

  createEffect(() => {
    const openVal = props.open;
    untrack(() => {
      if (openVal !== undefined) {
        setActive(openVal);
      }
    });
  });
  createEffect(() => {
    const activeVal = active();
    untrack(() => {
      props.onOpen?.(activeVal);
    });
  });

  // trigger timeout for exitting
  let visibleTimeout;
  createEffect(() => {
    clearTimeout(visibleTimeout!);
    if (visible()) {
      visibleTimeout = setTimeout(() => {
        setDelayedVisible(true);
      });
    } else {
      visibleTimeout = setTimeout(() => {
        setDelayedVisible(false);
      }, props.animationDuration);
    }
  });

  const strategy = () => props.strategy || 'absolute';

  // trigger active status of floating ui
  let activeTimeout: any;
  const trigger = () => props.trigger || 'always';
  const [referenceHovered, setReferenceHovered] = createSignal(false);
  const [refHovered, setRefHovered] = createSignal(false);
  if (!props.reference) {
    throw new Error('Reference not found!');
  }
  if (trigger() == 'hover') {
    //hover listener of the reference and the current floating ref
    createPointerListeners({
      target: props.reference as HTMLElement,
      onEnter: (_e: PointerEvent) => {
        setReferenceHovered(true);
      },
      onLeave: (_e: PointerEvent) => {
        setReferenceHovered(false);
      },
    });
    if (props.persistOnFloatingHover) {
      createEffect(() => {
        if (active()) {
          createPointerListeners({
            target: ref! as HTMLElement,
            onEnter: (_e: PointerEvent) => {
              setRefHovered(true);
            },
            onLeave: (_e: PointerEvent) => {

              setRefHovered(false);
            },
          });
        }
      });
    }

    // effect for hover state changed
    createEffect(() => {
      clearTimeout(activeTimeout);
      const active = refHovered() || referenceHovered();
      if (active) {
        activeTimeout = setTimeout(() => {
          setActive(true);
        }, props.delayEnter);
      } else {
        activeTimeout = setTimeout(() => {
          setActive(false);
        }, props.delayLeave);
      }
    });
  } else if (trigger() == 'click') {
    const onKeyPress = (e: KeyboardEvent) => {
      if (e.key == 'Enter') {
        setActive(props.persistOnReferenceClick ? true : !active());
      }
    };
    createPointerListeners({
      target: () => props.reference as HTMLElement,
      onUp: (_e: PointerEvent) => {
        setActive(props.persistOnReferenceClick ? true : !active());
      },
    });
    (props.reference as HTMLElement).addEventListener('keypress', onKeyPress);
    const fn = (e: MouseEvent) => {
      const rect = Dom.getVisibleBoundingRect(
        (boundingRef || ref) as HTMLElement,
      );
      const outsideClick = !(ref as HTMLElement).contains(e.target as Node);
      const referenceClick = (props.reference as HTMLElement)?.contains(
        e.target as Node,
      );
      const insideBoundClick =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (outsideClick && !referenceClick && !insideBoundClick) {
        setActive(false);
      }
    };
    createEffect(() => {
      if (active()) {
        document.addEventListener('click', fn);
      } else {
        document.removeEventListener('click', fn);
      }
    });
    onCleanup(() => {
      document.removeEventListener('click', fn);
    });
  } else if (trigger() == 'manual') {
    setActive(false);
  } else {
    setActive(true);
  }

  const middlewares = () => [
    offset(props.offset ?? 8),
    inline(),
    props.placement
      ? flip({
        fallbackPlacements: props.fallbackPlacements,
        fallbackStrategy: 'initialPlacement',
      })
      : autoPlacement({ allowedPlacements: props.allowedPlacements }),
    shift(props.shift),
    ...(props.autoSize
      ? [
        size({
          apply({ availableWidth, availableHeight, elements }) {
            Object.assign(elements.floating.style, {
              maxWidth: `${availableWidth}px`,
              maxHeight: `${availableHeight - 16}px`,
            });
          },
        }),
      ]
      : []),
    ...(props.arrow
      ? [
        arrow({
          element: arrowRef,
          padding: 16,
        }),
      ]
      : []),
    hide(),
  ];

  onMount(() => {
    untrack(() => {
      setTimeout(() => {
        const el = ref as HTMLElement;
        cleanup?.();
        cleanup = autoUpdate(props.reference as HTMLElement, el, () => {
          computePosition(props.reference as HTMLElement, el, {
            placement: props.placement,
            strategy: strategy(),
            middleware: middlewares(),
          }).then(({ x, y, middlewareData, placement }) => {
            setRenderedPlacement(placement);
            setHidden(middlewareData.hide?.referenceHidden || false);
            Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
            // setFloatingStyle({ left: `${x}px`, top: `${y}px` });

            if (middlewareData.arrow) {
              const arrowEl = arrowRef;
              const { x, y } = middlewareData.arrow;

              // Get the side from placement
              const side = placement.split('-')[0];
              const staticSide = {
                top: 'bottom',
                right: 'left',
                bottom: 'top',
                left: 'right',
              }[side];

              Object.assign(arrowEl.style, {
                left: x != null ? `${x}px` : '',
                top: y != null ? `${y}px` : '',
                [staticSide!]: `${-arrowEl.offsetWidth / 2}px`,
              });
            }
          });
        });
      }, FLOATING_INIT_DELAY);
    });
  });

  onCleanup(() => {
    cleanup?.();
  });

  const renderedSide = () => renderedPlacement()?.split('-')[0] as Side;

  const floatingClass = () => {
    const renderedData = {
      placement: renderedPlacement()!,
      side: renderedSide()!,
    };

    if (!isRendered())
      return `${strategy()} pointer-events-none ${props.inactiveClass?.(
        renderedData,
      )}`;
    return mergeClass(
      `${strategy() == 'absolute' ? 'absolute' : 'fixed'}`,
      `z-500 top-0 left-0 w-max box-content`,
      props.inactiveClass?.(renderedData),
      visible()
        ? delayedVisible()
          ? props.activeClass?.(renderedData)
          : ''
        : null,
      props.class,
    );
  };

  const arrowClass = () => {
    if (!isRendered()) return 'absolute pointer-events-none rounded-sm';

    const side = renderedSide()!;
    const renderedData = {
      placement: renderedPlacement()!,
      side,
    };

    const beforeClass = joinClass(
      'before:absolute before:border-transparent before:border-6 before:block',
      side == 'bottom' &&
      'before:-top-0.5 before:border-t-0 before:border-b-inherit',
      side == 'top' &&
      'before:-bottom-0.5 before:border-b-0 before:border-t-inherit',
      side == 'right' &&
      'before:-left-0.5 before:border-l-0 before:border-r-inherit',
      side == 'left' &&
      'before:-right-0.5 before:border-r-0 before:border-l-inherit',
      props.arrowBeforeClass?.(renderedData),
    );
    const afterClass = joinClass(
      'after:absolute after:border-transparent after:border-6 after:block',
      side == 'bottom' && 'after:top-0 after:border-t-0 after:border-b-white',
      side == 'top' && 'after:bottom-0 after:border-b-0 after:border-t-white',
      side == 'right' && 'after:left-0 after:border-l-0 after:border-r-white',
      side == 'left' && 'after:right-0 after:border-r-0 after:border-l-white',
      props.arrowAfterClass?.(renderedData),
    );
    return mergeClass(
      'absolute pointer-events-none border-inherit block w-3 h-1.5',
      beforeClass,
      afterClass,
      props.arrowClass,
    );
  };

  const style = () => ({ ...props.style, ...floatingStyle() });

  const onFloatingKeyPress = (e: KeyboardEvent) => {
    if (e.key == 'Escape') {
      setActive(false);
    }
  };

  const FloatingContent = (
    <div
      class={floatingClass()}
      ref={mergeRef(props.ref, (el) => (ref = el))}
      style={style()}
      onKeyDown={onFloatingKeyPress}
    >
      <Show when={isRendered()}>
        {props.children}
        <div
          ref={(el) => (boundingRef = el)}
          class="absolute top-1/2 left-1/2 -z-10 h-full w-full -translate-x-1/2 -translate-y-1/2 bg-transparent p-2"
        ></div>
      </Show>
      <Show when={props.arrow}>
        <div class={arrowClass()} ref={(el) => (arrowRef = el)}></div>
      </Show>
    </div>
  );

  if (!props.root) return FloatingContent;

  const root = Dom.getRoot(props.root);
  return <Portal mount={root}>{FloatingContent}</Portal>;
}

export const getOrigin = (placement: Placement) => {
  switch (placement) {
    case 'top':
      return 'origin-bottom';
    case 'top-start':
      return 'origin-bottom-left';
    case 'top-end':
      return 'origin-bottom-right';
    case 'bottom':
      return 'origin-top';
    case 'bottom-start':
      return 'origin-top-left';
    case 'bottom-end':
      return 'origin-top-right';
    case 'left':
      return 'origin-right';
    case 'left-start':
      return 'origin-top-right';
    case 'left-end':
      return 'origin-bottom-right';
    case 'right':
      return 'origin-left';
    case 'right-start':
      return 'origin-top-left';
    case 'right-end':
      return 'origin-bottom-left';
  }
};
