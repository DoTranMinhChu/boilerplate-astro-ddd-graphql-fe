import { mergeClass } from '@core/helpers/class';
import { Ref, Show } from 'solid-js';
import { baseConfig } from '../config/BaseConfig';

export interface LabelProps extends BaseProps {
  label?: string | JSX.Element;
  subtitle?: string | JSX.Element;
  subtitleClass?: string;
  description?: string | JSX.Element;
  descriptionClass?: string;
  tooltip?: string;
  tooltipRef?: Ref<HTMLElement>;
  tooltipIcon?: JSX.Element;
  tooltipClass?: string;
  required?: boolean;
  requiredIcon?: JSX.Element;
  requiredClass?: string;
}

export function Label(props: LabelProps) {
  const labelClass = () =>
    mergeClass(
      'flex items-center font-medium text-base text-neutral-700 min-h-6 mb-1 first-letter:uppercase',
      props.class,
    );
  const descriptionClass = () =>
    mergeClass(
      'text-xsm font-normal -mt-1.5 mb-1.5 first-letter:uppercase',
      props.descriptionClass,
    );
  const subtitleClass = () =>
    mergeClass('font-normal text-xs ml-1.5', props.subtitleClass);

  const requiredClass = () =>
    mergeClass(`ml-1 translate-y-1 text-2xs text-main`, props.requiredClass);
  const tooltipClass = () =>
    mergeClass(
      `ml-1.5 translate-y-0.5 text-base text-info`,
      props.tooltipClass,
    );
  const requiredIcon = () =>
    props.requiredIcon || baseConfig().iconRequired?.();
  const tooltipIcon = () => props.tooltipIcon || baseConfig().iconTooltip?.();

  return (
    <>
      <div class={labelClass()}>
        <label for={props.id} class={`inline-flex items-center`}>
          {props.label}
          <Show when={props.subtitle}>
            <span class={subtitleClass()}>{props.subtitle}</span>
          </Show>
          <Show when={props.required}>
            <sup class={requiredClass()}>{requiredIcon()}</sup>
          </Show>
          <Show when={props.tooltip}>
            <span ref={props.tooltipRef} class={tooltipClass()}>
              {tooltipIcon()}
            </span>
          </Show>
        </label>
        {props.children}
      </div>
      {props.description && (
        <div class={descriptionClass()}>{props.description}</div>
      )}
    </>
  );
}
