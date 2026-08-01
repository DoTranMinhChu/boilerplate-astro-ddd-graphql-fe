import { mergeClass } from '@core/helpers/class';

export type LinkProps = BaseProps &
  JSX.IntrinsicElements['a'] & {
    targetBlank?: boolean;
  };
export function Link(props: LinkProps) {
  const linkClass = () =>
    mergeClass(
      `
      font-medium underline hover:text-info visited:text-indigo hover:visited:text-indigo-600
    `,
      props.class,
    );
  return (
    <a
      {...props}
      target={props.targetBlank ? '_blanke' : props.target}
      class={linkClass()}
    >
      {props.children}
    </a>
  );
}
