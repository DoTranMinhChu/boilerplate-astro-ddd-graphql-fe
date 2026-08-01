import { Icon } from '@iconify-icon/solid';
import { mergeClass } from '@core/helpers/class';

export interface TipsProps extends BaseProps {
  title: string;
}
export function Tips(props: TipsProps) {
  const tipsClass = () =>
    mergeClass(
      `rounded-lg border-2 border-info-200 overflow-hidden animate-fade-in duration-500`,
      props.class,
    );
  return (
    <div class={tipsClass()}>
      <div class="relative overflow-hidden border-b-2 border-dashed border-info-200 bg-info-50 p-3">
        <span class="text-lg font-semibold text-info">{props.title}</span>
        <Icon
          class="absolute -right-2 top-0 -rotate-45 text-6xl text-yellow-300"
          icon={'mdi:lightbulb-on'}
        />
      </div>
      <div class="whitespace-pre-line bg-white p-4 text-base font-normal">
        {props.children}
      </div>
    </div>
  );
}
