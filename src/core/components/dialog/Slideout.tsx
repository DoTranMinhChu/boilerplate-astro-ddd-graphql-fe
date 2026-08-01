import { joinClass, mergeClass } from '@core/helpers/class';
import { checkMobile } from '@core/helpers/device';
import {
  Dialog,
  DialogBody,
  DialogBodyProps,
  DialogFooter,
  DialogFooterProps,
  DialogHeader,
  DialogHeaderProps,
  DialogProps,
} from './Dialog';

export interface SlideoutProps extends DialogProps {
  /* 320px */
  xs?: boolean;
  /* 480px */
  sm?: boolean;
  /* 768px */
  md?: boolean;
  /* 1024px */
  lg?: boolean;
  /* 1280px */
  xl?: boolean;
  /* 1440px */
  xl2?: boolean;
}
export function Slideout(props: SlideoutProps) {
  const slideoutClass = () =>
    mergeClass(
      'h-screen max-w-(94%)',
      props.xl2
        ? 'w-8xl'
        : props.xl
          ? 'w-7xl'
          : props.lg
            ? 'w-5xl'
            : props.sm
              ? 'w-md'
              : props.xs
                ? 'w-sm'
                : props.md
                  ? 'w-3xl'
                  : '',
      props.class,
    );

  const initialClass = () =>
    joinClass(
      `opacity-0`,
      props.position == 'left' && `origin-left`,
      props.position == 'right' && `origin-right`,
    );
  const postInitialClass = () => joinClass(`opacity-100 translate-x-full`);
  const transitionClass = () =>
    joinClass(`transition opacity-100 duration-300`);
  const transitioningClass = () => joinClass(``);
  const inactiveClass = () => joinClass(`blur-md translate-x-full`);
  const activeClass = () => joinClass(`opacity-100 blur-0 translate-x-0`);

  return (
    <Dialog
      screenGap="none"
      position="right"
      {...props}
      isOpen={!!props.isOpen}
      initialClass={initialClass()}
      postInitialClass={postInitialClass()}
      transitioningClass={transitioningClass()}
      transitionClass={transitionClass()}
      inactiveClass={inactiveClass()}
      activeClass={activeClass()}
      containerClass="h-full"
      class={slideoutClass()}
    />
  );
}

export interface SlideoutHeaderProps extends DialogHeaderProps {}
export function SlideoutHeader(props: SlideoutHeaderProps) {
  return <DialogHeader {...props} />;
}
Slideout.Header = SlideoutHeader;

export interface SlideoutBodyProps extends DialogBodyProps {}
export function SlideoutBody(props: SlideoutBodyProps) {
  return <DialogBody {...props} />;
}
Slideout.Body = SlideoutBody;

export interface SlideoutFooterProps extends DialogFooterProps {}
export function SlideoutFooter(props: SlideoutFooterProps) {
  const check = checkMobile();

  return (
    <DialogFooter
      class={`border-t border-neutral-100 ${check ? `mb-16` : `mb-0`}`}
      {...props}
    />
  );
}
Slideout.Footer = SlideoutFooter;
