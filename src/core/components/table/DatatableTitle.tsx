import { mergeClass } from '@core/helpers/class';
import { useDatatable } from './DatatableContext';

export interface DatatableTitleProps extends BaseProps {
  title?: string;
  titleClass?: string;
  description?: string;
  descriptionClass?: string;
}
export function DatatableTitle(props: DatatableTitleProps) {
  const { service } = useDatatable();
  const title = () => props.title || service.displayName;
  const datatableTitleClass = () => mergeClass('px-1 self-center', props.class);
  const titleClass = () =>
    mergeClass(
      `font-bold text-lg leading-tight first-letter:uppercase`,
      props.titleClass,
    );
  const descriptionClass = () =>
    mergeClass(`text-xsm text-neutral`, props.descriptionClass);

  return (
    <div class={datatableTitleClass()}>
      <h3 class={titleClass()}>{title()}</h3>
      <div class={descriptionClass()}>{props.description}</div>
    </div>
  );
}
