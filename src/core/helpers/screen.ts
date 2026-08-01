import { Accessor, createEffect, createSignal, onCleanup } from 'solid-js';

const FONT_SIZE = 16;
const XS_THRESHOLD = FONT_SIZE * 24;
const SM_THRESHOLD = FONT_SIZE * 30;
const MD_THRESHOLD = FONT_SIZE * 48;
const LG_THRESHOLD = FONT_SIZE * 64;
const XL_THRESHOLD = FONT_SIZE * 80;
const XXL_THRESHOLD = FONT_SIZE * 90;

const [xxs, setXxs] = createSignal(false);
const [xs, setXs] = createSignal(false);
const [sm, setSm] = createSignal(false);
const [md, setMd] = createSignal(false);
const [lg, setLg] = createSignal(false);
const [xl, setXl] = createSignal(false);
const [xxl, setXxl] = createSignal(false);

const [fromXs, setFromXs] = createSignal(false);
const [fromSm, setFromSm] = createSignal(false);
const [fromMd, setFromMd] = createSignal(false);
const [fromLg, setFromLg] = createSignal(false);
const [fromXl, setFromXl] = createSignal(false);
const [fromXxl, setFromXxl] = createSignal(false);

const handleResize = () => {
  const screenWidth = window.innerWidth;

  setXxs(screenWidth < XS_THRESHOLD);
  setXs(screenWidth >= XS_THRESHOLD && screenWidth < SM_THRESHOLD);
  setSm(screenWidth >= SM_THRESHOLD && screenWidth < MD_THRESHOLD);
  setMd(screenWidth >= MD_THRESHOLD && screenWidth < LG_THRESHOLD);
  setLg(screenWidth >= LG_THRESHOLD && screenWidth < XL_THRESHOLD);
  setXl(screenWidth >= XL_THRESHOLD && screenWidth < XXL_THRESHOLD);
  setXxl(screenWidth >= XXL_THRESHOLD);

  setFromXs(screenWidth >= XS_THRESHOLD);
  setFromSm(screenWidth >= SM_THRESHOLD);
  setFromMd(screenWidth >= MD_THRESHOLD);
  setFromLg(screenWidth >= LG_THRESHOLD);
  setFromXl(screenWidth >= XL_THRESHOLD);
  setFromXxl(screenWidth >= XXL_THRESHOLD);
};

if (typeof window !== 'undefined') {
  window.addEventListener('resize', handleResize);
  handleResize();

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('resize', handleResize);
  });
}

export const createScreen = () => {
  return {
    xxs,
    xs,
    sm,
    md,
    lg,
    xl,
    xxl,
    /** from 384 */
    fromXs,
    /** from 480px */
    fromSm,
    /** from 768px */
    fromMd,
    /** from 1024px */
    fromLg,
    /** from 1280px */
    fromXl,
    /** from 1440px */
    fromXxl,
  };
};

export const createOnScreen = (props: {
  ref: Accessor<HTMLElement | undefined>;
  margin?: number;
}) => {
  const [onScreen, setOnScreen] = createSignal(import.meta.env.SSR || false);
  const [hadOnScreen, setHadOnScreen] = createSignal(
    import.meta.env.SSR || false,
  );

  const observer = import.meta.env.SSR
    ? null
    : new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setOnScreen(true);
            setHadOnScreen(true);
          } else {
            setOnScreen(false);
          }
        },
        {
          root: null,
          rootMargin: (props.margin || 0) + 'px',
          threshold: 0,
        },
      );

  const unobserve = () => {
    if (props.ref() && observer) {
      observer.unobserve(props.ref()!);
    }
  };

  createEffect(() => {
    if (props.ref() && observer) {
      observer.observe(props.ref()!);
    }
  });

  onCleanup(() => {
    unobserve();
  });

  return { onScreen, hadOnScreen, unobserve };
};
