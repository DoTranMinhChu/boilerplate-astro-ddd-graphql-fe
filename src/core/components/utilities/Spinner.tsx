import { mergeClass } from '@core/helpers/class';
import { baseConfig } from '../config/BaseConfig';

export interface SpinnerProps extends BaseProps {}
export function Spinner(props: SpinnerProps) {
  const spinnerClass = () =>
    mergeClass(`flex-center col-span-full w-full text-3xl p-8`, props.class);

  return <div class={spinnerClass()}>{baseConfig().iconSpinner()}</div>;
}
