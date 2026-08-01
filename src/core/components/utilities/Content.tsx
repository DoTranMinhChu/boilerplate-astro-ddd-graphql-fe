import { mergeClass } from '@core/helpers/class';
import DOMPurify from 'isomorphic-dompurify';

export interface ContentProps extends BaseProps {
  innerHTML: string | null | undefined;
}
export function Content(props: ContentProps) {
  const contentClass = () => mergeClass(`ck-content`, props.class);
  const sanitizedHTML = props.innerHTML
    ? DOMPurify.sanitize(props.innerHTML)
    : '';
  return (
    <div {...props} class={contentClass()} innerHTML={sanitizedHTML}></div>
  );
}
