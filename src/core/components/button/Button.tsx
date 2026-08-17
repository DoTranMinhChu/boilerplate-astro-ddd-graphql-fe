import { A } from '@solidjs/router';
import { joinClass, mergeClass } from '@core/helpers/class';
import { mergeRef } from '@core/helpers/ref';
import { createTooltip } from '../tooltip/createTooltip';
import {
  Match,
  type Ref,
  Show,
  Switch,
  createMemo,
  createSignal,
  onMount,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { baseConfig } from '../config/BaseConfig';

export interface ButtonProps
  extends BaseProps,
  ButtonColorProps,
  ButtonTypeProps,
  ButtonSizeProps,
  ButtonPaddingProps,
  ButtonAlignProps,
  ButtonLinkProps,
  ButtonRadiusProps,
  ButtonInteractProps,
  ButtonEventProps {
  label?: string | JSX.Element;
  icon?: JSX.Element;
  iconEnd?: JSX.Element;
  iconLoading?: JSX.Element;
  loadingStrategy?: 'move_label' | 'hide_label';
  ref?: Ref<HTMLElement>;
  focusable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  loading?: boolean;
  reset?: boolean;
  submit?: boolean;
  labelClass?: string;
  iconClass?: string;
  loaderClass?: string;
  transparent?: boolean;
  stopPropagation?: boolean;
  tooltip?: JSX.Element | string;
  placement?: Placement;
  /** Accessible name for icon-only buttons (no `label`) — forwarded straight onto the
   * rendered element. Canvas Editor v2, Task 2 (RepeaterFieldEditor's row action icons). */
  'aria-label'?: string;
}
interface ButtonEventProps {
  onClick?: null | ((e: MouseEvent) => any) | ((e: MouseEvent) => Promise<any>);
  onMouseEnter?: (e: MouseEvent) => any;
  onMouseLeave?: (e: MouseEvent) => any;
}
export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonSizeProps {
  size?: ButtonSize;
  sm?: boolean;
  md?: boolean;
  lg?: boolean;
}
export type ButtonColor = SemanticColor;
type ButtonColorProps = Partial<
  Record<SemanticColor, boolean> & {
    color?: SemanticColor;
  }
>;
export type ButtonType = 'solid' | 'outline' | 'light' | 'flat' | 'ghost';
interface ButtonTypeProps {
  type?: ButtonType;
  solid?: boolean;
  outline?: boolean;
  light?: boolean;
  flat?: boolean;
  ghost?: boolean;
}
export type ButtonPadding = 'uniform' | 'wide' | 'compact';
interface ButtonPaddingProps {
  padding?: ButtonPadding;
  uniform?: boolean;
  wide?: boolean;
  compact?: boolean;
}
export type ButtonAlign = 'left' | 'center' | 'right';
interface ButtonAlignProps {
  align?: ButtonAlign;
  left?: boolean;
  center?: boolean;
  right?: boolean;
}
interface ButtonLinkProps {
  href?: string;
  targetBlank?: boolean;
  nativeAnchor?: boolean;
  download?: boolean;
}
export type ButtonRadius = 'none' | 'rounded' | 'full';
interface ButtonRadiusProps {
  radius?: ButtonRadius;
  roundedNone?: boolean;
  roundedFull?: boolean;
}
export type ButtonInteract = 'normal' | 'main' | 'danger';
interface ButtonInteractProps {
  interact?: ButtonInteract;
  interactMain?: boolean;
  interactDanger?: boolean;
}
export function Button(props: ButtonProps) {
  const [executing, setExecuting] = createSignal(false);
  const loading = createMemo(() => executing() || props.loading || false);
  const loadingStrategy = () =>
    props.loadingStrategy || (padding() == 'compact' && !props.icon)
      ? 'hide_label'
      : 'move_label';
  const iconLoading = () => props.iconLoading || baseConfig().iconSpinner();
  const focusable = () => props.focusable ?? true;

  // variants
  const padding = () =>
    props.padding ||
    (props.wide ? 'wide' : props.compact ? 'compact' : 'uniform');
  const align = () =>
    props.align || (props.left ? 'left' : props.right ? 'right' : 'center');
  const size = () => props.size || (props.lg ? 'lg' : props.sm ? 'sm' : 'md');
  const color = () => {
    if (props.color) return props.color;
    else if (props.main) return 'main';
    else if (props.sub) return 'sub';
    else if (props.accent) return 'accent';
    else if (props.info) return 'info';
    else if (props.success) return 'success';
    else if (props.warning) return 'warning';
    else if (props.danger) return 'danger';
    else if (props.special) return 'special';
    else if (props.white) return 'white';
    else if (props.black) return 'black';
    else if (props.brand) return 'brand';
    else return 'neutral';
  };
  const type = () => {
    if (props.type) return props.type;
    else if (props.outline) return 'outline';
    else if (props.light) return 'light';
    else if (props.flat) return 'flat';
    else if (props.ghost) return 'ghost';
    else return 'solid';
  };

  // loading state class
  const labelLoaderLeftClass = () => {
    if (padding() == 'uniform') {
      return size() == 'md'
        ? '-left-4'
        : size() == 'sm'
          ? '-left-3'
          : '-left-5';
    } else if (padding() == 'wide') {
      return size() == 'md'
        ? '-left-5'
        : size() == 'sm'
          ? '-left-4'
          : '-left-6';
    } else {
      // compact form does not have text-spinner
      return 'hidden';
    }
  };
  const labelLoadingTranslateClass = () => {
    if (padding() == 'uniform') {
      return size() == 'md'
        ? 'translate-x-2'
        : size() == 'sm'
          ? 'translate-x-1.5'
          : 'translate-x-3';
    } else if (padding() == 'wide') {
      return size() == 'md'
        ? 'translate-x-2.5'
        : size() == 'sm'
          ? 'translate-x-2'
          : 'translate-x-4';
    }
  };
  const endLoaderTranslateClass = () => {
    if (padding() == 'uniform') {
      return size() == 'md'
        ? 'translate-x-1.5'
        : size() == 'sm'
          ? 'translate-x-1'
          : 'translate-x-2.5';
    } else if (padding() == 'wide') {
      return size() == 'md'
        ? 'translate-x-2'
        : size() == 'sm'
          ? 'translate-x-1.5'
          : 'translate-x-2.5';
    }
  };

  const baseLabelClass = () => {
    let baseLabelClass =
      'relative inline-flex items-center transition-transform first-letter:uppercase';

    switch (size()) {
      case 'md': {
        baseLabelClass = joinClass(
          baseLabelClass,
          padding() == 'compact' && `px-1`,
          padding() != 'compact' &&
          `px-2 ${props.icon ? `pl-1` : props.iconEnd ? `pr-1` : ``}`,
        );
        break;
      }
      case 'sm': {
        baseLabelClass = joinClass(
          baseLabelClass,
          padding() == 'compact' && `px-0.5`,
          padding() != 'compact' &&
          `px-1.5 ${props.icon ? `pl-0.5` : props.iconEnd ? `pr-0.5` : ``}`,
        );
        break;
      }
      case 'lg': {
        baseLabelClass = joinClass(
          baseLabelClass,
          padding() == 'compact' && `px-1.5`,
          padding() != 'compact' &&
          `px-3 ${props.icon ? `pl-1.5` : props.iconEnd ? `pr-1.5` : ``}`,
        );
      }
    }

    return mergeClass(
      baseLabelClass,
      align() == 'left' && !props.icon && !loading() && 'pl-0',
      align() == 'right' && !props.iconEnd && 'pr-0',
      loading()
        ? loadingStrategy() == 'hide_label'
          ? 'invisible'
          : `opacity-75 ${!props.icon ? labelLoadingTranslateClass() : ''}`
        : '',
      props.labelClass,
    );
  };

  // Icons
  const baseIconClass = createMemo(() => {
    let baseIconClass = 'transition-transform flex-center';
    switch (size()) {
      case 'md': {
        baseIconClass = joinClass(
          baseIconClass,
          padding() == 'compact' ? `w-4 h-4 text-base` : `w-7 h-7 text-xl`,
        );
        break;
      }
      case 'sm': {
        baseIconClass = joinClass(
          baseIconClass,
          padding() == `compact` ? `w-3 h-3 text-xs` : 'w-6 h-6 text-base',
        );
        break;
      }
      case 'lg': {
        baseIconClass = joinClass(
          baseIconClass,
          padding() == `compact` ? `w-5 h-5 text-xl` : 'w-8 h-8 text-2xl',
        );
        break;
      }
    }
    return baseIconClass;
  });
  const iconClass = () =>
    mergeClass(
      baseIconClass(),
      loading() && loadingStrategy() == 'hide_label' ? 'invisible' : '',
      props.iconClass,
    );
  const iconEndClass = () =>
    mergeClass(
      baseIconClass(),
      !props.icon && loading() ? endLoaderTranslateClass() : '',
      loading() && loadingStrategy() == 'hide_label' ? 'invisible' : '',
      props.iconClass,
    );
  const labelLoaderClass = () =>
    mergeClass(
      baseIconClass(),
      'absolute',
      size() == 'md' ? 'scale-90' : size() == 'sm' ? 'scale-75' : 'scale-95',
      labelLoaderLeftClass(),
      props.loaderClass,
    );
  const loaderClass = () =>
    mergeClass(
      baseIconClass(),
      props.label && loading() && loadingStrategy() == 'hide_label'
        ? 'invisible'
        : '',
      props.loaderClass,
    );
  const hideLabelLoaderClass = () =>
    mergeClass(
      baseIconClass(),
      'absolute place-self-center animate-fade-in',
      props.loaderClass,
    );

  // Button class
  const radius = () =>
    props.radius ||
    (props.roundedFull ? 'full' : props.roundedNone ? 'none' : 'rounded');
  const interact = () =>
    props.interact ||
    (props.interactMain ? 'main' : props.interactDanger ? 'danger' : 'normal');

  const buttonClass = createMemo(() => {
    let buttonClass = `relative inline-flex items-center whitespace-nowrap`;

    buttonClass = joinClass(
      buttonClass,
      'font-medium',
      align() == 'left'
        ? 'justify-start'
        : align() == 'right'
          ? 'justify-end'
          : 'justify-center',
      radius() == 'full'
        ? 'rounded-full'
        : radius() == 'none'
          ? 'rounded-none'
          : '',
      focusable()
        ? type() == 'outline' || type() == 'ghost'
          ? 'focus-visible:ring-1'
          : 'focus-visible:ring-2'
        : 'focus-visible:ring-0',
      props.disabled || loading() ? 'pointer-events-none' : '',
    );

    switch (size()) {
      case 'md': {
        if (padding() == 'compact') {
          buttonClass = joinClass(
            buttonClass,
            radius() == 'rounded' && 'rounded',
            'text-xsm py-1 px-1 leading-4 h-fit',
          );
        } else {
          buttonClass = joinClass(
            buttonClass,
            'h-10 min-w-10 text-base',
            radius() == 'rounded' && 'rounded-md',
            padding() == 'uniform'
              ? 'px-1.5'
              : padding() == 'wide'
                ? 'px-5'
                : '',
          );
        }
        break;
      }
      case 'sm': {
        if (padding() == 'compact') {
          buttonClass = joinClass(
            buttonClass,
            radius() == 'rounded' && 'rounded-xs',
            'text-xs py-0.5 px-0.5 leading-3 h-fit',
          );
        } else {
          buttonClass = joinClass(
            buttonClass,
            'h-8 min-w-8 text-sm',
            radius() == 'rounded' && 'rounded',
            padding() == 'uniform' ? 'px-1' : padding() == 'wide' ? 'px-4' : '',
          );
        }
        break;
      }
      case 'lg': {
        if (padding() == 'compact') {
          buttonClass = joinClass(
            buttonClass,
            radius() == 'rounded' && 'rounded-md',
            'text-sm py-1.5 px-1.5 leading-5 h-fit',
          );
        } else {
          buttonClass = joinClass(
            buttonClass,
            'h-12 min-w-12 text-lg',
            radius() == 'rounded' && 'rounded-lg',
            padding() == 'uniform' ? 'px-2' : padding() == 'wide' ? 'px-6' : '',
          );
        }
        break;
      }
    }

    if (padding() != 'compact') {
      buttonClass = joinClass(buttonClass, 'leading-none');
    }

    // disabled style
    if (props.disabled) {
      if (type() == 'outline') {
        buttonClass = joinClass(
          buttonClass,
          'bg-white border border-neutral-100 text-neutral-200',
        );
      } else if (type() == 'light') {
        buttonClass = joinClass(
          buttonClass,
          'border-neutral-50 bg-neutral-50 text-neutral-300',
        );
      } else if (type() == 'flat') {
        buttonClass = joinClass(buttonClass, 'text-neutral-200');
      } else if (type() == 'ghost') {
        buttonClass = joinClass(
          buttonClass,
          'text-lighter border-neutral-lightest opacity-50',
        );
      } else {
        buttonClass = joinClass(buttonClass, 'bg-neutral-300 text-neutral-100');
      }
      // return here because disabled button won't take color class
      return mergeClass(buttonClass, props.class);
    }

    if (type() == 'solid') {
      // solid
      switch (color()) {
        case 'neutral': {
          buttonClass = joinClass(
            buttonClass,
            'bg-neutral-600 text-white',
            'hover:bg-neutral-700 active:bg-neutral-800',
            'focus-visible:ring-neutral-900',
            loading() ? 'bg-neutral-700' : '',
          );
          break;
        }
        case 'white': {
          buttonClass = joinClass(
            buttonClass,
            'bg-white border border-neutral-50 text-neutral-700',
            'hover:text-black',
            'focus-visible:ring-light',
            loading() ? 'text-black' : '',
          );
          break;
        }
        case 'black': {
          buttonClass = joinClass(
            buttonClass,
            'text-neutral-50',
            'hover:bg-black/80 hover:text-white',
            'focus-visible:ring-light',
            loading() ? 'bg-black/80' : 'bg-black',
          );
          break;
        }
        default: {
          buttonClass = joinClass(
            buttonClass,
            `bg-${color()} text-white`,
            `hover:bg-${color()}-600 active:bg-${color()}-700`,
            `focus-visible:ring-${color()}-900`,
            loading() ? `bg-${color()}-600` : '',
          );
          break;
        }
      }

      if (interact() == 'main' && type() !== 'solid') {
        if (color() == 'white') {
          buttonClass = joinClass(
            buttonClass,
            'hover:text-main-600 active:text-main-700',
            loading() ? 'text-main' : '',
          );
        } else {
          buttonClass = joinClass(
            buttonClass,
            'hover:bg-main active:bg-main-600',
            loading() ? 'bg-main-600' : '',
          );
        }
      } else if (interact() == 'danger' && type() !== 'solid') {
        if (color() == 'white') {
          buttonClass = joinClass(
            buttonClass,
            'hover:text-danger-600 active:text-danger-700',
            loading() ? 'text-danger-600' : '',
          );
        } else {
          buttonClass = joinClass(
            buttonClass,
            'hover:bg-danger active:bg-danger-600',
            loading() ? 'bg-danger-600' : '',
          );
        }
      }
    } else if (type() == 'outline') {
      buttonClass = joinClass(buttonClass, 'border');
      switch (color()) {
        case 'neutral': {
          buttonClass = joinClass(
            buttonClass,
            'bg-white text-neutral-600 border-neutral-100',
            'hover:border-neutral-300 hover:bg-lightest hover:text-neutral-800 active:border-neutral-300 active:bg-neutral-50',
            'focus-visible:ring-neutral',
            loading()
              ? 'border-neutral-400 text-neutral-800 bg-neutral-50'
              : '',
          );
          break;
        }
        case 'white': {
          buttonClass = joinClass(
            buttonClass,
            'bg-transparent text-white border-white',
            'hover:opacity-80',
            'focus-visible:ring-light',
            loading() ? 'opacity-80' : '',
          );
          break;
        }
        case 'black': {
          buttonClass = joinClass(
            buttonClass,
            'bg-transparent text-black border-black',
            'hover:opacity-75',
            'focus-visible:ring-light',
            loading() ? 'opacity-75' : '',
          );
          break;
        }
        default: {
          buttonClass = joinClass(
            buttonClass,
            `bg-white text-${color()} border-${color()}-400`,
            `hover:border-${color()} hover:text-${color()}-600 active:border-${color()}-600 active:bg-${color()}-50`,
            `focus-visible:ring-${color()}`,
            loading()
              ? `border-${color()} text-${color()}-600 bg-${color()}-50`
              : '',
          );
          break;
        }
      }

      if (interact() == 'main') {
        buttonClass = joinClass(
          buttonClass,
          'hover:text-main hover:border-main-400 active:text-main active:border-main-400 active:bg-main-50',
          'focus-visible:ring-main',
          loading() ? 'text-main border-main-400 bg-main-50' : '',
          color() == 'white' || color() == 'black'
            ? 'hover:bg-transparent active:bg-transparent'
            : '',
        );
      } else if (interact() == 'danger') {
        buttonClass = joinClass(
          buttonClass,
          'hover:text-danger hover:border-danger-400 active:border-danger-400 active:bg-danger-50',
          'focus-visible:ring-danger',
          loading() ? 'text-danger border-danger-400 bg-danger-50' : '',
          color() == 'white' || color() == 'black'
            ? 'hover:bg-transparent active:bg-transparent'
            : '',
        );
      }
    } else if (type() == 'light') {
      // buttonClass = joinClass(buttonClass, "border");
      switch (color()) {
        case 'neutral': {
          buttonClass = joinClass(
            buttonClass,
            'bg-lighter text-neutral-700',
            'hover:text-neutral-800 hover:bg-neutral-100',
            'focus-visible:ring-neutral',
            loading() ? 'text-neutral-800 bg-neutral-100' : '',
          );
          break;
        }
        case 'white': {
          buttonClass = joinClass(
            buttonClass,
            'bg-neutral-900 border-neutral-800 text-white',
            'hover:bg-neutral-800 border-neutral-700',
            'focus-visible:ring-light',
            loading() ? 'bg-neutral' : '',
          );
          break;
        }
        case 'black': {
          buttonClass = joinClass(
            buttonClass,
            'bg-neutral-50 border-neutral-100 text-black',
            'hover:bg-neutral-50/75 hover:border-neutral-100/75',
            'focus-visible:ring-neutral',
            loading() ? 'opacity-75 border-neutral-100/75' : '',
          );
          break;
        }
        default: {
          buttonClass = joinClass(
            buttonClass,
            `bg-${color()}-100 text-${color()}-600`,
            `hover:text-${color()}-700 hover:bg-${color()}-200`,
            `focus-visible:ring-${color()}`,
            loading() ? `text-${color()}-700 bg-${color()}-200` : '',
          );
          break;
        }
      }

      if (interact() == 'main') {
        buttonClass = joinClass(
          buttonClass,
          'hover:text-main-800 hover:bg-main-200 active:text-main-700',
          'focus-visible:ring-main',
          loading() ? 'text-main-800 bg-main-200' : '',
        );
      } else if (interact() == 'danger') {
        buttonClass = joinClass(
          buttonClass,
          'hover:text-danger-800 hover:bg-danger-200',
          'focus-visible:ring-danger',
          loading() ? 'text-danger-800 bg-danger-200' : '',
        );
      }
    } else if (type() == 'flat') {
      switch (color()) {
        case 'neutral': {
          buttonClass = joinClass(
            buttonClass,
            'bg-transparent text-neutral-600',
            'hover:bg-neutral-50 hover:text-neutral-700 active:bg-neutral-50 active:text-neutral-800',
            'focus-visible:ring-neutral',
            loading() ? 'bg-neutral-50 text-neutral-800' : '',
          );
          break;
        }
        case 'white': {
          buttonClass = joinClass(
            buttonClass,
            'bg-transparent text-white',
            'hover:bg-neutral-100/20',
            'focus-visible:ring-light',
            loading() ? 'bg-neutral-100/20' : '',
          );
          break;
        }
        case 'black': {
          buttonClass = joinClass(
            buttonClass,
            'bg-transparent text-black',
            'hover:bg-neutral-100/20',
            'focus-visible:ring-light',
            loading() ? 'bg-neutral-100/20' : '',
          );
          break;
        }
        default: {
          buttonClass = joinClass(
            buttonClass,
            `bg-transparent text-${color()}`,
            `hover:bg-${color()}-50 hover:text-${color()}-600 active:bg-${color()}-50 active:text-${color()}-700`,
            `focus-visible:ring-${color()}`,
            loading() ? `bg-${color()}-50 text-${color()}-700` : '',
          );
          break;
        }
      }

      if (interact() == 'main') {
        buttonClass = joinClass(
          buttonClass,
          'hover:text-main hover:bg-main-50 active:bg-main-50 active:text-main-600',
          'focus-visible:ring-main',
          loading() ? 'bg-main-50 text-main-600' : '',
        );
      } else if (interact() == 'danger') {
        buttonClass = joinClass(
          buttonClass,
          'hover:text-danger hover:bg-danger-50 active:bg-danger-50 active:text-danger-600',
          'focus-visible:ring-danger',
          loading() ? 'bg-danger-50 text-danger-600' : '',
        );
      }
    } else if (type() == 'ghost') {
      buttonClass = joinClass(buttonClass, 'border-2 bg-transparent');
      switch (color()) {
        case 'neutral': {
          buttonClass = joinClass(
            buttonClass,
            'text-neutral-700 border-neutral-300',
            'hover:bg-neutral-600 hover:border-neutral-600 hover:text-white active:bg-neutral-700 active:border-neutral-700 active:text-white',
            'focus-visible:ring-white',
            loading() ? 'bg-neutral-600 border-neutral-600 text-white' : '',
          );
          break;
        }
        case 'white': {
          buttonClass = joinClass(
            buttonClass,
            'text-white border-white',
            'hover:bg-white hover:text-neutral-700',
            'focus-visible:ring-light',
            loading() ? 'bg-white text-neutral-700' : '',
          );
          break;
        }
        case 'black': {
          buttonClass = joinClass(
            buttonClass,
            'text-black border-black',
            'hover:bg-black hover:text-white',
            'focus-visible:ring-light',
            loading() ? 'bg-black text-white' : '',
          );
          break;
        }
        default: {
          buttonClass = joinClass(
            buttonClass,
            `text-${color()} border-${color()}`,
            `hover:bg-${color()} hover:border-${color()} hover:text-white active:border-${color()}-600 active:bg-${color()}-600 active:text-white`,
            `focus-visible:ring-${color()}-50`,
            loading() ? `bg-${color()} border-${color()} text-white` : '',
          );
          break;
        }
      }

      // no hover main/danger on this style
    }

    if (props.onClick === null && !props.href) {
      buttonClass = buttonClass.replace(
        /(hover:|active:|focus:|focus-visible:)[^ ]+/g,
        '',
      );
      buttonClass = joinClass(buttonClass, 'cursor-default hover:opacity-95');
    } else {
      buttonClass = joinClass(buttonClass, 'cursor-pointer');
    }

    if (props.transparent) {
      buttonClass = joinClass(
        buttonClass,
        props.transparent &&
        'bg-transparent hover:bg-transparent active:bg-transparent',
      );
    }

    return mergeClass(buttonClass, props.class);
  });

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) {
      if (props.stopPropagation) {
        e.stopPropagation();
      }
      const result = props.onClick(e);
      if (result && typeof result.then === 'function') {
        setExecuting(true);
        if (typeof result.finally === 'function') {
          result.finally(() => setExecuting(false));
        } else {
          result.then(() => setExecuting(false)).catch(() => setExecuting(false));
        }
      }
    }
  };

  let ref: Ref<HTMLElement>;

  const ButtonContent = () => (
    <>
      <slot name="icon" />
      <Show when={!!props.icon}>
        <i class={loading() ? loaderClass() : iconClass()}>
          {loading() ? iconLoading() : props.icon}
        </i>
      </Show>
      <Show
        when={loading() && props.label && loadingStrategy() == 'hide_label'}
      >
        <i class={hideLabelLoaderClass()}>{iconLoading()}</i>
      </Show>
      <Show when={!!props.label}>
        <span class={baseLabelClass()}>
          <Show when={!props.icon && loading()}>
            <i class={labelLoaderClass()}>{iconLoading()}</i>
          </Show>
          {props.label}
        </span>
      </Show>
      {props.children}
      <Show when={!!props.iconEnd}>
        <i class={iconEndClass()}>{props.iconEnd}</i>
      </Show>
      <slot name="iconEnd" />
    </>
  );
  const kind = () =>
    props.href ? 'link' : props.onClick !== null ? 'button' : 'badge';

  onMount(() => {
    if (props.tooltip) {
      createTooltip(ref, props.tooltip, {
        placement: props.placement,
        allowedPlacements: [
          'top',
          'top-start',
          'top-end',
          'bottom',
          'bottom-start',
          'bottom-end',
        ],
      });
    }
  });

  return (
    <>
      <Switch>
        <Match when={kind() == 'link'}>
          <Dynamic
            component={import.meta.env.SSR || props.nativeAnchor ? 'a' : A}
            id={props.id}
            href={props.href!}
            target={props.targetBlank ? '_blank' : undefined}
            download={props.download as string | undefined}
            tabIndex={focusable() ? 0 : -1}
            ref={mergeRef(props.ref, (el: HTMLElement) => (ref = el))}
            style={props.style}
            class={buttonClass()}
            aria-label={props['aria-label']}
            onClick={handleClick}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
          >
            <ButtonContent />
          </Dynamic>
        </Match>
        <Match when={kind() == 'button'}>
          <button
            id={props.id}
            type={props.submit ? 'submit' : props.reset ? 'reset' : 'button'}
            tabIndex={focusable() ? 0 : -1}
            ref={mergeRef(props.ref, (el: HTMLElement) => (ref = el))}
            style={props.style}
            class={buttonClass()}
            aria-label={props['aria-label']}
            onClick={handleClick}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
          >
            <ButtonContent />
          </button>
        </Match>
        <Match when={kind() == 'badge'}>
          <div
            id={props.id}
            tabIndex={focusable() ? 0 : -1}
            ref={mergeRef(props.ref, (el: HTMLElement) => (ref = el))}
            style={props.style}
            class={buttonClass()}
            aria-label={props['aria-label']}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
          >
            <ButtonContent />
          </div>
        </Match>
      </Switch>
    </>
  );
}
