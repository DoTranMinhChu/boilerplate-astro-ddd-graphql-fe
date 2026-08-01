import { baseConfig } from '@core/components/config/BaseConfig';
import { mergeClass } from '@core/helpers/class';

export interface EmptyProps extends BaseProps {
  icon?: JSX.Element;
  iconClass?: string;
  content?: string | JSX.Element;
}
export function Empty(props: EmptyProps) {
  const emptyRowClass = () =>
    mergeClass(
      `rounded flex-col gap-2 py-12 px-4 text-neutral-400 font-medium flex-center text-center`,
      props.class,
    );
  const icon = () => props.icon || baseConfig().iconEmpty();
  const iconClass = () => mergeClass('text-2xl leading-0', props.iconClass);
  const content = () => props.content ?? baseConfig().emptyText;

  return (
    <div class={emptyRowClass()}>
      <i class={iconClass()}>{icon()}</i>
      {content()}
      {props.children}
    </div>
  );
}
