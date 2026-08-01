import { mergeClass } from '@core/helpers/class';

export interface SectionTitleProps extends BaseProps {
  title: string | JSX.Element;
  titleClass?: string;
}
export function SectionTitle(props: SectionTitleProps) {
  const sectionTitleClass = () =>
    mergeClass('flex items-center mb-1', props.class);
  const titleClass = () =>
    mergeClass('flex-1 font-semibold text-lg', props.titleClass);

  return (
    <div class={sectionTitleClass()} style={props.style}>
      <div class={titleClass()}>{props.title}</div>
      {props.children}
    </div>
  );
}
