import { mergeClass } from '@core/helpers/class';

export interface PageTitleProps extends BaseProps {
  title: string | JSX.Element;
  titleClass?: string;
}
export function PageTitle(props: PageTitleProps) {
  const pageTitleClass = () =>
    mergeClass('flex items-center mb-2', props.class);
  const titleClass = () =>
    mergeClass('flex-1 font-bold text-xl', props.titleClass);

  return (
    <div class={pageTitleClass()} style={props.style}>
      <div class={titleClass()}>{props.title}</div>
      {props.children}
    </div>
  );
}
