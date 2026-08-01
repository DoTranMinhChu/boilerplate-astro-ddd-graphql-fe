import { joinClass, mergeClass } from '@core/helpers/class';
import { FormatDatetimeType, formatDatetime } from '@core/helpers/date';
import { FormatNumberOptions, formatNumber } from '@core/helpers/number';
import { Show } from 'solid-js';
import { Img } from '../utilities/Img';

export interface CellProps extends BaseProps {
  value: any;
  subValue?: any;
  image?: string | JSX.Element;
  valueClass?: string;
  subValueClass?: string;
  imageClass?: string;
  isAvatar?: boolean;
  valueAsDate?: boolean | FormatDatetimeType;
  subValueAsDate?: boolean | FormatDatetimeType;
  valueAsNumber?: boolean | FormatNumberOptions;
  subValueAsNumber?: boolean | FormatNumberOptions;
}
export function Cell(props: CellProps) {
  const cellClass = () => mergeClass(`flex items-center gap-2`, props.class);
  const valueClass = () =>
    mergeClass(``, props.subValue && `font-medium`, props.valueClass);
  const subValueClass = () =>
    mergeClass(`font-normal text-sm`, props.subValueClass);
  const imageClass = () =>
    joinClass(
      `w-10 h-10`,
      props.isAvatar ? `rounded-full` : `rounded`,
      props.imageClass,
    );

  const image = () => {
    return props.image;
  };

  const value = () => {
    const currentValue = props.value;
    if (props.valueAsNumber) {
      return formatNumber(
        currentValue,
        typeof props.valueAsNumber == 'object'
          ? props.valueAsNumber
          : undefined,
      );
    }
    if (props.valueAsDate) {
      return formatDatetime(
        currentValue,
        typeof props.valueAsDate == 'string' ? props.valueAsDate : undefined,
      );
    }
    return currentValue;
  };

  const subValue = () => {
    const currentValue = props.subValue;
    if (props.subValueAsNumber) {
      return formatNumber(
        currentValue,
        typeof props.subValueAsNumber == 'object'
          ? props.subValueAsNumber
          : undefined,
      );
    }
    if (props.subValueAsDate) {
      return formatDatetime(
        currentValue,
        typeof props.valueAsDate == 'string' ? props.valueAsDate : undefined,
      );
    }
    return currentValue;
  };

  return (
    <div class={cellClass()}>
      <Show when={props.image !== undefined}>
        <Img
          square
          bordered
          shouldOpenLightboxOnClick
          class={imageClass()}
          size="thumb"
          src={image()}
        />
      </Show>
      <div class="flex-column flex-1">
        <div class={valueClass()}>{value()}</div>
        <Show when={props.subValue}>
          <div class={subValueClass()}>{subValue()}</div>
        </Show>
      </div>
    </div>
  );
}
