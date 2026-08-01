import { mergeClass } from '@core/helpers/class';

export function Card(
  props: BaseProps & {
    onClick?: (e?: MouseEvent) => any;
  },
) {
  const cardClass = () =>
    mergeClass(
      `w-full rounded-lg bg-white p-2`,
      `border border-lighter border-b-light border-l-neutral-100 border-r-neutral-100`,
      props.class,
    );
  return (
    <div {...props} class={cardClass()} onClick={props.onClick}>
      {props.children}
    </div>
  );
}

export interface CardHeaderProps extends BaseProps {
  title?: string | JSX.Element;
  titleClass?: string;
}
export function CardHeader(props: CardHeaderProps) {
  const headerClass = () =>
    mergeClass(
      'relative flex items-center py-2 rounded-t-inherit',
      'border-b border-neutral-50 border-solid',
      props.class,
    );

  const titleClass = () =>
    mergeClass('flex-1 pl-1 font-bold text-lg', props.titleClass);
  return (
    <div class={headerClass()} style={props.style}>
      {props.title && <div class={titleClass()}>{props.title}</div>}
      {props.children}
    </div>
  );
}
Card.Header = CardHeader;

export function CardDivider(props: BaseProps) {
  const dividerClass = () =>
    mergeClass(`-mx-2 my-2 w-auto border-t border-neutral-50`, props.class);
  return <div class={dividerClass()}></div>;
}

Card.Divider = CardDivider;

export interface CardBodyProps extends BaseProps {}
export function CardBody(props: CardBodyProps) {
  const bodyClass = () => mergeClass('p-2', props.class);

  return <div class={bodyClass()}>{props.children}</div>;
}
Card.Body = CardBody;
